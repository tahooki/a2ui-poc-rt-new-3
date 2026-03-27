import type { ApprovalItem, DeployItem, PageKey, RollbackItem } from "@/devops-chat/types/domain";
import type { AssistantChatHistoryItem } from "@/devops-chat/lib/chat-api";
import type { TemplateEnvelope } from "@/devops-chat/types/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatRequestBody = {
  pageKey: PageKey;
  prompt: string;
  templateId: TemplateEnvelope["templateId"] | null;
  selectedItem: DeployItem | ApprovalItem | RollbackItem | null;
  history?: AssistantChatHistoryItem[];
};

function buildSystemPrompt(pageKey: PageKey) {
  return [
    "You are the embedded assistant inside an operations console for deploy, approval, and rollback workflows.",
    "Answer in concise Korean unless the user clearly asks for another language.",
    "Use only the provided console context. If a detail is not present, say that it is not shown in the current UI context.",
    "Do not invent IDs, statuses, or deployment evidence.",
    `Current workflow page: ${pageKey}.`,
  ].join("\n");
}

function buildContextMessage(body: ChatRequestBody) {
  return [
    "Current console context JSON:",
    JSON.stringify(
      {
        pageKey: body.pageKey,
        templateId: body.templateId,
        selectedItem: body.selectedItem,
      },
      null,
      2,
    ),
  ].join("\n");
}

function extractErrorMessage(status: number, raw: string) {
  if (!raw) {
    return `OpenAI request failed with status ${status}.`;
  }

  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string } };
    return parsed.error?.message ?? raw;
  } catch {
    return raw;
  }
}

function parseOpenAiSsePayload(rawEvent: string) {
  const lines = rawEvent.split("\n");

  for (const line of lines) {
    if (!line.startsWith("data:")) {
      continue;
    }

    const value = line.slice(5).trimStart();
    if (!value) {
      continue;
    }

    if (value === "[DONE]") {
      return { done: true, text: "" };
    }

    const parsed = JSON.parse(value) as {
      choices?: Array<{
        delta?: {
          content?: string | Array<{ type?: string; text?: string }>;
        };
      }>;
    };

    const content = parsed.choices?.[0]?.delta?.content;
    if (typeof content === "string") {
      return { done: false, text: content };
    }

    if (Array.isArray(content)) {
      return {
        done: false,
        text: content
          .filter((item) => item.type === "text" && typeof item.text === "string")
          .map((item) => item.text)
          .join(""),
      };
    }
  }

  return { done: false, text: "" };
}

function createSseEvent(event: string, data: Record<string, string>) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function buildProxyStream(upstream: ReadableStream<Uint8Array>) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.getReader();
      let buffer = "";

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
              const parsed = parseOpenAiSsePayload(rawEvent);

              if (parsed.text) {
                controller.enqueue(encoder.encode(createSseEvent("delta", { text: parsed.text })));
              }

              if (parsed.done) {
                controller.enqueue(encoder.encode(createSseEvent("done", {})));
                controller.close();
                return;
              }
            }

            boundary = buffer.indexOf("\n\n");
          }

          if (done) {
            break;
          }
        }

        controller.enqueue(encoder.encode(createSseEvent("done", {})));
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Assistant stream proxy failed.";
        controller.enqueue(encoder.encode(createSseEvent("error", { message })));
        controller.close();
      }
    },
  });
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const body = (await request.json()) as ChatRequestBody;
  const prompt = body.prompt?.trim();

  if (!prompt) {
    return Response.json({ error: "Prompt is required." }, { status: 400 });
  }

  const history = (body.history ?? [])
    .filter((message) => message.content.trim())
    .slice(-8)
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));

  const upstreamResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      stream: true,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(body.pageKey),
        },
        {
          role: "system",
          content: buildContextMessage(body),
        },
        ...history,
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    const rawError = await upstreamResponse.text();
    return Response.json(
      {
        error: extractErrorMessage(upstreamResponse.status, rawError),
      },
      { status: upstreamResponse.status || 500 },
    );
  }

  return new Response(buildProxyStream(upstreamResponse.body), {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}
