/**
 * Runtime template definitions.
 *
 * Each definition describes a template's metadata, selection predicate,
 * binder key, and renderer key. Phase 5 will migrate these into a
 * registry with versioning / publishing support.
 */

export type TemplateDefinition = {
  templateId: string;
  family: string;
  intentKeys: string[];
  requiredFacts: string[];
  rendererKey: string;
};

export const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    templateId: "quick_deploy_launchpad",
    family: "deploy.launchpad",
    intentKeys: ["deploy.start"],
    requiredFacts: ["deploy.serviceName", "deploy.selectedServiceContext"],
    rendererKey: "quick_deploy_launchpad",
  },
  {
    templateId: "deployment_approval_inbox",
    family: "approval.inbox",
    intentKeys: ["approval.review"],
    requiredFacts: ["approval.requestId"],
    rendererKey: "deployment_approval_inbox",
  },
  {
    templateId: "rollback_summary",
    family: "rollback.summary",
    intentKeys: ["rollback.start"],
    requiredFacts: ["rollback.serviceName"],
    rendererKey: "rollback_summary",
  },
  {
    templateId: "dry_run_stepper",
    family: "rollback.stepper",
    intentKeys: ["rollback.start"],
    requiredFacts: ["rollback.serviceName", "rollback.context"],
    rendererKey: "dry_run_stepper",
  },
  {
    templateId: "confirm_action",
    family: "rollback.confirm",
    intentKeys: ["rollback.start"],
    requiredFacts: ["rollback.serviceName", "rollback.context"],
    rendererKey: "confirm_action",
  },
];

export function getTemplateDefinition(templateId: string): TemplateDefinition | undefined {
  return TEMPLATE_DEFINITIONS.find((d) => d.templateId === templateId);
}

export function getTemplatesByFamily(family: string): TemplateDefinition[] {
  return TEMPLATE_DEFINITIONS.filter((d) => d.family === family);
}

export function getTemplatesByIntent(intentKey: string): TemplateDefinition[] {
  return TEMPLATE_DEFINITIONS.filter((d) => d.intentKeys.includes(intentKey));
}
