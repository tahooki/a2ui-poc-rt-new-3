import type { ConversationWorkflowState } from "@/devops-chat/types/conversation";
import type { DecisionResult } from "../decision-engine";

const REQUIRED = ["approval.requestId"];

export function evaluateApprovalPolicy(
  filledSlots: Record<string, unknown>,
  _workflow: ConversationWorkflowState | null,
): DecisionResult {
  const matched: string[] = [];
  const missing: string[] = [];

  for (const key of REQUIRED) {
    if (filledSlots[key] != null) {
      matched.push(key);
    } else {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    return {
      trace: {
        mode: "ask_followup",
        matched,
        missing,
        disqualified: [],
        reason: `승인 대상 지정 필요: ${missing.join(", ")}`,
      },
      surfaceIntent: null,
    };
  }

  return {
    trace: {
      mode: "render_surface",
      matched,
      missing: [],
      disqualified: [],
      reason: "승인 검토 surface-ready",
    },
    surfaceIntent: {
      family: "approval.inbox",
      intentKey: "approval.review",
      readiness: "ready",
    },
  };
}
