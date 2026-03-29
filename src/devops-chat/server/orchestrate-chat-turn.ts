import type {
  ConversationAwaiting,
  ConversationFacts,
  ConversationIntentState,
  ConversationWorkflowState,
} from "@/devops-chat/types/conversation";
import type {
  AssistantTurnHistoryItem,
  AssistantTurnResponse,
  ContextSnapshot,
  ToolResultEntry,
} from "@/devops-chat/types/assistant-response";
import { resolveAwaiting } from "./orchestration/awaiting-resolver";
import { resolveIntent } from "./orchestration/intent-resolver";
import { planTools, deduplicateTools } from "./orchestration/tool-planner";
import { getFilledSlots, mergeSlotPatch, setSlot } from "./orchestration/slot-memory";
import { getWorkflowForIntent } from "./orchestration/workflow-definitions";
import { getFirstMissingRequiredSlot, getSlotSchema, canonicalizeValue } from "./orchestration/slot-definitions";
import { evaluateDecision } from "./decision/decision-engine";
import { buildTurnResponse } from "./orchestration/response-builder";
import { getTool } from "./tools/tool-registry";
import { executeTool } from "./tools/tool-executor";
import { adaptToolResult } from "./tools/tool-result-adapter";
import { ensureBuiltinToolsRegistered } from "./tools/register-builtin-tools";
import { isLlmAvailable } from "./ai/llm-client";
import { resolveIntentWithAi } from "./ai/ai-intent-resolver";
import { resolveAwaitingWithAi } from "./ai/ai-awaiting-resolver";
import { findMockResponse } from "./ai/mock-responses";
import { narrateToolResult } from "./ai/tool-narrator";
import { simulateStreaming } from "./ai/simulate-streaming";
import { clearSlot, invalidateDependentSlots } from "./orchestration/slot-memory";

export type OrchestrateTurnInput = {
  requestId: string;
  conversationId: string;
  input: string;
  history: AssistantTurnHistoryItem[];
  contextSnapshot: ContextSnapshot;
  facts: ConversationFacts;
  intent?: ConversationIntentState | null;
  workflow?: ConversationWorkflowState | null;
  awaiting?: ConversationAwaiting;
  /** When false, force mock responses even if API key exists */
  useAi?: boolean;
};

export type OrchestrateTurnCallbacks = {
  onDelta?: (text: string) => void;
  onToolStart?: (toolName: string) => void;
  onToolDone?: (toolName: string, summary: string) => void;
};

const MAX_ITERATIONS = 3;

/**
 * Phase 2 orchestration pipeline.
 *
 * 1. hydrate conversation state
 * 2. resolve awaiting answer
 * 3. resolve intent/workflow
 * 4. plan tool(s)
 * 5. execute tool(s)
 * 6. merge facts/slots
 * 7. evaluate decision
 * 8. build response
 */
