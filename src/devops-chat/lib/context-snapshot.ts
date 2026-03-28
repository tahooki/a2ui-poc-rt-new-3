import type { PageKey, ApprovalItem, DeployItem, RollbackItem } from "@/devops-chat/types/domain";
import type { ContextSnapshot } from "@/devops-chat/types/assistant-response";

/**
 * Build a minimal context snapshot for the assistant from the current page state.
 * Includes only what the assistant needs for judgment — not the entire runtime.
 */

export function buildDeploySnapshot(
  selectedItem: DeployItem | null,
): ContextSnapshot {
  if (!selectedItem) {
    return { pageKey: "deploy", selectedEntity: null };
  }

  return {
    pageKey: "deploy",
    selectedEntity: {
      id: selectedItem.id,
      requestId: selectedItem.requestId,
      service: selectedItem.service,
      environment: selectedItem.environment,
      targetVersion: selectedItem.targetVersion,
      recommendedVersion: selectedItem.recommendedVersion,
      strategy: selectedItem.strategy,
      status: selectedItem.status,
      impactSummary: selectedItem.impactSummary,
      requestedBy: selectedItem.requestedBy,
    },
  };
}

export function buildApproveSnapshot(
  selectedItem: ApprovalItem | null,
  activeTab?: string,
): ContextSnapshot {
  if (!selectedItem) {
    return {
      pageKey: "approve",
      selectedEntity: null,
      extra: activeTab ? { activeTab } : undefined,
    };
  }

  return {
    pageKey: "approve",
    selectedEntity: {
      id: selectedItem.id,
      type: selectedItem.type,
      title: selectedItem.title,
      environment: selectedItem.environment,
      requestedBy: selectedItem.requestedBy,
      riskSummary: selectedItem.riskSummary,
      riskTone: selectedItem.riskTone,
      status: selectedItem.status,
      verificationSummary: selectedItem.verificationSummary,
      impactScope: selectedItem.impactScope,
    },
    extra: activeTab ? { activeTab } : undefined,
  };
}

export function buildRollbackSnapshot(
  selectedItem: RollbackItem | null,
  activeDeploymentId?: string | null,
): ContextSnapshot {
  if (!selectedItem) {
    return { pageKey: "rollback", selectedEntity: null };
  }

  const activeDeployment = activeDeploymentId
    ? selectedItem.deploymentHistory.find((d) => d.id === activeDeploymentId)
    : null;

  return {
    pageKey: "rollback",
    selectedEntity: {
      id: selectedItem.id,
      service: selectedItem.service,
      environment: selectedItem.environment,
      currentVersion: selectedItem.currentVersion,
      incidentSummary: selectedItem.incidentSummary,
      severity: selectedItem.severity,
      recommendedRollbackVersion: selectedItem.recommendedRollbackVersion,
      latestStatus: selectedItem.latestStatus,
    },
    extra: activeDeployment
      ? {
          activeDeployment: {
            id: activeDeployment.id,
            version: activeDeployment.version,
            status: activeDeployment.status,
            rollbackRisk: activeDeployment.rollbackRisk,
          },
        }
      : undefined,
  };
}

export function buildContextSnapshot(
  pageKey: PageKey,
  selectedItem: DeployItem | ApprovalItem | RollbackItem | null,
  extra?: Record<string, unknown>,
): ContextSnapshot {
  switch (pageKey) {
    case "deploy":
      return buildDeploySnapshot(selectedItem as DeployItem | null);
    case "approve":
      return buildApproveSnapshot(
        selectedItem as ApprovalItem | null,
        extra?.activeTab as string | undefined,
      );
    case "rollback":
      return buildRollbackSnapshot(
        selectedItem as RollbackItem | null,
        extra?.activeDeploymentId as string | null | undefined,
      );
  }
}
