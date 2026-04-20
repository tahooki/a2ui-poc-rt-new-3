import type { A2UIPartConfig, SurfaceConfig, SurfaceConfigValue } from "../../dynamic/schema";
import { DEPLOY_PART_DEFINITIONS } from "./deploy-part-definitions";
import { SHARED_PART_DEFINITIONS } from "./shared-part-definitions";
import type {
  A2UIPartDefinition,
  A2UIPartDefinitionFilter,
  A2UIPartEditorField,
  PartPreviewSurfaceOptions,
  PartPreviewSurfaceConfig,
} from "./part-definition-types";

export type {
  A2UIPartCategory,
  A2UIPartDefinition,
  A2UIPartDefinitionFilter,
  A2UIPartEditorField,
  PartPreviewSurfaceConfig,
  PartPreviewSurfaceOptions,
} from "./part-definition-types";

export const A2UI_ALLOWED_BINDING_ROOTS = ["payload", "actions", "meta", "context"] as const;

export const A2UI_PART_DEFINITIONS = [
  ...SHARED_PART_DEFINITIONS,
  ...DEPLOY_PART_DEFINITIONS,
] satisfies A2UIPartDefinition[];

const DEFINITION_MAP = new Map<string, A2UIPartDefinition>(
  A2UI_PART_DEFINITIONS.map((definition) => [definition.type, definition]),
);

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function defaultIdPrefix(type: string): string {
  return type
    .replace(/Block$/, "")
    .replace(/[A-Z]/g, (char, index) => `${index ? "-" : ""}${char.toLowerCase()}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isBindingRecord(value: unknown): value is { type: "binding"; path: string } {
  return isRecord(value) && value.type === "binding" && typeof value.path === "string";
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function normalizePayloadPath(path: string): string | null {
  if (path === "payload") return "";
  if (!path.startsWith("payload.")) return null;
  return path.slice("payload.".length);
}

function requiredPathsFromFields(
  part: A2UIPartConfig,
  definition: A2UIPartDefinition,
): string[] {
  const props = part.props ?? {};
  return definition.editorFields
    .filter((field) => field.required)
    .flatMap((field) => {
      const value = props[field.prop];
      if (isBindingRecord(value)) return [value.path];
      if (field.kind === "bindingPath") return [field.defaultPath];
      return [];
    });
}

export function listA2UIPartDefinitions(filter: A2UIPartDefinitionFilter = {}): A2UIPartDefinition[] {
  const categories = filter.categories ? new Set(filter.categories) : null;
  return A2UI_PART_DEFINITIONS
    .filter((definition) => !categories || categories.has(definition.category))
    .map((definition) => cloneValue(definition));
}

export function getA2UIPartDefinition(type: string): A2UIPartDefinition | undefined {
  const definition = DEFINITION_MAP.get(type);
  return definition ? cloneValue(definition) : undefined;
}

export function listA2UIPartDefinitionTypes(): string[] {
  return A2UI_PART_DEFINITIONS.map((definition) => definition.type);
}

export function createDefaultPart(type: string, index = 1, id?: string): A2UIPartConfig {
  const definition = DEFINITION_MAP.get(type);
  if (!definition) {
    return {
      id: id ?? `${defaultIdPrefix(type)}-${index}`,
      type,
      props: {},
    };
  }

  return {
    id: id ?? `${definition.defaultIdPrefix ?? defaultIdPrefix(type)}-${index}`,
    type,
    props: cloneValue(definition.defaultProps),
  };
}

export function getA2UIPartEditorFields(type: string): A2UIPartEditorField[] {
  return getA2UIPartDefinition(type)?.editorFields ?? [];
}

export function getA2UIPartPreviewPayload(type: string): Record<string, unknown> {
  return getA2UIPartDefinition(type)?.previewPayload ?? {};
}

export function createPartPreviewSurfaceConfig(
  part: A2UIPartConfig,
  options: PartPreviewSurfaceOptions = {},
): PartPreviewSurfaceConfig {
  return {
    kind: "a2ui_card",
    version: 1,
    card: {
      title: { type: "static", value: options.title ?? part.type },
      subtitle: options.subtitle ? { type: "static", value: options.subtitle } : undefined,
      tone: { type: "static", value: "info" },
    },
    parts: [cloneValue(part)] as [A2UIPartConfig],
  };
}

export function listRequiredPayloadFieldsForSurfaceConfig(surfaceConfig: SurfaceConfig | undefined): string[] {
  if (!Array.isArray(surfaceConfig?.parts)) return [];

  const requiredPaths = surfaceConfig.parts.flatMap((part) => {
    const definition = DEFINITION_MAP.get(part.type);
    if (!definition) return [];
    return [
      ...(definition.requiredPayloadPaths ?? []),
      ...requiredPathsFromFields(part, definition),
    ];
  });

  return unique(
    requiredPaths
      .map(normalizePayloadPath)
      .filter((path): path is string => path !== null && path.length > 0),
  );
}

export function listAllowedPropsForPart(type: string): string[] {
  const definition = DEFINITION_MAP.get(type);
  if (!definition) return [];
  return unique([
    ...Object.keys(definition.defaultProps),
    ...definition.editorFields.map((field) => field.prop),
  ]);
}

export function isKnownA2UIPartDefinition(type: string): boolean {
  return DEFINITION_MAP.has(type);
}

export function isAllowedBindingPath(path: string): boolean {
  const [root] = path.split(".");
  return A2UI_ALLOWED_BINDING_ROOTS.includes(root as (typeof A2UI_ALLOWED_BINDING_ROOTS)[number]);
}

export function staticValue(value: unknown): SurfaceConfigValue {
  return { type: "static", value: cloneValue(value) } as SurfaceConfigValue;
}
