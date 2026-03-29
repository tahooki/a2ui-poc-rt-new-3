/**
 * Approval domain command adapter.
 *
 * Handles both single-item actions (legacy) and queue-item actions.
 */

import type { ActionExecutionContext, ActionExecutionResult } from "../action-types";
import { APPROVAL_ACTION_IDS } from "../action-types";

export function runApprovalAction(context: ActionExecutionContext): ActionExecutionResult {
  const { actionId, targetRef } = context;
  const requestId = targetRef?.entityId ?? "unknown";
  const now = new Date().toISOString();

  switch (actionId) {
    // Legacy single-item actions
    case APPROVAL_ACTION_IDS.APPROVE:
    case APPROVAL_ACTION_IDS.APPROVE_ITEM:
      return {
        ok: true,
        actionId,
        outcome: "succeeded",
        summary: `요청 ${requestId}을 승인했습니다.`,
        userFacingMessage: `요청 ${requestId}이 승인되었습니다.`,
        factsPatch: {
          approval: {
            lastActionItemId: requestId,
            lastActionType: "approved",
            lastActionAt: now,
          },
        },
        activityEvent: {
          kind: "action",
          status: "succeeded",
          title: `요청 ${requestId} 승인`,
          timestamp: now,
        },
      };

    case APPROVAL_ACTION_IDS.HOLD:
    case APPROVAL_ACTION_IDS.HOLD_ITEM:
      return {
        ok: true,
        actionId,
        outcome: "succeeded",
        summary: `요청 ${requestId}을 보류했습니다.`,
        userFacingMessage: `요청 ${requestId}이 보류되었습니다.`,
        factsPatch: {
          approval: {
            lastActionItemId: requestId,
            lastActionType: "held",
            lastActionAt: now,
          },
        },
        activityEvent: {
          kind: "action",
          status: "succeeded",
          title: `요청 ${requestId} 보류`,
          timestamp: now,
        },
      };

    case APPROVAL_ACTION_IDS.APPROVE_ALL:
      return {
        ok: true,
        actionId,
        outcome: "succeeded",
        summary: "대기 중인 전체 요청을 승인했습니다.",
        userFacingMessage: "모든 대기 요청이 승인되었습니다.",
        factsPatch: {
          approval: {
            lastActionType: "approved_all",
            lastActionAt: now,
          },
        },
        activityEvent: {
          kind: "action",
          status: "succeeded",
          title: "전체 요청 일괄 승인",
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
