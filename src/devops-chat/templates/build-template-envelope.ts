/**
 * @deprecated Legacy template envelope builder.
 *
 * Phase 1에서는 이 파일을 직접 확장하지 않는다.
 * Phase 2에서 conversation facts 기반 template selector로 교체 예정.
 *
 * 교체 지점:
 * - buildDeployTemplate → facts.deploy + decision.mode === "render_surface"로 전환
 * - buildApprovalTemplate → facts.approval 기반 선택으로 전환
 * - buildRollbackTemplate → facts.rollback + rollback status 기반 선택으로 전환
 *
 * 현재는 view-model에서 selected item 기반으로 직접 호출되고 있으며,
 * conversation store의 activeSurface 필드가 이후 연결점이 된다.
 */
import {
  deployStatusMeta,
  rollbackStatusMeta,
} from "@/devops-chat/lib/status";
import type { ApprovalItem, DeployItem, RollbackDeployment, RollbackItem } from "@/devops-chat/types/domain";
import type { TemplateEnvelope } from "@/devops-chat/types/templates";

export function getDefaultTemplateIdForDeploy() {
  return "quick_deploy_launchpad" as const;
}

export function getDefaultTemplateIdForApproval() {
  return "deployment_approval_inbox" as const;
}

export function getDefaultTemplateIdForRollback(item: RollbackItem, deployment?: RollbackDeployment | null) {
  const activeDeployment =
    deployment ??
    item.deploymentHistory.find((candidate) => candidate.id === item.recommendedRollbackDeploymentId) ??
    item.deploymentHistory[0];

  if (!activeDeployment) {
    return "rollback_summary" as const;
  }

  if (activeDeployment.status === "dry_run_running" || activeDeployment.status === "dry_run_completed") {
    return "dry_run_stepper" as const;
  }

  if (activeDeployment.status === "confirm_ready" || activeDeployment.status === "executed") {
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
    imageDetail: {
      repository: item.service,
      imageTag: item.targetVersion,
      imageUri: item.artifact,
      gitRef: "",
      commitSha: "",
      imageDigest: "",
      buildStatus: "push_verified",
      pushedAt: item.requestedAt,
    },
    requestDetail: {
      selectedImageId: item.selectedImageId,
      selectedImageUri: item.artifact,
      service: item.service,
      environment: item.environment,
      cpu: item.cpu,
      memory: item.memory,
      containerPort: item.containerPort,
      desiredCount: item.desiredCount,
      minimumHealthyPercent: item.minimumHealthyPercent,
      maximumPercent: item.maximumPercent,
      deploymentStrategy: item.strategy,
      healthCheckPath: item.healthCheckPath,
      healthCheckGracePeriod: item.healthCheckGracePeriod,
      rollbackBaseline: item.rollbackBaseline,
      requestedBy: item.requestedBy,
      executionProfile: item.executionProfile,
      operatorNote: item.operatorNote,
    },
  };
}

export function buildApprovalTemplate(item: ApprovalItem): TemplateEnvelope {
  const state = item.status === "held" ? "hold" : item.status;
  const requestTypeLabel =
    item.type === "temporary_access"
      ? "Temporary Access"
      : item.type === "config_change"
        ? "Config Change"
        : "Data Operation";
  const title =
    item.type === "temporary_access"
      ? item.detail.principal
      : item.type === "config_change"
        ? item.detail.service
        : item.detail.operationType;
  const keyFacts =
    item.type === "temporary_access"
      ? [
          { label: "Principal", value: item.detail.principal, mono: true },
          { label: "Resource", value: item.detail.resource, mono: true },
          { label: "Scope", value: item.detail.scope, mono: true },
          { label: "Duration", value: item.detail.duration, mono: true },
        ]
      : item.type === "config_change"
        ? [
            { label: "Service", value: item.detail.service, mono: true },
            { label: "Target config", value: item.detail.targetConfig, mono: true },
            { label: "Current", value: item.detail.currentValue, mono: true },
            { label: "Proposed", value: item.detail.proposedValue, mono: true },
          ]
        : [
            { label: "Operation", value: item.detail.operationType, mono: true },
            { label: "Target", value: item.detail.target, mono: true },
            { label: "Window", value: item.detail.executionWindow, mono: true },
            { label: "Records", value: item.detail.recordCount, mono: true },
          ];
  const decisionGuidance =
    item.type === "temporary_access"
      ? `expires ${item.detail.expiresAt}`
      : item.type === "config_change"
        ? item.detail.rollbackMethod
        : item.detail.recoveryMethod;

  return {
    templateId: "deployment_approval_inbox",
    state,
    requestId: item.id,
    requestTypeLabel,
    title,
    environment: item.environment,
    riskSummary: item.riskSummary,
    verificationSummary: item.verificationSummary,
    impactScope: item.impactScope,
    decisionGuidance,
    checks: item.verificationChecks,
    keyFacts,
    primaryActionLabel: item.status === "approved" ? "승인됨" : "승인",
    secondaryActionLabel: item.status === "held" ? "보류됨" : "보류",
  };
}

