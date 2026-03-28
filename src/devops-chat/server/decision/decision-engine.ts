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

    case "rollback.start":
      return evaluateRollbackPolicy(filledSlots, workflow);

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
