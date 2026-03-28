/**
 * Builds a view model for the contract viewer panel.
 */

import type { TemplateRegistryDefinition, TemplateInputContractField } from "./registry-types";

export type ContractFieldViewModel = {
  path: string;
  type: string;
  required: boolean;
  description: string;
  example: string;
  enumValues: string[];
};

export type ContractViewModel = {
  templateId: string;
  title: string;
  schemaVersion: string;
  fields: ContractFieldViewModel[];
};

export function buildContractViewModel(def: TemplateRegistryDefinition): ContractViewModel {
  return {
    templateId: def.templateId,
    title: def.title,
    schemaVersion: def.inputContract.schemaVersion,
    fields: def.inputContract.fields.map((f) => ({
      path: f.path,
      type: f.type,
      required: f.required,
      description: f.description ?? "",
      example: f.example !== undefined ? JSON.stringify(f.example) : "",
      enumValues: f.enumValues ?? [],
    })),
  };
}
