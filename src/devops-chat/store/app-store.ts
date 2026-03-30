"use client";

import { create } from "zustand";
import approveSeedData from "@/devops-chat/data/seed/approve.json";
import deploySeedData from "@/devops-chat/data/seed/deploy.json";
import rollbackSeedData from "@/devops-chat/data/seed/rollback.json";
import { legacyStreamAssistantChat, type AssistantChatRequest } from "@/devops-chat/lib/chat-api";
import { findIntentPrompt, routePromptForSelection } from "@/devops-chat/lib/prompt-router";
import {
  getDefaultTemplateIdForApproval,
  getDefaultTemplateIdForDeploy,
  getDefaultTemplateIdForRollback,
} from "@/devops-chat/templates/build-template-envelope";
import type {
  ApprovalItem,
  ApprovalSeed,
  ApprovalType,
  AssistantMessage,
  AssistantMessageRole,
  DeployImage,
  DeployItem,
  DeploySeed,
  PageKey,
  PageSeedMap,
  RollbackDeployment,
  RollbackItem,
  RollbackSeed,
  ServiceHealth,
} from "@/devops-chat/types/domain";
import type { TemplateEnvelope } from "@/devops-chat/types/templates";
import type {
  DeployImageDraft,
  DeployRequestDraft,
  DeployWorkflowRuntime,
  RuntimePageMap,
} from "@/devops-chat/view-models/build-console-view-model";

type AssistantRuntime = {
  composerText: string;
  activeTemplateId: TemplateEnvelope["templateId"] | null;
  messages: AssistantMessage[];
  isSubmitting: boolean;
  error: string | null;
};

type DeployRuntime = {
  seed: DeploySeed;
  items: DeployItem[];
  images: DeployImage[];
  selectedId: string | null;
  workflow: DeployWorkflowRuntime;
  assistant: AssistantRuntime;
};

type ApprovalRuntime = {
  seed: ApprovalSeed;
  items: ApprovalItem[];
  selectedId: string | null;
  activeTab: ApprovalType;
  assistant: AssistantRuntime;
};

type RollbackRuntime = {
  seed: RollbackSeed;
  items: RollbackItem[];
  serviceHealth: ServiceHealth[];
  selectedId: string | null;
  activeDeploymentId: string | null;
  assistant: AssistantRuntime;
};

type DevopsConsoleStore = {
  pages: RuntimePageMap;
  resetPage: (pageKey: PageKey) => void;
  selectRow: (pageKey: PageKey, rowId: string) => void;
  setApprovalTab: (tab: ApprovalType) => void;
  setDeployWorkflowField: (
    field: keyof DeployWorkflowRuntime,
    value: DeployWorkflowRuntime[keyof DeployWorkflowRuntime],
  ) => void;
  setComposerText: (pageKey: PageKey, value: string) => void;
  activateIntent: (pageKey: PageKey, intentId: string) => void;
  submitPrompt: (pageKey: PageKey) => Promise<void>;
  runPrimaryPageAction: (pageKey: PageKey) => void;
  runPrimaryTemplateAction: (pageKey: PageKey) => void;
  runSecondaryTemplateAction: (pageKey: PageKey) => void;
  setRollbackTarget: (serviceId: string, deploymentId: string) => void;
  quickRollback: (serviceId: string, deploymentId: string) => void;
  startRollbackDryRun: (serviceId: string, deploymentId: string) => void;
  completeRollbackDryRun: (serviceId: string, deploymentId: string) => void;
  confirmRollback: (serviceId: string, deploymentId: string) => void;
  registerDeployImage: () => void;
  selectDeployImage: (imageId: string) => void;
  selectDeployRequest: (requestId: string) => void;
  submitDeployRequest: () => void;
  startDeployRun: () => void;
  completeDeployRun: () => void;
};

const seedMap: PageSeedMap = {
  deploy: deploySeedData as DeploySeed,
  approve: approveSeedData as ApprovalSeed,
  rollback: rollbackSeedData as RollbackSeed,
};

let assistantMessageSequence = 0;

function cloneSeed<T>(value: T): T {
  return structuredClone(value);
}

function createAssistantMessage(
  role: AssistantMessageRole,
  content: string,
  status: AssistantMessage["status"] = "complete",
): AssistantMessage {
  assistantMessageSequence += 1;

  return {
    id: `assistant-message-${assistantMessageSequence}`,
    role,
    content,
    status,
  };
}

function createAssistantMessages(
  role: AssistantMessageRole,
  lines: string[],
  status: AssistantMessage["status"] = "complete",
) {
  return lines.filter(Boolean).map((line) => createAssistantMessage(role, line, status));
}

function trimMessages(messages: AssistantMessage[]) {
  return messages.filter((message) => message.content.trim() || message.status === "streaming").slice(-24);
}

function appendAssistantMessages(messages: AssistantMessage[], lines: string[]) {
  return trimMessages([...messages, ...createAssistantMessages("assistant", lines)]);
}

function buildAssistantHistory(messages: AssistantMessage[]) {
  return messages
    .filter((message) => message.status === "complete" && message.content.trim())
    .slice(-8)
    .map(({ role, content }) => ({ role, content }));
}

function resetAssistantState(
  assistant: AssistantRuntime,
  messages: AssistantMessage[],
  templateId: TemplateEnvelope["templateId"] | null,
) {
  assistant.messages = trimMessages(messages);
  assistant.activeTemplateId = templateId;
  assistant.isSubmitting = false;
  assistant.error = null;
}

function appendAssistantStateMessages(assistant: AssistantRuntime, lines: string[]) {
  assistant.messages = appendAssistantMessages(assistant.messages, lines);
  assistant.isSubmitting = false;
  assistant.error = null;
}

function getDeployTemplateId() {
  return getDefaultTemplateIdForDeploy();
}

function getApprovalTemplateId() {
  return getDefaultTemplateIdForApproval();
}

function getDefaultMessages<T extends { assistantMessages: string[] }>(item: T | null) {
  return createAssistantMessages(
    "assistant",
    item?.assistantMessages.slice(0, 4) ?? ["현재 선택된 항목이 없습니다."],
  );
}

