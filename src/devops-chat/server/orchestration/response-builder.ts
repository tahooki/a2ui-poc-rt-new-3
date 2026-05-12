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
import { tryRenderA2UISurface } from "@/devops-chat/server/a2ui-bridge";

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

/**
 * A2UI MCP 서버를 통한 surface 생성 시도.
 * MCP 서버 미실행 시 기존 binder fallback.
 */
async function tryBuildSurfaceWithA2UI(input: ResponseBuilderInput): Promise<SurfaceEnvelope | null> {
  if (input.decisionMode !== "render_surface") return null;
  if (!input.intent) return null;

  // 1차: A2UI MCP 서버로 시도
  try {
    const a2uiSurface = await tryRenderA2UISurface(input.intent, input.facts);
    if (a2uiSurface) return a2uiSurface;
  } catch {
    // MCP 실패 → 기존 binder fallback
  }

  // 2차: 기존 binder fallback
  return tryBuildSurface(input);
}

export async function buildTurnResponse(input: ResponseBuilderInput): Promise<AssistantTurnResponse> {
  const surface = await tryBuildSurfaceWithA2UI(input);

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
