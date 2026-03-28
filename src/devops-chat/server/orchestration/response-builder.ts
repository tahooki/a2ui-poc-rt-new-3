import type {
  ConversationAwaiting,
  ConversationFacts,
  ConversationIntentState,
  ConversationWorkflowState,
  DecisionTrace,
  SurfaceIntentCandidate,
} from "@/devops-chat/types/conversation";
import type { AssistantTurnResponse, ToolResultEntry } from "@/devops-chat/types/assistant-response";

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

export function buildTurnResponse(input: ResponseBuilderInput): AssistantTurnResponse {
  return {
    requestId: input.requestId,
    message: { role: "assistant", text: input.text },
    surface: null, // Phase 2: no actual surface rendering
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