function getDefaultApprovalTab(items: ApprovalItem[], selectedId: string | null): ApprovalType {
  return items.find((item) => item.id === selectedId)?.type ?? items[0]?.type ?? "temporary_access";
}

function createDeployImageDraft(): DeployImageDraft {
  return {
    repository: "",
    imageTag: "",
    imageUri: "",
    gitRef: "",
    commitSha: "",
    imageDigest: "",
    buildStatus: "registered",
    pushedAt: "",
  };
}

function createDeployRequestDraft(image: DeployImage | null, item?: DeployItem | null): DeployRequestDraft {
  return {
    selectedImageId: item?.selectedImageId ?? null,
    service: item?.service ?? image?.services[0] ?? image?.repository ?? "",
    environment: item?.environment ?? "production",
    cpu: item?.cpu ?? "",
    memory: item?.memory ?? "",
    containerPort: item?.containerPort ?? "8080",
    desiredCount: item?.desiredCount ?? "4",
    deploymentStrategy: item?.strategy ?? "rolling",
    minimumHealthyPercent: item?.minimumHealthyPercent ?? "100",
    maximumPercent: item?.maximumPercent ?? "200",
    healthCheckPath: item?.healthCheckPath ?? "/healthz/ready",
    healthCheckGracePeriod: item?.healthCheckGracePeriod ?? "60",
    rollbackBaseline: item?.rollbackBaseline ?? image?.imageTag ?? "current-stable",
    requestedBy: item?.requestedBy ?? "operator.manual",
    executionProfile: item?.executionProfile ?? "standard",
    operatorNote: item?.operatorNote ?? "",
  };
}

function createDeployWorkflow(seed: DeploySeed, item?: DeployItem | null): DeployWorkflowRuntime {
  const selectedRegisteredImageId = seed.images[0]?.id ?? null;
  const selectedImage =
    seed.images.find((image) => image.id === (item?.selectedImageId ?? selectedRegisteredImageId)) ?? null;

  return {
    selectedRegisteredImageId,
    imageDraft: createDeployImageDraft(),
    requestDraft: createDeployRequestDraft(selectedImage, item),
  };
}

function createDeployRuntime(seed: DeploySeed): DeployRuntime {
  const items = cloneSeed(seed.items);
  const images = cloneSeed(seed.images);
  const selectedId = seed.selectedId;
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  return {
    seed: cloneSeed(seed),
    items,
    images,
    selectedId,
    workflow: createDeployWorkflow({ ...seed, items, images }, selectedItem),
    assistant: {
      composerText: "",
      activeTemplateId: getDeployTemplateId(),
      messages: getDefaultMessages(selectedItem),
      isSubmitting: false,
      error: null,
    },
  };
}

function createApprovalRuntime(seed: ApprovalSeed): ApprovalRuntime {
  const items = cloneSeed(seed.items);
  const selectedId = seed.selectedId;
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  return {
    seed: cloneSeed(seed),
    items,
    selectedId,
    activeTab: getDefaultApprovalTab(items, selectedId),
    assistant: {
      composerText: "",
      activeTemplateId: getApprovalTemplateId(),
      messages: getDefaultMessages(selectedItem),
      isSubmitting: false,
      error: null,
    },
  };
}

function createRollbackRuntime(seed: RollbackSeed): RollbackRuntime {
  const items = cloneSeed(seed.items);
  const serviceHealth = cloneSeed(seed.serviceHealth ?? []);
  const selectedId = seed.selectedId;
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;
  const activeDeploymentId =
    selectedItem?.recommendedRollbackDeploymentId ?? selectedItem?.deploymentHistory[0]?.id ?? null;

  return {
    seed: cloneSeed(seed),
    items,
    serviceHealth,
    selectedId,
    activeDeploymentId,
    assistant: {
      composerText: "",
      activeTemplateId: selectedItem ? getDefaultTemplateIdForRollback(selectedItem) : "rollback_summary",
      messages: getDefaultMessages(selectedItem),
      isSubmitting: false,
      error: null,
    },
  };
}

function createInitialPages(): RuntimePageMap {
  return {
    deploy: createDeployRuntime(seedMap.deploy),
    approve: createApprovalRuntime(seedMap.approve),
    rollback: createRollbackRuntime(seedMap.rollback),
  };
}

function cloneAssistantRuntime(runtime: AssistantRuntime): AssistantRuntime {
  return {
    ...runtime,
    messages: runtime.messages.map((message) => ({ ...message })),
  };
}

function updateDeployRuntime(runtime: DeployRuntime, updater: (draft: DeployRuntime) => void): DeployRuntime {
  const draft: DeployRuntime = {
    seed: runtime.seed,
    selectedId: runtime.selectedId,
    images: runtime.images.map((image) => ({
      ...image,
      services: [...image.services],
      notes: [...image.notes],
    })),
    items: runtime.items.map((item) => ({
      ...item,
      preflightChecks: [...item.preflightChecks],
      rolloutConfig: [...item.rolloutConfig],
      healthSignals: [...item.healthSignals],
      events: [...item.events],
      activityLog: [...item.activityLog],
    })),
    workflow: {
      selectedRegisteredImageId: runtime.workflow.selectedRegisteredImageId,
      imageDraft: { ...runtime.workflow.imageDraft },
      requestDraft: { ...runtime.workflow.requestDraft },
    },
    assistant: cloneAssistantRuntime(runtime.assistant),
  };

  updater(draft);
  return draft;
}