export async function orchestrateChatTurn(
  turnInput: OrchestrateTurnInput,
  callbacks: OrchestrateTurnCallbacks = {},
): Promise<AssistantTurnResponse> {
  ensureBuiltinToolsRegistered();

  const {
    requestId,
    input,
    history,
    contextSnapshot,
    useAi: useAiParam,
  } = turnInput;

  // useAi=false forces mock mode; useAi=true or undefined uses API key check
  const forceMock = useAiParam === false;

  let facts: ConversationFacts = { ...turnInput.facts };
  let currentIntent = turnInput.intent ?? null;
  let currentWorkflow = turnInput.workflow ?? null;
  let currentAwaiting = turnInput.awaiting ?? null;

  const toolResults: ToolResultEntry[] = [];
  const executedTools: string[] = [];
  let factsPatch: Partial<ConversationFacts> = {};

  // -----------------------------------------------------------------------
  // Step 2: Resolve awaiting answer (AI-first, rule-based fallback)
  // -----------------------------------------------------------------------
  if (currentAwaiting) {
    let awaitHandled = false;

    // --- AI path ---
    if (isLlmAvailable() && !forceMock) {
      const aiResult = await resolveAwaitingWithAi(input, currentAwaiting);
      if (aiResult) {
        switch (aiResult.action) {
          case "fill_slot": {
            if (aiResult.value) {
              facts = setSlot(facts, currentAwaiting.slotKey, aiResult.value, "user");
              const staleMap = buildStaleMapForIntent(currentAwaiting.originIntentKey);
              facts = invalidateDependentSlots(facts, currentAwaiting.slotKey, staleMap);
              currentAwaiting = null;
              awaitHandled = true;
            }
            break;
          }
          case "cancel": {
            currentAwaiting = null;
            currentIntent = null;
            currentWorkflow = null;
            const text = "취소했습니다. 다른 작업을 말씀해 주세요.";
            callbacks.onDelta?.(text);
            return buildTurnResponse({
              requestId, text, intent: null, workflow: null, facts,
              awaiting: null, decisionMode: "text", decisionReason: "사용자 취소 (AI)",
              decisionTrace: null, surfaceIntent: null, toolResults: [], factsPatch: {},
            });
          }
          case "correction": {
            facts = clearSlot(facts, currentAwaiting.slotKey);
            const staleMap = buildStaleMapForIntent(currentAwaiting.originIntentKey);
            facts = invalidateDependentSlots(facts, currentAwaiting.slotKey, staleMap);
            currentAwaiting = null;
            awaitHandled = true;
            break;
          }
          case "interrupt": {
            currentAwaiting = null;
            awaitHandled = true;
            break;
          }
          // "unclear" → fall through to rule-based
        }
      }
    }

    // --- Rule-based fallback ---
    if (!awaitHandled) {
      const awaitResult = resolveAwaiting(input, currentAwaiting, facts);

      if (awaitResult.resolved) {
        facts = awaitResult.facts;
        currentAwaiting = null;
      } else {
        facts = awaitResult.facts;

        switch (awaitResult.reason) {
          case "cancel": {
            currentAwaiting = null;
            currentIntent = null;
            currentWorkflow = null;
            const text = "취소했습니다. 다른 작업을 말씀해 주세요.";
            callbacks.onDelta?.(text);
            return buildTurnResponse({
              requestId, text, intent: null, workflow: null, facts,
              awaiting: null, decisionMode: "text", decisionReason: "사용자 취소",
              decisionTrace: null, surfaceIntent: null, toolResults: [], factsPatch: {},
            });
          }
          case "interrupt": {
            currentAwaiting = null;
            break;
          }
          case "correction": {
            currentAwaiting = null;
            break;
          }
          case "ambiguous":
          case "no_match": {
            const retryAwaiting = awaitResult.awaiting!;
            const text = retryAwaiting.prompt;
            callbacks.onDelta?.(text);
            return buildTurnResponse({
              requestId, text, intent: currentIntent, workflow: currentWorkflow, facts,
              awaiting: retryAwaiting, decisionMode: "ask_followup",
              decisionReason: awaitResult.reason === "ambiguous" ? "모호한 입력" : "일치하는 항목 없음",
              decisionTrace: null, surfaceIntent: null, toolResults: [], factsPatch: {},
            });
          }
          case "no_awaiting":
            break;
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Step 3: Resolve intent / workflow (AI-first, rule-based fallback)
  // -----------------------------------------------------------------------
  let aiSlots: Record<string, string> = {};

  if (isLlmAvailable() && !forceMock) {
    const aiResult = await resolveIntentWithAi(
      input,
      currentIntent?.intentKey ?? null,
      history,
    );

    if (aiResult && aiResult.confidence >= 0.5) {
      const isSwitch = currentIntent && currentIntent.intentKey !== aiResult.intentKey;

      currentIntent = {
        intentKey: aiResult.intentKey,
        confidence: aiResult.confidence,
        source: "llm",
        startedAt: isSwitch ? new Date().toISOString() : (currentIntent?.startedAt ?? new Date().toISOString()),
      };

      if (isSwitch) {
        currentAwaiting = null;
      }

      // Collect AI-extracted slots for merging after intent is set
      aiSlots = aiResult.slots ?? {};
    }
  }

  // Rule-based fallback if AI didn't resolve
  if (!currentIntent || currentIntent.source !== "llm") {
    const intentResult = resolveIntent(input, currentIntent, currentAwaiting, facts);
    currentIntent = intentResult.intent;
    facts = intentResult.facts;

    if (intentResult.isSwitch) {
      currentAwaiting = null;
    }
  }

  // Merge AI-extracted slots into facts
  for (const [slotKey, value] of Object.entries(aiSlots)) {
    if (value) {
      facts = setSlot(facts, slotKey, value, "user");
    }
  }

  // Update workflow based on intent
  const workflowDef = getWorkflowForIntent(currentIntent.intentKey);
  if (workflowDef) {
    if (!currentWorkflow || currentWorkflow.flowKey !== workflowDef.flowKey) {
      currentWorkflow = {
        flowKey: workflowDef.flowKey,
        stepKey: workflowDef.steps[0].stepKey,
        status: "collecting",
      };
    }
  } else {
    currentWorkflow = null;
  }

  // -----------------------------------------------------------------------
  // Steps 4-6: Tool planning + execution loop (max iterations)
  // -----------------------------------------------------------------------
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const planned = planTools(currentIntent.intentKey, facts);
    const deduped = deduplicateTools(planned, executedTools);

    if (deduped.length === 0) break;

    // Execute the first planned tool
    const plan = deduped[0];
    const toolDef = getTool(plan.toolName);
    if (!toolDef) break;

    callbacks.onToolStart?.(plan.toolName);

    const toolContext: Record<string, unknown> = {
      ...contextSnapshot,
      serviceName: getFilledSlots(facts)["deploy.serviceName"] ?? getFilledSlots(facts)["rollback.serviceName"],
    };

    const execResult = await executeTool(toolDef, facts, toolContext);
    const adapted = adaptToolResult(execResult.output);

    executedTools.push(plan.toolName);
    toolResults.push({ toolName: plan.toolName, summary: adapted.summary });

    // Merge facts patch
    facts = { ...facts, ...adapted.factsPatch };
    factsPatch = { ...factsPatch, ...adapted.factsPatch };

    // Merge slot patch
    if (Object.keys(adapted.slotPatch).length > 0) {
      facts = mergeSlotPatch(facts, adapted.slotPatch);
    }

    callbacks.onToolDone?.(plan.toolName, adapted.summary);
  }

  // -----------------------------------------------------------------------
  // Step 7: Evaluate decision
  // -----------------------------------------------------------------------
  const filledSlots = getFilledSlots(facts);
  const decision = evaluateDecision(currentIntent.intentKey, filledSlots, currentWorkflow);

  // Update workflow status based on decision
  if (currentWorkflow) {
    if (decision.trace.mode === "render_surface") {
      currentWorkflow = { ...currentWorkflow, status: "ready" };
    } else if (decision.trace.mode === "ask_followup") {
      currentWorkflow = { ...currentWorkflow, status: "collecting" };
    }
  }

  // -----------------------------------------------------------------------
  // Step 8: Build response
  // -----------------------------------------------------------------------
  let responseText: string;
  let responseAwaiting: ConversationAwaiting = null;

  if (decision.trace.mode === "ask_followup") {
    // Find the missing slot and build awaiting
    const missingSlot = getFirstMissingRequiredSlot(currentIntent.intentKey, filledSlots);
    if (missingSlot) {
      const awaitingOptions = buildAwaitingOptions(missingSlot.slotKey, facts);
      responseAwaiting = {
        kind: "slot",
        slotKey: missingSlot.slotKey,
        prompt: missingSlot.awaitingPrompt ?? `${missingSlot.label}을(를) 입력해 주세요.`,
        expectedInput: missingSlot.awaitingInput ?? "free_text",
        options: awaitingOptions,
        allowFreeform: true,
        retryCount: 0,
        originIntentKey: currentIntent.intentKey,
        originRequestId: requestId,
      };
      responseText = awaitingOptions.length > 0
        ? `${responseAwaiting.prompt}\n\n선택 가능: ${awaitingOptions.map((o) => o.label).join(", ")}`
        : responseAwaiting.prompt;
    } else {
      responseText = decision.trace.reason;
    }
  } else if (decision.trace.mode === "render_surface") {
    responseText = "필요한 정보가 모두 준비되었습니다.";
    // Enrich with tool summaries
    if (toolResults.length > 0) {
      const summaries = toolResults.map((t) => t.summary).join("\n");
      responseText = `${summaries}\n\n${responseText}`;
    }
  } else {
    // text mode
    if (toolResults.length > 0) {
      responseText = toolResults.map((t) => t.summary).join("\n");
    } else {
      responseText = await callLlmOrFallback(
        contextSnapshot,
        history,
        input,
        null,
        callbacks,
        forceMock,
      );
    }
  }

  // Try LLM for natural language polish if available and not a simple follow-up
  if (decision.trace.mode === "text" && toolResults.length > 0) {
    const llmText = await callLlmOrFallback(
      contextSnapshot,
      history,
      input,
      toolResults.map((t) => t.summary).join("\n"),
      callbacks,
      forceMock,
    );
    if (llmText !== responseText) {
      responseText = llmText;
    }
  }

  if (!callbacks.onDelta) {
    // no streaming — just return
  } else if (decision.trace.mode !== "text" || toolResults.length === 0) {
    callbacks.onDelta(responseText);
  }

  // Include slot facts in the factsPatch
  if (facts.slots && Object.keys(facts.slots).length > 0) {
    factsPatch = { ...factsPatch, slots: facts.slots };
  }

  return buildTurnResponse({
    requestId,
    text: responseText,
    intent: currentIntent,
    workflow: currentWorkflow,
    facts,
    awaiting: responseAwaiting,
    decisionMode: decision.trace.mode,
    decisionReason: decision.trace.reason,
    decisionTrace: decision.trace,
    surfaceIntent: decision.surfaceIntent,
    toolResults,
    factsPatch,
  });
}

// ---------------------------------------------------------------------------
// Awaiting option builders
// ---------------------------------------------------------------------------

function buildAwaitingOptions(
  slotKey: string,
  facts: ConversationFacts,
): Array<{ label: string; value: string; aliases?: string[] }> {
  if (slotKey === "deploy.serviceName") {
    const deployable = facts.deploy as Record<string, unknown> | undefined;
    const data = deployable?.deployableServices as { services?: string[] } | undefined;
    if (data?.services) {
      return data.services.map((s) => ({ label: s, value: s }));
    }
  }

  if (slotKey === "deploy.environment") {
    return [
      { label: "production", value: "production", aliases: ["프로덕션", "운영", "prod"] },
      { label: "staging", value: "staging", aliases: ["스테이징", "stg"] },
      { label: "development", value: "development", aliases: ["개발", "dev"] },
    ];
  }

  if (slotKey === "rollback.serviceName") {
    const rollbackData = facts.rollback as Record<string, unknown> | undefined;
    const candidates = rollbackData?.candidates as { candidates?: Array<{ service: string }> } | undefined;
    if (candidates?.candidates) {
      return candidates.candidates.map((c) => ({ label: c.service, value: c.service }));
    }
  }

  if (slotKey === "approval.requestId") {
    const approvalData = facts.approval as Record<string, unknown> | undefined;
    const queueItems = approvalData?.queueItems as Array<{ id: string; title?: string }> | undefined;
    if (queueItems) {
      return queueItems.map((item) => ({ label: item.title ?? item.id, value: item.id }));
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// LLM call (preserved from Phase 1)
// ---------------------------------------------------------------------------

function buildSystemPrompt(ctx: ContextSnapshot): string {
  return [
    "You are the embedded assistant inside an operations console for deploy, approval, and rollback workflows.",
    "Answer in concise Korean unless the user clearly asks for another language.",
    "Use only the provided console context and tool results. If a detail is not present, say that it is not shown in the current UI context.",
    "Do not invent IDs, statuses, or deployment evidence.",
    `Current workflow page: ${ctx.pageKey}.`,
  ].join("\n");
}

async function callLlmOrFallback(
  ctx: ContextSnapshot,
  history: AssistantTurnHistoryItem[],
  userInput: string,
  toolSummary: string | null,
  callbacks: OrchestrateTurnCallbacks,
  forceMockMode = false,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || forceMockMode) {
    // Mock AI path: pattern-matched responses + tool narration + typing simulation
    let mockText: string;
    if (toolSummary) {
      // Try to extract tool name from summary for better narration
      const toolHint = toolSummary.includes("배포") ? "getPreviousDeployments"
        : toolSummary.includes("승인") || toolSummary.includes("approval") ? "getApprovalQueueSummary"
        : toolSummary.includes("롤백") || toolSummary.includes("rollback") ? "getRollbackCandidates"
        : toolSummary.includes("컨텍스트") || toolSummary.includes("이미지") ? "getServiceDeployContext"
        : toolSummary.includes("서비스") ? "getDeployableServices"
        : "unknown";
      mockText = narrateToolResult(toolHint, toolSummary, ctx.pageKey);
    } else {
      mockText = findMockResponse(userInput, ctx.pageKey);
    }

    if (callbacks.onDelta) {
      await simulateStreaming(mockText, callbacks.onDelta);
    }
    return mockText;
  }

  const systemPrompt = buildSystemPrompt(ctx);
  const contextJson = JSON.stringify(
    { pageKey: ctx.pageKey, selectedEntity: ctx.selectedEntity, extra: ctx.extra },
    null,
    2,
  );

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
    { role: "system", content: `Current console context JSON:\n${contextJson}` },
  ];

  if (toolSummary) {
    messages.push({ role: "system", content: `Tool execution result:\n${toolSummary}` });
  }

  for (const h of history.slice(-8)) {
    messages.push({ role: h.role, content: h.content });
  }
  messages.push({ role: "user", content: userInput });

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        stream: true,
        messages,
      }),
    });

    if (!response.ok || !response.body) {
      return toolSummary ?? buildContextualSummary(ctx) ?? "현재 요청을 처리할 수 없습니다.";
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      buffer = buffer.replace(/\r/g, "");

      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const rawEvent = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);

        if (rawEvent) {
          const text = extractDeltaText(rawEvent);
          if (text) {
            fullText += text;
            callbacks.onDelta?.(text);
          }
        }

        boundary = buffer.indexOf("\n\n");
      }

      if (done) break;
    }

    return fullText || toolSummary || "현재 요청을 처리할 수 없습니다.";
  } catch {
    return toolSummary ?? buildContextualSummary(ctx) ?? "현재 요청을 처리할 수 없습니다.";
  }
}

