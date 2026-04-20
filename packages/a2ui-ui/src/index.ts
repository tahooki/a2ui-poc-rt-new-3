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

// Types
export type { SurfaceEnvelope, SurfaceAction, ActionEvent, ActionCallback, TemplateAction } from "./types";
