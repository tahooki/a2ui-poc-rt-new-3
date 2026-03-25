import {
  buildApprovalTemplate,
  buildDeployTemplate,
  buildRollbackTemplate,
} from "@/devops-chat/templates/build-template-envelope";
import {
  approvalStatusMeta,
  deployStatusMeta,
  rollbackStatusMeta,
} from "@/devops-chat/lib/status";
import type {
  ApprovalItem,
  ApprovalSeed,
  DeployItem,
  DeploySeed,
  DetailSection,
  PageKey,
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
  messages: string[];
  composerText: string;
  composerPlaceholder: string;
  template: TemplateEnvelope | null;
};

type DeployRuntime = {
  seed: DeploySeed;
  items: DeployItem[];
  selectedId: string | null;
  assistant: {
    composerText: string;
    activeTemplateId: TemplateEnvelope["templateId"] | null;
    messages: string[];
  };
};

type ApprovalRuntime = {
  seed: ApprovalSeed;
  items: ApprovalItem[];
  selectedId: string | null;
  assistant: {
    composerText: string;
    activeTemplateId: TemplateEnvelope["templateId"] | null;
    messages: string[];
  };
};

type RollbackRuntime = {
  seed: RollbackSeed;
  items: RollbackItem[];
  selectedId: string | null;
  assistant: {
    composerText: string;
    activeTemplateId: TemplateEnvelope["templateId"] | null;
    messages: string[];
  };
};

export type RuntimePageMap = {
  deploy: DeployRuntime;
  approve: ApprovalRuntime;
  rollback: RollbackRuntime;
};

