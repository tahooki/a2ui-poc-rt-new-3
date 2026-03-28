import { registerTool } from "./tool-registry";
import { getPreviousDeployments } from "./builtin/get-previous-deployments";
import { getDeployableServices } from "./builtin/get-deployable-services";
import { getApprovalQueueSummary } from "./builtin/get-approval-queue-summary";
import { getRollbackCandidates } from "./builtin/get-rollback-candidates";

let registered = false;

export function ensureBuiltinToolsRegistered(): void {
  if (registered) return;
  registered = true;

  registerTool(getPreviousDeployments);
  registerTool(getDeployableServices);
  registerTool(getApprovalQueueSummary);
  registerTool(getRollbackCandidates);
}
