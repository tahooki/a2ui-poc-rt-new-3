"use client";

import { create } from "zustand";
import approveSeedData from "@/devops-chat/data/seed/approve.json";
import deploySeedData from "@/devops-chat/data/seed/deploy.json";
import rollbackSeedData from "@/devops-chat/data/seed/rollback.json";
import { findIntentPrompt, routePromptForSelection } from "@/devops-chat/lib/prompt-router";
import {
  getDefaultTemplateIdForApproval,
  getDefaultTemplateIdForDeploy,
  getDefaultTemplateIdForRollback,
} from "@/devops-chat/templates/build-template-envelope";
import type {
  ApprovalItem,
  ApprovalSeed,
  DeployItem,
  DeploySeed,
  PageKey,
  PageSeedMap,
  RollbackItem,
  RollbackSeed,
} from "@/devops-chat/types/domain";
import type { TemplateEnvelope } from "@/devops-chat/types/templates";
import type { RuntimePageMap } from "@/devops-chat/view-models/build-console-view-model";

type AssistantRuntime = {
  composerText: string;
  activeTemplateId: TemplateEnvelope["templateId"] | null;
  messages: string[];
};

type DeployRuntime = {
  seed: DeploySeed;
  items: DeployItem[];
  selectedId: string | null;
  assistant: AssistantRuntime;
};

type ApprovalRuntime = {
  seed: ApprovalSeed;
  items: ApprovalItem[];
  selectedId: string | null;
  assistant: AssistantRuntime;
};

type RollbackRuntime = {
  seed: RollbackSeed;
  items: RollbackItem[];
  selectedId: string | null;
  assistant: AssistantRuntime;
};

type DevopsConsoleStore = {
  pages: RuntimePageMap;
  resetPage: (pageKey: PageKey) => void;
  selectRow: (pageKey: PageKey, rowId: string) => void;
  setComposerText: (pageKey: PageKey, value: string) => void;
  activateIntent: (pageKey: PageKey, intentId: string) => void;
  submitPrompt: (pageKey: PageKey) => void;
  runPrimaryPageAction: (pageKey: PageKey) => void;
  runPrimaryTemplateAction: (pageKey: PageKey) => void;
  runSecondaryTemplateAction: (pageKey: PageKey) => void;
};

const seedMap: PageSeedMap = {
  deploy: deploySeedData as DeploySeed,
  approve: approveSeedData as ApprovalSeed,
  rollback: rollbackSeedData as RollbackSeed,
};

function cloneSeed<T>(value: T): T {
  return structuredClone(value);
}

function trimMessages(messages: string[]) {
  return messages.filter(Boolean).slice(-4);
}

function getDeployTemplateId() {
  return getDefaultTemplateIdForDeploy();
}

function getApprovalTemplateId() {
  return getDefaultTemplateIdForApproval();
}

function getDefaultMessages<T extends { assistantMessages: string[] }>(item: T | null) {
  return item?.assistantMessages.slice(0, 4) ?? ["현재 선택된 항목이 없습니다."];
}

