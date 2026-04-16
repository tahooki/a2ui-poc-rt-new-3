import type { BindingRecipe } from "../binding/binding-engine.js";
import {
  APPROVAL_QUEUE_INBOX_RECIPE,
  DEPLOY_LAUNCHPAD_RECIPE,
  ROLLBACK_SUMMARY_RECIPE,
} from "../binding/binding-engine.js";

export type TemplateActionRegistration = {
  actionId: string;
  label: string;
  variant: "primary" | "secondary" | "danger" | "ghost";
  kind: "submit" | "select" | "refresh" | "navigate";
};

export type TemplateIntentRegistration = {
  intentKey: string;
  requiredFacts: string[];
  optionalFacts?: string[];
};

export type TemplateResolverRegistration =
  | {
      kind: "deploy_service";
      endpointTemplate: "/api/services/{serviceName}";
      serviceNameFact: "serviceName";
      defaultEnvironment: string;
      defaultRequestDetail: Record<string, string>;
      impactSummaryTemplate: "{serviceName} {environment} 환경에 {recommendedVersion} 배포";
    }
  | {
      kind: "approval_queue";
      endpoint: "/api/approvals";
    }
  | {
      kind: "rollback_incidents";
      endpoint: "/api/incidents";
    };

export type TemplateContractRegistration = {
  requiredFields: string[];
  optionalFields: string[];
};

export type TemplateRegistration = {
  templateId: string;
  version: string;
  title: string;
  status: "published" | "draft" | "disabled";
  description: string;
  intents: TemplateIntentRegistration[];
  resolver: TemplateResolverRegistration;
  bindingRecipe: BindingRecipe;
  contract: TemplateContractRegistration;
  actions: TemplateActionRegistration[];
};

export const TEMPLATE_CATALOG: TemplateRegistration[] = [
  {
    templateId: "deploy_launchpad",
    version: "1.0.0",
    title: "Deploy Launchpad",
    status: "published",
    description: "서비스명 기반 배포 준비 정보를 카드로 보여주는 A2UI 템플릿",
    intents: [
      {
        intentKey: "deploy.start",
        requiredFacts: ["serviceName"],
        optionalFacts: ["environment", "targetVersion"],
      },
    ],
    resolver: {
      kind: "deploy_service",
      endpointTemplate: "/api/services/{serviceName}",
      serviceNameFact: "serviceName",
      defaultEnvironment: "production",
      defaultRequestDetail: {
        cpu: "1024",
        memory: "2048",
        desiredCount: "4",
        deploymentStrategy: "rolling",
        requestedBy: "AI Assistant",
      },
      impactSummaryTemplate: "{serviceName} {environment} 환경에 {recommendedVersion} 배포",
    },
    bindingRecipe: DEPLOY_LAUNCHPAD_RECIPE,
    contract: {
      requiredFields: ["service", "environment", "targetVersion", "strategy", "state"],
      optionalFields: ["imageDetail", "requestDetail", "riskSummary", "preflightChecks"],
    },
    actions: [
      { actionId: "deploy.start", label: "배포 시작", variant: "primary", kind: "submit" },
      { actionId: "deploy.refresh", label: "초안 새로 고침", variant: "ghost", kind: "refresh" },
    ],
  },
  {
    templateId: "approval_queue_inbox",
    version: "1.0.0",
    title: "Approval Queue Inbox",
    status: "published",
    description: "승인 대기 항목과 상태별 요약을 보여주는 A2UI 템플릿",
    intents: [
      {
        intentKey: "approval.review",
        requiredFacts: [],
      },
    ],
    resolver: {
      kind: "approval_queue",
      endpoint: "/api/approvals",
    },
    bindingRecipe: APPROVAL_QUEUE_INBOX_RECIPE,
    contract: {
      requiredFields: ["items"],
      optionalFields: ["byStatus", "byType", "queueSummary"],
    },
    actions: [
      { actionId: "approve.selected", label: "선택 항목 승인", variant: "primary", kind: "submit" },
      { actionId: "approve.hold", label: "보류", variant: "ghost", kind: "submit" },
    ],
  },
  {
    templateId: "rollback_summary",
    version: "1.0.0",
    title: "Rollback Summary",
    status: "published",
    description: "인시던트 기반 롤백 후보와 권장 사항을 보여주는 A2UI 템플릿",
    intents: [
      {
        intentKey: "rollback.start",
        requiredFacts: ["serviceName"],
      },
    ],
    resolver: {
      kind: "rollback_incidents",
      endpoint: "/api/incidents",
    },
    bindingRecipe: ROLLBACK_SUMMARY_RECIPE,
    contract: {
      requiredFields: ["service", "candidates"],
      optionalFields: ["serviceHealth", "causeSummary", "recommendation"],
    },
    actions: [
      { actionId: "rollback.execute", label: "롤백 실행", variant: "danger", kind: "submit" },
    ],
  },
];

export function listTemplateSummaries() {
  return TEMPLATE_CATALOG.map(({ templateId, version, title, status, description }) => ({
    templateId,
    version,
    title,
    status,
    description,
  }));
}

export function getTemplateRegistration(templateId: string): TemplateRegistration | undefined {
  return TEMPLATE_CATALOG.find((template) => template.templateId === templateId);
}

export function getTemplateIntentRegistration(
  intentKey: string,
): { template: TemplateRegistration; intent: TemplateIntentRegistration } | undefined {
  for (const template of TEMPLATE_CATALOG) {
    const intent = template.intents.find((candidate) => candidate.intentKey === intentKey);
    if (intent) return { template, intent };
  }

  return undefined;
}

export function getTemplateContract(templateId: string) {
  const template = getTemplateRegistration(templateId);
  if (!template) return { error: "Template not found" };

  return {
    templateId: template.templateId,
    ...template.contract,
  };
}
