/**
 * Deploy domain command adapter.
 */

import type { ActionExecutionContext, ActionExecutionResult } from "../action-types";
import { DEPLOY_ACTION_IDS } from "../action-types";

export function runDeployAction(context: ActionExecutionContext): ActionExecutionResult {
  const { actionId, targetRef } = context;
  const serviceName = targetRef?.entityId ?? "unknown";
  const now = new Date().toISOString();

  switch (actionId) {
    case DEPLOY_ACTION_IDS.START:
      return {
        ok: true,
        actionId,
        outcome: "succeeded",
        summary: `${serviceName} 배포를 시작했습니다.`,
        userFacingMessage: `${serviceName} 서비스의 배포가 시작되었습니다.`,
        factsPatch: { deploy: { status: "deploying", startedAt: now } },
        activityEvent: {
          kind: "action",
          status: "succeeded",
          title: `${serviceName} 배포 시작`,
          timestamp: now,
        },
      };

    case DEPLOY_ACTION_IDS.COMPLETE:
      return {
        ok: true,
        actionId,
        outcome: "succeeded",
        summary: `${serviceName} 배포를 완료했습니다.`,
        userFacingMessage: `${serviceName} 서비스의 배포가 완료되었습니다.`,
        factsPatch: { deploy: { status: "succeeded", completedAt: now } },
        activityEvent: {
          kind: "action",
          status: "succeeded",
          title: `${serviceName} 배포 완료`,
          timestamp: now,
        },
      };

    case DEPLOY_ACTION_IDS.REFRESH_DRAFT:
      return {
        ok: true,
        actionId,
        outcome: "succeeded",
        summary: `배포 초안을 새로 고쳤습니다.`,
        userFacingMessage: `배포 초안이 갱신되었습니다.`,
        activityEvent: {
          kind: "action",
          status: "succeeded",
          title: "배포 초안 새로고침",
          timestamp: now,
        },
      };

    default:
      return {
        ok: false,
        actionId,
        outcome: "rejected",
        summary: `Unknown deploy action: ${actionId}`,
      };
  }
}
