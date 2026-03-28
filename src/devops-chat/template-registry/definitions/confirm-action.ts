import type { TemplateRegistryDefinition } from "../registry-types";

export const confirmActionDef: TemplateRegistryDefinition = {
  templateId: "confirm_action",
  version: "1.0.0",
  status: "active",
  rendererKey: "confirm_action",
  sourcePath: "src/devops-console/templates/confirm-action.tsx",
  title: "Confirm Action",
  description: "Rollback 최종 확정을 위한 surface. 경고, 체크리스트, 확정 버튼을 포함한다.",
  inputContract: {
    schemaVersion: "1.0",
    fields: [
      { path: "templateId", type: "string", required: true, enumValues: ["confirm_action"] },
      { path: "state", type: "string", required: true, enumValues: ["confirm_ready", "executed"] },
      { path: "service", type: "string", required: true },
      { path: "environment", type: "string", required: true },
      { path: "targetVersion", type: "string", required: true },
      { path: "warning", type: "string", required: false, description: "위험도 경고 메시지" },
      { path: "checklist", type: "string[]", required: true, description: "최종 확인 체크리스트" },
    ],
  },
  selectionPolicyDoc: {
    intentKeys: ["rollback.start"],
    requiredFacts: ["rollback.serviceName", "rollback.context"],
    reasonTemplate: "rollback.start에서 context까지 있으면 confirm 후보 (dry-run stepper와 경쟁)",
  },
  previewCases: [
    {
      id: "confirm_ready",
      title: "Rollback 확정 대기",
      payload: {
        templateId: "confirm_action", state: "confirm_ready", service: "orders-api",
        environment: "production", targetVersion: "v3.0.2",
        warning: "critical severity incident · high blast radius",
        checklist: ["모든 dry run 통과 확인", "운영팀 승인 확인", "모니터링 대시보드 확인"],
        primaryActionLabel: "Rollback 확정", secondaryActionLabel: "요약 보기",
      },
    },
  ],
};
