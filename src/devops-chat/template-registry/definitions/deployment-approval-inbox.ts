import type { TemplateRegistryDefinition } from "../registry-types";

export const deploymentApprovalInboxDef: TemplateRegistryDefinition = {
  templateId: "deployment_approval_inbox",
  version: "1.0.0",
  status: "active",
  rendererKey: "deployment_approval_inbox",
  sourcePath: "src/devops-console/templates/deployment-approval-inbox.tsx",
  title: "Deployment Approval Inbox",
  description: "승인 요청을 검토하고 승인/보류 결정을 내리는 surface. 리스크 요약, 검증 결과, key facts를 표시한다.",
  inputContract: {
    schemaVersion: "1.0",
    fields: [
      { path: "templateId", type: "string", required: true, description: "Template identifier", enumValues: ["deployment_approval_inbox"] },
      { path: "state", type: "string", required: true, description: "승인 상태", example: "pending", enumValues: ["pending", "approved", "hold"] },
      { path: "requestId", type: "string", required: true, description: "요청 ID", example: "REQ-001" },
      { path: "requestTypeLabel", type: "string", required: false, description: "요청 유형 라벨", example: "Temporary Access" },
      { path: "title", type: "string", required: true, description: "요청 제목", example: "admin@corp access to production DB" },
      { path: "environment", type: "string", required: true, description: "대상 환경", example: "production" },
      { path: "riskSummary", type: "string", required: false, description: "리스크 요약" },
      { path: "verificationSummary", type: "string", required: false, description: "검증 요약" },
      { path: "impactScope", type: "string", required: false, description: "영향 범위" },
      { path: "checks", type: "string[]", required: false, description: "검증 체크 항목" },
      { path: "keyFacts", type: "Array<{label,value,mono?}>", required: false, description: "핵심 사실 목록" },
    ],
  },
  selectionPolicyDoc: {
    intentKeys: ["approval.review"],
    requiredFacts: ["approval.requestId"],
    reasonTemplate: "approval.review intent에서 requestId가 확보되면 선택",
  },
  previewCases: [
    {
      id: "pending",
      title: "승인 대기 중",
      payload: {
        templateId: "deployment_approval_inbox", state: "pending", requestId: "REQ-001",
        requestTypeLabel: "Temporary Access", title: "admin@corp → production DB",
        environment: "production", riskSummary: "Low risk", verificationSummary: "All checks passed",
        impactScope: "Single DB", decisionGuidance: "expires 2026-04-01",
        checks: ["Identity verified", "Scope validated"], keyFacts: [{ label: "Principal", value: "admin@corp", mono: true }],
        primaryActionLabel: "승인", secondaryActionLabel: "보류",
      },
    },
  ],
};
