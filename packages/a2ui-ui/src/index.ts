// @a2ui/ui — A2UI Front UI Library

// Primitives
export {
  SurfaceCard,
  StatusBadge,
  ActionButton,
  DataTable,
  PropertyList,
} from "./primitives";
export type {
  SurfaceCardProps,
  StatusBadgeProps,
  ActionButtonProps,
  DataTableColumn,
  DataTableProps,
  PropertyItem,
  PropertyListProps,
} from "./primitives";

// Renderer
export { SurfaceRenderer, type SurfaceRendererProps } from "./renderer/SurfaceRenderer";
export { registerTemplate, getTemplate, listTemplates } from "./renderer/TemplateRegistry";
export type { TemplateDefinition } from "./renderer/TemplateRegistry";
export { createActionEvent } from "./renderer/ActionEmitter";

// Dynamic renderer
export { DynamicA2UICardRenderer, type DynamicA2UICardRendererProps } from "./dynamic/DynamicA2UICardRenderer";
export { A2UI_PART_REGISTRY, getA2UIPart, listA2UIPartTypes } from "./dynamic/part-registry";
export type {
  A2UICardSurfaceConfig,
  A2UIPartConfig,
  BindingValue,
  DynamicA2UIEnvelope,
  SurfaceConfig,
  SurfaceConfigValue,
} from "./dynamic/schema";
export {
  A2UI_ALLOWED_BINDING_ROOTS,
  A2UI_PART_DEFINITIONS,
  createDefaultPart,
  createPartPreviewSurfaceConfig,
  getA2UIPartDefinition,
  getA2UIPartEditorFields,
  getA2UIPartPreviewPayload,
  isAllowedBindingPath,
  isKnownA2UIPartDefinition,
  listA2UIPartDefinitionTypes,
  listA2UIPartDefinitions,
  listAllowedPropsForPart,
  listRequiredPayloadFieldsForSurfaceConfig,
  staticValue,
} from "./parts/catalog";
export type {
  A2UIPartCategory,
  A2UIPartDefinition,
  A2UIPartDefinitionFilter,
  A2UIPartEditorField,
  PartPreviewSurfaceConfig,
  PartPreviewSurfaceOptions,
} from "./parts/catalog";

// Types
export type { SurfaceEnvelope, SurfaceAction, ActionEvent, ActionCallback, TemplateAction } from "./types";
