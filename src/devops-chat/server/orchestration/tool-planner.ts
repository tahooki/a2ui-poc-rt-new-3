import type { ConversationFacts, IntentKey } from "@/devops-chat/types/conversation";
import { getSlotValue } from "./slot-memory";

export type PlannedTool = {
  toolName: string;
  reason: string;
};

// ---------------------------------------------------------------------------
// Tool planning: given intent + filled slots, decide which tools to run
// ---------------------------------------------------------------------------

export function planTools(
  intentKey: IntentKey,
  facts: ConversationFacts,
): PlannedTool[] {
  switch (intentKey) {
    case "deploy.start":
      return planDeployTools(facts);
    case "deploy.history.lookup":
      return planDeployHistoryTools();
    case "rollback.start":
      return planRollbackTools(facts);
    case "approval.review":
      return planApprovalTools(facts);
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Deploy intent tool planning
// ---------------------------------------------------------------------------

function planDeployTools(facts: ConversationFacts): PlannedTool[] {
  const serviceName = getSlotValue<string>(facts, "deploy.serviceName");
  const serviceContext = getSlotValue(facts, "deploy.selectedServiceContext");

  // No service name yet → fetch deployable services list
  if (!serviceName) {
    return [{ toolName: "getDeployableServices", reason: "배포 가능한 서비스 목록 조회" }];
  }

  // Service name known but no context → fetch service deploy context
  if (serviceName && !serviceContext) {
    return [{ toolName: "getServiceDeployContext", reason: `${serviceName} 배포 컨텍스트 조회` }];
  }

  return [];
}

function planDeployHistoryTools(): PlannedTool[] {
  return [{ toolName: "getPreviousDeployments", reason: "이전 배포 이력 조회" }];
}

// ---------------------------------------------------------------------------
// Rollback intent tool planning
// ---------------------------------------------------------------------------

function planRollbackTools(facts: ConversationFacts): PlannedTool[] {
  const serviceName = getSlotValue<string>(facts, "rollback.serviceName");

  if (!serviceName) {
    return [{ toolName: "getRollbackCandidates", reason: "롤백 후보 서비스 조회" }];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Approval intent tool planning
// ---------------------------------------------------------------------------

function planApprovalTools(facts: ConversationFacts): PlannedTool[] {
  const requestId = getSlotValue<string>(facts, "approval.requestId");

  if (!requestId) {
    return [{ toolName: "getApprovalQueueSummary", reason: "승인 대기 큐 조회" }];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Deduplicate: prevent same tool+args from running twice in a turn
// ---------------------------------------------------------------------------

export function deduplicateTools(
  planned: PlannedTool[],
  alreadyExecuted: string[],
): PlannedTool[] {
  return planned.filter((t) => !alreadyExecuted.includes(t.toolName));
}
