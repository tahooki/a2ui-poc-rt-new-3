/**
 * Binder: dry_run_stepper
 *
 * Assembles payload from conversation facts for the dry-run stepper template.
 */

import type { ConversationFacts, BindingResult } from "@/devops-chat/types/conversation";
import type { DryRunStepperTemplateData } from "@/devops-chat/types/templates";
import { getSlotValue } from "@/devops-chat/server/orchestration/slot-memory";
import { ROLLBACK_ACTION_IDS, type SurfaceActionDescriptor } from "@/devops-chat/actions/action-types";

export function bindDryRunStepper(
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
  const steps = (context!.dryRunChecks as string[]) ?? ["환경 검증", "의존성 확인", "호환성 체크"];

  const payload: DryRunStepperTemplateData = {
    templateId: "dry_run_stepper",
    state: "not_started",
    service: serviceName!,
    environment,
    targetVersion,
    steps,
    helperText: "Dry run을 시작하면 실제 적용 전에 검증을 수행합니다.",
    primaryActionLabel: "Dry run 시작",
    secondaryActionLabel: "요약 보기",
    actions: [
      {
        actionId: ROLLBACK_ACTION_IDS.COMPLETE_DRY_RUN,
        label: "Dry run 시작",
        variant: "primary",
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
      templateId: "dry_run_stepper",
      payload: payload as unknown as Record<string, unknown>,
      sourceIntent: intentKey,
      updatedAt: new Date().toISOString(),
      freshnessKey: `dryrun:${serviceName}:${environment}:${targetVersion}`,
      bindingTrace: { usedFacts, missingFacts },
    },
  };
}
