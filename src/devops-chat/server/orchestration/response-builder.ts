import type {
  ConversationAwaiting,
  ConversationFacts,
  ConversationIntentState,
  ConversationWorkflowState,
  DecisionTrace,
  SurfaceEnvelope,
  SurfaceIntentCandidate,
} from "@/devops-chat/types/conversation";
import type { AssistantTurnResponse, ToolResultEntry } from "@/devops-chat/types/assistant-response";
import { selectTemplate } from "@/devops-chat/templates/template-selector";
import { getBinder } from "@/devops-chat/templates/binders";
import { validateSurfaceEnvelope } from "@/devops-chat/templates/validate-surface-envelope";

export type ResponseBuilderInput = {
  requestId: string;
  text: string;
  intent: ConversationIntentState | null;
  workflow: ConversationWorkflowState | null;
  facts: ConversationFacts;
  awaiting: ConversationAwaiting;
  decisionMode: "text" | "ask_followup" | "render_surface";
  decisionReason: string;
  decisionTrace: DecisionTrace | null;
  surfaceIntent: SurfaceIntentCandidate | null;
  toolResults: ToolResultEntry[];
  factsPatch: Partial<ConversationFacts>;
};

/**
 * Try to produce a validated surface envelope when decision is render_surface.
 * Returns null on selector miss, binding failure, or validation failure.
 */
function tryBuildSurface(input: ResponseBuilderInput): SurfaceEnvelope | null {
  if (input.decisionMode !== "render_surface") return null;
  if (!input.intent) return null;

  const selectionResult = selectTemplate({
    intentKey: input.intent.intentKey,
    workflow: input.workflow,
    facts: input.facts,
    surfaceIntent: input.surfaceIntent,
    lastDecisionTrace: input.decisionTrace,
  });

  if (!selectionResult.selected) return null;

  const binder = getBinder(selectionResult.selected.templateId);
  if (!binder) return null;

  const bindingResult = binder(input.facts, input.intent.intentKey);
  if (!bindingResult.ok) return null;

  const validation = validateSurfaceEnvelope(bindingResult.surface);
  if (!validation.valid) return null;

  return bindingResult.surface;
}

export function buildTurnResponse(input: ResponseBuilderInput): AssistantTurnResponse {
  const surface = tryBuildSurface(input);

  return {
    requestId: input.requestId,
    message: { role: "assistant", text: input.text },
    surface,
    intent: input.intent,
    workflow: input.workflow,
    awaiting: input.awaiting,
    pendingTool: null,
    decision: { mode: input.decisionMode, reason: input.decisionReason },
    decisionTrace: input.decisionTrace,
    surfaceIntent: input.surfaceIntent,
    toolResults: input.toolResults.length > 0 ? input.toolResults : undefined,
    factsPatch: Object.keys(input.factsPatch).length > 0 ? input.factsPatch : undefined,
  };
}
