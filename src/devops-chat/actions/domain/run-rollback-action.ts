/**
 * Rollback domain command adapter.
 */

import type { ActionExecutionContext, ActionExecutionResult } from "../action-types";
import { ROLLBACK_ACTION_IDS } from "../action-types";

export function runRollbackAction(context: ActionExecutionContext): ActionExecutionResult {
  const { actionId, targetRef } = context;
  const serviceName = targetRef?.entityId ?? "unknown";
  const now = new Date().toISOString();

  switch (actionId) {
    case ROLLBACK_ACTION_IDS.SELECT_TARGET: {
      const deploymentId = targetRef?.entityId ?? "unknown";
      return {
        ok: true,
        actionId,
        outcome: "succeeded",
        summary: `배포 인스턴스 ${deploymentId}을 롤백 대상으로 선택했습니다.`,
        userFacingMessage: `${deploymentId}을 롤백 대상으로 선택했습니다. 요약을 확인해 주세요.`,
        factsPatch: {
          rollback: {
            selectedTargetId: deploymentId,
            context: { targetId: deploymentId },
          },
        },
        activityEvent: {
          kind: "action",
          status: "succeeded",
          title: `롤백 대상 선택: ${deploymentId}`,
          timestamp: now,
        },
      };
    }

    case ROLLBACK_ACTION_IDS.START_DRY_RUN:
      return {
        ok: true,
        actionId,
        outcome: "succeeded",
        summary: `${serviceName} dry run을 시작했습니다.`,
        userFacingMessage: `${serviceName}의 dry run이 시작되었습니다.`,
        factsPatch: { rollback: { status: "dry_run_running", dryRunStartedAt: now } },
        activityEvent: {
          kind: "action",
          status: "succeeded",
          title: `${serviceName} dry run 시작`,
          timestamp: now,
        },
      };

    case ROLLBACK_ACTION_IDS.COMPLETE_DRY_RUN:
      return {
        ok: true,
        actionId,
        outcome: "succeeded",
        summary: `${serviceName} dry run을 완료했습니다.`,
        userFacingMessage: `${serviceName}의 dry run이 완료되었습니다.`,
        factsPatch: { rollback: { status: "dry_run_completed", dryRunCompletedAt: now } },
        activityEvent: {
          kind: "action",
          status: "succeeded",
          title: `${serviceName} dry run 완료`,
          timestamp: now,
        },
      };

    case ROLLBACK_ACTION_IDS.OPEN_CONFIRM:
      return {
        ok: true,
        actionId,
        outcome: "succeeded",
        summary: `${serviceName} 최종 확인 단계로 이동합니다.`,
        userFacingMessage: `최종 확인 단계로 이동합니다.`,
        factsPatch: { rollback: { status: "confirm_ready" } },
        activityEvent: {
          kind: "action",
          status: "succeeded",
          title: `${serviceName} 최종 확인 열기`,
          timestamp: now,
        },
      };

    case ROLLBACK_ACTION_IDS.CONFIRM:
      return {
        ok: true,
        actionId,
        outcome: "succeeded",
        summary: `${serviceName} rollback을 확정했습니다.`,
        userFacingMessage: `${serviceName}의 rollback이 확정되었습니다.`,
        factsPatch: { rollback: { status: "executed", confirmedAt: now } },
        activityEvent: {
          kind: "action",
          status: "succeeded",
          title: `${serviceName} rollback 확정`,
          timestamp: now,
        },
      };

    case ROLLBACK_ACTION_IDS.BACK_TO_SUMMARY:
      return {
        ok: true,
        actionId,
        outcome: "succeeded",
        summary: `요약 화면으로 돌아갑니다.`,
        userFacingMessage: `요약 화면으로 돌아갑니다.`,
        activityEvent: {
          kind: "action",
          status: "succeeded",
          title: "요약 보기",
          timestamp: now,
        },
      };

    default:
      return {
        ok: false,
        actionId,
        outcome: "rejected",
        summary: `Unknown rollback action: ${actionId}`,
      };
  }
}
