import type { TemplateRegistryDefinition } from "../registry-types";

export const rollbackSummaryDef: TemplateRegistryDefinition = {
  templateId: "rollback_summary",
  version: "1.0.0",
  status: "active",
  rendererKey: "rollback_summary",
  sourcePath: "src/devops-console/templates/rollback-summary.tsx",
  title: "Rollback Summary",
  description: "Rollback 대상의 현재 상태, 추천 버전, 근거를 요약해서 보여주는 surface. Dry run 시작 액션을 제공한다.",
  inputContract: {
    schemaVersion: "1.0",
    fields: [
      { path: "templateId", type: "string", required: true, enumValues: ["rollback_summary"] },
      { path: "state", type: "string", required: true, example: "identified", enumValues: ["identified", "dry_run_ready"] },
      { path: "service", type: "string", required: true, description: "대상 서비스", example: "orders-api" },
      { path: "environment", type: "string", required: true, example: "production" },
      { path: "incident", type: "string", required: true, description: "인시던트 요약" },
      { path: "currentVersion", type: "string", required: true },
      { path: "recommendedVersion", type: "string", required: true },
      { path: "evidence", type: "string[]", required: false },
      { path: "blastRadius", type: "string", required: false },
    ],
  },
  selectionPolicyDoc: {
    intentKeys: ["rollback.start"],
    requiredFacts: ["rollback.serviceName"],
    reasonTemplate: "rollback.start에서 serviceName만 있으면 요약 surface 선택",
  },
  previewCases: [
    {
      id: "identified",
      title: "Rollback 대상 식별됨",
      payload: {
        templateId: "rollback_summary", state: "identified", service: "orders-api",
        environment: "production", incident: "OOM crash in orders-api", currentVersion: "v3.1.0",
        recommendedVersion: "v3.0.2", evidence: ["Memory spike at 14:32", "Pod restarts: 12"],
        blastRadius: "high", primaryActionLabel: "Dry run 시작", secondaryActionLabel: "영향 범위 보기",
      },
    },
  ],
};
