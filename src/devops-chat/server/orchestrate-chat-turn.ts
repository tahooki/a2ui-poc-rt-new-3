import type { ConversationFacts } from "@/devops-chat/types/conversation";
import type {
  AssistantTurnHistoryItem,
  AssistantTurnResponse,
  ContextSnapshot,
} from "@/devops-chat/types/assistant-response";
import { resolveToolForInput } from "./tools/tool-registry";
import { executeTool } from "./tools/tool-executor";
import { adaptToolResult } from "./tools/tool-result-adapter";
import { ensureBuiltinToolsRegistered } from "./tools/register-builtin-tools";

export type OrchestrateTurnInput = {
  requestId: string;
  conversationId: string;
  input: string;
  history: AssistantTurnHistoryItem[];
  contextSnapshot: ContextSnapshot;
  facts: ConversationFacts;
};

export type OrchestrateTurnCallbacks = {
  onDelta?: (text: string) => void;
  onToolStart?: (toolName: string) => void;
  onToolDone?: (toolName: string, summary: string) => void;
};

/**
 * Build the system prompt for the LLM call.
 */
function buildSystemPrompt(ctx: ContextSnapshot): string {
  return [
    "You are the embedded assistant inside an operations console for deploy, approval, and rollback workflows.",
    "Answer in concise Korean unless the user clearly asks for another language.",
    "Use only the provided console context and tool results. If a detail is not present, say that it is not shown in the current UI context.",
    "Do not invent IDs, statuses, or deployment evidence.",
    `Current workflow page: ${ctx.pageKey}.`,
  ].join("\n");
}

/**
 * Try to call OpenAI for a natural language response.
 * Returns null if the API key is missing or the call fails.
 */
async function callLlm(
  systemPrompt: string,
  contextJson: string,
  history: AssistantTurnHistoryItem[],
  userInput: string,
  toolSummary: string | null,
  callbacks: OrchestrateTurnCallbacks,
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt },
    { role: "system", content: `Current console context JSON:\n${contextJson}` },
  ];

  if (toolSummary) {
    messages.push({
      role: "system",
      content: `Tool execution result:\n${toolSummary}`,
    });
  }

  const trimmedHistory = history.slice(-8);
  for (const h of trimmedHistory) {
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

    if (!response.ok || !response.body) return null;

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

    return fullText || null;
  } catch {
    return null;
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
      // ignore parse errors for individual lines
    }
  }

  return "";
}

/**
 * Determine if user input suggests they need a follow-up question.
 */
function needsFollowUp(input: string, ctx: ContextSnapshot): boolean {
  const vague = /^(도움|help|뭐|무엇|어떻게)\s*$/i.test(input.trim());
  return vague && !ctx.selectedEntity;
}

/**
 * Deterministic contextual summarizer.
 * Generates a text summary from the context snapshot when no tool matches
 * and no LLM is available — ensures the assistant always has something to say.
 */
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

/**
 * Main orchestration entry point.
 * Resolves tools, executes them, optionally calls LLM, and returns a structured turn response.
 */
export async function orchestrateChatTurn(
  turnInput: OrchestrateTurnInput,
  callbacks: OrchestrateTurnCallbacks = {},
): Promise<AssistantTurnResponse> {
  ensureBuiltinToolsRegistered();

  const { requestId, input, history, contextSnapshot, facts } = turnInput;

  // Check for follow-up needed
  if (needsFollowUp(input, contextSnapshot)) {
    const text = contextSnapshot.selectedEntity
      ? "어떤 작업을 도와드릴까요?"
      : "먼저 항목을 선택하거나, 구체적인 질문을 입력해 주세요.";

    callbacks.onDelta?.(text);

    return {
      requestId,
      message: { role: "assistant", text },
      surface: null,
      awaiting: { kind: "free_text", prompt: text },
      pendingTool: null,
      decision: { mode: "ask_followup" },
    };
  }

  // Resolve tool
  const tool = resolveToolForInput(input, facts);
  let toolSummary: string | null = null;
  let factsPatch: Partial<ConversationFacts> | undefined;
  const toolResults: Array<{ toolName: string; summary: string }> = [];

  if (tool) {
    callbacks.onToolStart?.(tool.name);

    const result = await executeTool(tool, facts, contextSnapshot as unknown as Record<string, unknown>);
    const adapted = adaptToolResult(result.output);

    toolSummary = adapted.summary;
    factsPatch = adapted.factsPatch;
    toolResults.push({ toolName: tool.name, summary: adapted.summary });

    callbacks.onToolDone?.(tool.name, adapted.summary);
  }

  // Build context JSON for LLM
  const contextJson = JSON.stringify(
    { pageKey: contextSnapshot.pageKey, selectedEntity: contextSnapshot.selectedEntity, extra: contextSnapshot.extra },
    null,
    2,
  );

  // Try LLM call
  const systemPrompt = buildSystemPrompt(contextSnapshot);
  const llmText = await callLlm(systemPrompt, contextJson, history, input, toolSummary, callbacks);

  // Fallback chain: LLM → tool summary → contextual summary → generic message
  const contextualFallback = !llmText && !toolSummary
    ? buildContextualSummary(contextSnapshot)
    : null;

  const finalText = llmText
    ?? toolSummary
    ?? contextualFallback
    ?? "현재 요청을 처리할 수 없습니다. 잠시 후 다시 시도해 주세요.";

  // If no LLM was used, emit the fallback text as delta
  if (!llmText && (toolSummary || contextualFallback)) {
    callbacks.onDelta?.(toolSummary ?? contextualFallback!);
  }

  return {
    requestId,
    message: { role: "assistant", text: finalText },
    surface: null,
    awaiting: null,
    pendingTool: null,
    decision: { mode: "text" },
    toolResults: toolResults.length > 0 ? toolResults : undefined,
    factsPatch,
  };
}
