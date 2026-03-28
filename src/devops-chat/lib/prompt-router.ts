/**
 * @deprecated Legacy prompt router.
 * Replaced by server/orchestrate-chat-turn.ts (Conversation Foundation Phase 1).
 * Still used by app-store.ts legacy submitPrompt path.
 */
import type {
  ApprovalItem,
  AssistantIntent,
  DeployItem,
  PageKey,
  RollbackItem,
} from "@/devops-chat/types/domain";
import type { TemplateEnvelope } from "@/devops-chat/types/templates";

type PromptRouteResult = {
  nextTemplateId: TemplateEnvelope["templateId"];
  messages: string[];
};

function normalizePrompt(prompt: string) {
  return prompt.trim().toLowerCase();
}

export function routeDeployPrompt(prompt: string, item: DeployItem): PromptRouteResult {
  const normalized = normalizePrompt(prompt);

  if (normalized.includes("리스크")) {
    return {
      nextTemplateId: "quick_deploy_launchpad",
      messages: [
        `${item.service} 운영 배포의 핵심 리스크만 다시 정리했습니다.`,
        `${item.strategy} 전략 기준으로 헬스 체크와 자동 중단 조건을 우선 확인하세요.`,
      ],
    };
  }

  if (normalized.includes("안정") || normalized.includes("버전")) {
    return {
      nextTemplateId: "quick_deploy_launchpad",
      messages: [
        `최근 안정 릴리스 ${item.baselineVersion} 와 현재 추천 버전 ${item.recommendedVersion} 를 비교했습니다.`,
        "실행 전 확인이 필요한 항목만 남겼습니다.",
      ],
    };
  }

  return {
    nextTemplateId: "quick_deploy_launchpad",
    messages: [
      "현재 선택된 서비스 기준으로 배포 초안을 준비했습니다.",
      `추천 버전은 ${item.recommendedVersion} 입니다.`,
    ],
  };
}

export function routeApprovalPrompt(prompt: string, item: ApprovalItem): PromptRouteResult {
  const normalized = normalizePrompt(prompt);
  const subject =
    item.type === "temporary_access"
      ? item.detail.principal
      : item.type === "config_change"
        ? item.detail.service
        : item.detail.operationType;

  if (normalized.includes("보류")) {
    return {
      nextTemplateId: "deployment_approval_inbox",
      messages: [
        "보류 판단에 필요한 근거만 다시 정리했습니다.",
        ...item.notes.slice(0, 2),
      ],
    };
  }

  if (normalized.includes("리스크") || normalized.includes("영향")) {
    return {
      nextTemplateId: "deployment_approval_inbox",
      messages: [
        `${subject} 승인 요청의 핵심 리스크는 ${item.riskSummary} 입니다.`,
        `영향 범위는 ${item.impactScope} 로 제한됩니다.`,
      ],
    };
  }

  return {
    nextTemplateId: "deployment_approval_inbox",
    messages: [
      "승인 판단에 필요한 핵심 정보만 정리했습니다.",
      item.rollbackAvailability,
    ],
  };
}

export function routeRollbackPrompt(prompt: string, item: RollbackItem): PromptRouteResult {
  const normalized = normalizePrompt(prompt);
  const target =
    item.deploymentHistory.find((deployment) => deployment.id === item.recommendedRollbackDeploymentId) ??
    item.deploymentHistory[0];

  if (!target) {
    return {
      nextTemplateId: "rollback_summary",
      messages: [
        "현재 선택한 서비스에 연결된 rollback target이 없습니다.",
      ],
    };
  }

  if (normalized.includes("최종") || normalized.includes("확인")) {
    if (target.status === "dry_run_completed" || target.status === "confirm_ready" || target.status === "executed") {
      return {
        nextTemplateId: "confirm_action",
        messages: [
          "최종 확인 카드로 전환했습니다.",
          "위험 작업이므로 체크리스트를 다시 확인한 뒤 확정하세요.",
        ],
      };
    }

    return {
      nextTemplateId: "rollback_summary",
      messages: [
        "최종 확인 전에 dry run 단계가 먼저 필요합니다.",
        "현재는 롤백 요약과 영향 범위를 먼저 검토하세요.",
      ],
    };
  }

  if (normalized.includes("영향") || normalized.includes("dry")) {
    return {
      nextTemplateId:
        target.status === "dry_run_running" || target.status === "dry_run_completed"
          ? "dry_run_stepper"
          : "rollback_summary",
      messages: [
        `영향 범위는 ${item.blastRadius} 입니다.`,
        "dry run 체크 항목을 기준으로 안전성을 먼저 검토하세요.",
      ],
    };
  }

  return {
    nextTemplateId: "rollback_summary",
    messages: [
      "최근 장애 이전의 마지막 안정 버전을 기준으로 롤백을 준비했습니다.",
      `추천 복귀 버전은 ${target.version} 입니다.`,
    ],
  };
}

export function routePromptForSelection(args: {
  pageKey: PageKey;
  prompt: string;
  selectedItem: DeployItem | ApprovalItem | RollbackItem;
}): PromptRouteResult {
  switch (args.pageKey) {
    case "deploy":
      return routeDeployPrompt(args.prompt, args.selectedItem as DeployItem);
    case "approve":
      return routeApprovalPrompt(args.prompt, args.selectedItem as ApprovalItem);
    case "rollback":
      return routeRollbackPrompt(args.prompt, args.selectedItem as RollbackItem);
  }
}

export function findIntentPrompt(intents: AssistantIntent[], intentId: string) {
  return intents.find((intent) => intent.id === intentId)?.prompt ?? "";
}
