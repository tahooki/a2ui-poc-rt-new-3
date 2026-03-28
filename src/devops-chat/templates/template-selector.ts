/**
 * Template selector: picks the best template based on conversation facts.
 *
 * Input: intent, workflow, facts, surfaceIntent, lastDecisionTrace.
 * Output: best candidate templateId + selection trace.
 */

import type {
  ConversationFacts,
  ConversationWorkflowState,
  DecisionTrace,
  SurfaceIntentCandidate,
  TemplateCandidateScore,
} from "@/devops-chat/types/conversation";
import { getSlotValue } from "@/devops-chat/server/orchestration/slot-memory";
import { TEMPLATE_DEFINITIONS, type TemplateDefinition } from "./template-definitions";

export type TemplateSelectionInput = {
  intentKey: string;
  workflow: ConversationWorkflowState | null;
  facts: ConversationFacts;
  surfaceIntent: SurfaceIntentCandidate | null;
  lastDecisionTrace: DecisionTrace | null;
};

export type TemplateSelectionResult = {
  selected: TemplateCandidateScore | null;
  candidates: TemplateCandidateScore[];
};

/**
 * Score a single template definition against the current conversation state.
 */
function scoreCandidate(
  def: TemplateDefinition,
  input: TemplateSelectionInput,
): TemplateCandidateScore {
  const matched: string[] = [];
  const missing: string[] = [];
  const disqualified: string[] = [];

  // Intent match
  const intentMatch = def.intentKeys.includes(input.intentKey);
  if (!intentMatch) {
    disqualified.push(`intent mismatch: ${input.intentKey} not in [${def.intentKeys.join(",")}]`);
  }

  // Family match with surfaceIntent
  const familyMatch = input.surfaceIntent?.family === def.family;
  if (familyMatch) {
    matched.push(`family: ${def.family}`);
  }

  // Required facts check
  for (const factKey of def.requiredFacts) {
    const value = getSlotValue(input.facts, factKey);
    if (value !== undefined && value !== null) {
      matched.push(factKey);
    } else {
      missing.push(factKey);
    }
  }

  const eligible = intentMatch && missing.length === 0 && disqualified.length === 0;

  // Score: base from matched facts, bonus for family match and surfaceIntent readiness
  let score = matched.length;
  if (familyMatch) score += 2;
  if (input.surfaceIntent?.readiness === "ready") score += 1;
  if (!eligible) score = -1;

  const reason = eligible
    ? `eligible: ${matched.length} facts matched, family=${familyMatch}`
    : disqualified.length > 0
      ? `disqualified: ${disqualified.join("; ")}`
      : `missing facts: ${missing.join(", ")}`;

  return {
    templateId: def.templateId,
    eligible,
    score,
    matched,
    missing,
    disqualified,
    reason,
  };
}

/**
 * Select the best template for the given conversation state.
 * Returns null if no eligible candidate exists.
 */
export function selectTemplate(input: TemplateSelectionInput): TemplateSelectionResult {
  // Only run if decision was render_surface
  const candidates = TEMPLATE_DEFINITIONS.map((def) => scoreCandidate(def, input));

  const eligible = candidates.filter((c) => c.eligible);

  // Tie-break: highest score wins, then prefer surfaceIntent family match
  eligible.sort((a, b) => b.score - a.score);

  return {
    selected: eligible[0] ?? null,
    candidates,
  };
}
