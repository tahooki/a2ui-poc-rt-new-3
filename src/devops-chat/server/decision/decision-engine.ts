import type {
  ConversationWorkflowState,
  DecisionTrace,
  IntentKey,
  SurfaceIntentCandidate,
} from "@/devops-chat/types/conversation";
import { evaluateDeployPolicy } from "./policies/deploy";
import { evaluateApprovalPolicy } from "./policies/approval";
import { evaluateRollbackPolicy } from "./policies/rollback";

export type DecisionResult = {
  trace: DecisionTrace;
  surfaceIntent: SurfaceIntentCandidate | null;
};

export function evaluateDecision(
  intentKey: IntentKey,
  filledSlots: Record<string, unknown>,
  workflow: ConversationWorkflowState | null,
): DecisionResult {
  switch (intentKey) {
    case "deploy.start":
      return evaluateDeployPolicy(filledSlots, workflow);

    case "deploy.history.lookup":
      return {
        trace: {
          mode: "text",
          matched: ["deploy.history.lookup"],
          missing: [],
          disqualified: [],
          reason: "이전 배포 조회는 text로 응답한다",
        },
        surfaceIntent: null,
      };

    case "approval.review":
      return evaluateApprovalPolicy(filledSlots, workflow);

    case "approval.status.check":
      return {
        trace: {
          mode: "text",
          matched: ["approval.status.check"],
          missing: [],
          disqualified: [],
          reason: "승인 현황 조회는 text로 응답한다",
        },
        surfaceIntent: null,
      };

    case "rollback.start":
      return evaluateRollbackPolicy(filledSlots, workflow);

    case "rollback.status.check":
      return {
        trace: {
          mode: "text",
          matched: ["rollback.status.check"],
          missing: [],
          disqualified: [],
          reason: "롤백 현황 조회는 text로 응답한다",
        },
        surfaceIntent: null,
      };

    case "general.qna":
    default:
      return {
        trace: {
          mode: "text",
          matched: [],
          missing: [],
          disqualified: [],
          reason: "일반 Q&A는 text로 응답한다",
        },
        surfaceIntent: null,
      };
  }
}
