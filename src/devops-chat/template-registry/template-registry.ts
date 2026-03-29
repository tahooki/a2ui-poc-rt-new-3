/**
 * Template registry: single source for all template registry definitions.
 *
 * NOTE: Registry definitions are the documentation/management layer.
 * Runtime source-of-truth is in template-definitions.ts (Phase 3) +
 * template-selector.ts + binders. Registry docs should stay in sync
 * but do not directly drive runtime behavior.
 */

import type { TemplateRegistryDefinition } from "./registry-types";
import { quickDeployLaunchpadDef } from "./definitions/quick-deploy-launchpad";
import { approvalQueueInboxDef } from "./definitions/approval-queue-inbox";
import { deploymentApprovalInboxDef } from "./definitions/deployment-approval-inbox";
import { rollbackTargetListDef } from "./definitions/rollback-target-list";
import { rollbackSummaryDef } from "./definitions/rollback-summary";
import { dryRunStepperDef } from "./definitions/dry-run-stepper";
import { confirmActionDef } from "./definitions/confirm-action";

export const ALL_TEMPLATE_DEFINITIONS: TemplateRegistryDefinition[] = [
  quickDeployLaunchpadDef,
  approvalQueueInboxDef,
  deploymentApprovalInboxDef,
  rollbackTargetListDef,
  rollbackSummaryDef,
  dryRunStepperDef,
  confirmActionDef,
];

const REGISTRY_MAP = new Map<string, TemplateRegistryDefinition>(
  ALL_TEMPLATE_DEFINITIONS.map((def) => [def.templateId, def]),
);

export function getRegistryDefinition(templateId: string): TemplateRegistryDefinition | undefined {
  return REGISTRY_MAP.get(templateId);
}

export function getAllRegistryDefinitions(): TemplateRegistryDefinition[] {
  return ALL_TEMPLATE_DEFINITIONS;
}

export function getActiveDefinitions(): TemplateRegistryDefinition[] {
  return ALL_TEMPLATE_DEFINITIONS.filter((d) => d.status === "active");
}
