import {
  buildApprovalTemplate,
  buildDeployTemplate,
  buildRollbackTemplate,
} from "@/devops-chat/templates/build-template-envelope";
import {
  approvalStatusMeta,
  deployStatusMeta,
} from "@/devops-chat/lib/status";
import type {
  ApprovalItem,
  AssistantMessage,
  ApprovalSeed,
  ApprovalType,
  DeployImage,
  DeployItem,
  DeploySeed,
  DetailSection,
  PageKey,
  RollbackDeployment,
  RollbackItem,
  RollbackSeed,
  SemanticTone,
} from "@/devops-chat/types/domain";
import type { TemplateEnvelope } from "@/devops-chat/types/templates";

export type SummaryMetricViewModel = {
  label: string;
  value: string;
  tone: SemanticTone;
};

export type TableCellViewModel = {
  value: string;
  mono?: boolean;
};

export type TableRowViewModel = {
  id: string;
  cells: TableCellViewModel[];
  statusLabel: string;
  statusTone: SemanticTone;
  isSelected: boolean;
};

export type DeployImageDraft = {
  repository: string;
  imageTag: string;
  imageUri: string;
  gitRef: string;
  commitSha: string;
  imageDigest: string;
  buildStatus: string;
  pushedAt: string;
};

export type DeployRequestDraft = {
  selectedImageId: string | null;
  service: string;
  environment: string;
  cpu: string;
  memory: string;
  containerPort: string;
  desiredCount: string;
  deploymentStrategy: string;
  minimumHealthyPercent: string;
  maximumPercent: string;
  healthCheckPath: string;
  healthCheckGracePeriod: string;
  rollbackBaseline: string;
  requestedBy: string;
  executionProfile: string;
  operatorNote: string;
};

export type DeployWorkflowRuntime = {
  selectedRegisteredImageId: string | null;
  imageDraft: DeployImageDraft;
  requestDraft: DeployRequestDraft;
};

export const approvalTabMeta: Record<
  ApprovalType,
  {
    label: string;
    role: string;
    tableDescription: string;
  }
> = {
  temporary_access: {
    label: "Temporary Access",
    role: "임시 권한 요청의 범위와 만료 조건을 검토하는 승인 탭입니다.",
    tableDescription: "principal, resource, scope, duration 중심으로 임시 권한 요청을 검토합니다.",
  },
  config_change: {
    label: "Config Change",
    role: "운영 설정 변경 요청의 diff와 rollback 경로를 검토하는 승인 탭입니다.",
    tableDescription: "runtime configuration 변경 요청을 current/proposed value 중심으로 검토합니다.",
  },
  data_operation: {
    label: "Data Operation",
    role: "데이터성 운영 작업의 영향 범위와 복구 가능성을 검토하는 승인 탭입니다.",
    tableDescription: "queue replay, backfill, cache purge 같은 고위험 데이터 작업을 검토합니다.",
  },
};

export type ConsolePageViewModel = {
  key: PageKey;
  navLabel: string;
  pageTitle: string;
  pageDescription: string;
  pageScope: string;
  lastUpdated: string;
  filters: string[];
  primaryActionLabel: string;
  summaryMetrics: SummaryMetricViewModel[];
  tableTitle: string;
  tableColumns: string[];
  tableRows: TableRowViewModel[];
  detailTitle: string;
  detailDescription: string;
  detailSections: DetailSection[];
  emptyDetailTitle: string;
  emptyDetailDescription: string;
  assistantTitle: string;
  assistantDescription: string;
  assistantContext: Array<{ label: string; value: string }>;
  intents: DeploySeed["intents"] | ApprovalSeed["intents"] | RollbackSeed["intents"];
  messages: AssistantMessage[];
  isSubmitting: boolean;
  error: string | null;
  composerText: string;
  composerPlaceholder: string;
  template: TemplateEnvelope | null;
};

type DeployRuntime = {
  seed: DeploySeed;
  items: DeployItem[];
  images: DeployImage[];
  selectedId: string | null;
  workflow: DeployWorkflowRuntime;
    assistant: {
      composerText: string;
      activeTemplateId: TemplateEnvelope["templateId"] | null;
      messages: AssistantMessage[];
      isSubmitting: boolean;
      error: string | null;
    };
};