function updateApprovalRuntime(runtime: ApprovalRuntime, updater: (draft: ApprovalRuntime) => void): ApprovalRuntime {
  const draft: ApprovalRuntime = {
    seed: runtime.seed,
    selectedId: runtime.selectedId,
    activeTab: runtime.activeTab,
    items: runtime.items.map((item) => {
      if (item.type === "temporary_access") {
        return {
          ...item,
          verificationChecks: [...item.verificationChecks],
          notes: [...item.notes],
          detail: {
            ...item.detail,
            safeguards: [...item.detail.safeguards],
          },
        };
      }

      if (item.type === "config_change") {
        return {
          ...item,
          verificationChecks: [...item.verificationChecks],
          notes: [...item.notes],
          detail: {
            ...item.detail,
            verificationEvidence: [...(item.detail.verificationEvidence ?? [])],
          },
        };
      }

      return {
        ...item,
        verificationChecks: [...item.verificationChecks],
        notes: [...item.notes],
        detail: {
          ...item.detail,
          executionChecks: [...item.detail.executionChecks],
        },
      };
    }),
    assistant: cloneAssistantRuntime(runtime.assistant),
  };

  updater(draft);
  return draft;
}

function updateRollbackRuntime(runtime: RollbackRuntime, updater: (draft: RollbackRuntime) => void): RollbackRuntime {
  const draft: RollbackRuntime = {
    seed: runtime.seed,
    serviceHealth: runtime.serviceHealth,
    selectedId: runtime.selectedId,
    activeDeploymentId: runtime.activeDeploymentId,
    items: runtime.items.map((item) => ({
      ...item,
      deploymentHistory: item.deploymentHistory.map((deployment) => ({
        ...deployment,
        evidence: [...deployment.evidence],
        dryRunChecks: [...deployment.dryRunChecks],
        confirmChecklist: [...deployment.confirmChecklist],
        notes: [...deployment.notes],
      })),
    })),
    assistant: cloneAssistantRuntime(runtime.assistant),
  };

  updater(draft);
  return draft;
}

function updatePageAssistantState(
  pages: RuntimePageMap,
  pageKey: PageKey,
  updater: (assistant: AssistantRuntime) => void,
) {
  switch (pageKey) {
    case "deploy":
      return {
        ...pages,
        deploy: updateDeployRuntime(pages.deploy, (draft) => {
          updater(draft.assistant);
        }),
      };
    case "approve":
      return {
        ...pages,
        approve: updateApprovalRuntime(pages.approve, (draft) => {
          updater(draft.assistant);
        }),
      };
    case "rollback":
      return {
        ...pages,
        rollback: updateRollbackRuntime(pages.rollback, (draft) => {
          updater(draft.assistant);
        }),
      };
  }
}

function withSelectedItem<T extends { id: string }>(items: T[], selectedId: string | null) {
  return items.find((item) => item.id === selectedId) ?? null;
}

function getApprovalItemsByTab(items: ApprovalItem[], tab: ApprovalType) {
  return items.filter((item) => item.type === tab);
}

function withSelectedRollbackService(items: RollbackItem[], selectedId: string | null) {
  return items.find((item) => item.id === selectedId) ?? null;
}

function withSelectedRollbackDeployment(service: RollbackItem | null, deploymentId: string | null) {
  return service?.deploymentHistory.find((deployment) => deployment.id === deploymentId) ?? null;
}

function getDefaultRollbackDeploymentId(service: RollbackItem | null) {
  return service?.recommendedRollbackDeploymentId ?? service?.deploymentHistory[0]?.id ?? null;
}

function buildRollbackAssistantMessages(service: RollbackItem | null, deployment: RollbackDeployment | null) {
  if (!service || !deployment) {
    return createAssistantMessages("assistant", ["현재 선택된 롤백 대상이 없습니다."]);
  }

  return createAssistantMessages("assistant", [
    `${service.service} 서비스의 rollback target ${deployment.version} 을 기준으로 복귀 흐름을 준비했습니다.`,
    deployment.whyThisTarget,
  ]);
}

function executeRollback(service: RollbackItem, deployment: RollbackDeployment) {
  deployment.status = "executed";
  service.currentVersion = deployment.version;
  service.latestDeploymentId = deployment.id;
  service.latestStatus = "recovered";
  service.recommendedRollbackDeploymentId = deployment.id;
  service.recommendedRollbackVersion = deployment.version;
  service.lastUpdated = "just now";
}

function withSelectedImage(images: DeployImage[], imageId: string | null) {
  return images.find((image) => image.id === imageId) ?? null;
}

function isDeployRequestDraftValid(draft: DeployRequestDraft) {
  return Boolean(
    draft.selectedImageId &&
      draft.service.trim() &&
      draft.environment.trim() &&
      draft.cpu.trim() &&
      draft.memory.trim() &&
      draft.containerPort.trim() &&
      draft.desiredCount.trim() &&
      draft.deploymentStrategy.trim() &&
      draft.minimumHealthyPercent.trim() &&
      draft.maximumPercent.trim() &&
      draft.rollbackBaseline.trim() &&
      draft.requestedBy.trim(),
  );
}

function isDeployImageDraftValid(draft: DeployImageDraft) {
  return Boolean(
    draft.repository.trim() &&
      draft.imageTag.trim() &&
      draft.imageUri.trim() &&
      (draft.gitRef.trim() || draft.commitSha.trim()),
  );
}

