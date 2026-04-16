/**
 * Decision Engine — admin template catalog 기반 판단
 *
 * intent + facts를 평가하여 render_surface / ask_followup / text_only 중 하나를 결정
 */

import { getTemplateIntentRegistration } from "../catalog/template-catalog.js";

export type DecisionMode = "render_surface" | "ask_followup" | "text_only";

export type DecisionResult = {
  mode: DecisionMode;
  templateId?: string;
  reason: string;
  missingFacts?: string[];
};

type FactsMap = Record<string, unknown>;

export function evaluateDecision(
  intentKey: string,
  facts: FactsMap,
): DecisionResult {
  const registration = getTemplateIntentRegistration(intentKey);

  if (!registration) {
    return {
      mode: "text_only",
      reason: `No A2UI rule for intent: ${intentKey}`,
    };
  }

  const missing = registration.intent.requiredFacts.filter((f) => !facts[f]);

  if (missing.length > 0) {
    return {
      mode: "ask_followup",
      reason: `Missing required facts: ${missing.join(", ")}`,
      missingFacts: missing,
    };
  }

  return {
    mode: "render_surface",
    templateId: registration.template.templateId,
    reason: `All required facts present for ${registration.template.templateId}`,
  };
}
