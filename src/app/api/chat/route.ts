import type {
  AssistantTurnRequest,
  AssistantTurnResponse,
} from "@/devops-chat/types/assistant-response";
import { orchestrateChatTurn } from "@/devops-chat/server/orchestrate-chat-turn";
import type {
  ConversationDecision,
  ConversationIntentState,
  IntentKey,
  SurfaceEnvelope,
} from "@/devops-chat/types/conversation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createSseEvent(event: string, data: Record<string, unknown>) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

type PythonChatResponse = {
  request_id?: string;
  text?: string;
  surface?: Record<string, unknown> | null;
  intent?: string | null;
  decision_mode?: string | null;
  decision_reason?: string | null;
  tool_results?: Array<{ tool_name?: string; summary?: string }>;
};

type ParsedSseEvent = {
  event: string;
  data: string;
};

type A2UITemplateSummary = {
  templateId: string;
  title?: string;
  status?: string;
};

const VALID_INTENTS = new Set<IntentKey>([
  "deploy.start",
  "deploy.history.lookup",
  "approval.review",
  "approval.status.check",
  "rollback.start",
  "rollback.status.check",
  "general.qna",
]);

function normalizeIntent(intent: string | null | undefined): ConversationIntentState | null {
  if (!intent) return null;
  const normalized = intent === "general" ? "general.qna" : intent;
  const intentKey = VALID_INTENTS.has(normalized as IntentKey)
    ? normalized as IntentKey
    : "general.qna";

  return {
    intentKey,
    confidence: intentKey === "general.qna" ? 0.3 : 0.8,
    source: "rule",
    startedAt: new Date().toISOString(),
  };
}

function normalizeDecisionMode(mode: string | null | undefined): ConversationDecision["mode"] {
  if (mode === "render_surface" || mode === "ask_followup") return mode;
  return "text";
}

function normalizeSurface(surface: PythonChatResponse["surface"]): SurfaceEnvelope | null {
  if (process.env.PYTHON_AGENT_ENABLE_SURFACES === "false") return null;
  if (!surface || typeof surface !== "object") return null;

  const templateId = surface.templateId;
  if (typeof templateId !== "string") return null;

  return {
    templateId,
    version: (surface.version as string | undefined) ?? "1.0.0",
    payload: (surface.payload as Record<string, unknown> | undefined) ?? {},
    actions: (surface.actions as Array<Record<string, unknown>> | undefined) ?? [],
    sourceIntent: (surface.sourceIntent as string | undefined) ?? templateId,
    updatedAt: (surface.updatedAt as string | undefined) ?? new Date().toISOString(),
    meta: (surface.meta as Record<string, unknown> | undefined) ?? {},
  };
}

function parseSseEvent(rawEvent: string): ParsedSseEvent {
  const lines = rawEvent.split("\n");
  let event = "message";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  return { event, data: dataLines.join("\n") };
}

function getA2UIMcpUrl(): string {
  return process.env.A2UI_MCP_URL ?? "http://localhost:3100/mcp";
}

function normalizeMatchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "");
}

function findMentionedTemplate(input: string, templates: A2UITemplateSummary[]): A2UITemplateSummary | null {
  const normalizedInput = normalizeMatchText(input);
  const exactMatch = templates.find((template) => {
    const id = template.templateId;
    const title = template.title ?? "";
    return (
      input.includes(id) ||
      (!!title && input.includes(title)) ||
      normalizedInput.includes(normalizeMatchText(id)) ||
      (!!title && normalizedInput.includes(normalizeMatchText(title)))
    );
  });

  if (exactMatch) return exactMatch;

  const asksForRecentTemplate = /등록했던|방금|최근|테스트\s*컴포넌트|smoke/i.test(input);
  if (!asksForRecentTemplate) return null;

  const newestFirst = [...templates].reverse();
  return newestFirst.find((template) => /smoke|test/i.test(`${template.templateId} ${template.title ?? ""}`))
    ?? newestFirst.find((template) => template.status === "draft")
    ?? null;
}

