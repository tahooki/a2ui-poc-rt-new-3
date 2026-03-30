/**
 * Binder: rollback_target_list (multi-instance)
 *
 * Shows deployment instances for the selected service, with per-instance rollback buttons.
 */

import type { ConversationFacts, BindingResult } from "@/devops-chat/types/conversation";
import type { RollbackTargetListTemplateData, RollbackTargetItem, IncidentAlert } from "@/devops-chat/types/templates";
import { getSlotValue } from "@/devops-chat/server/orchestration/slot-memory";
import { ROLLBACK_ACTION_IDS, type SurfaceActionDescriptor } from "@/devops-chat/actions/action-types";

function buildTargetActions(deploymentId: string, eligible: boolean): SurfaceActionDescriptor[] {
  if (!eligible) return [];
  return [
    {
      actionId: ROLLBACK_ACTION_IDS.SELECT_TARGET,
      label: "이 버전으로 롤백",
      variant: "primary",
      targetRef: { entityType: "rollback_deployment", entityId: deploymentId },
    },
  ];
}

export function bindRollbackTargetList(
  facts: ConversationFacts,
  intentKey: string,
): BindingResult {
  const usedFacts: string[] = [];
  const missingFacts: string[] = [];

  const serviceName = getSlotValue(facts, "rollback.serviceName") as string | undefined;
  if (serviceName) usedFacts.push("rollback.serviceName");
  else missingFacts.push("rollback.serviceName");

  const candidates = getSlotValue(facts, "rollback.candidates") as Array<Record<string, unknown>> | undefined;
  if (candidates && candidates.length > 0) usedFacts.push("rollback.candidates");
  else missingFacts.push("rollback.candidates");

  if (missingFacts.length > 0) {
    return { ok: false, reason: `missing: ${missingFacts.join(", ")}`, missingFacts };
  }

  // Find the service's candidate entry
  const serviceCandidate = candidates!.find(
    (c) => (c.service as string)?.toLowerCase() === serviceName!.toLowerCase(),
  );

  if (!serviceCandidate) {
    return { ok: false, reason: `service ${serviceName} not found in candidates`, missingFacts: ["rollback.candidates"] };
  }

  const eligibleVersions = (serviceCandidate.eligibleVersions as Array<Record<string, unknown>>) ?? [];
  const rollbackData = facts.rollback ?? {};
  const recommendedId = (serviceCandidate.recommendedRollbackDeploymentId as string)
    ?? (rollbackData.recommendedRollbackDeploymentId as string)
    ?? null;

  const targets: RollbackTargetItem[] = eligibleVersions.map((ev) => {
    const id = (ev.id as string) ?? "unknown";
    const isRecommended = id === recommendedId;
    return {
      id,
      version: (ev.version as string) ?? "unknown",
      deployedAt: (ev.deployedAt as string) ?? "",
      strategy: (ev.strategy as string) ?? "unknown",
      status: (ev.status as string) ?? "identified",
      rollbackRisk: (ev.rollbackRisk as string) ?? "unknown",
      rollbackEligible: true,
      whyThisTarget: (ev.whyThisTarget as string) ?? "",
      evidence: (ev.evidence as string[]) ?? [],
      isRecommended,
      actions: buildTargetActions(id, true),
    };
  });

  // Build incident alert from serviceHealth if available
  const serviceHealthList = (facts.rollback?.serviceHealth as Array<Record<string, unknown>>) ?? [];
  const healthEntry = serviceHealthList.find(
    (h) => (h.service as string)?.toLowerCase() === serviceName!.toLowerCase(),
  );

  const incidentAlert: IncidentAlert | undefined = healthEntry
    ? {
        status: (healthEntry.status as IncidentAlert["status"]) ?? "warning",
        incidentId: ((healthEntry.activeIncident as Record<string, unknown>)?.id as string) ?? "",
        incidentTitle: ((healthEntry.activeIncident as Record<string, unknown>)?.title as string) ?? "",
        severity: ((healthEntry.activeIncident as Record<string, unknown>)?.severity as string) ?? (serviceCandidate.severity as string) ?? "high",
        errorRate: (healthEntry.errorRate as string) ?? "",
        normalErrorRate: (healthEntry.normalErrorRate as string) ?? "",
        p99Latency: (healthEntry.p99Latency as string) ?? "",
        normalP99Latency: (healthEntry.normalP99Latency as string) ?? "",
        lastDeployedAt: (healthEntry.lastDeployedAt as string) ?? "",
        instancesHealthy: ((healthEntry.instances as Record<string, number>)?.healthy as number) ?? 0,
        instancesTotal: ((healthEntry.instances as Record<string, number>)?.total as number) ?? 0,
      }
    : undefined;

  const payload: RollbackTargetListTemplateData = {
    templateId: "rollback_target_list",
    state: "active",
    service: serviceName!,
    environment: (serviceCandidate.environment as string) ?? "production",
    currentVersion: (serviceCandidate.currentVersion as string) ?? "unknown",
    incidentSummary: (serviceCandidate.incidentSummary as string) ?? "",
    severity: (serviceCandidate.severity as string) ?? "high",
    incidentAlert,
    targets,
    recommendedTargetId: recommendedId,
    primaryActionLabel: "추천 버전으로 롤백",
    secondaryActionLabel: "서비스 다시 선택",
  };

  return {
    ok: true,
    surface: {
      templateId: "rollback_target_list",
      payload: payload as unknown as Record<string, unknown>,
      sourceIntent: intentKey,
      updatedAt: new Date().toISOString(),
      freshnessKey: `rollback-targets:${serviceName}:${targets.length}`,
      bindingTrace: { usedFacts, missingFacts },
    },
  };
}
