import type {
  ApprovalItem,
  AssistantMessageRole,
  DeployItem,
  PageKey,
  RollbackItem,
} from "@/devops-chat/types/domain";
import type { TemplateEnvelope } from "@/devops-chat/types/templates";

export type AssistantChatHistoryItem = {
  role: AssistantMessageRole;
  content: string;
};

export type AssistantChatRequest = {
  pageKey: PageKey;
  prompt: string;
  templateId: TemplateEnvelope["templateId"] | null;
  selectedItem: DeployItem | ApprovalItem | RollbackItem | null;
  history: AssistantChatHistoryItem[];
};

type AssistantChatStreamHandlers = {
  onDelta: (text: string) => void;
  onDone?: () => void;
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
  payload: AssistantChatRequest,
  handlers: AssistantChatStreamHandlers,
) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let message = "Assistant streaming request failed.";

    try {
      const errorPayload = (await response.json()) as { error?: string };
      message = errorPayload.error ?? message;
    } catch {
      // Ignore JSON parse failures and fall back to the default message.
    }

    throw new Error(message);
  }

  if (!response.body) {
    throw new Error("Streaming response body is not available.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

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

        if (parsed.event === "delta" && parsed.data) {
          const payloadData = JSON.parse(parsed.data) as { text?: string };
          if (payloadData.text) {
            handlers.onDelta(payloadData.text);
          }
        }

        if (parsed.event === "error" && parsed.data) {
          const payloadData = JSON.parse(parsed.data) as { message?: string };
          throw new Error(payloadData.message ?? "Assistant stream failed.");
        }

        if (parsed.event === "done") {
          handlers.onDone?.();
          return;
        }
      }

      boundary = buffer.indexOf("\n\n");
    }

    if (done) {
      break;
    }
  }

  handlers.onDone?.();
}