type ApprovalRuntime = {
  seed: ApprovalSeed;
  items: ApprovalItem[];
  selectedId: string | null;
  activeTab: ApprovalType;
    assistant: {
      composerText: string;
      activeTemplateId: TemplateEnvelope["templateId"] | null;
      messages: AssistantMessage[];
      isSubmitting: boolean;
      error: string | null;
    };
};

type RollbackRuntime = {
  seed: RollbackSeed;
  items: RollbackItem[];
  selectedId: string | null;
  activeDeploymentId: string | null;
    assistant: {
      composerText: string;
      activeTemplateId: TemplateEnvelope["templateId"] | null;
      messages: AssistantMessage[];
      isSubmitting: boolean;
      error: string | null;
    };
};

export type RuntimePageMap = {
  deploy: DeployRuntime;
  approve: ApprovalRuntime;
  rollback: RollbackRuntime;
};

function buildDeploySummaryMetrics(items: DeployItem[], images: DeployImage[]): SummaryMetricViewModel[] {
  return [
    {
      label: "등록 이미지",
      value: `${images.length}`,
      tone: "info",
    },
    {
      label: "작성된 요청",
      value: `${items.length}`,
      tone: "warning",
    },
    {
      label: "진행 중 실행",
      value: `${items.filter((item) => item.status === "deploying" || item.status === "verifying").length}`,
      tone: "info",
    },
    {
      label: "성공 배포",
      value: `${items.filter((item) => item.status === "succeeded").length}`,
      tone: "success",
    },
  ];
}

function buildApprovalSummaryMetrics(items: ApprovalItem[]): SummaryMetricViewModel[] {
  return [
    {
      label: "승인 대기",
      value: `${items.filter((item) => item.status === "pending").length}`,
      tone: "warning",
    },
    {
      label: "오늘 승인 완료",
      value: `${items.filter((item) => item.status === "approved").length}`,
      tone: "success",
    },
    {
      label: "고위험 요청",
      value: `${items.filter((item) => item.riskTone === "danger").length}`,
      tone: "danger",
    },
    {
      label: "보류 건수",
      value: `${items.filter((item) => item.status === "held").length}`,
      tone: "neutral",
    },
  ];
}

function filterApprovalItemsByTab(items: ApprovalItem[], activeTab: ApprovalType) {
  const statusOrder = {
    pending: 0,
    held: 1,
    approved: 2,
  } as const;

  return items
    .filter((item) => item.type === activeTab)
    .toSorted((left, right) => {
      const leftRank = statusOrder[left.status];
      const rightRank = statusOrder[right.status];

      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }

      return left.id.localeCompare(right.id);
    });
}

function buildApprovalTableColumns(activeTab: ApprovalType) {
  switch (activeTab) {
    case "temporary_access":
      return ["Request ID", "Principal", "Resource", "Scope", "Duration", "Requested By", "Status"];
    case "config_change":
      return ["Request ID", "Service", "Environment", "Change Type", "Risk", "Requested By", "Status"];
    case "data_operation":
      return ["Request ID", "Operation", "Target", "Environment", "Impact", "Requested By", "Status"];
  }
}

function buildApprovalTableRows(items: ApprovalItem[], activeTab: ApprovalType): TableRowViewModel[] {
  return items.map((item) => {
    if (activeTab === "temporary_access" && item.type === "temporary_access") {
      return {
        id: item.id,
        cells: [
          { value: item.id, mono: true },
          { value: item.detail.principal, mono: true },
          { value: item.detail.resource, mono: true },
          { value: item.detail.scope, mono: true },
          { value: item.detail.duration, mono: true },
          { value: item.requestedBy, mono: true },
        ],
        statusLabel: approvalStatusMeta[item.status].label,
        statusTone: approvalStatusMeta[item.status].tone,
        isSelected: false,
      };
    }

    if (activeTab === "config_change" && item.type === "config_change") {
      return {
        id: item.id,
        cells: [
          { value: item.id, mono: true },
          { value: item.detail.service, mono: true },
          { value: item.environment, mono: true },
          { value: item.detail.changeType, mono: true },
          { value: item.riskSummary },
          { value: item.requestedBy, mono: true },
        ],
        statusLabel: approvalStatusMeta[item.status].label,
        statusTone: approvalStatusMeta[item.status].tone,
        isSelected: false,
      };
    }

    if (activeTab === "data_operation" && item.type === "data_operation") {
      return {
        id: item.id,
        cells: [
          { value: item.id, mono: true },
          { value: item.detail.operationType, mono: true },
          { value: item.detail.target, mono: true },
          { value: item.environment, mono: true },
          { value: item.impactScope },
          { value: item.requestedBy, mono: true },
        ],
        statusLabel: approvalStatusMeta[item.status].label,
        statusTone: approvalStatusMeta[item.status].tone,
        isSelected: false,
      };
    }

    return {
      id: item.id,
      cells: [{ value: item.id, mono: true }],
      statusLabel: approvalStatusMeta[item.status].label,
      statusTone: approvalStatusMeta[item.status].tone,
      isSelected: false,
    };
  });
}

