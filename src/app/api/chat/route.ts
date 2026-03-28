import type { AssistantTurnRequest } from "@/devops-chat/types/assistant-response";
import { orchestrateChatTurn } from "@/devops-chat/server/orchestrate-chat-turn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createSseEvent(event: string, data: Record<string, unknown>) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
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
