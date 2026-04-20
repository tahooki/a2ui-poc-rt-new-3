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

// Types
export type { SurfaceEnvelope, SurfaceAction, ActionEvent, ActionCallback, TemplateAction } from "./types";