function buildRollbackSummaryMetrics(items: RollbackItem[]): SummaryMetricViewModel[] {
  return [
    {
      label: "오픈 인시던트",
      value: `${items.filter((item) => item.latestStatus !== "recovered").length}`,
      tone: "danger",
    },
    {
      label: "롤백 후보",
      value: `${items.filter((item) => item.deploymentHistory.some((deployment) => deployment.rollbackEligible)).length}`,
      tone: "warning",
    },
    {
      label: "최근 실패 배포",
      value: `${items.filter((item) => item.latestStatus === "degraded" || item.latestStatus === "critical").length}`,
      tone: "danger",
    },
    {
      label: "복구 완료",
      value: `${items.filter((item) => item.latestStatus === "recovered").length}`,
      tone: "success",
    },
  ];
}

function buildDeployDetailSections(item: DeployItem): DetailSection[] {
  return [
    {
      title: "요청 개요",
      items: [
        { label: "Request ID", value: item.requestId, mono: true },
        { label: "Image ID", value: item.selectedImageId, mono: true },
        { label: "Service", value: item.service, mono: true },
        { label: "Environment", value: item.environment, mono: true },
      ],
    },
    {
      title: "실행 설정",
      items: [
        { label: "CPU", value: item.cpu, mono: true },
        { label: "Memory", value: item.memory, mono: true },
        { label: "Container port", value: item.containerPort, mono: true },
        { label: "Desired count", value: item.desiredCount, mono: true },
        { label: "Strategy", value: item.strategy, mono: true },
      ],
    },
    {
      title: "Rollout 상태",
      items: [
        { label: "Task definition", value: item.taskDefinitionRevision, mono: true },
        { label: "Current stage", value: item.currentStage },
        { label: "Rollout progress", value: item.rolloutProgress },
        { label: "Health", value: item.healthStatus },
        { label: "Verification", value: item.verificationStatus },
      ],
    },
    {
      title: "운영 메모",
      items: [
        { label: "Rollback baseline", value: item.rollbackBaseline, mono: true },
        { label: "Execution profile", value: item.executionProfile || "default", mono: true },
        { label: "Operator note", value: item.operatorNote || "-", mono: false },
      ],
    },
  ];
}

