/**
 * Action dispatcher: executes an action through the registry.
 */

import type { ActionExecutionContext, ActionExecutionResult } from "./action-types";
import { lookupAction } from "./action-registry";

export async function dispatchAction(
  context: ActionExecutionContext,
): Promise<ActionExecutionResult> {
  const definition = lookupAction(context.actionId);

  if (!definition) {
    return {
      ok: false,
      actionId: context.actionId,
      outcome: "rejected",
      summary: `Unknown action: ${context.actionId}`,
      userFacingMessage: `알 수 없는 액션입니다: ${context.actionId}`,
    };
  }

  try {
    const result = await definition.handler(context);
    return result;
  } catch (error) {
    return {
      ok: false,
      actionId: context.actionId,
      outcome: "failed",
      summary: `Action failed: ${error instanceof Error ? error.message : "unknown error"}`,
      userFacingMessage: "액션 실행 중 오류가 발생했습니다.",
      activityEvent: {
        kind: "action",
        status: "failed",
        title: `${context.actionId} 실패`,
        detail: error instanceof Error ? error.message : undefined,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
