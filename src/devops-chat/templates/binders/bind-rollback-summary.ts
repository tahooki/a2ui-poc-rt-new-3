/**
 * Binder: rollback_summary
 *
 * Assembles payload from conversation facts for the rollback summary template.
 */

import type { ConversationFacts, BindingResult } from "@/devops-chat/types/conversation";
import type { RollbackSummaryTemplateData } from "@/devops-chat/types/templates";
import { getSlotValue } from "@/devops-chat/server/orchestration/slot-memory";
import { ROLLBACK_ACTION_IDS, type SurfaceActionDescriptor } from "@/devops-chat/actions/action-types";

export function bindRollbackSummary(
  facts: ConversationFacts,
  intentKey: string,
): BindingResult {
  const usedFacts: string[] = [];
  const missingFacts: string[] = [];

  const serviceName = getSlotValue(facts, "rollback.serviceName") as string | undefined;
  if (serviceName) usedFacts.push("rollback.serviceName");
  else missingFacts.push("rollback.serviceName");

  if (missingFacts.length > 0) {
    return { ok: false, reason: `missing: ${missingFacts.join(", ")}`, missingFacts };
  }

  const rollbackData = facts.rollback ?? {};
  const context = getSlotValue(facts, "rollback.context") as Record<string, unknown> | undefined;
  if (context) usedFacts.push("rollback.context");

  const environment = (rollbackData.environment as string) ?? "production";
  const currentVersion = (rollbackData.currentVersion as string) ?? "unknown";
  const recommendedVersion = (rollbackData.recommendedVersion as string)
    ?? (context?.recommendedVersion as string)
    ?? "unknown";
  const incident = (rollbackData.incidentSummary as string) ?? "incident 정보 없음";
  const evidence = (context?.evidence as string[]) ?? [];
  const blastRadius = (rollbackData.blastRadius as string) ?? "unknown";

  const payload: RollbackSummaryTemplateData = {
    templateId: "rollback_summary",
    state: "identified",
    service: serviceName!,
    environment,
    incident,
    currentVersion,
    recommendedVersion,
    evidence,
    blastRadius,
    primaryActionLabel: "Dry run 시작",
    secondaryActionLabel: "영향 범위 보기",
    actions: [
      {
        actionId: ROLLBACK_ACTION_IDS.START_DRY_RUN,
        label: "Dry run 시작",
        variant: "primary",
        targetRef: { entityType: "rollback", entityId: serviceName! },
      },
      {
        actionId: ROLLBACK_ACTION_IDS.BACK_TO_SUMMARY,
        label: "영향 범위 보기",
        variant: "secondary",
      },
    ] satisfies SurfaceActionDescriptor[],
  };

  return {
    ok: true,
    surface: {
      templateId: "rollback_summary",
      payload: payload as unknown as Record<string, unknown>,
      sourceIntent: intentKey,
      updatedAt: new Date().toISOString(),
      freshnessKey: `rollback:${serviceName}:${environment}`,
      bindingTrace: { usedFacts, missingFacts },
    },
  };
}
