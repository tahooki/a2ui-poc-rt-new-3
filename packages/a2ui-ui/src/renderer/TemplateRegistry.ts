import type { ComponentType } from "react";
import type { ActionCallback } from "../types/action-event";

export type TemplateDefinition = {
  templateId: string;
  version: string;
  component: ComponentType<{
    payload: Record<string, unknown>;
    onAction: ActionCallback;
  }>;
};

const registry = new Map<string, TemplateDefinition>();

export function registerTemplate(def: TemplateDefinition): void {
  registry.set(def.templateId, def);
}

export function getTemplate(templateId: string): TemplateDefinition | undefined {
  return registry.get(templateId);
}

export function listTemplates(): TemplateDefinition[] {
  return Array.from(registry.values());
}
