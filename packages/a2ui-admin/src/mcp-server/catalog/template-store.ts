/**
 * Template Store - JSON file backed catalog read/write.
 *
 * The stored model is resolver/action driven. Legacy single `resolver`
 * catalogs are normalized in memory so old fixtures keep working during the
 * migration.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getA2UIPartDefinition,
  isAllowedBindingPath,
  isKnownA2UIPartDefinition,
  listAllowedPropsForPart,
  listRequiredPayloadFieldsForSurfaceConfig,
  type A2UIPartEditorField,
  type SurfaceConfig,
} from "@a2ui/ui";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = resolve(__dirname, "../../../data/template-catalog.json");

export const CATALOG_SCHEMA_VERSION = 2;

export const KNOWN_BINDING_RECIPE_IDS = [
  "deploy_launchpad",
  "deploy_history_table",
  "approval_queue_inbox",
  "rollback_summary",
  "component_smoke_test",
] as const;

export type BindingRecipeId = (typeof KNOWN_BINDING_RECIPE_IDS)[number];
export type TemplateStatus = "published" | "draft" | "disabled";
export type ResolverPhase = "blocking" | "optional" | "actionOnly";
export type ResolverKind = "http_get" | "transform_filter" | "static_defaults" | "llm_summary";
export type ActionVariant = "primary" | "secondary" | "danger" | "ghost";
export type ActionKind = "submit" | "select" | "refresh" | "navigate";

export type LegacyResolverRegistration =
  | {
      kind: "deploy_service";
      endpointTemplate: string;
      serviceNameFact: string;
      defaultEnvironment: string;
      defaultRequestDetail: Record<string, string>;
      impactSummaryTemplate: string;
    }
  | {
      kind: "approval_queue";
      endpoint: string;
    }
  | {
      kind: "rollback_incidents";
      endpoint: string;
    };

export type ResolverConfig = {
  id: string;
  kind: ResolverKind;
  label?: string;
  enabled?: boolean;
  phase?: ResolverPhase;
  requiredFacts?: string[];
  optionalFacts?: string[];
  outputAlias?: string;
  requiredOutputs?: string[];
  assign?: Record<string, string>;
  endpoint?: string;
  method?: "GET" | "POST";
  inputPath?: string;
  filter?: {
    field: string;
    fact: string;
  };
  values?: Record<string, unknown>;
  inputAliases?: string[];
  promptKey?: string;
};

export type ActionEnableWhen =
  | {
      field: string;
      equals: unknown;
    }
  | {
      field: string;
      exists: true;
    };

export type StoredTemplateAction = {
  actionId: string;
  label: string;
  variant: ActionVariant;
  kind: ActionKind;
  requiredPayloadFields?: string[];
  enableWhen?: ActionEnableWhen | null;
  params?: Record<string, unknown>;
  confirm?: {
    title?: string;
    message?: string;
  };
};

export type TemplateIntentRegistration = {
  intentKey: string;
  requiredFacts: string[];
  optionalFacts?: string[];
};

export type GeneratedValidation = {
  requiredFacts: string[];
  renderRequiredPayloadFields: string[];
  actionRequiredPayloadFields: Record<string, string[]>;
  requiredResolverOutputs: Record<string, string[]>;
};

export type SurfaceConfigRecord = Record<string, unknown>;

export type StoredTemplateRegistration = {
  schemaVersion?: number;
  templateId: string;
  version: string;
  title: string;
  status: TemplateStatus;
  description: string;
  intents: TemplateIntentRegistration[];
  resolver?: LegacyResolverRegistration;
  resolvers?: ResolverConfig[];
  bindingRecipeId: BindingRecipeId | string;
  contract?: {
    requiredFields: string[];
    optionalFields: string[];
  };
  actions: StoredTemplateAction[];
  surfaceConfig?: SurfaceConfigRecord;
  generatedValidation?: GeneratedValidation;
};

let cache: StoredTemplateRegistration[] | null = null;
let cacheMtimeMs = 0;

const RENDER_REQUIRED_FIELDS: Record<string, string[]> = {
  deploy_launchpad: ["templateId", "state", "service", "environment", "targetVersion", "strategy"],
  deploy_history_table: ["templateId", "state", "summaryItems", "rows", "columns"],
  approval_queue_inbox: ["templateId", "items"],
  rollback_summary: ["templateId", "candidates"],
  component_smoke_test: ["templateId", "headline", "metricLabel", "metricValue", "statusTone", "rows"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isSurfaceConfigLike(value: unknown): value is SurfaceConfig {
  return isRecord(value) && value.kind === "a2ui_card" && Array.isArray(value.parts);
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function legacyResolverToResolvers(template: StoredTemplateRegistration): ResolverConfig[] {
  if (!template.resolver) return [];

  switch (template.resolver.kind) {
    case "deploy_service":
      return [
        {
          id: "service",
          kind: "http_get",
          label: "Service detail",
          phase: "blocking",
          requiredFacts: [template.resolver.serviceNameFact],
          optionalFacts: ["environment"],
          endpoint: template.resolver.endpointTemplate,
          outputAlias: "service",
          requiredOutputs: ["recommendedVersion", "availableImages"],
          assign: {
            recommendedVersion: "service.recommendedVersion",
            availableImages: "service.availableImages",
            environments: "service.environments",
          },
        },
        {
          id: "deployDefaults",
          kind: "static_defaults",
          label: "Deploy defaults",
          phase: "blocking",
          outputAlias: "defaults",
          values: {
            environment: template.resolver.defaultEnvironment,
            requestDetail: template.resolver.defaultRequestDetail,
            impactSummaryTemplate: template.resolver.impactSummaryTemplate,
            strategy: "rolling",
          },
        },
        {
          id: "deployments",
          kind: "http_get",
          label: "Deployment history source",
          phase: "optional",
          endpoint: "/api/deployments",
          outputAlias: "deployments",
          requiredOutputs: [],
        },
        {
          id: "deploymentHistory",
          kind: "transform_filter",
          label: "Filter history by service",
          phase: "optional",
          requiredFacts: [template.resolver.serviceNameFact],
          inputPath: "deployments.history",
          filter: { field: "service", fact: template.resolver.serviceNameFact },
          outputAlias: "deploymentHistory",
          assign: {
            deploymentHistory: "deploymentHistory",
            lastDeployment: "deploymentHistory.0",
          },
        },
        {
          id: "riskSummary",
          kind: "llm_summary",
          label: "Risk summary",
          phase: "optional",
          outputAlias: "llm",
        },
      ];

    case "approval_queue":
      return [
        {
          id: "approvals",
          kind: "http_get",
          label: "Approval queue",
          phase: "blocking",
          endpoint: template.resolver.endpoint,
          outputAlias: "approvals",
          requiredOutputs: ["items"],
          assign: {
            items: "approvals.items",
            byStatus: "approvals.byStatus",
            byType: "approvals.byType",
          },
        },
        {
          id: "queueSummary",
          kind: "llm_summary",
          label: "Queue summary",
          phase: "optional",
          outputAlias: "llm",
        },
      ];

    case "rollback_incidents":
      return [
        {
          id: "incidents",
          kind: "http_get",
          label: "Rollback incidents",
          phase: "blocking",
          endpoint: template.resolver.endpoint,
          outputAlias: "incidents",
          requiredOutputs: ["candidates"],
          assign: {
            candidates: "incidents.candidates",
            serviceHealth: "incidents.serviceHealth",
          },
        },
        {
          id: "rollbackAnalysis",
          kind: "llm_summary",
          label: "Rollback analysis",
          phase: "optional",
          outputAlias: "llm",
        },
      ];
  }
}

export function buildGeneratedValidation(template: StoredTemplateRegistration): GeneratedValidation {
  const resolvers = getTemplateResolvers(template);
  const blockingResolvers = resolvers.filter((resolver) => resolver.enabled !== false && (resolver.phase ?? "blocking") === "blocking");
  const requiredFacts = unique(blockingResolvers.flatMap((resolver) => resolver.requiredFacts ?? []));
  const requiredResolverOutputs: Record<string, string[]> = {};

  for (const resolver of resolvers) {
    const outputs = stringArray(resolver.requiredOutputs);
    if (outputs.length > 0 && resolver.outputAlias) {
      requiredResolverOutputs[resolver.outputAlias] = outputs;
    }
  }

  const actionRequiredPayloadFields: Record<string, string[]> = {};
  for (const action of template.actions ?? []) {
    actionRequiredPayloadFields[action.actionId] = stringArray(action.requiredPayloadFields);
  }

  return {
    requiredFacts,
    renderRequiredPayloadFields: unique([
      ...(RENDER_REQUIRED_FIELDS[template.bindingRecipeId] ?? template.contract?.requiredFields ?? []),
      ...(isSurfaceConfigLike(template.surfaceConfig)
        ? listRequiredPayloadFieldsForSurfaceConfig(template.surfaceConfig)
        : []),
    ]),
    actionRequiredPayloadFields,
    requiredResolverOutputs,
  };
}

export function getTemplateResolvers(template: StoredTemplateRegistration): ResolverConfig[] {
  if (Array.isArray(template.resolvers) && template.resolvers.length > 0) {
    return template.resolvers;
  }
  return legacyResolverToResolvers(template);
}

export function normalizeTemplate(template: StoredTemplateRegistration): StoredTemplateRegistration {
  const normalized: StoredTemplateRegistration = {
    ...template,
    schemaVersion: CATALOG_SCHEMA_VERSION,
    intents: Array.isArray(template.intents) ? template.intents : [],
    resolvers: getTemplateResolvers(template),
    actions: Array.isArray(template.actions) ? template.actions : [],
  };
  normalized.generatedValidation = buildGeneratedValidation(normalized);
  return normalized;
}

function loadCatalog(): StoredTemplateRegistration[] {
  const mtimeMs = statSync(CATALOG_PATH).mtimeMs;
  if (cache && cacheMtimeMs === mtimeMs) return cache;
  const raw = readFileSync(CATALOG_PATH, "utf-8");
  const parsed = JSON.parse(raw) as StoredTemplateRegistration[];
  cache = parsed.map(normalizeTemplate);
  cacheMtimeMs = mtimeMs;
  return cache;
}

function invalidateCache(): void {
  cache = null;
  cacheMtimeMs = 0;
}

export function readAllTemplates(): StoredTemplateRegistration[] {
  return loadCatalog();
}

export function readTemplate(templateId: string): StoredTemplateRegistration | undefined {
  return loadCatalog().find((template) => template.templateId === templateId);
}

function writeCatalog(catalog: StoredTemplateRegistration[]): void {
  const dir = dirname(CATALOG_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tempPath = `${CATALOG_PATH}.tmp`;
  writeFileSync(tempPath, JSON.stringify(catalog, null, 2) + "\n", "utf-8");
  renameSync(tempPath, CATALOG_PATH);
}

export function writeTemplate(templateId: string, data: StoredTemplateRegistration): void {
  const catalog = loadCatalog();
  const normalized = normalizeTemplate({ ...data, templateId });
  const idx = catalog.findIndex((template) => template.templateId === templateId);
  if (idx >= 0) {
    catalog[idx] = normalized;
  } else {
    catalog.push(normalized);
  }
  writeCatalog(catalog);
  invalidateCache();
}

export function deleteTemplate(templateId: string): boolean {
  const catalog = loadCatalog();
  const idx = catalog.findIndex((template) => template.templateId === templateId);
  if (idx < 0) return false;
  catalog.splice(idx, 1);
  writeCatalog(catalog);
  invalidateCache();
  return true;
}

function validateStringArray(value: unknown, path: string, errors: string[], required = true): void {
  if (value === undefined && !required) return;
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array`);
    return;
  }
  value.forEach((item, index) => {
    if (typeof item !== "string" || item.length === 0) {
      errors.push(`${path}[${index}] must be a non-empty string`);
    }
  });
}

function validateResolver(resolver: unknown, index: number, seenIds: Set<string>, errors: string[]): void {
  const path = `resolvers[${index}]`;
  if (!isRecord(resolver)) {
    errors.push(`${path} must be an object`);
    return;
  }

  const id = resolver.id;
  if (typeof id !== "string" || !id) {
    errors.push(`${path}.id is required`);
  } else if (seenIds.has(id)) {
    errors.push(`${path}.id must be unique`);
  } else {
    seenIds.add(id);
  }

  if (!["http_get", "transform_filter", "static_defaults", "llm_summary"].includes(resolver.kind as string)) {
    errors.push(`${path}.kind must be http_get|transform_filter|static_defaults|llm_summary`);
  }
  if (resolver.phase !== undefined && !["blocking", "optional", "actionOnly"].includes(resolver.phase as string)) {
    errors.push(`${path}.phase must be blocking|optional|actionOnly`);
  }
  validateStringArray(resolver.requiredFacts, `${path}.requiredFacts`, errors, false);
  validateStringArray(resolver.optionalFacts, `${path}.optionalFacts`, errors, false);
  validateStringArray(resolver.requiredOutputs, `${path}.requiredOutputs`, errors, false);

  if (resolver.outputAlias !== undefined && (typeof resolver.outputAlias !== "string" || !resolver.outputAlias)) {
    errors.push(`${path}.outputAlias must be a non-empty string`);
  }
  if (resolver.assign !== undefined && !isRecord(resolver.assign)) {
    errors.push(`${path}.assign must be an object`);
  }

  if (resolver.kind === "http_get") {
    if (typeof resolver.endpoint !== "string" || !resolver.endpoint) errors.push(`${path}.endpoint is required`);
    if (resolver.method !== undefined && !["GET", "POST"].includes(resolver.method as string)) {
      errors.push(`${path}.method must be GET|POST`);
    }
  }
  if (resolver.kind === "transform_filter") {
    if (typeof resolver.inputPath !== "string" || !resolver.inputPath) errors.push(`${path}.inputPath is required`);
    if (!isRecord(resolver.filter)) {
      errors.push(`${path}.filter is required`);
    } else {
      if (typeof resolver.filter.field !== "string" || !resolver.filter.field) errors.push(`${path}.filter.field is required`);
      if (typeof resolver.filter.fact !== "string" || !resolver.filter.fact) errors.push(`${path}.filter.fact is required`);
    }
  }
  if (resolver.kind === "static_defaults" && resolver.values !== undefined && !isRecord(resolver.values)) {
    errors.push(`${path}.values must be an object`);
  }
}

function validateAction(action: unknown, index: number, seenIds: Set<string>, errors: string[]): void {
  const path = `actions[${index}]`;
  if (!isRecord(action)) {
    errors.push(`${path} must be an object`);
    return;
  }

  const id = action.actionId;
  if (typeof id !== "string" || !id) {
    errors.push(`${path}.actionId is required`);
  } else if (seenIds.has(id)) {
    errors.push(`${path}.actionId must be unique`);
  } else {
    seenIds.add(id);
  }
  if (typeof action.label !== "string" || !action.label) errors.push(`${path}.label is required`);
  if (!["primary", "secondary", "danger", "ghost"].includes(action.variant as string)) {
    errors.push(`${path}.variant must be primary|secondary|danger|ghost`);
  }
  if (!["submit", "select", "refresh", "navigate"].includes(action.kind as string)) {
    errors.push(`${path}.kind must be submit|select|refresh|navigate`);
  }
  validateStringArray(action.requiredPayloadFields, `${path}.requiredPayloadFields`, errors, false);
  if (action.enableWhen !== undefined && action.enableWhen !== null) {
    if (!isRecord(action.enableWhen)) {
      errors.push(`${path}.enableWhen must be an object or null`);
    } else if (typeof action.enableWhen.field !== "string" || !action.enableWhen.field) {
      errors.push(`${path}.enableWhen.field is required`);
    } else if (!("equals" in action.enableWhen) && action.enableWhen.exists !== true) {
      errors.push(`${path}.enableWhen must declare equals or exists:true`);
    }
  }
}

function readStaticValue(value: unknown): unknown {
  if (isRecord(value) && value.type === "static" && "value" in value) return value.value;
  return value;
}

function validateBindingPath(pathValue: unknown, path: string, errors: string[]): void {
  if (typeof pathValue !== "string" || !pathValue) {
    errors.push(`${path}.path must be a non-empty string`);
    return;
  }
  if (!isAllowedBindingPath(pathValue)) {
    errors.push(`${path}.path must start with payload, actions, meta, or context`);
  }
}

function validateSurfaceConfigValue(value: unknown, path: string, errors: string[]): void {
  if (value === undefined || value === null) return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateSurfaceConfigValue(item, `${path}[${index}]`, errors));
    return;
  }
  if (!isRecord(value)) return;

  if ("type" in value) {
    if (value.type === "binding") {
      validateBindingPath(value.path, path, errors);
      return;
    }
    if (value.type === "static") {
      if (!("value" in value)) errors.push(`${path}.value is required for static config values`);
      return;
    }
  }

  for (const [key, child] of Object.entries(value)) {
    validateSurfaceConfigValue(child, `${path}.${key}`, errors);
  }
}

function validateStringListStaticValue(value: unknown, path: string, errors: string[]): void {
  const raw = readStaticValue(value);
  if (!Array.isArray(raw)) {
    errors.push(`${path} must be a static string array`);
    return;
  }
  raw.forEach((item, index) => {
    if (typeof item !== "string" || !item) {
      errors.push(`${path}[${index}] must be a non-empty string`);
    }
  });
}

function validateStaticTextValue(value: unknown, path: string, errors: string[]): void {
  const raw = readStaticValue(value);
  if (typeof raw !== "string") {
    errors.push(`${path} must be static text`);
  }
}

function validateSelectValue(
  value: unknown,
  field: Extract<A2UIPartEditorField, { kind: "select" }>,
  path: string,
  errors: string[],
): void {
  const raw = readStaticValue(value);
  if (typeof raw !== "string" || !field.options.some((option) => option.value === raw)) {
    errors.push(`${path} must be one of: ${field.options.map((option) => option.value).join(", ")}`);
  }
}

function validatePartFieldValue(
  value: unknown,
  field: A2UIPartEditorField,
  path: string,
  errors: string[],
): void {
  if (value === undefined) {
    if (field.required) errors.push(`${path} is required`);
    return;
  }

  switch (field.kind) {
    case "bindingPath":
      if (!isRecord(value) || value.type !== "binding") {
        errors.push(`${path} must be a binding value`);
        return;
      }
      validateBindingPath(value.path, path, errors);
      return;
    case "staticStringList":
      validateStringListStaticValue(value, path, errors);
      return;
    case "staticText":
      validateStaticTextValue(value, path, errors);
      return;
    case "select":
      validateSelectValue(value, field, path, errors);
      return;
    case "staticJson":
      validateSurfaceConfigValue(value, path, errors);
      return;
  }
}

function validatePartProps(
  type: string,
  props: Record<string, unknown> | undefined,
  path: string,
  errors: string[],
): void {
  const definition = getA2UIPartDefinition(type);
  if (!definition) return;

  const knownProps = new Set(listAllowedPropsForPart(type));
  for (const prop of Object.keys(props ?? {})) {
    if (!knownProps.has(prop)) {
      errors.push(`${path}.props.${prop} is not declared for ${type}`);
    }
  }

  for (const field of definition.editorFields) {
    validatePartFieldValue(props?.[field.prop], field, `${path}.props.${field.prop}`, errors);
  }
}

function validateSurfaceConfig(surfaceConfig: unknown, errors: string[]): void {
  if (surfaceConfig === undefined) return;
  if (!isRecord(surfaceConfig)) {
    errors.push("surfaceConfig must be an object");
    return;
  }
  if (surfaceConfig.kind !== "a2ui_card") {
    errors.push("surfaceConfig.kind must be a2ui_card");
  }
  if (!Array.isArray(surfaceConfig.parts)) {
    errors.push("surfaceConfig.parts must be an array");
    return;
  }
  if (surfaceConfig.card !== undefined) {
    if (!isRecord(surfaceConfig.card)) {
      errors.push("surfaceConfig.card must be an object");
    } else {
      validateSurfaceConfigValue(surfaceConfig.card, "surfaceConfig.card", errors);
    }
  }
  const partIds = new Set<string>();
  surfaceConfig.parts.forEach((part, index) => {
    const path = `surfaceConfig.parts[${index}]`;
    if (!isRecord(part)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (typeof part.id !== "string" || !part.id) {
      errors.push(`${path}.id is required`);
    } else if (partIds.has(part.id)) {
      errors.push(`${path}.id must be unique`);
    } else {
      partIds.add(part.id);
    }
    if (typeof part.type !== "string" || !part.type) {
      errors.push(`${path}.type is required`);
    } else if (!isKnownA2UIPartDefinition(part.type)) {
      errors.push(`${path}.type is unknown: ${part.type}`);
    }
    if (part.props !== undefined && !isRecord(part.props)) {
      errors.push(`${path}.props must be an object`);
    } else if (typeof part.type === "string") {
      validatePartProps(part.type, part.props as Record<string, unknown> | undefined, path, errors);
    }
  });
}

export function validateStoredTemplate(data: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(data)) return ["Template must be an object"];

  if (typeof data.templateId !== "string" || !data.templateId) errors.push("templateId is required");
  if (typeof data.version !== "string" || !data.version) errors.push("version is required");
  if (typeof data.title !== "string" || !data.title) errors.push("title is required");
  if (typeof data.description !== "string") errors.push("description is required");
  if (!["published", "draft", "disabled"].includes(data.status as string)) {
    errors.push("status must be published|draft|disabled");
  }
  if (!KNOWN_BINDING_RECIPE_IDS.includes(data.bindingRecipeId as BindingRecipeId)) {
    errors.push(`bindingRecipeId must be one of: ${KNOWN_BINDING_RECIPE_IDS.join(", ")}`);
  }

  if (!Array.isArray(data.intents)) {
    errors.push("intents must be an array");
  } else {
    data.intents.forEach((intent, index) => {
      const path = `intents[${index}]`;
      if (!isRecord(intent)) {
        errors.push(`${path} must be an object`);
        return;
      }
      if (typeof intent.intentKey !== "string" || !intent.intentKey) errors.push(`${path}.intentKey is required`);
      validateStringArray(intent.requiredFacts, `${path}.requiredFacts`, errors);
      validateStringArray(intent.optionalFacts, `${path}.optionalFacts`, errors, false);
    });
  }

  const normalized = normalizeTemplate(data as StoredTemplateRegistration);
  const resolverIds = new Set<string>();
  normalized.resolvers?.forEach((resolver, index) => validateResolver(resolver, index, resolverIds, errors));

  if (!Array.isArray(data.actions)) {
    errors.push("actions must be an array");
  } else {
    const actionIds = new Set<string>();
    data.actions.forEach((action, index) => validateAction(action, index, actionIds, errors));
  }

  validateSurfaceConfig(data.surfaceConfig, errors);

  return errors;
}
