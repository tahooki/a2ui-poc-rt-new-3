/**
 * AI-powered awaiting resolver.
 *
 * Uses LLM to interpret free-text responses when the assistant
 * is waiting for a specific slot value.
 *
 * Falls back to rule-based resolver when LLM is unavailable.
 */

import type { ConversationAwaiting } from "@/devops-chat/types/conversation";
import { callLlmStructured, type LlmMessage } from "./llm-client";

export type AiAwaitingResult = {
  action: "fill_slot" | "correction" | "cancel" | "interrupt" | "unclear";
  value?: string;
  reasoning: string;
  newIntentHint?: string;
};

function buildSystemPrompt(awaiting: NonNullable<ConversationAwaiting>): string {
  const options = awaiting.options?.map((o) => o.label).join(", ") ?? "없음";

  return `You are interpreting a user's response to a follow-up question in a DevOps console assistant.

The assistant asked: "${awaiting.prompt}"
Waiting for slot: ${awaiting.slotKey}
Expected input type: ${awaiting.expectedInput}
Available options: [${options}]

Classify the user's response:

1. "fill_slot" — The user is answering the question. Extract the value.
   - Match to available options if possible (case-insensitive, partial match OK)
   - For environment: normalize "프로덕션"/"운영"/"prod" → "production", "스테이징" → "staging", "개발"/"dev" → "development"
   - For confirmation: "네"/"응"/"맞아"/"yes" → "true", "아니"/"no" → "false"

2. "correction" — The user wants to change a previous answer (e.g. "아니 다른 걸로", "그거 말고")

3. "cancel" — The user wants to cancel the current flow (e.g. "취소", "그만", "됐어")

4. "interrupt" — The user is switching to a completely different topic (e.g. "이전 배포 알려줘", "롤백하고 싶어")
   - Set newIntentHint to the likely new intent

5. "unclear" — Cannot determine the user's intent from the input

Respond in JSON:
{
  "action": "fill_slot",
  "value": "payments-api",
  "reasoning": "User selected payments-api from the options"
}`;
}

export async function resolveAwaitingWithAi(
  input: string,
  awaiting: NonNullable<ConversationAwaiting>,
): Promise<AiAwaitingResult | null> {
  const messages: LlmMessage[] = [
    { role: "system", content: buildSystemPrompt(awaiting) },
    { role: "user", content: input },
  ];

  const result = await callLlmStructured<AiAwaitingResult>({
    messages,
    temperature: 0,
  });

  if (!result) return null;

  const validActions = ["fill_slot", "correction", "cancel", "interrupt", "unclear"];
  if (!validActions.includes(result.action)) return null;

  return result;
}