function extractDeltaText(rawEvent: string): string {
  for (const line of rawEvent.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const value = line.slice(5).trimStart();
    if (!value || value === "[DONE]") continue;

    try {
      const parsed = JSON.parse(value) as {
        choices?: Array<{ delta?: { content?: string | Array<{ type?: string; text?: string }> } }>;
      };

      const content = parsed.choices?.[0]?.delta?.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .filter((c) => c.type === "text" && typeof c.text === "string")
          .map((c) => c.text)
          .join("");
      }
    } catch {
      // ignore parse errors
    }
  }
  return "";
}

function buildStaleMapForIntent(intentKey: string): Record<string, string[]> {
  const schema = getSlotSchema(intentKey as never);
  if (!schema) return {};
  const map: Record<string, string[]> = {};
  for (const slot of schema.slots) {
    if (slot.staleWhen) {
      map[slot.slotKey] = slot.staleWhen;
    }
  }
  return map;
}

function buildContextualSummary(ctx: ContextSnapshot): string | null {
  const entity = ctx.selectedEntity;
  if (!entity) {
    const pageLabels: Record<string, string> = {
      deploy: "배포",
      approve: "승인",
      rollback: "롤백",
    };
    const label = pageLabels[ctx.pageKey] ?? ctx.pageKey;
    return `현재 ${label} 페이지입니다. 항목을 선택하면 상세 정보를 안내해 드릴 수 있습니다.`;
  }

  const parts: string[] = [];

  if (ctx.pageKey === "deploy") {
    parts.push(`선택된 배포 요청: ${entity.requestId ?? entity.id}`);
    if (entity.service) parts.push(`서비스: ${entity.service}`);
    if (entity.environment) parts.push(`환경: ${entity.environment}`);
    if (entity.targetVersion) parts.push(`대상 버전: ${entity.targetVersion}`);
    if (entity.status) parts.push(`상태: ${entity.status}`);
    if (entity.impactSummary) parts.push(`영향 요약: ${entity.impactSummary}`);
  } else if (ctx.pageKey === "approve") {
    parts.push(`선택된 승인 요청: ${entity.title ?? entity.id}`);
    if (entity.type) parts.push(`유형: ${entity.type}`);
    if (entity.environment) parts.push(`환경: ${entity.environment}`);
    if (entity.riskSummary) parts.push(`리스크: ${entity.riskSummary}`);
    if (entity.status) parts.push(`상태: ${entity.status}`);
  } else if (ctx.pageKey === "rollback") {
    parts.push(`선택된 롤백 대상: ${entity.service ?? entity.id}`);
    if (entity.environment) parts.push(`환경: ${entity.environment}`);
    if (entity.currentVersion) parts.push(`현재 버전: ${entity.currentVersion}`);
    if (entity.severity) parts.push(`심각도: ${entity.severity}`);
    if (entity.incidentSummary) parts.push(`인시던트: ${entity.incidentSummary}`);
  }

  return parts.length > 0 ? parts.join("\n") : null;
}
