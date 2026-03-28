import type { TemplateRegistryDefinition } from "../registry-types";

export const dryRunStepperDef: TemplateRegistryDefinition = {
  templateId: "dry_run_stepper",
  version: "1.0.0",
  status: "active",
  rendererKey: "dry_run_stepper",
  sourcePath: "src/devops-console/templates/dry-run-stepper.tsx",
  title: "Dry Run Stepper",
  description: "Rollback dry run의 단계별 진행 상태를 표시하는 surface.",
  inputContract: {
    schemaVersion: "1.0",
    fields: [
      { path: "templateId", type: "string", required: true, enumValues: ["dry_run_stepper"] },
      { path: "state", type: "string", required: true, enumValues: ["not_started", "running", "completed"] },
      { path: "service", type: "string", required: true },
      { path: "environment", type: "string", required: true },
      { path: "targetVersion", type: "string", required: true },
      { path: "steps", type: "string[]", required: true, description: "Dry run 단계 목록" },
      { path: "helperText", type: "string", required: false },
    ],
  },
  selectionPolicyDoc: {
    intentKeys: ["rollback.start"],
    requiredFacts: ["rollback.serviceName", "rollback.context"],
    reasonTemplate: "rollback.start에서 context까지 있으면 dry-run stepper 후보",
  },
  previewCases: [
    {
      id: "running",
      title: "Dry run 진행 중",
      payload: {
        templateId: "dry_run_stepper", state: "running", service: "orders-api",
        environment: "production", targetVersion: "v3.0.2",
        steps: ["환경 검증", "의존성 확인", "호환성 체크", "트래픽 전환 시뮬레이션"],
        helperText: "Dry run 진행 중", primaryActionLabel: "Dry run 완료", secondaryActionLabel: "요약 보기",
      },
    },
  ],
};
