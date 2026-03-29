/**
 * AI-powered intent resolver + slot extractor.
 *
 * Uses LLM to:
 * 1. Classify intent from free-text input
 * 2. Extract multiple slots from a single sentence
 *
 * Falls back to rule-based resolver when LLM is unavailable.
 */

import type { IntentKey, ConversationFacts } from "@/devops-chat/types/conversation";
import { callLlmStructured, type LlmMessage } from "./llm-client";

export type AiIntentResult = {
  intentKey: IntentKey;
  confidence: number;
  slots: Record<string, string>;
  reasoning: string;
};

const SYSTEM_PROMPT = `You are an intent classifier and slot extractor for a DevOps operations console.

Given user input, classify the intent and extract any mentioned slots.

Available intents:
- "deploy.start": User wants to deploy a service (배포, deploy)
- "deploy.history.lookup": User asks about past deployments (이전 배포, 배포 이력, 마지막 배포)
- "approval.review": User wants to review/manage approval requests (승인, approve)
- "rollback.start": User wants to rollback a service (롤백, rollback)
- "general.qna": General question not related to specific workflow

Available slots to extract:
- "deploy.serviceName": Service name (e.g. "payments-api", "orders-api")
- "deploy.environment": Target environment (e.g. "production", "staging", "development")
- "deploy.targetVersion": Target version (e.g. "v1.2.3")
- "rollback.serviceName": Service name for rollback
- "approval.requestId": Approval request identifier

Rules:
- Only extract slots explicitly mentioned in the input
- Normalize environment names: "프로덕션"/"운영"/"prod" → "production", "스테이징"/"stg" → "staging", "개발"/"dev" → "development"
- Service names should be kept as-is (lowercase kebab-case)
- If intent is ambiguous, prefer the more specific one
- confidence: 0.0-1.0, higher means more certain

Respond in JSON format:
{
  "intentKey": "deploy.start",
  "confidence": 0.95,
  "slots": { "deploy.serviceName": "payments-api", "deploy.environment": "production" },
  "reasoning": "User explicitly asked to deploy payments-api to production"
}`;

export async function resolveIntentWithAi(
  input: string,
  currentIntentKey: string | null,
  history: Array<{ role: string; content: string }>,
): Promise<AiIntentResult | null> {
  const messages: LlmMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  // Add conversation context
  if (currentIntentKey) {
    messages.push({
      role: "system",
      content: `Current active intent: ${currentIntentKey}. If the user's input continues this intent, keep it. If they clearly switch to a different topic, change the intent.`,
    });
  }

  // Add recent history for context
  for (const h of history.slice(-4)) {
    messages.push({ role: h.role as "user" | "assistant", content: h.content });
  }

  messages.push({ role: "user", content: input });

  const result = await callLlmStructured<AiIntentResult>({
    messages,
    temperature: 0,
  });

  if (!result) return null;

  // Validate intentKey
  const validIntents: IntentKey[] = [
    "deploy.start",
    "deploy.history.lookup",
    "approval.review",
    "rollback.start",
    "general.qna",
  ];

  if (!validIntents.includes(result.intentKey as IntentKey)) {
    return null;
  }

  return result;
}