function buildApprovalDetailSections(item: ApprovalItem): DetailSection[] {
  const commonSections: DetailSection[] = [
    {
      title: "요청 개요",
      items: [
        { label: "Request", value: item.id, mono: true },
        { label: "Title", value: item.title, mono: true },
        { label: "Requester", value: item.requestedBy, mono: true },
        { label: "Window", value: item.requestWindow, mono: true },
      ],
    },
    {
      title: "영향 범위",
      items: [
        { label: "Team", value: item.team, mono: true },
        { label: "Impact", value: item.impactScope },
        { label: "Requested at", value: item.requestedAt, mono: true },
      ],
    },
    {
      title: "검증 체크",
      items: item.verificationChecks.map((value, index) => ({
        label: `Check ${index + 1}`,
        value,
      })),
    },
  ];

  if (item.type === "temporary_access") {
    return [
      ...commonSections,
      {
        title: "Access scope",
        items: [
          { label: "Principal", value: item.detail.principal, mono: true },
          { label: "Resource", value: item.detail.resource, mono: true },
          { label: "Scope", value: item.detail.scope, mono: true },
          { label: "Duration", value: item.detail.duration, mono: true },
          { label: "Expires at", value: item.detail.expiresAt, mono: true },
        ],
      },
      {
        title: "Safeguards",
        items: item.detail.safeguards.map((value, index) => ({
          label: `Guard ${index + 1}`,
          value,
        })),
      },
      {
        title: "관련 메모",
        items: [
          { label: "Justification", value: item.detail.justification },
          ...item.notes.map((value, index) => ({
            label: `Note ${index + 1}`,
            value,
          })),
        ],
      },
    ];
  }

  if (item.type === "config_change") {
    return [
      ...commonSections,
      {
        title: "Config diff",
        items: [
          { label: "Service", value: item.detail.service, mono: true },
          { label: "Change type", value: item.detail.changeType, mono: true },
          { label: "Target config", value: item.detail.targetConfig, mono: true },
          { label: "Current", value: item.detail.currentValue, mono: true },
          { label: "Proposed", value: item.detail.proposedValue, mono: true },
        ],
      },
      {
        title: "Rollback 방법",
        items: [
          { label: "Rollback", value: item.detail.rollbackMethod },
          { label: "Availability", value: item.rollbackAvailability },
        ],
      },
      {
        title: "관련 메모",
        items: [
          ...(item.detail.verificationEvidence ?? []).map((value, index) => ({
            label: `Evidence ${index + 1}`,
            value,
          })),
          ...item.notes.map((value, index) => ({
            label: `Note ${index + 1}`,
            value,
          })),
        ],
      },
    ];
  }

  return [
    ...commonSections,
    {
      title: "Operation summary",
      items: [
        { label: "Operation", value: item.detail.operationType, mono: true },
        { label: "Target", value: item.detail.target, mono: true },
        { label: "Window", value: item.detail.executionWindow, mono: true },
        { label: "Records", value: item.detail.recordCount, mono: true },
      ],
    },
    {
      title: "Recovery / rollback",
      items: [
        { label: "Recovery", value: item.detail.recoveryMethod },
        { label: "Blast radius", value: item.detail.blastRadius },
        { label: "Availability", value: item.rollbackAvailability },
      ],
    },
    {
      title: "관련 메모",
      items: [
        ...item.detail.executionChecks.map((value, index) => ({
          label: `Execution check ${index + 1}`,
          value,
        })),
        ...item.notes.map((value, index) => ({
          label: `Note ${index + 1}`,
          value,
        })),
      ],
    },
  ];
}

function buildRollbackDetailSections(item: RollbackItem, deployment: RollbackDeployment | null): DetailSection[] {
  if (!deployment) {
    return [];
  }

  return [
    {
      title: "서비스 요약",
      items: [
        { label: "Service", value: item.service, mono: true },
        { label: "Incident", value: item.incidentSummary, mono: true },
        { label: "Severity", value: item.severity, mono: true },
        { label: "Current version", value: item.currentVersion, mono: true },
      ],
    },
    {
      title: "선택된 rollback target",
      items: [
        { label: "Deployment ID", value: deployment.id, mono: true },
        { label: "Version", value: deployment.version, mono: true },
        { label: "Deployed at", value: deployment.deployedAt, mono: true },
        { label: "Strategy", value: deployment.strategy, mono: true },
      ],
    },
    {
      title: "Target evidence",
      items: [
        { label: "Why this target", value: deployment.whyThisTarget },
        ...deployment.evidence.map((value, index) => ({
          label: `Evidence ${index + 1}`,
          value,
        })),
      ],
    },
    {
      title: "영향 서비스",
      items: [
        { label: "Blast radius", value: item.blastRadius },
        { label: "Recovery window", value: deployment.recoveryWindow },
        { label: "Health summary", value: deployment.healthSummary },
        { label: "Verification", value: deployment.verification },
      ],
    },
    {
      title: "Operator note",
      items: deployment.notes.map((value, index) => ({
        label: `Note ${index + 1}`,
        value,
      })),
    },
  ];
}

