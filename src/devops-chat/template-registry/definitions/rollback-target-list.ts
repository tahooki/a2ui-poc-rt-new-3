import type { TemplateRegistryDefinition } from "../registry-types";

export const rollbackTargetListDef: TemplateRegistryDefinition = {
  templateId: "rollback_target_list",
  version: "1.0.0",
  status: "active",
  rendererKey: "rollback_target_list",
  sourcePath: "src/devops-console/templates/rollback-target-list.tsx",
  title: "Rollback Target List",
  description: "선택한 서비스의 배포 인스턴스 목록을 보여주는 surface. eligible/not-eligible 분리, 추천 인스턴스 표시, 개별 롤백 버튼 제공.",
  inputContract: {
    schemaVersion: "1.0",
    fields: [
      { path: "templateId", type: "string", required: true, enumValues: ["rollback_target_list"] },
      { path: "state", type: "string", required: true, enumValues: ["active", "selected"] },
      { path: "service", type: "string", required: true, description: "대상 서비스명" },
      { path: "environment", type: "string", required: false },
      { path: "currentVersion", type: "string", required: false },
      { path: "incidentSummary", type: "string", required: false },
      { path: "severity", type: "string", required: false },
      { path: "targets", type: "RollbackTargetItem[]", required: true, description: "배포 인스턴스 목록" },
      { path: "recommendedTargetId", type: "string | null", required: false },
    ],
  },
  selectionPolicyDoc: {
    intentKeys: ["rollback.start"],
    requiredFacts: ["rollback.serviceName", "rollback.candidates"],
    reasonTemplate: "rollback.start에서 서비스 + 후보 목록이 있으면 target list 선택",
  },
  previewCases: [
    {
      id: "active",
      title: "롤백 대상 인스턴스 목록",
      payload: {
        templateId: "rollback_target_list", state: "active",
        service: "payments-api", environment: "production",
        currentVersion: "v2.3.18", incidentSummary: "INC-842 card timeout",
        severity: "high", recommendedTargetId: "deploy-pay-316",
        targets: [
          {
            id: "deploy-pay-316", version: "v2.3.16", deployedAt: "2026-03-20",
            strategy: "canary", status: "dry_run_ready", rollbackRisk: "low",
            rollbackEligible: true, isRecommended: true,
            whyThisTarget: "마지막 안정 릴리즈",
            evidence: ["카드 결제 정상", "latency 정상"],
            actions: [{ actionId: "rollback.select_target", label: "이 버전으로 롤백", variant: "primary",
              targetRef: { entityType: "rollback_deployment", entityId: "deploy-pay-316" } }],
          },
          {
            id: "deploy-pay-314", version: "v2.3.14", deployedAt: "2026-03-15",
            strategy: "rolling", status: "identified", rollbackRisk: "medium",
            rollbackEligible: true, isRecommended: false,
            whyThisTarget: "2주 전 릴리즈",
            evidence: [],
            actions: [{ actionId: "rollback.select_target", label: "이 버전으로 롤백", variant: "primary",
              targetRef: { entityType: "rollback_deployment", entityId: "deploy-pay-314" } }],
          },
        ],
        primaryActionLabel: "추천 버전으로 롤백",
        secondaryActionLabel: "서비스 다시 선택",
      },
    },
  ],
};
