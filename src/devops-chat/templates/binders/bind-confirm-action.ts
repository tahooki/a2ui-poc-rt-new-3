/**
 * Binder: confirm_action
 *
 * Assembles payload from conversation facts for the confirm action template.
 */

import type { ConversationFacts, BindingResult } from "@/devops-chat/types/conversation";
import type { ConfirmActionTemplateData } from "@/devops-chat/types/templates";
import { getSlotValue } from "@/devops-chat/server/orchestration/slot-memory";
import { ROLLBACK_ACTION_IDS, type SurfaceActionDescriptor } from "@/devops-chat/actions/action-types";

export function bindConfirmAction(
  facts: ConversationFacts,
  intentKey: string,
): BindingResult {
  const usedFacts: string[] = [];
  const missingFacts: string[] = [];

  const serviceName = getSlotValue(facts, "rollback.serviceName") as string | undefined;
  if (serviceName) usedFacts.push("rollback.serviceName");
  else missingFacts.push("rollback.serviceName");

  const context = getSlotValue(facts, "rollback.context") as Record<string, unknown> | undefined;
  if (context) usedFacts.push("rollback.context");
  else missingFacts.push("rollback.context");

  if (missingFacts.length > 0) {
    return { ok: false, reason: `missing: ${missingFacts.join(", ")}`, missingFacts };
  }

  const rollbackData = facts.rollback ?? {};
  const environment = (rollbackData.environment as string) ?? "production";
  const targetVersion = (context!.targetVersion as string)
    ?? (rollbackData.recommendedVersion as string)
    ?? "unknown";
  const severity = (rollbackData.severity as string) ?? "high";
  const blastRadius = (rollbackData.blastRadius as string) ?? "unknown";
  const checklist = (context!.confirmChecklist as string[]) ?? ["최종 확인 필요"];

  const payload: ConfirmActionTemplateData = {
    templateId: "confirm_action",
    state: "confirm_ready",
    service: serviceName!,
    environment,
    targetVersion,
    warning: `${severity} severity incident · ${blastRadius}`,
    checklist,
    primaryActionLabel: "Rollback 확정",
    secondaryActionLabel: "요약 보기",
    actions: [
      {
        actionId: ROLLBACK_ACTION_IDS.CONFIRM,
        label: "Rollback 확정",
        variant: "danger",
        confirmationRequired: true,
        confirmationMessage: "정말로 rollback을 확정하시겠습니까?",
        targetRef: { entityType: "rollback", entityId: serviceName! },
      },
      {
        actionId: ROLLBACK_ACTION_IDS.BACK_TO_SUMMARY,
        label: "요약 보기",
        variant: "secondary",
      },
    ] satisfies SurfaceActionDescriptor[],
  };

  return {
    ok: true,
    surface: {
      templateId: "confirm_action",
      payload: payload as unknown as Record<string, unknown>,
      sourceIntent: intentKey,
      updatedAt: new Date().toISOString(),
      freshnessKey: `confirm:${serviceName}:${environment}:${targetVersion}`,
      bindingTrace: { usedFacts, missingFacts },
    },
  };
}