function createDeployRuntime(seed: DeploySeed): DeployRuntime {
  const items = cloneSeed(seed.items);
  const selectedId = seed.selectedId;
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  return {
    seed: cloneSeed(seed),
    items,
    selectedId,
    assistant: {
      composerText: "",
      activeTemplateId: getDeployTemplateId(),
      messages: getDefaultMessages(selectedItem),
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
    assistant: {
      composerText: "",
      activeTemplateId: getApprovalTemplateId(),
      messages: getDefaultMessages(selectedItem),
    },
  };
}

function createRollbackRuntime(seed: RollbackSeed): RollbackRuntime {
  const items = cloneSeed(seed.items);
  const selectedId = seed.selectedId;
  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  return {
    seed: cloneSeed(seed),
    items,
    selectedId,
    assistant: {
      composerText: "",
      activeTemplateId: selectedItem ? getDefaultTemplateIdForRollback(selectedItem) : "rollback_summary",
      messages: getDefaultMessages(selectedItem),
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

function updateDeployRuntime(runtime: DeployRuntime, updater: (draft: DeployRuntime) => void): DeployRuntime {
  const draft: DeployRuntime = {
    seed: runtime.seed,
    selectedId: runtime.selectedId,
    items: runtime.items.map((item) => ({ ...item, activityLog: [...item.activityLog] })),
    assistant: { ...runtime.assistant, messages: [...runtime.assistant.messages] },
  };

  updater(draft);
  return draft;
}

function updateApprovalRuntime(runtime: ApprovalRuntime, updater: (draft: ApprovalRuntime) => void): ApprovalRuntime {
  const draft: ApprovalRuntime = {
    seed: runtime.seed,
    selectedId: runtime.selectedId,
    items: runtime.items.map((item) => ({
      ...item,
      verificationChecks: [...item.verificationChecks],
      changeSummary: [...item.changeSummary],
      notes: [...item.notes],
    })),
    assistant: { ...runtime.assistant, messages: [...runtime.assistant.messages] },
  };

  updater(draft);
  return draft;
}

function updateRollbackRuntime(runtime: RollbackRuntime, updater: (draft: RollbackRuntime) => void): RollbackRuntime {
  const draft: RollbackRuntime = {
    seed: runtime.seed,
    selectedId: runtime.selectedId,
    items: runtime.items.map((item) => ({
      ...item,
      evidence: [...item.evidence],
      recentDeployHistory: [...item.recentDeployHistory],
      dryRunChecks: [...item.dryRunChecks],
      confirmChecklist: [...item.confirmChecklist],
      notes: [...item.notes],
    })),
    assistant: { ...runtime.assistant, messages: [...runtime.assistant.messages] },
  };

  updater(draft);
  return draft;
}

function withSelectedItem<T extends { id: string }>(items: T[], selectedId: string | null) {
  return items.find((item) => item.id === selectedId) ?? null;
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
          draft.assistant.messages = trimMessages(getDefaultMessages(selectedItem));
          draft.assistant.activeTemplateId = getDeployTemplateId();
        });

        return { pages: { ...state.pages, deploy: page } };
      }

      if (pageKey === "approve") {
        const page = updateApprovalRuntime(state.pages.approve, (draft) => {
          draft.selectedId = rowId;
          const selectedItem = withSelectedItem(draft.items, rowId);
          draft.assistant.messages = trimMessages(getDefaultMessages(selectedItem));
          draft.assistant.activeTemplateId = getApprovalTemplateId();
        });

        return { pages: { ...state.pages, approve: page } };
      }

      const page = updateRollbackRuntime(state.pages.rollback, (draft) => {
        draft.selectedId = rowId;
        const selectedItem = withSelectedItem(draft.items, rowId);
        draft.assistant.messages = trimMessages(getDefaultMessages(selectedItem));
        draft.assistant.activeTemplateId = selectedItem
          ? getDefaultTemplateIdForRollback(selectedItem)
          : "rollback_summary";
      });

      return { pages: { ...state.pages, rollback: page } };
    });
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
    get().submitPrompt(pageKey);
  },
  submitPrompt: (pageKey) => {
    set((state) => {
      if (pageKey === "deploy") {
        const page = updateDeployRuntime(state.pages.deploy, (draft) => {
          const selectedItem = withSelectedItem(draft.items, draft.selectedId);
          if (!selectedItem) {
            draft.assistant.messages = ["먼저 배포 후보를 선택하세요."];
            return;
          }

          const route = routePromptForSelection({
            pageKey,
            prompt: draft.assistant.composerText,
            selectedItem,
          });

          draft.assistant.activeTemplateId = route.nextTemplateId;
          draft.assistant.messages = trimMessages(route.messages);
        });

        return { pages: { ...state.pages, deploy: page } };
      }

      if (pageKey === "approve") {
        const page = updateApprovalRuntime(state.pages.approve, (draft) => {
          const selectedItem = withSelectedItem(draft.items, draft.selectedId);
          if (!selectedItem) {
            draft.assistant.messages = ["먼저 승인 요청을 선택하세요."];
            return;
          }

          const route = routePromptForSelection({
            pageKey,
            prompt: draft.assistant.composerText,
            selectedItem,
          });

          draft.assistant.activeTemplateId = route.nextTemplateId;
          draft.assistant.messages = trimMessages(route.messages);
        });

        return { pages: { ...state.pages, approve: page } };
      }

      const page = updateRollbackRuntime(state.pages.rollback, (draft) => {
        const selectedItem = withSelectedItem(draft.items, draft.selectedId);
        if (!selectedItem) {
          draft.assistant.messages = ["먼저 롤백 후보를 선택하세요."];
          return;
        }

        const route = routePromptForSelection({
          pageKey,
          prompt: draft.assistant.composerText,
          selectedItem,
        });

        draft.assistant.activeTemplateId = route.nextTemplateId;
        draft.assistant.messages = trimMessages(route.messages);
      });

      return { pages: { ...state.pages, rollback: page } };
    });
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
            selectedItem.updatedAt = "just now";
            selectedItem.activityLog.unshift({
              time: "now",
              value: "Deployment marked completed from assistant workflow",
            });
            draft.assistant.messages = trimMessages([
              "배포 완료 상태로 반영했습니다.",
              `${selectedItem.service} ${selectedItem.targetVersion} 배포가 성공으로 전환되었습니다.`,
            ]);
            return;
          }

          if (selectedItem.status !== "succeeded") {
            selectedItem.status = "deploying";
            selectedItem.updatedAt = "just now";
            selectedItem.activityLog.unshift({
              time: "now",
              value: "Deployment started from assistant launchpad",
            });
            draft.assistant.messages = trimMessages([
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
          draft.assistant.messages = trimMessages([
            "승인 처리했습니다.",
            `${selectedItem.id} 요청은 운영 승인 완료 상태입니다.`,
          ]);
        });

        return { pages: { ...state.pages, approve: page } };
      }

      const page = updateRollbackRuntime(state.pages.rollback, (draft) => {
        const selectedItem = withSelectedItem(draft.items, draft.selectedId);
        if (!selectedItem) {
          return;
        }

        if (draft.assistant.activeTemplateId === "confirm_action") {
          selectedItem.status = "executed";
          selectedItem.updatedAt = "just now";
          draft.assistant.messages = trimMessages([
            "Rollback 실행을 완료 상태로 반영했습니다.",
            `${selectedItem.service} 서비스는 ${selectedItem.lastStableVersion} 기준으로 복귀되었습니다.`,
          ]);
          return;
        }

        if (draft.assistant.activeTemplateId === "dry_run_stepper") {
          if (selectedItem.status === "dry_run_running") {
            selectedItem.status = "confirm_ready";
            draft.assistant.activeTemplateId = "confirm_action";
            draft.assistant.messages = trimMessages([
              "Dry run 검증을 완료했습니다.",
              "최종 확인 카드에서 위험 체크리스트를 확인한 뒤 확정하세요.",
            ]);
            return;
          }

          selectedItem.status = "dry_run_running";
          draft.assistant.messages = trimMessages([
            "Dry run 검증을 시작했습니다.",
            "핵심 안전 체크를 단계형으로 진행합니다.",
          ]);
          return;
        }

        selectedItem.status = "dry_run_running";
        draft.assistant.activeTemplateId = "dry_run_stepper";
        draft.assistant.messages = trimMessages([
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

          draft.assistant.messages = trimMessages([
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
          draft.assistant.messages = trimMessages([
            "보류 처리했습니다.",
            `${selectedItem.id} 요청은 추가 검토 전까지 hold 상태입니다.`,
          ]);
        });

        return { pages: { ...state.pages, approve: page } };
      }

      const page = updateRollbackRuntime(state.pages.rollback, (draft) => {
        const selectedItem = withSelectedItem(draft.items, draft.selectedId);
        if (!selectedItem) {
          return;
        }

        if (draft.assistant.activeTemplateId === "confirm_action") {
          draft.assistant.activeTemplateId = "rollback_summary";
          draft.assistant.messages = trimMessages([
            "최종 확인 카드에서 롤백 요약으로 돌아갔습니다.",
          ]);
          return;
        }

        if (draft.assistant.activeTemplateId === "dry_run_stepper") {
          draft.assistant.activeTemplateId = "rollback_summary";
          draft.assistant.messages = trimMessages([
            "dry run 단계에서 요약 카드로 돌아갔습니다.",
          ]);
          return;
        }

        if (selectedItem.status === "confirm_ready" || selectedItem.status === "dry_run_completed") {
          draft.assistant.activeTemplateId = "confirm_action";
          draft.assistant.messages = trimMessages([
            "최종 확인 카드로 전환했습니다.",
            "위험 작업이므로 체크리스트를 다시 확인하세요.",
          ]);
          return;
        }

        draft.assistant.messages = trimMessages([
          `영향 범위는 ${selectedItem.blastRadius} 입니다.`,
          "dry run 이후 최종 확인 카드로 전환할 수 있습니다.",
        ]);
      });

      return { pages: { ...state.pages, rollback: page } };
    });
  },
}));
