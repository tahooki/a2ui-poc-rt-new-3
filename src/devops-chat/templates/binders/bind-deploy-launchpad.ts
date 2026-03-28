/**
 * Binder: quick_deploy_launchpad
 *
 * Assembles payload from conversation facts for the deploy launchpad template.
 */

import type { ConversationFacts, BindingResult } from "@/devops-chat/types/conversation";
import type { QuickDeployTemplateData } from "@/devops-chat/types/templates";
import { getSlotValue } from "@/devops-chat/server/orchestration/slot-memory";
import { DEPLOY_ACTION_IDS, type SurfaceActionDescriptor } from "@/devops-chat/actions/action-types";

export function bindDeployLaunchpad(
  facts: ConversationFacts,
  intentKey: string,
): BindingResult {
  const usedFacts: string[] = [];
  const missingFacts: string[] = [];

  const serviceName = getSlotValue(facts, "deploy.serviceName") as string | undefined;
  if (serviceName) usedFacts.push("deploy.serviceName");
  else missingFacts.push("deploy.serviceName");

  const context = getSlotValue(facts, "deploy.selectedServiceContext") as Record<string, unknown> | undefined;
  if (context) usedFacts.push("deploy.selectedServiceContext");
  else missingFacts.push("deploy.selectedServiceContext");

  if (missingFacts.length > 0) {
    return { ok: false, reason: `missing: ${missingFacts.join(", ")}`, missingFacts };
  }

  const environment = (getSlotValue(facts, "deploy.environment") as string) ?? "production";
  if (getSlotValue(facts, "deploy.environment")) usedFacts.push("deploy.environment");

  const recommendedVersion = (context!.recommendedVersion as string) ?? "latest";
  const targetVersion = (getSlotValue(facts, "deploy.targetVersion") as string) ?? recommendedVersion;
  if (getSlotValue(facts, "deploy.targetVersion")) usedFacts.push("deploy.targetVersion");

  const environments = (context!.environments as string[]) ?? [];
  const availableImages = (context!.availableImages as Array<{ tag: string }>) ?? [];

  const payload: QuickDeployTemplateData = {
    templateId: "quick_deploy_launchpad",
    state: "ready",
    service: serviceName!,
    environment,
    recommendedVersion,
    targetVersion,
    strategy: "rolling",
    impactSummary: `${serviceName} ${environment} 환경에 ${targetVersion} 배포`,
    preflightChecks: environments.length > 0
      ? [`${environments.length}개 환경 확인됨`, `${availableImages.length}개 이미지 사용 가능`]
      : ["환경 정보 확인 중"],
    helperText: "배포 준비 완료",
    primaryActionLabel: "배포 시작",
    secondaryActionLabel: "초안 새로 고침",
    actions: [
      {
        actionId: DEPLOY_ACTION_IDS.START,
        label: "배포 시작",
        variant: "primary",
        targetRef: { entityType: "deploy", entityId: serviceName!, entityVersion: targetVersion },
      },
      {
        actionId: DEPLOY_ACTION_IDS.REFRESH_DRAFT,
        label: "초안 새로 고침",
        variant: "secondary",
      },
    ] satisfies SurfaceActionDescriptor[],
  };

  return {
    ok: true,
    surface: {
      templateId: "quick_deploy_launchpad",
      payload: payload as unknown as Record<string, unknown>,
      sourceIntent: intentKey,
      updatedAt: new Date().toISOString(),
      freshnessKey: `deploy:${serviceName}:${environment}:${targetVersion}`,
      bindingTrace: { usedFacts, missingFacts },
    },
  };
}