async function tryResolveExplicitA2UITemplate(input: string): Promise<SurfaceEnvelope | null> {
  const { A2UIMcpClient } = await import("@a2ui/agent-node");
  const client = new A2UIMcpClient({ serverUrl: getA2UIMcpUrl() });

  try {
    await client.connect();
    const summaries = await client.callTool("a2ui.listTemplates", {});
    const templates = Array.isArray(summaries)
      ? summaries as A2UITemplateSummary[]
      : [];
    const template = findMentionedTemplate(input, templates);

    if (!template) return null;

    const envelope = await client.callTool("a2ui.resolveTemplateData", {
      templateId: template.templateId,
      context: {
        intentKey: `${template.templateId}.start`,
      },
    });

    if (envelope.error || typeof envelope.templateId !== "string") return null;

    return {
      templateId: envelope.templateId,
      version: (envelope.version as string | undefined) ?? "1.0.0",
      payload: (envelope.payload as Record<string, unknown> | undefined) ?? {},
      actions: (envelope.actions as Array<Record<string, unknown>> | undefined) ?? [],
      sourceIntent: (envelope.sourceIntent as string | undefined) ?? `${template.templateId}.start`,
      updatedAt: (envelope.updatedAt as string | undefined) ?? new Date().toISOString(),
      freshnessKey: envelope.freshnessKey as string | undefined,
      meta: (envelope.meta as Record<string, unknown> | undefined) ?? {},
    };
  } catch {
    return null;
  } finally {
    await client.disconnect().catch(() => {});
  }
}

function buildExplicitTemplateResult(
  requestId: string,
  surface: SurfaceEnvelope,
): AssistantTurnResponse {
  const catalogTemplateId =
    typeof surface.meta?.catalogTemplateId === "string"
      ? surface.meta.catalogTemplateId
      : surface.templateId;

  return {
    requestId,
    message: {
      role: "assistant",
      text: `${catalogTemplateId} 템플릿을 catalog에서 resolve했습니다.`,
    },
    surface,
    intent: null,
    workflow: null,
    awaiting: null,
    pendingTool: null,
    decision: {
      mode: "render_surface",
      reason: "사용자가 Admin catalog template을 직접 지정했습니다.",
    },
    decisionTrace: null,
    surfaceIntent: {
      family: "a2ui.catalog",
      intentKey: surface.sourceIntent,
      readiness: "ready",
    },
    factsPatch: {},
  };
}

function createPythonAgentPayload(body: AssistantTurnRequest, input: string) {
  return {
    conversation_id: body.conversationId ?? "default",
    input,
    context: {
      contextSnapshot: body.contextSnapshot,
      history: body.history ?? [],
      facts: body.facts ?? {},
    },
  };
}

function buildPythonAssistantResult(
  pythonResult: PythonChatResponse,
  fallbackRequestId: string,
): AssistantTurnResponse {
  const text = pythonResult.text?.trim() || "Python agent returned an empty response.";
  const mode = normalizeDecisionMode(pythonResult.decision_mode);

  return {
    requestId: pythonResult.request_id ?? fallbackRequestId,
    message: { role: "assistant", text },
    surface: normalizeSurface(pythonResult.surface),
    intent: normalizeIntent(pythonResult.intent),
    workflow: null,
    awaiting: null,
    pendingTool: null,
    decision: {
      mode,
      reason: pythonResult.decision_reason ?? undefined,
    },
    decisionTrace: null,
    surfaceIntent: null,
    toolResults: pythonResult.tool_results?.map((tool) => ({
      toolName: tool.tool_name ?? "python-agent",
      summary: tool.summary ?? "",
    })),
    factsPatch: {},
  };
}

