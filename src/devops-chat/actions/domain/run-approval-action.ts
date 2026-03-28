/**
 * Approval domain command adapter.
 */

import type { ActionExecutionContext, ActionExecutionResult } from "../action-types";
import { APPROVAL_ACTION_IDS } from "../action-types";

export function runApprovalAction(context: ActionExecutionContext): ActionExecutionResult {
  const { actionId, targetRef } = context;
  const requestId = targetRef?.entityId ?? "unknown";
  const now = new Date().toISOString();

  switch (actionId) {
    case APPROVAL_ACTION_IDS.APPROVE:
      return {
        ok: true,
        actionId,
        outcome: "succeeded",
        summary: `요청 ${requestId}을 승인했습니다.`,
        userFacingMessage: `요청 ${requestId}이 승인되었습니다.`,
        factsPatch: { approval: { status: "approved", approvedAt: now } },
        activityEvent: {
          kind: "action",
          status: "succeeded",
          title: `요청 ${requestId} 승인`,
          timestamp: now,
        },
      };

    case APPROVAL_ACTION_IDS.HOLD:
      return {
        ok: true,
        actionId,
        outcome: "succeeded",
        summary: `요청 ${requestId}을 보류했습니다.`,
        userFacingMessage: `요청 ${requestId}이 보류되었습니다.`,
        factsPatch: { approval: { status: "held", heldAt: now } },
        activityEvent: {
          kind: "action",
          status: "succeeded",
          title: `요청 ${requestId} 보류`,
          timestamp: now,
        },
      };

    default:
      return {
        ok: false,
        actionId,
        outcome: "rejected",
        summary: `Unknown approval action: ${actionId}`,
      };
  }
}
