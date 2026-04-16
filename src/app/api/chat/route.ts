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
  // For the initial Python-agent chat smoke test we keep A2UI rendering disabled
  // unless explicitly enabled, because MCP template IDs use the @a2ui/ui renderer
  // while the existing console chat renderer still uses the legacy template map.
  if (process.env.PYTHON_AGENT_ENABLE_SURFACES !== "true") return null;
  if (!surface || typeof surface !== "object") return null;

  const templateId = surface.templateId;
  if (typeof templateId !== "string") return null;

  return {
    templateId,
    payload: (surface.payload as Record<string, unknown> | undefined) ?? {},
    sourceIntent: (surface.sourceIntent as string | undefined) ?? templateId,
    updatedAt: (surface.updatedAt as string | undefined) ?? new Date().toISOString(),
  };
}

async function runPythonAgentTurn(
  body: AssistantTurnRequest,
  input: string,
  fallbackRequestId: string,
): Promise<AssistantTurnResponse> {
  const baseUrl = process.env.PYTHON_AGENT_URL ?? "http://localhost:8000";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: body.conversationId ?? "default",
      input,
      context: {
        contextSnapshot: body.contextSnapshot,
        history: body.history ?? [],
        facts: body.facts ?? {},
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Python agent returned ${response.status}`);
  }

  const pythonResult = await response.json() as PythonChatResponse;
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
        const result = process.env.ASSISTANT_BACKEND === "python"
          ? await runPythonAgentTurn(body, input, requestId)
          : await orchestrateChatTurn(
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

        if (process.env.ASSISTANT_BACKEND === "python") {
          controller.enqueue(encoder.encode(createSseEvent("delta", { text: result.message.text })));
        }

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
