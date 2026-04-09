/**
 * Decision Engine — 규칙 기반 판단
 *
 * intent + facts를 평가하여 render_surface / ask_followup / text_only 중 하나를 결정
 */

export type DecisionMode = "render_surface" | "ask_followup" | "text_only";

export type DecisionResult = {
  mode: DecisionMode;
  templateId?: string;
  reason: string;
  missingFacts?: string[];
};

type FactsMap = Record<string, unknown>;

// Intent → 필요한 facts + 매칭 템플릿
const INTENT_RULES: Record<string, {
  templateId: string;
  requiredFacts: string[];
  optionalFacts?: string[];
}> = {
  "deploy.start": {
    templateId: "deploy_launchpad",
    requiredFacts: ["serviceName"],
    optionalFacts: ["environment", "targetVersion"],
  },
  "approval.review": {
    templateId: "approval_queue_inbox",
    requiredFacts: [],
  },
  "rollback.start": {
    templateId: "rollback_summary",
    requiredFacts: ["serviceName"],
  },
};

export function evaluateDecision(
  intentKey: string,
  facts: FactsMap,
): DecisionResult {
  const rule = INTENT_RULES[intentKey];

  if (!rule) {
    return {
      mode: "text_only",
      reason: `No A2UI rule for intent: ${intentKey}`,
    };
  }

  const missing = rule.requiredFacts.filter((f) => !facts[f]);

  if (missing.length > 0) {
    return {
      mode: "ask_followup",
      reason: `Missing required facts: ${missing.join(", ")}`,
      missingFacts: missing,
    };
  }

  return {
    mode: "render_surface",
    templateId: rule.templateId,
    reason: `All required facts present for ${rule.templateId}`,
  };
}