export function buildConsoleViewModel(pageKey: PageKey, pages: RuntimePageMap): ConsolePageViewModel {
  switch (pageKey) {
    case "deploy": {
      const page = pages.deploy;
      const selectedItem = page.items.find((item) => item.id === page.selectedId) ?? null;

      return {
        key: "deploy",
        navLabel: page.seed.navLabel,
        pageTitle: page.seed.pageTitle,
        pageDescription: page.seed.pageDescription,
        pageScope: page.seed.pageScope,
        lastUpdated: page.seed.lastUpdated,
        filters: page.seed.filters,
        primaryActionLabel: page.seed.primaryActionLabel,
        summaryMetrics: buildDeploySummaryMetrics(page.items, page.images),
        tableTitle: page.seed.tableTitle,
        tableColumns: [
          "Request ID",
          "Service",
          "Environment",
          "Image tag",
          "Strategy",
          "Requested By",
          "Updated At",
          "Status",
        ],
        tableRows: page.items.map((item) => ({
          id: item.id,
          cells: [
            { value: item.requestId, mono: true },
            { value: item.service, mono: true },
            { value: item.environment, mono: true },
            { value: item.targetVersion, mono: true },
            { value: item.strategy, mono: true },
            { value: item.requestedBy, mono: true },
            { value: item.updatedAt, mono: true },
          ],
          statusLabel: deployStatusMeta[item.status].label,
          statusTone: deployStatusMeta[item.status].tone,
          isSelected: item.id === page.selectedId,
        })),
        detailTitle: "Selected deployment detail",
        detailDescription: "선택한 request의 이미지, 실행 설정, rollout 상태를 함께 보여줍니다.",
        detailSections: selectedItem ? buildDeployDetailSections(selectedItem) : [],
        emptyDetailTitle: "선택된 배포 요청 없음",
        emptyDetailDescription: "request를 생성하거나 테이블에서 요청을 선택하면 실행 컨텍스트가 표시됩니다.",
        assistantTitle: page.seed.assistantTitle,
        assistantDescription: page.seed.assistantDescription,
        assistantContext: selectedItem
          ? [
              { label: "Page", value: page.seed.pageTitle },
              { label: "Service", value: selectedItem.service },
              { label: "Environment", value: selectedItem.environment },
              { label: "Selected", value: selectedItem.requestId },
            ]
          : [{ label: "Page", value: page.seed.pageTitle }],
        intents: page.seed.intents,
        messages: page.assistant.messages,
        isSubmitting: page.assistant.isSubmitting,
        error: page.assistant.error,
        composerText: page.assistant.composerText,
        composerPlaceholder: page.seed.composerPlaceholder,
        template: selectedItem ? buildDeployTemplate(selectedItem) : null,
      };
    }
    case "approve": {
      const page = pages.approve;
      const filteredItems = filterApprovalItemsByTab(page.items, page.activeTab);
      const selectedItem =
        filteredItems.find((item) => item.id === page.selectedId) ?? filteredItems[0] ?? null;
      const tableRows = buildApprovalTableRows(filteredItems, page.activeTab).map((row) => ({
        ...row,
        isSelected: row.id === selectedItem?.id,
      }));

      return {
        key: "approve",
        navLabel: page.seed.navLabel,
        pageTitle: page.seed.pageTitle,
        pageDescription: approvalTabMeta[page.activeTab].role,
        pageScope: page.seed.pageScope,
        lastUpdated: page.seed.lastUpdated,
        filters: [
          `Type: ${approvalTabMeta[page.activeTab].label}`,
          ...page.seed.filters.slice(1),
        ],
        primaryActionLabel: page.seed.primaryActionLabel,
        summaryMetrics: buildApprovalSummaryMetrics(filteredItems),
        tableTitle: page.seed.tableTitle,
        tableColumns: buildApprovalTableColumns(page.activeTab),
        tableRows,
        detailTitle: "Approval detail panel",
        detailDescription: approvalTabMeta[page.activeTab].tableDescription,
        detailSections: selectedItem ? buildApprovalDetailSections(selectedItem) : [],
        emptyDetailTitle: "선택된 승인 요청 없음",
        emptyDetailDescription: "현재 탭에서 요청을 선택하면 승인 판단에 필요한 detail과 근거가 우측 패널에 반영됩니다.",
        assistantTitle: page.seed.assistantTitle,
        assistantDescription: `${approvalTabMeta[page.activeTab].label} 요청의 핵심 리스크와 승인 근거를 압축해서 보여줍니다.`,
        assistantContext: selectedItem
          ? [
              { label: "Page", value: page.seed.pageTitle },
              { label: "Type", value: approvalTabMeta[selectedItem.type].label },
              { label: "Environment", value: selectedItem.environment },
              { label: "Selected", value: selectedItem.title },
            ]
          : [{ label: "Page", value: page.seed.pageTitle }],
        intents: page.seed.intents,
        messages: page.assistant.messages,
        isSubmitting: page.assistant.isSubmitting,
        error: page.assistant.error,
        composerText: page.assistant.composerText,
        composerPlaceholder: page.seed.composerPlaceholder,
        template: selectedItem ? buildApprovalTemplate(selectedItem) : null,
      };
    }
    case "rollback": {
      const page = pages.rollback;
      const selectedItem = page.items.find((item) => item.id === page.selectedId) ?? null;
      const selectedDeployment =
        selectedItem?.deploymentHistory.find((deployment) => deployment.id === page.activeDeploymentId) ??
        selectedItem?.deploymentHistory.find((deployment) => deployment.id === selectedItem.recommendedRollbackDeploymentId) ??
        selectedItem?.deploymentHistory[0] ??
        null;

      return {
        key: "rollback",
        navLabel: page.seed.navLabel,
        pageTitle: page.seed.pageTitle,
        pageDescription: page.seed.pageDescription,
        pageScope: page.seed.pageScope,
        lastUpdated: page.seed.lastUpdated,
        filters: page.seed.filters,
        primaryActionLabel: page.seed.primaryActionLabel,
        summaryMetrics: buildRollbackSummaryMetrics(page.items),
        tableTitle: page.seed.tableTitle,
        tableColumns: [
          "Service",
          "Environment",
          "Incident",
          "Current Version",
          "Latest Deployment",
          "Blast Radius",
          "Updated At",
          "Status",
        ],
        tableRows: page.items.map((item) => ({
          id: item.id,
          cells: [
            { value: item.service, mono: true },
            { value: item.environment, mono: true },
            { value: item.incidentSummary },
            { value: item.currentVersion, mono: true },
            { value: item.latestDeploymentId, mono: true },
            { value: item.blastRadius },
            { value: item.lastUpdated, mono: true },
          ],
          statusLabel:
            item.latestStatus === "recovered"
              ? "recovered"
              : item.latestStatus === "critical"
                ? "critical"
                : item.latestStatus === "degraded"
                  ? "degraded"
                  : "watch",
          statusTone:
            item.latestStatus === "recovered"
              ? "success"
              : item.latestStatus === "critical"
                ? "danger"
                : "warning",
          isSelected: item.id === page.selectedId,
        })),
        detailTitle: "Rollback target detail",
        detailDescription: "선택한 서비스의 rollback target과 근거를 서비스 기준으로 검토합니다.",
        detailSections: selectedItem ? buildRollbackDetailSections(selectedItem, selectedDeployment) : [],
        emptyDetailTitle: "선택된 rollback 서비스 없음",
        emptyDetailDescription: "서비스를 선택하면 추천 rollback target과 근거가 동기화됩니다.",
        assistantTitle: page.seed.assistantTitle,
        assistantDescription: page.seed.assistantDescription,
        assistantContext: selectedItem
          ? [
              { label: "Page", value: page.seed.pageTitle },
              { label: "Service", value: selectedItem.service },
              { label: "Environment", value: selectedItem.environment },
              { label: "Selected", value: selectedDeployment?.version ?? selectedItem.recommendedRollbackVersion },
            ]
          : [{ label: "Page", value: page.seed.pageTitle }],
        intents: page.seed.intents,
        messages: page.assistant.messages,
        isSubmitting: page.assistant.isSubmitting,
        error: page.assistant.error,
        composerText: page.assistant.composerText,
        composerPlaceholder: page.seed.composerPlaceholder,
        template: selectedItem
          ? buildRollbackTemplate(selectedItem, selectedDeployment, page.assistant.activeTemplateId ?? undefined)
          : null,
      };
    }
  }
}
