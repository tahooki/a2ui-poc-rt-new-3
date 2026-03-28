import type { ConversationWorkflowState } from "@/devops-chat/types/conversation";
import type { DecisionResult } from "../decision-engine";

const REQUIRED = ["rollback.serviceName"];
const READY_SET = ["rollback.serviceName", "rollback.context"];

export function evaluateRollbackPolicy(
  filledSlots: Record<string, unknown>,
  _workflow: ConversationWorkflowState | null,
): DecisionResult {
  const matched: string[] = [];
  const missing: string[] = [];

  for (const key of [...new Set([...REQUIRED, ...READY_SET])]) {
    if (filledSlots[key] != null) {
      matched.push(key);
    } else {
      missing.push(key);
    }
  }

  const requiredMissing = REQUIRED.filter((k) => filledSlots[k] == null);
  if (requiredMissing.length > 0) {
    return {
      trace: {
        mode: "ask_followup",
        matched,
        missing,
        disqualified: [],
        reason: `롤백 대상 지정 필요: ${requiredMissing.join(", ")}`,
      },
      surfaceIntent: null,
    };
  }

  const readyMissing = READY_SET.filter((k) => filledSlots[k] == null);
  if (readyMissing.length === 0) {
    return {
      trace: {
        mode: "render_surface",
        matched,
        missing: [],
        disqualified: [],
        reason: "롤백 summary surface-ready",
      },
      surfaceIntent: {
        family: "rollback.summary",
        intentKey: "rollback.start",
        readiness: "ready",
      },
    };
  }

  return {
    trace: {
      mode: "ask_followup",
      matched,
      missing: readyMissing,
      disqualified: [],
      reason: `롤백 컨텍스트 필요: ${readyMissing.join(", ")}`,
    },
    surfaceIntent: {
      family: "rollback.summary",
      intentKey: "rollback.start",
      readiness: "candidate",
    },
  };
}
