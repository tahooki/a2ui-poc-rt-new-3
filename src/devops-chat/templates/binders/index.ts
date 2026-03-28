/**
 * Binder registry: maps templateId to its binding function.
 */

import type { ConversationFacts, BindingResult } from "@/devops-chat/types/conversation";
import { bindDeployLaunchpad } from "./bind-deploy-launchpad";
import { bindApprovalInbox } from "./bind-approval-inbox";
import { bindRollbackSummary } from "./bind-rollback-summary";
import { bindDryRunStepper } from "./bind-dry-run-stepper";
import { bindConfirmAction } from "./bind-confirm-action";

export type BinderFn = (facts: ConversationFacts, intentKey: string) => BindingResult;

const BINDER_MAP: Record<string, BinderFn> = {
  quick_deploy_launchpad: bindDeployLaunchpad,
  deployment_approval_inbox: bindApprovalInbox,
  rollback_summary: bindRollbackSummary,
  dry_run_stepper: bindDryRunStepper,
  confirm_action: bindConfirmAction,
};

export function getBinder(templateId: string): BinderFn | undefined {
  return BINDER_MAP[templateId];
}

export {
  bindDeployLaunchpad,
  bindApprovalInbox,
  bindRollbackSummary,
  bindDryRunStepper,
  bindConfirmAction,
};
