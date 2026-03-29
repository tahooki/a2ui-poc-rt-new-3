import type { ConversationWorkflowState } from "@/devops-chat/types/conversation";
import type { DecisionResult } from "../decision-engine";

export function evaluateApprovalPolicy(
  filledSlots: Record<string, unknown>,
  _workflow: ConversationWorkflowState | null,
): DecisionResult {
  const matched: string[] = [];
  const missing: string[] = [];

  const hasQueueItems = filledSlots["approval.queueItems"] != null;
  const hasRequestId = filledSlots["approval.requestId"] != null;

  if (hasQueueItems) matched.push("approval.queueItems");
  if (hasRequestId) matched.push("approval.requestId");

  // Queue data available → render queue inbox
  if (hasQueueItems) {
    return {
      trace: {
        mode: "render_surface",
        matched,
        missing: [],
        disqualified: [],
        reason: "승인 큐 데이터 준비됨 — 큐 inbox surface 렌더",
      },
      surfaceIntent: {
        family: "approval.queue",
        intentKey: "approval.review",
        readiness: "ready",
      },
    };
  }

  // Single requestId → render detail surface
  if (hasRequestId) {
    return {
      trace: {
        mode: "render_surface",
        matched,
        missing: [],
        disqualified: [],
        reason: "승인 검토 surface-ready (단일건)",
      },
      surfaceIntent: {
        family: "approval.detail",
        intentKey: "approval.review",
        readiness: "ready",
      },
    };
  }

  // Neither → ask_followup (tool will fetch queue)
  return {
    trace: {
      mode: "ask_followup",
      matched,
      missing: ["approval.queueItems"],
      disqualified: [],
      reason: "승인 큐 조회 필요",
    },
    surfaceIntent: null,
  };
}