export function buildRollbackTemplate(
  item: RollbackItem,
  deployment?: RollbackDeployment | null,
  templateId?: TemplateEnvelope["templateId"],
): TemplateEnvelope {
  const activeDeployment =
    deployment ??
    item.deploymentHistory.find((candidate) => candidate.id === item.recommendedRollbackDeploymentId) ??
    item.deploymentHistory[0];

  if (!activeDeployment) {
    return {
      templateId: "rollback_summary",
      state: "identified",
      service: item.service,
      environment: item.environment,
      incident: item.incidentSummary,
      currentVersion: item.currentVersion,
      recommendedVersion: item.recommendedRollbackVersion,
      evidence: [],
      blastRadius: item.blastRadius,
      primaryActionLabel: "Dry run 시작",
      secondaryActionLabel: "영향 범위 보기",
    };
  }

  const activeTemplateId = templateId ?? getDefaultTemplateIdForRollback(item, activeDeployment);

  if (activeTemplateId === "dry_run_stepper") {
    return {
      templateId: "dry_run_stepper",
      state:
        activeDeployment.status === "dry_run_running"
          ? "running"
          : activeDeployment.status === "dry_run_completed" ||
              activeDeployment.status === "confirm_ready" ||
              activeDeployment.status === "executed"
            ? "completed"
            : "not_started",
      service: item.service,
      environment: item.environment,
      targetVersion: activeDeployment.version,
      steps: activeDeployment.dryRunChecks,
      helperText: rollbackStatusMeta[activeDeployment.status].label,
      primaryActionLabel:
        activeDeployment.status === "dry_run_running"
          ? "Dry run 완료"
          : activeDeployment.status === "dry_run_completed"
            ? "최종 확인 열기"
            : "Dry run 시작",
      secondaryActionLabel: "요약 보기",
    };
  }

  if (activeTemplateId === "confirm_action") {
    return {
      templateId: "confirm_action",
      state: activeDeployment.status === "executed" ? "executed" : "confirm_ready",
      service: item.service,
      environment: item.environment,
      targetVersion: activeDeployment.version,
      warning: `${item.severity} severity incident · ${item.blastRadius}`,
      checklist: activeDeployment.confirmChecklist,
      primaryActionLabel: activeDeployment.status === "executed" ? "실행 완료" : "Rollback 확정",
      secondaryActionLabel: "요약 보기",
    };
  }

  return {
    templateId: "rollback_summary",
    state: activeDeployment.status === "identified" ? "identified" : "dry_run_ready",
    service: item.service,
    environment: item.environment,
    incident: item.incidentSummary,
    currentVersion: item.currentVersion,
    recommendedVersion: activeDeployment.version,
    evidence: activeDeployment.evidence,
    blastRadius: item.blastRadius,
    primaryActionLabel: "Dry run 시작",
    secondaryActionLabel:
      activeDeployment.status === "dry_run_completed" || activeDeployment.status === "confirm_ready"
        ? "최종 확인"
        : "영향 범위 보기",
  };
}
