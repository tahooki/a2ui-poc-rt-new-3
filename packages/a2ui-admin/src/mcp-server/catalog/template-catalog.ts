import type { BindingRecipe } from "../binding/binding-engine.js";
import {
  APPROVAL_QUEUE_INBOX_RECIPE,
  COMPONENT_SMOKE_TEST_RECIPE,
  DEPLOY_LAUNCHPAD_RECIPE,
  ROLLBACK_SUMMARY_RECIPE,
} from "../binding/binding-engine.js";
import {
  buildGeneratedValidation,
  normalizeTemplate,
  readAllTemplates,
  readTemplate,
  type GeneratedValidation,
  type LegacyResolverRegistration,
  type ResolverConfig,
  type StoredTemplateAction,
  type StoredTemplateRegistration,
  type TemplateIntentRegistration,
  type TemplateStatus,
} from "./template-store.js";

export type TemplateActionRegistration = StoredTemplateAction;
export type TemplateResolverRegistration = LegacyResolverRegistration;

export type TemplateRegistration = {
  schemaVersion: number;
  templateId: string;
  version: string;
  title: string;
  status: TemplateStatus;
  description: string;
  intents: TemplateIntentRegistration[];
  resolver?: TemplateResolverRegistration;
  resolvers: ResolverConfig[];
  bindingRecipe: BindingRecipe;
  bindingRecipeId: string;
  actions: TemplateActionRegistration[];
  generatedValidation: GeneratedValidation;
};

const BINDING_RECIPE_MAP: Record<string, BindingRecipe> = {
  deploy_launchpad: DEPLOY_LAUNCHPAD_RECIPE,
  approval_queue_inbox: APPROVAL_QUEUE_INBOX_RECIPE,
  rollback_summary: ROLLBACK_SUMMARY_RECIPE,
  component_smoke_test: COMPONENT_SMOKE_TEST_RECIPE,
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function hydrateRegistration(stored: StoredTemplateRegistration): TemplateRegistration {
  const normalized = normalizeTemplate(stored);
  const recipe = BINDING_RECIPE_MAP[normalized.bindingRecipeId];
  if (!recipe) {
    throw new Error(`Unknown bindingRecipeId: ${normalized.bindingRecipeId}`);
  }

  return {
    schemaVersion: normalized.schemaVersion ?? 2,
    templateId: normalized.templateId,
    version: normalized.version,
    title: normalized.title,
    status: normalized.status,
    description: normalized.description,
    intents: normalized.intents,
    resolver: normalized.resolver,
    resolvers: normalized.resolvers ?? [],
    bindingRecipeId: normalized.bindingRecipeId,
    bindingRecipe: recipe,
    actions: normalized.actions,
    generatedValidation: normalized.generatedValidation ?? buildGeneratedValidation(normalized),
  };
}

export function listTemplateSummaries() {
  return readAllTemplates().map(({ templateId, version, title, status, description, generatedValidation }) => ({
    templateId,
    version,
    title,
    status,
    description,
    missingRequiredFacts: generatedValidation?.requiredFacts ?? [],
  }));
}

export function getTemplateRegistration(templateId: string): TemplateRegistration | undefined {
  const stored = readTemplate(templateId);
  if (!stored) return undefined;
  return hydrateRegistration(stored);
}

export function getTemplateIntentRegistration(
  intentKey: string,
): { template: TemplateRegistration; intent: TemplateIntentRegistration } | undefined {
  for (const stored of readAllTemplates()) {
    const intent = stored.intents.find((candidate) => candidate.intentKey === intentKey);
    if (!intent) continue;

    const template = hydrateRegistration(stored);
    return {
      template,
      intent: {
        ...intent,
        requiredFacts: unique([
          ...intent.requiredFacts,
          ...template.generatedValidation.requiredFacts,
        ]),
      },
    };
  }
  return undefined;
}

export function getTemplateContract(templateId: string) {
  const template = getTemplateRegistration(templateId);
  if (!template) return { error: "Template not found" };
  return {
    templateId: template.templateId,
    requiredFields: template.generatedValidation.renderRequiredPayloadFields,
    optionalFields: [],
    generatedFrom: "resolver-action-model",
  };
}
