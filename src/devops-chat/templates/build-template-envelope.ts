import {
  deployStatusMeta,
  rollbackStatusMeta,
} from "@/devops-chat/lib/status";
import type { ApprovalItem, DeployItem, RollbackItem } from "@/devops-chat/types/domain";
import type { TemplateEnvelope } from "@/devops-chat/types/templates";

export function getDefaultTemplateIdForDeploy() {
  return "quick_deploy_launchpad" as const;
}

export function getDefaultTemplateIdForApproval() {
  return "deployment_approval_inbox" as const;
}

export function getDefaultTemplateIdForRollback(item: RollbackItem) {
  if (item.status === "dry_run_running" || item.status === "dry_run_completed") {
    return "dry_run_stepper" as const;
  }

  if (item.status === "confirm_ready" || item.status === "executed") {
    return "confirm_action" as const;
  }

  return "rollback_summary" as const;
}

export function buildDeployTemplate(item: DeployItem): TemplateEnvelope {
  const state =
    item.status === "deploying" || item.status === "verifying"
      ? "deploying"
      : item.status === "succeeded"
        ? "done"
        : "ready";

  return {
    templateId: "quick_deploy_launchpad",
    state,
    service: item.service,
    environment: item.environment,
    recommendedVersion: item.recommendedVersion,
    targetVersion: item.targetVersion,
    strategy: item.strategy,
    impactSummary: item.impactSummary,
    preflightChecks: item.preflightChecks,
    helperText: deployStatusMeta[item.status].label,
    primaryActionLabel:
      state === "ready" ? "배포 시작" : state === "deploying" ? "완료 반영" : "완료됨",
    secondaryActionLabel: state === "done" ? "새 초안 생성" : "초안 새로 고침",
  };
}

export function buildApprovalTemplate(item: ApprovalItem): TemplateEnvelope {
  const state = item.status === "held" ? "hold" : item.status;

  return {
    templateId: "deployment_approval_inbox",
    state,
    requestId: item.id,
    service: item.service,
    environment: item.environment,
    riskSummary: item.riskSummary,
    verificationSummary: item.verificationSummary,
    impactScope: item.impactScope,
    rollbackAvailability: item.rollbackAvailability,
    checks: item.verificationChecks,
    primaryActionLabel: item.status === "approved" ? "승인됨" : "승인",
    secondaryActionLabel: item.status === "held" ? "보류됨" : "보류",
  };
}

export function buildRollbackTemplate(item: RollbackItem, templateId?: TemplateEnvelope["templateId"]): TemplateEnvelope {
  const activeTemplateId = templateId ?? getDefaultTemplateIdForRollback(item);

  if (activeTemplateId === "dry_run_stepper") {
    return {
      templateId: "dry_run_stepper",
      state:
        item.status === "dry_run_running"
          ? "running"
          : item.status === "dry_run_completed" || item.status === "confirm_ready" || item.status === "executed"
            ? "completed"
            : "not_started",
      service: item.service,
      environment: item.environment,
      targetVersion: item.lastStableVersion,
      steps: item.dryRunChecks,
      helperText: rollbackStatusMeta[item.status].label,
      primaryActionLabel:
        item.status === "dry_run_running" ? "Dry run 완료" : item.status === "dry_run_completed" ? "최종 확인 열기" : "Dry run 시작",
      secondaryActionLabel: "요약 보기",
    };
  }

  if (activeTemplateId === "confirm_action") {
    return {
      templateId: "confirm_action",
      state: item.status === "executed" ? "executed" : "confirm_ready",
      service: item.service,
      environment: item.environment,
      targetVersion: item.lastStableVersion,
      warning: `${item.severity} severity incident · ${item.blastRadius}`,
      checklist: item.confirmChecklist,
      primaryActionLabel: item.status === "executed" ? "실행 완료" : "Rollback 확정",
      secondaryActionLabel: "요약 보기",
    };
  }

  return {
    templateId: "rollback_summary",
    state: item.status === "identified" ? "identified" : "dry_run_ready",
    service: item.service,
    environment: item.environment,
    incident: item.incident,
    currentVersion: item.currentVersion,
    recommendedVersion: item.lastStableVersion,
    evidence: item.evidence,
    blastRadius: item.blastRadius,
    primaryActionLabel: "Dry run 시작",
    secondaryActionLabel: item.status === "dry_run_completed" || item.status === "confirm_ready" ? "최종 확인" : "영향 범위 보기",
  };
}
