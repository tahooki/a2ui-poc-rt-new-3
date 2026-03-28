/**
 * Builds a view model for the template list panel.
 */

import type { TemplateRegistryDefinition, TemplateRegistryStatus } from "./registry-types";
import { getAllRegistryDefinitions } from "./template-registry";

export type TemplateListItem = {
  templateId: string;
  title: string;
  version: string;
  status: TemplateRegistryStatus;
  rendererKey: string;
  description: string;
  previewCaseCount: number;
  fieldCount: number;
};

export function buildTemplateListViewModel(): TemplateListItem[] {
  return getAllRegistryDefinitions().map((def) => ({
    templateId: def.templateId,
    title: def.title,
    version: def.version,
    status: def.status,
    rendererKey: def.rendererKey,
    description: def.description,
    previewCaseCount: def.previewCases.length,
    fieldCount: def.inputContract.fields.length,
  }));
}
