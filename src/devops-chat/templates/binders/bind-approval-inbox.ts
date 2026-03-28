/**
 * Binder: deployment_approval_inbox
 *
 * Assembles payload from conversation facts for the approval inbox template.
 */

import type { ConversationFacts, BindingResult } from "@/devops-chat/types/conversation";
import type { DeploymentApprovalTemplateData } from "@/devops-chat/types/templates";
import { getSlotValue } from "@/devops-chat/server/orchestration/slot-memory";
import { APPROVAL_ACTION_IDS, type SurfaceActionDescriptor } from "@/devops-chat/actions/action-types";

export function bindApprovalInbox(
  facts: ConversationFacts,
  intentKey: string,
): BindingResult {
  const usedFacts: string[] = [];
  const missingFacts: string[] = [];

  const requestId = getSlotValue(facts, "approval.requestId") as string | undefined;
  if (requestId) usedFacts.push("approval.requestId");
  else missingFacts.push("approval.requestId");

  if (missingFacts.length > 0) {
    return { ok: false, reason: `missing: ${missingFacts.join(", ")}`, missingFacts };
  }

  // Pull additional context from facts if available
  const approvalData = facts.approval ?? {};
  const environment = (approvalData.environment as string) ?? "unknown";
  const riskSummary = (approvalData.riskSummary as string) ?? "리스크 정보 없음";
  const title = (approvalData.title as string) ?? requestId!;
  const requestTypeLabel = (approvalData.requestTypeLabel as string) ?? "Request";

  if (approvalData.environment) usedFacts.push("approval.environment");
  if (approvalData.riskSummary) usedFacts.push("approval.riskSummary");

  const payload: DeploymentApprovalTemplateData = {
    templateId: "deployment_approval_inbox",
    state: "pending",
    requestId: requestId!,
    requestTypeLabel,
    title,
    environment,
    riskSummary,
    verificationSummary: (approvalData.verificationSummary as string) ?? "검증 정보 없음",
    impactScope: (approvalData.impactScope as string) ?? "알 수 없음",
    decisionGuidance: (approvalData.decisionGuidance as string) ?? "",
    checks: (approvalData.checks as string[]) ?? [],
    keyFacts: (approvalData.keyFacts as Array<{ label: string; value: string; mono?: boolean }>) ?? [],
    primaryActionLabel: "승인",
    secondaryActionLabel: "보류",
    actions: [
      {
        actionId: APPROVAL_ACTION_IDS.APPROVE,
        label: "승인",
        variant: "primary",
        confirmationRequired: true,
        confirmationMessage: "이 요청을 승인하시겠습니까?",
        targetRef: { entityType: "approval", entityId: requestId! },
      },
      {
        actionId: APPROVAL_ACTION_IDS.HOLD,
        label: "보류",
        variant: "secondary",
        targetRef: { entityType: "approval", entityId: requestId! },
      },
    ] satisfies SurfaceActionDescriptor[],
  };

  return {
    ok: true,
    surface: {
      templateId: "deployment_approval_inbox",
      payload: payload as unknown as Record<string, unknown>,
      sourceIntent: intentKey,
      updatedAt: new Date().toISOString(),
      freshnessKey: `approval:${requestId}`,
      bindingTrace: { usedFacts, missingFacts },
    },
  };
}
