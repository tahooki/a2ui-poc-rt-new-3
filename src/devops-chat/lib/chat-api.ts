import type {
  AssistantTurnHistoryItem,
  AssistantTurnRequest,
  AssistantTurnResponse,
  SseDeltaPayload,
  SseErrorPayload,
  SseToolPayload,
} from "@/devops-chat/types/assistant-response";
import type { ConversationFacts, ConversationId } from "@/devops-chat/types/conversation";
import type { ContextSnapshot } from "@/devops-chat/types/assistant-response";

/** Protocol-level error from the server (e.g. orchestration failure). */
export class ChatProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatProtocolError";
  }
}

export type ChatStreamHandlers = {
  onDelta: (text: string) => void;
  onTool?: (payload: SseToolPayload) => void;
  onResult?: (result: AssistantTurnResponse) => void;
  onError?: (message: string) => void;
  onDone?: () => void;
};

export type ChatStreamRequest = {
  conversationId: ConversationId;
  input: string;
  contextSnapshot: ContextSnapshot;
  history: AssistantTurnHistoryItem[];
  facts: ConversationFacts;
};

function parseSseEvent(rawEvent: string) {
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

  return {
    event,
    data: dataLines.join("\n"),
  };
}

export async function streamAssistantChat(
  payload: ChatStreamRequest,
  handlers: ChatStreamHandlers,
  signal?: AbortSignal,
): Promise<AssistantTurnResponse | null> {
  const requestBody: AssistantTurnRequest = {
    conversationId: payload.conversationId,
    input: payload.input,
    contextSnapshot: payload.contextSnapshot,
    history: payload.history,
    facts: payload.facts,
  };

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    let message = "Assistant streaming request failed.";
    try {
      const errorPayload = (await response.json()) as { error?: string };
      message = errorPayload.error ?? message;
    } catch {
      // fall back to default message
    }
    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("Streaming response body is not available.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let turnResult: AssistantTurnResponse | null = null;

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

          try {
            switch (parsed.event) {
              case "delta": {
                if (parsed.data) {
                  const p = JSON.parse(parsed.data) as SseDeltaPayload;
                  if (p.text) handlers.onDelta(p.text);
                }
                break;
              }

              case "tool": {
                if (parsed.data) {
                  const p = JSON.parse(parsed.data) as SseToolPayload;
                  handlers.onTool?.(p);
                }
                break;
              }

              case "result": {
                if (parsed.data) {
                  turnResult = JSON.parse(parsed.data) as AssistantTurnResponse;
                  handlers.onResult?.(turnResult);
                }
                break;
              }

              case "error": {
                if (parsed.data) {
                  const p = JSON.parse(parsed.data) as SseErrorPayload;
                  const msg = p.message ?? "Assistant stream failed.";
                  handlers.onError?.(msg);
                  throw new ChatProtocolError(msg);
                }
                break;
              }

              case "done": {
                handlers.onDone?.();
                return turnResult;
              }
            }
          } catch (parseError) {
            if (parseError instanceof ChatProtocolError) throw parseError;
            // SSE event parse failure — log and skip this event rather than crashing
            console.warn(`[chat-api] Failed to parse SSE event "${parsed.event}":`, parseError);
          }
        }

        boundary = buffer.indexOf("\n\n");
      }

      if (done) break;
    }
  } finally {
    reader.releaseLock();
  }

  handlers.onDone?.();
  return turnResult;
}

// ---------------------------------------------------------------------------
// Legacy compat — used by app-store.ts and chat-assistant-store.ts
// Will be removed once those stores are fully migrated to conversation-store.
// ---------------------------------------------------------------------------

import type {
  ApprovalItem,
  AssistantMessageRole,
  DeployItem,
  PageKey,
  RollbackItem,
} from "@/devops-chat/types/domain";
import type { TemplateEnvelope } from "@/devops-chat/types/templates";

/** @deprecated Use AssistantTurnHistoryItem */
export type AssistantChatHistoryItem = {
  role: AssistantMessageRole;
  content: string;
};

/** @deprecated Use ChatStreamRequest */
export type AssistantChatRequest = {
  pageKey: PageKey;
  prompt: string;
  templateId: TemplateEnvelope["templateId"] | null;
  selectedItem: DeployItem | ApprovalItem | RollbackItem | null;
  history: AssistantChatHistoryItem[];
};

type LegacyStreamHandlers = {
  onDelta: (text: string) => void;
  onDone?: () => void;
};

/**
 * @deprecated Legacy streaming function kept for app-store compat.
 * Wraps the new streamAssistantChat by converting old request shape.
 */
export async function legacyStreamAssistantChat(
  payload: AssistantChatRequest,
  handlers: LegacyStreamHandlers,
) {
  const request: ChatStreamRequest = {
    conversationId: `assistant:${payload.pageKey}`,
    input: payload.prompt,
    contextSnapshot: {
      pageKey: payload.pageKey,
      selectedEntity: payload.selectedItem as Record<string, unknown> | null,
    },
    history: payload.history.map((h) => ({ role: h.role, content: h.content })),
    facts: { pageKey: payload.pageKey },
  };

  await streamAssistantChat(request, {
    onDelta: handlers.onDelta,
    onDone: handlers.onDone,
  });
}
