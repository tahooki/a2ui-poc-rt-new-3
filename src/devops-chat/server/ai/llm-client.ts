/**
 * LLM client utility for structured JSON output.
 *
 * Calls OpenAI-compatible API and parses the response as JSON.
 * Falls back gracefully when API key is not set.
 */

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmCallOptions = {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
};

/**
 * Returns true if LLM is available (API key set).
 */
export function isLlmAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Strip markdown code fences that some LLMs wrap around JSON output.
 * e.g. ```json\n{...}\n``` → {...}
 */
function stripMarkdownCodeFence(text: string): string {
  let s = text.trim();
  // ```json ... ``` or ``` ... ```
  const fenceMatch = s.match(/^```(?:json|JSON)?\s*\n?([\s\S]*?)\n?\s*```$/);
  if (fenceMatch) return fenceMatch[1].trim();
  return s;
}

/**
 * Call LLM and parse the response as JSON of type T.
 * Returns null if API key is not set or call fails.
 */
export async function callLlmStructured<T>(
  options: LlmCallOptions,
): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        messages: options.messages,
        temperature: options.temperature ?? 0,
        max_tokens: options.maxTokens ?? 1024,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(stripMarkdownCodeFence(content)) as T;
  } catch {
    return null;
  }
}
