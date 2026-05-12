/**
 * Binder registry: maps templateId to its binding function.
 */

import type { ConversationFacts, BindingResult } from "@/devops-chat/types/conversation";
import { bindDeployLaunchpad } from "./bind-deploy-launchpad";
import { bindDeployHistoryTable } from "./bind-deploy-history-table";
import { bindApprovalInbox } from "./bind-approval-inbox";
import { bindApprovalQueue } from "./bind-approval-queue";
import { bindRollbackTargetList } from "./bind-rollback-target-list";
import { bindRollbackSummary } from "./bind-rollback-summary";
import { bindDryRunStepper } from "./bind-dry-run-stepper";
import { bindConfirmAction } from "./bind-confirm-action";

export type BinderFn = (facts: ConversationFacts, intentKey: string) => BindingResult;

const BINDER_MAP: Record<string, BinderFn> = {
  quick_deploy_launchpad: bindDeployLaunchpad,
  deploy_history_table: bindDeployHistoryTable,
  approval_queue_inbox: bindApprovalQueue,
  deployment_approval_inbox: bindApprovalInbox,
  rollback_target_list: bindRollbackTargetList,
  rollback_summary: bindRollbackSummary,
  dry_run_stepper: bindDryRunStepper,
  confirm_action: bindConfirmAction,
};

export function getBinder(templateId: string): BinderFn | undefined {
  return BINDER_MAP[templateId];
}

export {
  bindDeployLaunchpad,
  bindDeployHistoryTable,
  bindApprovalQueue,
  bindApprovalInbox,
  bindRollbackTargetList,
  bindRollbackSummary,
  bindDryRunStepper,
  bindConfirmAction,
};
