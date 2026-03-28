import type { ConversationWorkflowState, DecisionTrace, SurfaceIntentCandidate } from "@/devops-chat/types/conversation";
import type { DecisionResult } from "../decision-engine";

const REQUIRED = ["deploy.serviceName"];
const READY_SET = ["deploy.serviceName", "deploy.selectedServiceContext"];

export function evaluateDeployPolicy(
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

  // Check extended readiness
  for (const key of READY_SET) {
    if (filledSlots[key] != null && !matched.includes(key)) {
      matched.push(key);
    } else if (filledSlots[key] == null && !missing.includes(key)) {
      missing.push(key);
    }
  }

  // If any required slot is missing → ask_followup
  const requiredMissing = REQUIRED.filter((k) => filledSlots[k] == null);
  if (requiredMissing.length > 0) {
    return {
      trace: {
        mode: "ask_followup",
        matched,
        missing,
        disqualified: [],
        reason: `필수 정보 부족: ${requiredMissing.join(", ")}`,
      },
      surfaceIntent: null,
    };
  }

  // All ready-set filled → render_surface
  const readyMissing = READY_SET.filter((k) => filledSlots[k] == null);
  if (readyMissing.length === 0) {
    return {
      trace: {
        mode: "render_surface",
        matched,
        missing: [],
        disqualified: [],
        reason: "deploy launchpad로 전환 가능한 핵심 facts가 모두 준비됨",
      },
      surfaceIntent: {
        family: "deploy.launchpad",
        intentKey: "deploy.start",
        readiness: "ready",
      },
    };
  }

  // Required met but context not yet fetched → ask_followup (tool will be planned)
  return {
    trace: {
      mode: "ask_followup",
      matched,
      missing: readyMissing,
      disqualified: [],
      reason: `서비스 컨텍스트 조회 필요: ${readyMissing.join(", ")}`,
    },
    surfaceIntent: {
      family: "deploy.launchpad",
      intentKey: "deploy.start",
      readiness: "candidate",
    },
  };
}
