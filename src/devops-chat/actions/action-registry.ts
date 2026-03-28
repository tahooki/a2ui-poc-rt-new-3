/**
 * Action registry: maps action id to its handler definition.
 */

import type { ActionDefinition, ActionHandlerFn } from "./action-types";
import {
  DEPLOY_ACTION_IDS,
  APPROVAL_ACTION_IDS,
  ROLLBACK_ACTION_IDS,
} from "./action-types";
import { runDeployAction } from "./domain/run-deploy-action";
import { runApprovalAction } from "./domain/run-approval-action";
import { runRollbackAction } from "./domain/run-rollback-action";

const ACTION_DEFINITIONS: ActionDefinition[] = [
  // Deploy actions
  { actionId: DEPLOY_ACTION_IDS.START, domain: "deploy", confirmationRequired: false, handler: runDeployAction },
  { actionId: DEPLOY_ACTION_IDS.COMPLETE, domain: "deploy", confirmationRequired: false, handler: runDeployAction },
  { actionId: DEPLOY_ACTION_IDS.REFRESH_DRAFT, domain: "deploy", confirmationRequired: false, handler: runDeployAction },

  // Approval actions
  { actionId: APPROVAL_ACTION_IDS.APPROVE, domain: "approval", confirmationRequired: true, handler: runApprovalAction },
  { actionId: APPROVAL_ACTION_IDS.HOLD, domain: "approval", confirmationRequired: false, handler: runApprovalAction },

  // Rollback actions
  { actionId: ROLLBACK_ACTION_IDS.START_DRY_RUN, domain: "rollback", confirmationRequired: false, handler: runRollbackAction },
  { actionId: ROLLBACK_ACTION_IDS.COMPLETE_DRY_RUN, domain: "rollback", confirmationRequired: false, handler: runRollbackAction },
  { actionId: ROLLBACK_ACTION_IDS.OPEN_CONFIRM, domain: "rollback", confirmationRequired: false, handler: runRollbackAction },
  { actionId: ROLLBACK_ACTION_IDS.CONFIRM, domain: "rollback", confirmationRequired: true, handler: runRollbackAction },
  { actionId: ROLLBACK_ACTION_IDS.BACK_TO_SUMMARY, domain: "rollback", confirmationRequired: false, handler: runRollbackAction },
];

const REGISTRY = new Map<string, ActionDefinition>(
  ACTION_DEFINITIONS.map((def) => [def.actionId, def]),
);

export function lookupAction(actionId: string): ActionDefinition | undefined {
  return REGISTRY.get(actionId);
}

export function getAllActionIds(): string[] {
  return Array.from(REGISTRY.keys());
}
