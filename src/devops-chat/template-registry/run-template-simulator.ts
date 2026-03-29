/**
 * Decision simulator: runs the runtime decision engine + template selector
 * against a user-supplied conversation facts JSON.
 *
 * Reuses the actual runtime path so results are identical to production.
 */

import type { ConversationFacts, IntentKey, TemplateCandidateScore } from "@/devops-chat/types/conversation";
import { evaluateDecision } from "@/devops-chat/server/decision/decision-engine";
import { selectTemplate, type TemplateSelectionResult } from "@/devops-chat/templates/template-selector";
import { getFilledSlots } from "@/devops-chat/server/orchestration/slot-memory";

export type SimulatorInput = {
  intentKey: string;
  facts: ConversationFacts;
};

export type SimulatorResult = {
  decisionMode: "text" | "ask_followup" | "render_surface";
  decisionReason: string;
  decisionMatched: string[];
  decisionMissing: string[];
  selectedTemplateId: string | null;
  selectionCandidates: TemplateCandidateScore[];
};

export function runTemplateSimulator(input: SimulatorInput): SimulatorResult {
  // Step 1: Run decision engine (convert facts to filledSlots flat map)
  const filledSlots = getFilledSlots(input.facts);
  const decisionResult = evaluateDecision(
    input.intentKey as IntentKey,
    filledSlots,
    null, // workflow
  );

  // Step 2: Run template selector
  const selectionResult: TemplateSelectionResult = selectTemplate({
    intentKey: input.intentKey,
    workflow: null,
    facts: input.facts,
    surfaceIntent: decisionResult.surfaceIntent,
    lastDecisionTrace: decisionResult.trace,
  });

  return {
    decisionMode: decisionResult.trace.mode,
    decisionReason: decisionResult.trace.reason,
    decisionMatched: decisionResult.trace.matched,
    decisionMissing: decisionResult.trace.missing,
    selectedTemplateId: selectionResult.selected?.templateId ?? null,
    selectionCandidates: selectionResult.candidates,
  };
}
