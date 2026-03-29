import type { ConversationWorkflowState } from "@/devops-chat/types/conversation";
import type { DecisionResult } from "../decision-engine";

export function evaluateRollbackPolicy(
  filledSlots: Record<string, unknown>,
  _workflow: ConversationWorkflowState | null,
): DecisionResult {
  const hasServiceName = filledSlots["rollback.serviceName"] != null;
  const hasCandidates = filledSlots["rollback.candidates"] != null;
  const hasContext = filledSlots["rollback.context"] != null;
  const hasSelectedTarget = filledSlots["rollback.selectedTargetId"] != null;

  const matched: string[] = [];
  if (hasServiceName) matched.push("rollback.serviceName");
  if (hasCandidates) matched.push("rollback.candidates");
  if (hasContext) matched.push("rollback.context");
  if (hasSelectedTarget) matched.push("rollback.selectedTargetId");

  // No serviceName → ask_followup
  if (!hasServiceName) {
    return {
      trace: {
        mode: "ask_followup",
        matched,
        missing: ["rollback.serviceName"],
        disqualified: [],
        reason: "롤백 대상 서비스 지정 필요",
      },
      surfaceIntent: null,
    };
  }

  // serviceName + context (target already selected) → rollback_summary
  if (hasServiceName && hasContext) {
    return {
      trace: {
        mode: "render_surface",
        matched,
        missing: [],
        disqualified: [],
        reason: "롤백 summary surface-ready (인스턴스 선택 완료)",
      },
      surfaceIntent: {
        family: "rollback.summary",
        intentKey: "rollback.start",
        readiness: "ready",
      },
    };
  }

  // serviceName + candidates (show target list)
  if (hasServiceName && hasCandidates) {
    return {
      trace: {
        mode: "render_surface",
        matched,
        missing: [],
        disqualified: [],
        reason: "롤백 대상 인스턴스 목록 surface-ready",
      },
      surfaceIntent: {
        family: "rollback.target_list",
        intentKey: "rollback.start",
        readiness: "ready",
      },
    };
  }

  // serviceName only → ask_followup (tool will fetch candidates)
  return {
    trace: {
      mode: "ask_followup",
      matched,
      missing: ["rollback.candidates"],
      disqualified: [],
      reason: "롤백 후보 조회 필요",
    },
    surfaceIntent: {
      family: "rollback.target_list",
      intentKey: "rollback.start",
      readiness: "candidate",
    },
  };
}