async function streamPythonAgentTurn(
  body: AssistantTurnRequest,
  input: string,
  fallbackRequestId: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
): Promise<void> {
  const baseUrl = process.env.PYTHON_AGENT_URL ?? "http://localhost:8000";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(createPythonAgentPayload(body, input)),
  });

  if (!response.ok) {
    throw new Error(`Python agent returned ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Python agent streaming response body is not available.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let surface: Record<string, unknown> | null = null;
  let intent: string | null = null;
  let decisionMode: string | null = null;
  let resultSent = false;

  function sendResult() {
    if (resultSent) return;
    resultSent = true;

    const result = buildPythonAssistantResult(
      {
        request_id: fallbackRequestId,
        text,
        surface,
        intent,
        decision_mode: decisionMode,
      },
      fallbackRequestId,
    );

    if (result.surface) {
      controller.enqueue(encoder.encode(createSseEvent("surface", result.surface)));
    }
    controller.enqueue(encoder.encode(createSseEvent("result", result)));
    controller.enqueue(encoder.encode(createSseEvent("done", {})));
  }

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      buffer = buffer.replace(/\r/g, "");

      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const rawEvent = buffer.slice(0, boundary).trim();
        buffer = buffer.slice(boundary + 2);

        if (rawEvent) {
          const parsed = parseSseEvent(rawEvent);
          const data = parsed.data ? JSON.parse(parsed.data) as Record<string, unknown> : {};

          if (parsed.event === "text") {
            const chunk = typeof data.chunk === "string" ? data.chunk : "";
            if (chunk) {
              text += chunk;
              controller.enqueue(encoder.encode(createSseEvent("delta", { text: chunk })));
            }
          } else if (parsed.event === "surface") {
            surface = data;
          } else if (parsed.event === "state") {
            if (typeof data.intent === "string") intent = data.intent;
            if (typeof data.decision_mode === "string") decisionMode = data.decision_mode;
          } else if (parsed.event === "done") {
            sendResult();
          } else if (parsed.event === "error") {
            const message = typeof data.message === "string" ? data.message : "Python agent stream failed.";
            throw new Error(message);
          }
        }

        boundary = buffer.indexOf("\n\n");
      }

      if (done) break;
    }

    sendResult();
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  const body = (await request.json()) as AssistantTurnRequest;
  const input = body.input?.trim();

  if (!input) {
    return Response.json({ error: "Input is required." }, { status: 400 });
  }

  const requestId = crypto.randomUUID();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (process.env.ASSISTANT_BACKEND === "python") {
          await streamPythonAgentTurn(body, input, requestId, controller, encoder);
          controller.close();
          return;
        }

        const explicitSurface = await tryResolveExplicitA2UITemplate(input);
        if (explicitSurface) {
          const result = buildExplicitTemplateResult(requestId, explicitSurface);
          controller.enqueue(encoder.encode(createSseEvent("delta", { text: result.message.text })));
          controller.enqueue(encoder.encode(createSseEvent("surface", explicitSurface)));
          controller.enqueue(encoder.encode(createSseEvent("result", result)));
          controller.enqueue(encoder.encode(createSseEvent("done", {})));
          controller.close();
          return;
        }

        const result = await orchestrateChatTurn(
              {
                requestId,
                conversationId: body.conversationId,
                input,
                history: body.history ?? [],
                contextSnapshot: body.contextSnapshot,
                facts: body.facts ?? {},
                intent: body.intent ?? null,
                workflow: body.workflow ?? null,
                awaiting: body.awaiting ?? null,
                useAi: (body as Record<string, unknown>).useAi as boolean | undefined,
              },
              {
                onDelta(text) {
                  controller.enqueue(encoder.encode(createSseEvent("delta", { text })));
                },
                onToolStart(toolName) {
                  controller.enqueue(
                    encoder.encode(createSseEvent("tool", { toolName, status: "running" })),
                  );
                },
                onToolDone(toolName, summary) {
                  controller.enqueue(
                    encoder.encode(createSseEvent("tool", { toolName, status: "done", summary })),
                  );
                },
              },
            );

        // Stream surface envelope separately if present
        if (result.surface) {
          controller.enqueue(encoder.encode(createSseEvent("surface", result.surface)));
        }

        controller.enqueue(encoder.encode(createSseEvent("result", result)));
        controller.enqueue(encoder.encode(createSseEvent("done", {})));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Orchestration failed.";
        controller.enqueue(encoder.encode(createSseEvent("error", { message })));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}
