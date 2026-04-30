/**
 * Binder: quick_deploy_launchpad
 *
 * Assembles payload from conversation facts for the deploy launchpad template.
 */

import type { ConversationFacts, BindingResult } from "@/devops-chat/types/conversation";
import type { QuickDeployTemplateData } from "@/devops-chat/types/templates";
import { getSlotValue } from "@/devops-chat/server/orchestration/slot-memory";
import { DEPLOY_ACTION_IDS, type SurfaceActionDescriptor } from "@/devops-chat/actions/action-types";
import { deployLaunchpadSurfaceConfig } from "@/devops-chat/templates/surface-configs/deploy-launchpad";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringFrom(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

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

  const deployFacts = asRecord(facts.deploy);
  const draftPayload = asRecord(deployFacts?.draftPayload);
  const draftImageDetail = asRecord(draftPayload?.imageDetail);
  const draftRequestDetail = asRecord(draftPayload?.requestDetail);
  if (draftPayload) usedFacts.push("deploy.draftPayload");

  const slotEnvironment = getSlotValue(facts, "deploy.environment") as string | undefined;
  const environment = stringFrom(
    draftPayload?.environment,
    stringFrom(draftRequestDetail?.environment, slotEnvironment ?? "production"),
  );
  if (slotEnvironment) usedFacts.push("deploy.environment");

  const service = stringFrom(draftPayload?.service, stringFrom(draftRequestDetail?.service, serviceName!));
  const recommendedVersion = stringFrom(draftPayload?.recommendedVersion, (context!.recommendedVersion as string) ?? "latest");
  const slotTargetVersion = getSlotValue(facts, "deploy.targetVersion") as string | undefined;
  const targetVersion = stringFrom(
    draftPayload?.targetVersion,
    stringFrom(draftImageDetail?.imageTag, slotTargetVersion ?? recommendedVersion),
  );
  if (slotTargetVersion) usedFacts.push("deploy.targetVersion");

  const environments = (context!.environments as string[]) ?? [];
  const availableImages = (context!.availableImages as Array<Record<string, unknown>>) ?? [];
  const deployStatus = deployFacts?.status;
  const state =
    deployStatus === "deploying"
      ? "deploying"
      : deployStatus === "succeeded"
        ? "done"
        : "ready";

  // Pick the best matching image for the target version
  const matchedImage = availableImages.find((img) => img.tag === targetVersion || img.imageTag === targetVersion) ?? availableImages[0];

  const imageDetail = draftImageDetail
    ? {
        repository: stringFrom(draftImageDetail.repository, service),
        imageTag: stringFrom(draftImageDetail.imageTag, targetVersion),
        imageUri: stringFrom(draftImageDetail.imageUri, ""),
        gitRef: stringFrom(draftImageDetail.gitRef, ""),
        commitSha: stringFrom(draftImageDetail.commitSha, ""),
        imageDigest: stringFrom(draftImageDetail.imageDigest, ""),
        buildStatus: stringFrom(draftImageDetail.buildStatus, "registered"),
        pushedAt: stringFrom(draftImageDetail.pushedAt, ""),
      }
    : matchedImage
    ? {
        repository: (matchedImage.repository as string) ?? service,
        imageTag: (matchedImage.imageTag as string) ?? (matchedImage.tag as string) ?? targetVersion,
        imageUri: (matchedImage.imageUri as string) ?? "",
        gitRef: (matchedImage.gitRef as string) ?? "",
        commitSha: (matchedImage.commitSha as string) ?? "",
        imageDigest: (matchedImage.imageDigest as string) ?? "",
        buildStatus: (matchedImage.buildStatus as string) ?? "registered",
        pushedAt: (matchedImage.pushedAt as string) ?? "",
      }
    : undefined;

  const requestDetail = {
    selectedImageId: stringFrom(
      draftRequestDetail?.selectedImageId,
      (matchedImage?.id as string | undefined) ?? (context!.recommendedImageId as string | undefined) ?? "",
    ),
    selectedImageUri: stringFrom(draftRequestDetail?.selectedImageUri, imageDetail?.imageUri ?? ""),
    service: stringFrom(draftRequestDetail?.service, service),
    environment: stringFrom(draftRequestDetail?.environment, environment),
    cpu: stringFrom(draftRequestDetail?.cpu, "1024"),
    memory: stringFrom(draftRequestDetail?.memory, "2048"),
    containerPort: stringFrom(draftRequestDetail?.containerPort, "8080"),
    desiredCount: stringFrom(draftRequestDetail?.desiredCount, "4"),
    minimumHealthyPercent: stringFrom(draftRequestDetail?.minimumHealthyPercent, "100"),
    maximumPercent: stringFrom(draftRequestDetail?.maximumPercent, "200"),
    deploymentStrategy: stringFrom(
      draftRequestDetail?.deploymentStrategy,
      stringFrom(draftPayload?.strategy, "rolling"),
    ),
    healthCheckPath: stringFrom(draftRequestDetail?.healthCheckPath, "/healthz/ready"),
    healthCheckGracePeriod: stringFrom(draftRequestDetail?.healthCheckGracePeriod, "60"),
    rollbackBaseline: stringFrom(
      draftRequestDetail?.rollbackBaseline,
      recommendedVersion !== targetVersion ? recommendedVersion : "이전 안정 버전",
    ),
    requestedBy: stringFrom(draftRequestDetail?.requestedBy, "AI Assistant"),
    executionProfile: stringFrom(draftRequestDetail?.executionProfile, "standard"),
    operatorNote: stringFrom(draftRequestDetail?.operatorNote, ""),
  };
  const renderedService = requestDetail.service || serviceName!;
  const renderedStrategy = requestDetail.deploymentStrategy || "rolling";

  const actions: SurfaceActionDescriptor[] =
    state === "deploying"
      ? [
          {
            actionId: DEPLOY_ACTION_IDS.COMPLETE,
            label: "완료 반영",
            variant: "primary",
            targetRef: { entityType: "deploy", entityId: renderedService, entityVersion: targetVersion },
          },
        ]
      : state === "done"
        ? [
            {
              actionId: DEPLOY_ACTION_IDS.REFRESH_DRAFT,
              label: "새 배포 초안",
              variant: "secondary",
            },
          ]
        : [
            {
              actionId: DEPLOY_ACTION_IDS.START,
              label: "배포 시작",
              variant: "primary",
              targetRef: { entityType: "deploy", entityId: renderedService, entityVersion: targetVersion },
            },
            {
              actionId: DEPLOY_ACTION_IDS.REFRESH_DRAFT,
              label: "초안 새로 고침",
              variant: "secondary",
            },
          ];

  const payload: QuickDeployTemplateData = {
    templateId: "quick_deploy_launchpad",
    state,
    service: renderedService,
    environment,
    recommendedVersion,
    targetVersion,
    strategy: renderedStrategy,
    impactSummary: state === "deploying"
      ? `${renderedService} ${environment} 환경에 ${targetVersion} 배포 진행 중`
      : state === "done"
        ? `${renderedService} ${environment} 환경에 ${targetVersion} 배포 완료`
        : `${renderedService} ${environment} 환경에 ${targetVersion} 배포`,
    preflightChecks: environments.length > 0
      ? [`${environments.length}개 환경 확인됨`, `${availableImages.length}개 이미지 사용 가능`]
      : ["환경 정보 확인 중"],
    helperText: state === "deploying" ? "배포 진행 중" : state === "done" ? "배포 완료" : "배포 준비 완료",
    primaryActionLabel: state === "deploying" ? "완료 반영" : state === "done" ? "완료됨" : "배포 시작",
    secondaryActionLabel: state === "done" ? "새 배포 초안" : "초안 새로 고침",
    imageDetail,
    requestDetail,
    deploymentHistory: (deployFacts?.deploymentHistory as QuickDeployTemplateData["deploymentHistory"]) ?? [],
    actions,
  };

  return {
    ok: true,
    surface: {
      templateId: "quick_deploy_launchpad",
      payload: payload as unknown as Record<string, unknown>,
      actions: actions as unknown as Array<Record<string, unknown>>,
      surfaceConfig: deployLaunchpadSurfaceConfig,
      sourceIntent: intentKey,
      updatedAt: new Date().toISOString(),
      freshnessKey: `deploy:${renderedService}:${environment}:${targetVersion}`,
      bindingTrace: { usedFacts, missingFacts },
    },
  };
}