function createRequestFromDraft(image: DeployImage, draft: DeployRequestDraft, sequence: number): DeployItem {
  const requestId = `deploy-req-${String(200 + sequence).padStart(3, "0")}`;
  const requestedAt = "just now";

  return {
    id: requestId,
    requestId,
    selectedImageId: image.id,
    service: draft.service,
    environment: draft.environment,
    targetVersion: image.imageTag,
    recommendedVersion: image.imageTag,
    strategy: draft.deploymentStrategy,
    requestedBy: draft.requestedBy,
    requestedAt,
    updatedAt: requestedAt,
    status: "draft_ready",
    baselineDeployment: `deploy-baseline-${sequence}`,
    baselineVersion: draft.rollbackBaseline,
    artifact: image.imageUri,
    healthCheckPath: draft.healthCheckPath,
    impactSummary: `${draft.service} 서비스에 ${image.imageTag} 이미지를 배포하기 위한 ECS-style request입니다.`,
    preflightChecks: [
      `${image.repository} image digest 확인 완료`,
      `min/max healthy ${draft.minimumHealthyPercent}/${draft.maximumPercent} 검토`,
      `rollback baseline ${draft.rollbackBaseline} 확보`,
    ],
    rolloutConfig: [
      `${draft.deploymentStrategy} 전략 사용`,
      `desired count ${draft.desiredCount}`,
      `grace period ${draft.healthCheckGracePeriod}s`,
    ],
    healthSignals: [
      `endpoint ${draft.healthCheckPath}`,
      `container port ${draft.containerPort}`,
      `execution profile ${draft.executionProfile || "standard"}`,
    ],
    cpu: draft.cpu,
    memory: draft.memory,
    containerPort: draft.containerPort,
    desiredCount: draft.desiredCount,
    minimumHealthyPercent: draft.minimumHealthyPercent,
    maximumPercent: draft.maximumPercent,
    healthCheckGracePeriod: draft.healthCheckGracePeriod,
    rollbackBaseline: draft.rollbackBaseline,
    executionProfile: draft.executionProfile,
    operatorNote: draft.operatorNote,
    taskDefinitionRevision: `td-${draft.service}-${sequence}`,
    currentStage: "request created",
    rolloutProgress: "not started",
    healthStatus: "not started",
    verificationStatus: "pending",
    runningCount: `0/${draft.desiredCount}`,
    events: [
      `${requestId} created from registered image ${image.imageTag}`,
      `request authored by ${draft.requestedBy}`,
    ],
    recentSuccess: {
      version: draft.rollbackBaseline,
      strategy: draft.deploymentStrategy,
      deployedAt: "2026-03-24 18:20 KST",
      releaseId: `deploy-prev-${sequence}`,
    },
    activityLog: [
      {
        time: "now",
        value: `Deploy request created for ${draft.environment} using ${image.imageTag}`,
      },
    ],
    assistantMessages: [
      `${requestId} request가 생성되었습니다.`,
      `${draft.service} 서비스는 ${image.imageTag} 기준으로 실행 준비 상태입니다.`,
    ],
  };
}

