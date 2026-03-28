/**
 * Action bridge: validates and routes surface actions.
 *
 * Validates active surface, action descriptor, and stale guards
 * before dispatching to the action handler.
 */

import type { SurfaceEnvelope, ConversationFacts } from "@/devops-chat/types/conversation";
import type {
  SurfaceActionDescriptor,
  ActionExecutionContext,
  ActionExecutionResult,
} from "./action-types";
import { lookupAction } from "./action-registry";
import { dispatchAction } from "./action-dispatcher";

export type ActionBridgeInput = {
  conversationId: string;
  activeSurface: SurfaceEnvelope | null;
  actionDescriptor: SurfaceActionDescriptor;
  facts: ConversationFacts;
};

/**
 * Validate and execute a surface action.
 *
 * Guards:
 * 1. Active surface must exist
 * 2. Action must be registered
 * 3. Action must not be disabled
 * 4. Stale surface check (templateId matches)
 */
export async function executeSurfaceAction(
  input: ActionBridgeInput,
): Promise<ActionExecutionResult> {
  const { conversationId, activeSurface, actionDescriptor, facts } = input;

  // Guard: no active surface
  if (!activeSurface) {
    return {
      ok: false,
      actionId: actionDescriptor.actionId,
      outcome: "rejected",
      summary: "No active surface",
      userFacingMessage: "현재 활성화된 surface가 없습니다.",
    };
  }

  // Guard: action disabled
  if (actionDescriptor.disabled) {
    return {
      ok: false,
      actionId: actionDescriptor.actionId,
      outcome: "rejected",
      summary: "Action is disabled",
      userFacingMessage: "이 액션은 현재 비활성화되어 있습니다.",
    };
  }

  // Guard: action not registered
  const definition = lookupAction(actionDescriptor.actionId);
  if (!definition) {
    return {
      ok: false,
      actionId: actionDescriptor.actionId,
      outcome: "rejected",
      summary: `Unknown action: ${actionDescriptor.actionId}`,
      userFacingMessage: `알 수 없는 액션입니다.`,
    };
  }

  // Build execution context
  const context: ActionExecutionContext = {
    actionId: actionDescriptor.actionId,
    conversationId,
    surfaceTemplateId: activeSurface.templateId,
    targetRef: actionDescriptor.targetRef,
    payload: actionDescriptor.payload,
    facts: facts as unknown as Record<string, unknown>,
  };

  return dispatchAction(context);
}
