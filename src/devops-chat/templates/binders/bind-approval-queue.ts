/**
 * Binder: approval_queue_inbox (multi-item queue)
 *
 * Assembles payload from conversation facts for the approval queue template.
 */

import type { ConversationFacts, BindingResult } from "@/devops-chat/types/conversation";
import type { ApprovalQueueTemplateData, ApprovalQueueItem } from "@/devops-chat/types/templates";
import { getSlotValue } from "@/devops-chat/server/orchestration/slot-memory";
import { APPROVAL_ACTION_IDS, type SurfaceActionDescriptor } from "@/devops-chat/actions/action-types";

const TYPE_LABELS: Record<string, string> = {
  temporary_access: "Temporary Access",
  config_change: "Config Change",
  data_operation: "Data Operation",
};

function buildItemActions(itemId: string, status: string): SurfaceActionDescriptor[] {
  if (status !== "pending") return [];
  return [
    {
      actionId: APPROVAL_ACTION_IDS.APPROVE_ITEM,
      label: "승인",
      variant: "primary",
      confirmationRequired: true,
      confirmationMessage: `${itemId}을(를) 승인하시겠습니까?`,
      targetRef: { entityType: "approval", entityId: itemId },
    },
    {
      actionId: APPROVAL_ACTION_IDS.HOLD_ITEM,
      label: "보류",
      variant: "secondary",
      targetRef: { entityType: "approval", entityId: itemId },
    },
  ];
}

export function bindApprovalQueue(
  facts: ConversationFacts,
  intentKey: string,
): BindingResult {
  const usedFacts: string[] = [];
  const missingFacts: string[] = [];

  const rawItems = getSlotValue(facts, "approval.queueItems") as Array<Record<string, unknown>> | undefined;
  if (rawItems && rawItems.length > 0) usedFacts.push("approval.queueItems");
  else missingFacts.push("approval.queueItems");

  if (missingFacts.length > 0) {
    return { ok: false, reason: `missing: ${missingFacts.join(", ")}`, missingFacts };
  }

  const items: ApprovalQueueItem[] = rawItems!.map((raw) => {
    const id = (raw.id as string) ?? "unknown";
    const type = (raw.type as string) ?? "unknown";
    const status = (raw.status as string) ?? "pending";
    return {
      id,
      type,
      typeLabel: TYPE_LABELS[type] ?? type,
      title: (raw.title as string) ?? id,
      environment: (raw.environment as string) ?? "unknown",
      requestedBy: (raw.requestedBy as string) ?? "unknown",
      riskSummary: (raw.riskSummary as string) ?? "",
      riskTone: (raw.riskTone as "warning" | "danger" | "success") ?? "warning",
      status: status as ApprovalQueueItem["status"],
      keyFacts: [],
      actions: buildItemActions(id, status),
    };
  });

  const summary = {
    pending: items.filter((i) => i.status === "pending").length,
    approved: items.filter((i) => i.status === "approved").length,
    held: items.filter((i) => i.status === "held").length,
    highRisk: items.filter((i) => i.riskTone === "danger").length,
  };

  const payload: ApprovalQueueTemplateData = {
    templateId: "approval_queue_inbox",
    state: summary.pending > 0 ? "active" : "all_done",
    items,
    summary,
    expandedItemId: null,
    primaryActionLabel: "전체 승인",
    secondaryActionLabel: "고위험만 보기",
  };

  return {
    ok: true,
    surface: {
      templateId: "approval_queue_inbox",
      payload: payload as unknown as Record<string, unknown>,
      sourceIntent: intentKey,
      updatedAt: new Date().toISOString(),
      freshnessKey: `approval-queue:${items.length}:${summary.pending}`,
      bindingTrace: { usedFacts, missingFacts },
    },
  };
}