export const useDevopsConsoleStore = create<DevopsConsoleStore>((set, get) => ({
  pages: createInitialPages(),
  resetPage: (pageKey) => {
    set((state) => ({
      pages: {
        ...state.pages,
        [pageKey]:
          pageKey === "deploy"
            ? createDeployRuntime(seedMap.deploy)
            : pageKey === "approve"
              ? createApprovalRuntime(seedMap.approve)
              : createRollbackRuntime(seedMap.rollback),
      },
    }));
  },
  selectRow: (pageKey, rowId) => {
    set((state) => {
      if (pageKey === "deploy") {
        const page = updateDeployRuntime(state.pages.deploy, (draft) => {
          draft.selectedId = rowId;
          const selectedItem = withSelectedItem(draft.items, rowId);
          const selectedImage = withSelectedImage(draft.images, selectedItem?.selectedImageId ?? null);

          if (selectedImage) {
            draft.workflow.requestDraft = createDeployRequestDraft(selectedImage, selectedItem);
          }

          // Row selection no longer resets assistant messages.
          // Conversation store handles message lifecycle; only template ID updated here.
          draft.assistant.activeTemplateId = getDeployTemplateId();
        });

        return { pages: { ...state.pages, deploy: page } };
      }

      if (pageKey === "approve") {
        const page = updateApprovalRuntime(state.pages.approve, (draft) => {
          draft.selectedId = rowId;
          const selectedItem = withSelectedItem(draft.items, rowId);
          if (selectedItem) {
            draft.activeTab = selectedItem.type;
          }

          draft.assistant.activeTemplateId = getApprovalTemplateId();
        });

        return { pages: { ...state.pages, approve: page } };
      }

      const page = updateRollbackRuntime(state.pages.rollback, (draft) => {
        draft.selectedId = rowId;
        const selectedService = withSelectedRollbackService(draft.items, rowId);
        draft.activeDeploymentId = getDefaultRollbackDeploymentId(selectedService);

        draft.assistant.activeTemplateId = selectedService
          ? getDefaultTemplateIdForRollback(selectedService)
          : "rollback_summary";
      });

      return { pages: { ...state.pages, rollback: page } };
    });
  },
  setApprovalTab: (tab) => {
    set((state) => {
      const page = updateApprovalRuntime(state.pages.approve, (draft) => {
        draft.activeTab = tab;
        const firstItemInTab = getApprovalItemsByTab(draft.items, tab)[0] ?? null;
        draft.selectedId = firstItemInTab?.id ?? null;

        // Tab change no longer resets assistant messages.
        draft.assistant.activeTemplateId = getApprovalTemplateId();
      });

      return { pages: { ...state.pages, approve: page } };
    });
  },
  setRollbackTarget: (serviceId, deploymentId) => {
    set((state) => {
      const page = updateRollbackRuntime(state.pages.rollback, (draft) => {
        draft.selectedId = serviceId;
        draft.activeDeploymentId = deploymentId;
        const selectedService = withSelectedRollbackService(draft.items, serviceId);

        draft.assistant.activeTemplateId = selectedService
          ? getDefaultTemplateIdForRollback(selectedService)
          : "rollback_summary";
      });

      return { pages: { ...state.pages, rollback: page } };
    });
  },
  quickRollback: (serviceId, deploymentId) => {
    set((state) => {
      const page = updateRollbackRuntime(state.pages.rollback, (draft) => {
        const selectedService = withSelectedRollbackService(draft.items, serviceId);
        const selectedDeployment = withSelectedRollbackDeployment(selectedService, deploymentId);
        if (!selectedService || !selectedDeployment) {
          return;
        }

        draft.selectedId = serviceId;
        draft.activeDeploymentId = deploymentId;
        executeRollback(selectedService, selectedDeployment);
        draft.assistant.activeTemplateId = "confirm_action";
        appendAssistantStateMessages(draft.assistant, [
          "서비스 상세에서 즉시 rollback을 수행했습니다.",
          `${selectedService.service} 서비스는 ${selectedDeployment.version} 기준으로 복귀되었습니다.`,
        ]);
      });

      return { pages: { ...state.pages, rollback: page } };
    });
  },
  startRollbackDryRun: (serviceId, deploymentId) => {
    set((state) => {
      const page = updateRollbackRuntime(state.pages.rollback, (draft) => {
        const selectedService = withSelectedRollbackService(draft.items, serviceId);
        const selectedDeployment = withSelectedRollbackDeployment(selectedService, deploymentId);
        if (!selectedService || !selectedDeployment) {
          return;
        }

        draft.selectedId = serviceId;
        draft.activeDeploymentId = deploymentId;
        selectedDeployment.status = "dry_run_running";
        draft.assistant.activeTemplateId = "dry_run_stepper";
        appendAssistantStateMessages(draft.assistant, [
          "Dry run 검증을 시작했습니다.",
          `${selectedDeployment.version} rollback target 기준으로 핵심 안전 체크를 진행합니다.`,
        ]);
      });

      return { pages: { ...state.pages, rollback: page } };
    });
  },
  completeRollbackDryRun: (serviceId, deploymentId) => {
    set((state) => {
      const page = updateRollbackRuntime(state.pages.rollback, (draft) => {
        const selectedService = withSelectedRollbackService(draft.items, serviceId);
        const selectedDeployment = withSelectedRollbackDeployment(selectedService, deploymentId);
        if (!selectedService || !selectedDeployment) {
          return;
        }

        draft.selectedId = serviceId;
        draft.activeDeploymentId = deploymentId;
        selectedDeployment.status = "confirm_ready";
        draft.assistant.activeTemplateId = "confirm_action";
        appendAssistantStateMessages(draft.assistant, [
          "Dry run 검증을 완료했습니다.",
          `${selectedDeployment.version} rollback target은 최종 확인 단계로 전환되었습니다.`,
        ]);
      });

      return { pages: { ...state.pages, rollback: page } };
    });
  },
  confirmRollback: (serviceId, deploymentId) => {
    set((state) => {
      const page = updateRollbackRuntime(state.pages.rollback, (draft) => {
        const selectedService = withSelectedRollbackService(draft.items, serviceId);
        const selectedDeployment = withSelectedRollbackDeployment(selectedService, deploymentId);
        if (!selectedService || !selectedDeployment) {
          return;
        }

        draft.selectedId = serviceId;
        draft.activeDeploymentId = deploymentId;
        executeRollback(selectedService, selectedDeployment);
        draft.assistant.activeTemplateId = "confirm_action";
        appendAssistantStateMessages(draft.assistant, [
          "Rollback를 확정했습니다.",
          `${selectedService.service} 서비스는 ${selectedDeployment.version} 기준으로 복귀되었습니다.`,
        ]);
      });

      return { pages: { ...state.pages, rollback: page } };
    });
  },
  setDeployWorkflowField: (field, value) => {
    set((state) => ({
      pages: {
        ...state.pages,
        deploy: {
          ...state.pages.deploy,
          workflow: {
            ...state.pages.deploy.workflow,
            [field]: value,
          },
        },
      },
    }));
  },
  setComposerText: (pageKey, value) => {
    set((state) => ({
      pages: {
        ...state.pages,
        [pageKey]: {
          ...state.pages[pageKey],
          assistant: {
            ...state.pages[pageKey].assistant,
            composerText: value,
          },
        },
      },
    }));
  },
  activateIntent: (pageKey, intentId) => {
    const page = get().pages[pageKey];
    const prompt = findIntentPrompt(page.seed.intents, intentId);
    get().setComposerText(pageKey, prompt);
    void get().submitPrompt(pageKey);
  },
  submitPrompt: async (pageKey) => {
    let requestPayload: AssistantChatRequest | null = null;
    let placeholderId = "";
    let fallbackMessages: string[] = [];

    set((state) => {
      if (pageKey === "deploy") {
        const page = updateDeployRuntime(state.pages.deploy, (draft) => {
          if (draft.assistant.isSubmitting) {
            return;
          }

          const selectedItem = withSelectedItem(draft.items, draft.selectedId);
          if (!selectedItem) {
            appendAssistantStateMessages(draft.assistant, ["먼저 deploy request를 선택하세요."]);
            return;
          }

          const prompt = draft.assistant.composerText.trim();
          if (!prompt) {
            appendAssistantStateMessages(draft.assistant, ["질문을 입력한 뒤 다시 시도하세요."]);
            return;
          }

          const route = routePromptForSelection({
            pageKey,
            prompt,
            selectedItem,
          });

          const assistantMessage = createAssistantMessage("assistant", "", "streaming");
          placeholderId = assistantMessage.id;
          fallbackMessages = route.messages;
          requestPayload = {
            pageKey,
            prompt,
            templateId: route.nextTemplateId,
            selectedItem: structuredClone(selectedItem),
            history: buildAssistantHistory(draft.assistant.messages),
          };

          draft.assistant.activeTemplateId = route.nextTemplateId;
          draft.assistant.messages = trimMessages([
            ...draft.assistant.messages,
            createAssistantMessage("user", prompt),
            assistantMessage,
          ]);
          draft.assistant.composerText = "";
          draft.assistant.isSubmitting = true;
          draft.assistant.error = null;
        });

        return { pages: { ...state.pages, deploy: page } };
      }

      if (pageKey === "approve") {
        const page = updateApprovalRuntime(state.pages.approve, (draft) => {
          if (draft.assistant.isSubmitting) {
            return;
          }

          const selectedItem = withSelectedItem(draft.items, draft.selectedId);
          if (!selectedItem) {
            appendAssistantStateMessages(draft.assistant, ["먼저 승인 요청을 선택하세요."]);
            return;
          }

          const prompt = draft.assistant.composerText.trim();
          if (!prompt) {
            appendAssistantStateMessages(draft.assistant, ["질문을 입력한 뒤 다시 시도하세요."]);
            return;
          }

          const route = routePromptForSelection({
            pageKey,
            prompt,
            selectedItem,
          });

          const assistantMessage = createAssistantMessage("assistant", "", "streaming");
          placeholderId = assistantMessage.id;
          fallbackMessages = route.messages;
          requestPayload = {
            pageKey,
            prompt,
            templateId: route.nextTemplateId,
            selectedItem: structuredClone(selectedItem),
            history: buildAssistantHistory(draft.assistant.messages),
          };

          draft.assistant.activeTemplateId = route.nextTemplateId;
          draft.assistant.messages = trimMessages([
            ...draft.assistant.messages,
            createAssistantMessage("user", prompt),
            assistantMessage,
          ]);
          draft.assistant.composerText = "";
          draft.assistant.isSubmitting = true;
          draft.assistant.error = null;
        });

        return { pages: { ...state.pages, approve: page } };
      }

      const page = updateRollbackRuntime(state.pages.rollback, (draft) => {
        if (draft.assistant.isSubmitting) {
          return;
        }

        const selectedService = withSelectedRollbackService(draft.items, draft.selectedId);
        const selectedDeployment = withSelectedRollbackDeployment(selectedService, draft.activeDeploymentId);
        if (!selectedService || !selectedDeployment) {
          appendAssistantStateMessages(draft.assistant, ["먼저 롤백 대상을 선택하세요."]);
          return;
        }

        const prompt = draft.assistant.composerText.trim();
        if (!prompt) {
          appendAssistantStateMessages(draft.assistant, ["질문을 입력한 뒤 다시 시도하세요."]);
          return;
        }

        const route = routePromptForSelection({
          pageKey,
          prompt,
          selectedItem: selectedService,
        });

        const assistantMessage = createAssistantMessage("assistant", "", "streaming");
        placeholderId = assistantMessage.id;
        fallbackMessages = route.messages;
        requestPayload = {
          pageKey,
          prompt,
          templateId: route.nextTemplateId,
          selectedItem: structuredClone(selectedService),
          history: buildAssistantHistory(draft.assistant.messages),
        };

        draft.assistant.activeTemplateId = route.nextTemplateId;
        draft.assistant.messages = trimMessages([
          ...draft.assistant.messages,
          createAssistantMessage("user", prompt),
          assistantMessage,
        ]);
        draft.assistant.composerText = "";
        draft.assistant.isSubmitting = true;
        draft.assistant.error = null;
      });

      return { pages: { ...state.pages, rollback: page } };
    });

    if (!requestPayload || !placeholderId) {
      return;
    }

    try {
      await legacyStreamAssistantChat(requestPayload, {
        onDelta: (text) => {
          set((state) => ({
            pages: updatePageAssistantState(state.pages, pageKey, (assistant) => {
              const target = assistant.messages.find((message) => message.id === placeholderId);
              if (!target) {
                return;
              }

              target.content += text;
            }),
          }));
        },
        onDone: () => {
          set((state) => ({
            pages: updatePageAssistantState(state.pages, pageKey, (assistant) => {
              assistant.isSubmitting = false;
              assistant.error = null;

              const target = assistant.messages.find((message) => message.id === placeholderId);
              if (!target) {
                return;
              }

              target.status = "complete";
              if (!target.content.trim()) {
                target.content = fallbackMessages.join(" ");
              }

              assistant.messages = trimMessages(assistant.messages);
            }),
          }));
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Assistant request failed.";
      const fallbackText = fallbackMessages.join(" ") || "Assistant 응답을 가져오지 못했습니다.";

      set((state) => ({
        pages: updatePageAssistantState(state.pages, pageKey, (assistant) => {
          assistant.isSubmitting = false;
          assistant.error = message;

          const target = assistant.messages.find((entry) => entry.id === placeholderId);
          if (!target) {
            assistant.messages = appendAssistantMessages(assistant.messages, [fallbackText]);
            return;
          }

          target.status = "error";
          if (!target.content.trim()) {
            target.content = fallbackText;
          }

          assistant.messages = trimMessages(assistant.messages);
        }),
      }));
    }
  },
  runPrimaryPageAction: (pageKey) => {
    const page = get().pages[pageKey];
    const firstIntent = page.seed.intents[0];
    if (firstIntent) {
      get().activateIntent(pageKey, firstIntent.id);
    }
  },
  runPrimaryTemplateAction: (pageKey) => {
    set((state) => {
      if (pageKey === "deploy") {
        const page = updateDeployRuntime(state.pages.deploy, (draft) => {
          const selectedItem = withSelectedItem(draft.items, draft.selectedId);
          if (!selectedItem) {
            return;
          }

          if (selectedItem.status === "deploying" || selectedItem.status === "verifying") {
            selectedItem.status = "succeeded";
            selectedItem.currentStage = "verification complete";
            selectedItem.rolloutProgress = "100%";
            selectedItem.healthStatus = "healthy";
            selectedItem.verificationStatus = "passed";
            selectedItem.runningCount = `${selectedItem.desiredCount}/${selectedItem.desiredCount}`;
            selectedItem.updatedAt = "just now";
            selectedItem.events.unshift("Manual completion reflected from assistant workflow");
            selectedItem.activityLog.unshift({
              time: "now",
              value: "Deployment marked completed from assistant workflow",
            });
            appendAssistantStateMessages(draft.assistant, [
              "배포 완료 상태로 반영했습니다.",
              `${selectedItem.service} ${selectedItem.targetVersion} 배포가 성공으로 전환되었습니다.`,
            ]);
            return;
          }

          if (selectedItem.status !== "succeeded") {
            selectedItem.status = "deploying";
            selectedItem.currentStage = "rollout started";
            selectedItem.rolloutProgress = "35%";
            selectedItem.healthStatus = "healthy";
            selectedItem.verificationStatus = "running";
            selectedItem.runningCount = `1/${selectedItem.desiredCount}`;
            selectedItem.updatedAt = "just now";
            selectedItem.events.unshift("Manual rollout started from assistant launchpad");
            selectedItem.activityLog.unshift({
              time: "now",
              value: "Deployment started from assistant launchpad",
            });
            appendAssistantStateMessages(draft.assistant, [
              "배포를 시작했습니다.",
              `${selectedItem.strategy} 전략으로 ${selectedItem.targetVersion} 를 전개합니다.`,
            ]);
          }
        });

        return { pages: { ...state.pages, deploy: page } };
      }

      if (pageKey === "approve") {
        const page = updateApprovalRuntime(state.pages.approve, (draft) => {
          const selectedItem = withSelectedItem(draft.items, draft.selectedId);
          if (!selectedItem) {
            return;
          }

          selectedItem.status = "approved";
          appendAssistantStateMessages(draft.assistant, [
            "승인 처리했습니다.",
            `${selectedItem.id} 요청은 운영 승인 완료 상태입니다.`,
          ]);
        });

        return { pages: { ...state.pages, approve: page } };
      }

      const page = updateRollbackRuntime(state.pages.rollback, (draft) => {
        const selectedService = withSelectedRollbackService(draft.items, draft.selectedId);
        const selectedDeployment = withSelectedRollbackDeployment(selectedService, draft.activeDeploymentId);
        if (!selectedService || !selectedDeployment) {
          return;
        }

        if (draft.assistant.activeTemplateId === "confirm_action") {
          executeRollback(selectedService, selectedDeployment);
          appendAssistantStateMessages(draft.assistant, [
            "Rollback 실행을 완료 상태로 반영했습니다.",
            `${selectedService.service} 서비스는 ${selectedDeployment.version} 기준으로 복귀되었습니다.`,
          ]);
          return;
        }

        if (draft.assistant.activeTemplateId === "dry_run_stepper") {
          if (selectedDeployment.status === "dry_run_running") {
            selectedDeployment.status = "confirm_ready";
            draft.assistant.activeTemplateId = "confirm_action";
            appendAssistantStateMessages(draft.assistant, [
              "Dry run 검증을 완료했습니다.",
              "최종 확인 카드에서 위험 체크리스트를 확인한 뒤 확정하세요.",
            ]);
            return;
          }

          selectedDeployment.status = "dry_run_running";
          appendAssistantStateMessages(draft.assistant, [
            "Dry run 검증을 시작했습니다.",
            "핵심 안전 체크를 단계형으로 진행합니다.",
          ]);
          return;
        }

        selectedDeployment.status = "dry_run_running";
        draft.assistant.activeTemplateId = "dry_run_stepper";
        appendAssistantStateMessages(draft.assistant, [
          "롤백 요약에서 dry run 단계로 전환했습니다.",
          "영향 범위와 체크 항목을 먼저 검증합니다.",
        ]);
      });

      return { pages: { ...state.pages, rollback: page } };
    });
  },
  runSecondaryTemplateAction: (pageKey) => {
    set((state) => {
      if (pageKey === "deploy") {
        const page = updateDeployRuntime(state.pages.deploy, (draft) => {
          const selectedItem = withSelectedItem(draft.items, draft.selectedId);
          if (!selectedItem) {
            return;
          }

          appendAssistantStateMessages(draft.assistant, [
            `${selectedItem.service} 배포 초안을 다시 생성했습니다.`,
            `artifact ${selectedItem.artifact} 와 preflight 체크를 최신 문맥으로 유지합니다.`,
          ]);
        });

        return { pages: { ...state.pages, deploy: page } };
      }

      if (pageKey === "approve") {
        const page = updateApprovalRuntime(state.pages.approve, (draft) => {
          const selectedItem = withSelectedItem(draft.items, draft.selectedId);
          if (!selectedItem) {
            return;
          }

          selectedItem.status = "held";
          appendAssistantStateMessages(draft.assistant, [
            "보류 처리했습니다.",
            `${selectedItem.id} 요청은 추가 검토 전까지 hold 상태입니다.`,
          ]);
        });

        return { pages: { ...state.pages, approve: page } };
      }

      const page = updateRollbackRuntime(state.pages.rollback, (draft) => {
        const selectedService = withSelectedRollbackService(draft.items, draft.selectedId);
        const selectedDeployment = withSelectedRollbackDeployment(selectedService, draft.activeDeploymentId);
        if (!selectedService || !selectedDeployment) {
          return;
        }

        if (draft.assistant.activeTemplateId === "confirm_action") {
          draft.assistant.activeTemplateId = "rollback_summary";
          appendAssistantStateMessages(draft.assistant, [
            "최종 확인 카드에서 롤백 요약으로 돌아갔습니다.",
          ]);
          return;
        }

        if (draft.assistant.activeTemplateId === "dry_run_stepper") {
          draft.assistant.activeTemplateId = "rollback_summary";
          appendAssistantStateMessages(draft.assistant, [
            "dry run 단계에서 요약 카드로 돌아갔습니다.",
          ]);
          return;
        }

        if (selectedDeployment.status === "confirm_ready" || selectedDeployment.status === "dry_run_completed") {
          draft.assistant.activeTemplateId = "confirm_action";
          appendAssistantStateMessages(draft.assistant, [
            "최종 확인 카드로 전환했습니다.",
            "위험 작업이므로 체크리스트를 다시 확인하세요.",
          ]);
          return;
        }

        appendAssistantStateMessages(draft.assistant, [
          `영향 범위는 ${selectedService.blastRadius} 입니다.`,
          "dry run 이후 최종 확인 카드로 전환할 수 있습니다.",
        ]);
      });

      return { pages: { ...state.pages, rollback: page } };
    });
  },
  registerDeployImage: () => {
    set((state) => {
      const page = updateDeployRuntime(state.pages.deploy, (draft) => {
        const imageDraft = draft.workflow.imageDraft;
        if (!isDeployImageDraftValid(imageDraft)) {
          appendAssistantStateMessages(draft.assistant, [
            "이미지 등록 필수 필드를 먼저 채워야 합니다.",
            "Repository, Image tag, Image URI, Git ref 또는 Commit SHA가 필요합니다.",
          ]);
          return;
        }

        const imageId = `img-${imageDraft.repository}-${imageDraft.imageTag}`.replace(/[^a-zA-Z0-9-]/g, "-");
        const image: DeployImage = {
          id: imageId,
          repository: imageDraft.repository.trim(),
          imageTag: imageDraft.imageTag.trim(),
          imageUri: imageDraft.imageUri.trim(),
          gitRef: imageDraft.gitRef.trim(),
          commitSha: imageDraft.commitSha.trim(),
          imageDigest: imageDraft.imageDigest.trim() || "sha256:pending",
          buildStatus: imageDraft.buildStatus.trim() || "registered",
          pushedAt: imageDraft.pushedAt.trim() || "just now",
          updatedAt: "just now",
          services: [imageDraft.repository.trim()],
          notes: [
            imageDraft.gitRef.trim()
              ? `git ref ${imageDraft.gitRef.trim()}`
              : `commit ${imageDraft.commitSha.trim()}`,
          ],
        };

        draft.images.unshift(image);
        draft.workflow.selectedRegisteredImageId = image.id;
        draft.workflow.imageDraft = createDeployImageDraft();
        appendAssistantStateMessages(draft.assistant, [
          `${image.repository}:${image.imageTag} 이미지를 registry 목록에 등록했습니다.`,
          "이제 request 단계에서 해당 이미지를 선택할 수 있습니다.",
        ]);
      });

      return { pages: { ...state.pages, deploy: page } };
    });
  },
  selectDeployImage: (imageId) => {
    set((state) => {
      const page = updateDeployRuntime(state.pages.deploy, (draft) => {
        draft.workflow.selectedRegisteredImageId = imageId;
      });

      return { pages: { ...state.pages, deploy: page } };
    });
  },
  selectDeployRequest: (requestId) => {
    set((state) => {
      const page = updateDeployRuntime(state.pages.deploy, (draft) => {
        draft.selectedId = requestId;
        const selectedItem = withSelectedItem(draft.items, requestId);
        const selectedImage = withSelectedImage(draft.images, selectedItem?.selectedImageId ?? null);

        if (selectedImage) {
          draft.workflow.requestDraft = createDeployRequestDraft(selectedImage, selectedItem);
        }

        resetAssistantState(
          draft.assistant,
          getDefaultMessages(selectedItem),
          draft.assistant.activeTemplateId ?? getDeployTemplateId(),
        );
      });

      return { pages: { ...state.pages, deploy: page } };
    });
  },
  submitDeployRequest: () => {
    set((state) => {
      const page = updateDeployRuntime(state.pages.deploy, (draft) => {
        const requestDraft = draft.workflow.requestDraft;
        if (!isDeployRequestDraftValid(requestDraft)) {
          appendAssistantStateMessages(draft.assistant, [
            "Deploy request 필수 필드가 아직 비어 있습니다.",
            "이미지 선택과 필수 request 필드를 모두 채워야 합니다.",
          ]);
          return;
        }

        const image = withSelectedImage(draft.images, requestDraft.selectedImageId);
        if (!image) {
          appendAssistantStateMessages(draft.assistant, [
            "선택된 이미지가 registry 목록에 없습니다.",
          ]);
          return;
        }

        const request = createRequestFromDraft(image, requestDraft, draft.items.length + 1);
        draft.items.unshift(request);
        draft.selectedId = request.id;
        appendAssistantStateMessages(draft.assistant, [
          `${request.requestId} request를 생성했습니다.`,
          `${request.service} 서비스는 run 단계에서 즉시 실행할 수 있습니다.`,
        ]);
      });

      return { pages: { ...state.pages, deploy: page } };
    });
  },
  startDeployRun: () => {
    set((state) => {
      const page = updateDeployRuntime(state.pages.deploy, (draft) => {
        const selectedItem = withSelectedItem(draft.items, draft.selectedId);
        if (!selectedItem) {
          appendAssistantStateMessages(draft.assistant, [
            "먼저 실행할 deploy request를 선택하세요.",
          ]);
          return;
        }

        selectedItem.status = "deploying";
        selectedItem.currentStage = "rollout started";
        selectedItem.rolloutProgress = "35%";
        selectedItem.healthStatus = "healthy";
        selectedItem.verificationStatus = "running";
        selectedItem.runningCount = `1/${selectedItem.desiredCount}`;
        selectedItem.updatedAt = "just now";
        selectedItem.events.unshift(`Rollout started for ${selectedItem.requestId}`);
        selectedItem.activityLog.unshift({
          time: "now",
          value: `Manual rollout started with ${selectedItem.strategy}`,
        });

        appendAssistantStateMessages(draft.assistant, [
          "수동 workflow 기준으로 rollout을 시작했습니다.",
          `${selectedItem.service} ${selectedItem.targetVersion} 배포가 실행 중입니다.`,
        ]);
      });

      return { pages: { ...state.pages, deploy: page } };
    });
  },
  completeDeployRun: () => {
    set((state) => {
      const page = updateDeployRuntime(state.pages.deploy, (draft) => {
        const selectedItem = withSelectedItem(draft.items, draft.selectedId);
        if (!selectedItem) {
          appendAssistantStateMessages(draft.assistant, [
            "먼저 완료 처리할 deploy request를 선택하세요.",
          ]);
          return;
        }

        selectedItem.status = "succeeded";
        selectedItem.currentStage = "verification complete";
        selectedItem.rolloutProgress = "100%";
        selectedItem.healthStatus = "healthy";
        selectedItem.verificationStatus = "passed";
        selectedItem.runningCount = `${selectedItem.desiredCount}/${selectedItem.desiredCount}`;
        selectedItem.updatedAt = "just now";
        selectedItem.events.unshift(`Verification completed for ${selectedItem.requestId}`);
        selectedItem.activityLog.unshift({
          time: "now",
          value: "Manual verification marked completed",
        });

        appendAssistantStateMessages(draft.assistant, [
          "수동 workflow 기준으로 배포 완료를 반영했습니다.",
          `${selectedItem.service} ${selectedItem.targetVersion} 가 성공 상태로 전환되었습니다.`,
        ]);
      });

      return { pages: { ...state.pages, deploy: page } };
    });
  },
}));