function buildDeploySummaryMetrics(items: DeployItem[]): SummaryMetricViewModel[] {
  return [
    {
      label: "오늘 배포 예정",
      value: `${items.length}`,
      tone: "info",
    },
    {
      label: "진행 중 배포",
      value: `${items.filter((item) => item.status === "deploying" || item.status === "verifying").length}`,
      tone: "warning",
    },
    {
      label: "실패 배포",
      value: `${items.filter((item) => item.status === "failed").length}`,
      tone: "danger",
    },
    {
      label: "승인 대기",
      value: `${items.filter((item) => item.status === "approval_pending").length}`,
      tone: "neutral",
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

function buildRollbackSummaryMetrics(items: RollbackItem[]): SummaryMetricViewModel[] {
  return [
    {
      label: "오픈 인시던트",
      value: `${items.filter((item) => item.status !== "executed").length}`,
      tone: "danger",
    },
    {
      label: "롤백 후보",
      value: `${items.filter((item) => item.status !== "executed").length}`,
      tone: "warning",
    },
    {
      label: "최근 실패 배포",
      value: `${items.filter((item) => item.status === "identified" || item.status === "dry_run_ready").length}`,
      tone: "danger",
    },
    {
      label: "복구 완료",
      value: `${items.filter((item) => item.status === "executed").length}`,
      tone: "success",
    },
  ];
}

function buildDeployDetailSections(item: DeployItem): DetailSection[] {
  return [
    {
      title: "기본 정보",
      items: [
        { label: "Service", value: item.service, mono: true },
        { label: "Environment", value: item.environment, mono: true },
        { label: "Baseline", value: `${item.baselineDeployment} · ${item.baselineVersion}`, mono: true },
        { label: "Requested by", value: item.requestedBy, mono: true },
      ],
    },
    {
      title: "최근 성공 배포",
      items: [
        { label: "Version", value: item.recentSuccess.version, mono: true },
        { label: "Strategy", value: item.recentSuccess.strategy, mono: true },
        { label: "Release", value: item.recentSuccess.releaseId, mono: true },
        { label: "Completed", value: item.recentSuccess.deployedAt, mono: true },
      ],
    },
    {
      title: "Artifact 정보",
      items: [
        { label: "Artifact", value: item.artifact, mono: true },
        { label: "Target version", value: item.targetVersion, mono: true },
        { label: "추천 버전", value: item.recommendedVersion, mono: true },
      ],
    },
    {
      title: "Rollout 설정",
      items: item.rolloutConfig.map((value, index) => ({
        label: `Rule ${index + 1}`,
        value,
      })),
    },
    {
      title: "Health check 정보",
      items: [
        { label: "Endpoint", value: item.healthCheckPath, mono: true },
        ...item.healthSignals.map((value, index) => ({
          label: `Signal ${index + 1}`,
          value,
        })),
      ],
    },
    {
      title: "Activity log",
      items: item.activityLog.map((entry) => ({
        label: entry.time,
        value: entry.value,
      })),
    },
  ];
}

function buildApprovalDetailSections(item: ApprovalItem): DetailSection[] {
  return [
    {
      title: "요청 개요",
      items: [
        { label: "Request", value: item.id, mono: true },
        { label: "Service", value: item.service, mono: true },
        { label: "Requester", value: item.requestedBy, mono: true },
        { label: "Window", value: item.requestWindow, mono: true },
      ],
    },
    {
      title: "변경 요약",
      items: item.changeSummary.map((value, index) => ({
        label: `Change ${index + 1}`,
        value,
      })),
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
    {
      title: "롤백 가능 여부",
      items: [{ label: "Rollback", value: item.rollbackAvailability }],
    },
    {
      title: "관련 메모",
      items: item.notes.map((value, index) => ({
        label: `Note ${index + 1}`,
        value,
      })),
    },
  ];
}

function buildRollbackDetailSections(item: RollbackItem): DetailSection[] {
  return [
    {
      title: "장애 요약",
      items: [
        { label: "Incident", value: item.incident, mono: true },
        { label: "Service", value: item.service, mono: true },
        { label: "Severity", value: item.severity, mono: true },
        { label: "Current version", value: item.currentVersion, mono: true },
      ],
    },
    {
      title: "최근 배포 이력",
      items: item.recentDeployHistory.map((value, index) => ({
        label: `Event ${index + 1}`,
        value,
      })),
    },
    {
      title: "후보 복귀 버전",
      items: [
        { label: "Last stable", value: item.lastStableVersion, mono: true },
        ...item.evidence.map((value, index) => ({
          label: `Evidence ${index + 1}`,
          value,
        })),
      ],
    },
    {
      title: "영향 서비스",
      items: [
        { label: "Blast radius", value: item.blastRadius },
        { label: "Recovery window", value: item.recoveryWindow },
      ],
    },
    {
      title: "Operator note",
      items: item.notes.map((value, index) => ({
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
        summaryMetrics: buildDeploySummaryMetrics(page.items),
        tableTitle: page.seed.tableTitle,
        tableColumns: [
          "Service",
          "Environment",
          "Target Version",
          "Strategy",
          "Requested By",
          "Updated At",
          "Status",
        ],
        tableRows: page.items.map((item) => ({
          id: item.id,
          cells: [
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
        detailDescription: "현재 선택한 요청의 핵심 운영 정보와 최근 검증 이력을 보여줍니다.",
        detailSections: selectedItem ? buildDeployDetailSections(selectedItem) : [],
        emptyDetailTitle: "선택된 배포 없음",
        emptyDetailDescription: "테이블에서 배포 후보를 선택하면 baseline, artifact, health, activity 정보가 동기화됩니다.",
        assistantTitle: page.seed.assistantTitle,
        assistantDescription: page.seed.assistantDescription,
        assistantContext: selectedItem
          ? [
              { label: "Page", value: page.seed.pageTitle },
              { label: "Service", value: selectedItem.service },
              { label: "Environment", value: selectedItem.environment },
              { label: "Selected", value: selectedItem.id },
            ]
          : [{ label: "Page", value: page.seed.pageTitle }],
        intents: page.seed.intents,
        messages: page.assistant.messages,
        composerText: page.assistant.composerText,
        composerPlaceholder: page.seed.composerPlaceholder,
        template: selectedItem ? buildDeployTemplate(selectedItem) : null,
      };
    }
    case "approve": {
      const page = pages.approve;
      const selectedItem = page.items.find((item) => item.id === page.selectedId) ?? null;

      return {
        key: "approve",
        navLabel: page.seed.navLabel,
        pageTitle: page.seed.pageTitle,
        pageDescription: page.seed.pageDescription,
        pageScope: page.seed.pageScope,
        lastUpdated: page.seed.lastUpdated,
        filters: page.seed.filters,
        primaryActionLabel: page.seed.primaryActionLabel,
        summaryMetrics: buildApprovalSummaryMetrics(page.items),
        tableTitle: page.seed.tableTitle,
        tableColumns: [
          "Request ID",
          "Service",
          "Environment",
          "Requested By",
          "Risk",
          "Verification",
          "Requested At",
          "Status",
        ],
        tableRows: page.items.map((item) => ({
          id: item.id,
          cells: [
            { value: item.id, mono: true },
            { value: item.service, mono: true },
            { value: item.environment, mono: true },
            { value: item.requestedBy, mono: true },
            { value: item.riskSummary },
            { value: item.verificationSummary },
            { value: item.requestedAt, mono: true },
          ],
          statusLabel: approvalStatusMeta[item.status].label,
          statusTone: approvalStatusMeta[item.status].tone,
          isSelected: item.id === page.selectedId,
        })),
        detailTitle: "Approval detail panel",
        detailDescription: "긴 요청서를 다시 읽지 않고도 승인 판단이 가능하도록 핵심 정보를 압축합니다.",
        detailSections: selectedItem ? buildApprovalDetailSections(selectedItem) : [],
        emptyDetailTitle: "선택된 승인 요청 없음",
        emptyDetailDescription: "요청을 선택하면 리스크, 검증, 롤백 가능 여부와 메모가 우측 패널에 반영됩니다.",
        assistantTitle: page.seed.assistantTitle,
        assistantDescription: page.seed.assistantDescription,
        assistantContext: selectedItem
          ? [
              { label: "Page", value: page.seed.pageTitle },
              { label: "Service", value: selectedItem.service },
              { label: "Environment", value: selectedItem.environment },
              { label: "Selected", value: selectedItem.id },
            ]
          : [{ label: "Page", value: page.seed.pageTitle }],
        intents: page.seed.intents,
        messages: page.assistant.messages,
        composerText: page.assistant.composerText,
        composerPlaceholder: page.seed.composerPlaceholder,
        template: selectedItem ? buildApprovalTemplate(selectedItem) : null,
      };
    }
    case "rollback": {
      const page = pages.rollback;
      const selectedItem = page.items.find((item) => item.id === page.selectedId) ?? null;

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
          "Incident",
          "Current Version",
          "Last Stable",
          "Severity",
          "Updated At",
          "Status",
        ],
        tableRows: page.items.map((item) => ({
          id: item.id,
          cells: [
            { value: item.service, mono: true },
            { value: item.incident },
            { value: item.currentVersion, mono: true },
            { value: item.lastStableVersion, mono: true },
            { value: item.severity, mono: true },
            { value: item.updatedAt, mono: true },
          ],
          statusLabel: rollbackStatusMeta[item.status].label,
          statusTone: rollbackStatusMeta[item.status].tone,
          isSelected: item.id === page.selectedId,
        })),
        detailTitle: "Rollback analysis detail",
        detailDescription: "문제 버전, 안정 버전, 영향 범위를 한 화면에서 검토하는 운영 패널입니다.",
        detailSections: selectedItem ? buildRollbackDetailSections(selectedItem) : [],
        emptyDetailTitle: "선택된 롤백 후보 없음",
        emptyDetailDescription: "인시던트 후보를 선택하면 요약, 영향 범위, dry run 체크가 함께 동기화됩니다.",
        assistantTitle: page.seed.assistantTitle,
        assistantDescription: page.seed.assistantDescription,
        assistantContext: selectedItem
          ? [
              { label: "Page", value: page.seed.pageTitle },
              { label: "Service", value: selectedItem.service },
              { label: "Environment", value: selectedItem.environment },
              { label: "Selected", value: selectedItem.id },
            ]
          : [{ label: "Page", value: page.seed.pageTitle }],
        intents: page.seed.intents,
        messages: page.assistant.messages,
        composerText: page.assistant.composerText,
        composerPlaceholder: page.seed.composerPlaceholder,
        template: selectedItem
          ? buildRollbackTemplate(selectedItem, page.assistant.activeTemplateId ?? undefined)
          : null,
      };
    }
  }
}
