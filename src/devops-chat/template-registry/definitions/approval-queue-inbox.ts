import type { TemplateRegistryDefinition } from "../registry-types";

export const approvalQueueInboxDef: TemplateRegistryDefinition = {
  templateId: "approval_queue_inbox",
  version: "1.0.0",
  status: "active",
  rendererKey: "approval_queue_inbox",
  sourcePath: "src/devops-console/templates/approval-queue-inbox.tsx",
  title: "Approval Queue Inbox",
  description: "여러 승인 요청을 큐 목록으로 보여주는 surface. 상태별 그룹핑, 개별 승인/보류 액션, 요약 카운터를 제공한다.",
  inputContract: {
    schemaVersion: "1.0",
    fields: [
      { path: "templateId", type: "string", required: true, enumValues: ["approval_queue_inbox"] },
      { path: "state", type: "string", required: true, example: "active", enumValues: ["active", "all_done"] },
      { path: "items", type: "ApprovalQueueItem[]", required: true, description: "승인 요청 목록" },
      { path: "summary", type: "object", required: true, description: "pending/approved/held/highRisk 카운트" },
      { path: "expandedItemId", type: "string | null", required: false },
    ],
  },
  selectionPolicyDoc: {
    intentKeys: ["approval.review"],
    requiredFacts: ["approval.queueItems"],
    reasonTemplate: "approval.review intent에서 큐 데이터가 확보되면 큐 inbox 선택",
  },
  previewCases: [
    {
      id: "active-queue",
      title: "대기 중인 요청이 있는 큐",
      payload: {
        templateId: "approval_queue_inbox",
        state: "active",
        items: [
          {
            id: "apr-access-101", type: "temporary_access", typeLabel: "Temporary Access",
            title: "admin@corp → prod DB", environment: "production", requestedBy: "alice@corp",
            riskSummary: "Medium risk", riskTone: "warning", status: "pending",
            keyFacts: [], actions: [
              { actionId: "approval.approve_item", label: "승인", variant: "primary", targetRef: { entityType: "approval", entityId: "apr-access-101" } },
              { actionId: "approval.hold_item", label: "보류", variant: "secondary", targetRef: { entityType: "approval", entityId: "apr-access-101" } },
            ],
          },
          {
            id: "apr-config-201", type: "config_change", typeLabel: "Config Change",
            title: "rate-limit 1000→5000", environment: "production", requestedBy: "bob@corp",
            riskSummary: "High risk", riskTone: "danger", status: "pending",
            keyFacts: [], actions: [
              { actionId: "approval.approve_item", label: "승인", variant: "primary", targetRef: { entityType: "approval", entityId: "apr-config-201" } },
              { actionId: "approval.hold_item", label: "보류", variant: "secondary", targetRef: { entityType: "approval", entityId: "apr-config-201" } },
            ],
          },
        ],
        summary: { pending: 2, approved: 1, held: 0, highRisk: 1 },
        expandedItemId: null,
        primaryActionLabel: "전체 승인",
        secondaryActionLabel: "고위험만 보기",
      },
    },
  ],
};
