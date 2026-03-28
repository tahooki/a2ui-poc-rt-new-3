/**
 * Phase 5: Template registry types.
 *
 * These types define the management/documentation layer on top of
 * the runtime template system (Phase 3). Registry definitions are
 * read-mostly documents for operators to inspect and validate templates.
 *
 * IMPORTANT: runtime payload types live in types/templates.ts.
 * Registry definitions are the documentation/management layer, not the runtime.
 */

export type TemplateRegistryStatus = "active" | "draft" | "deprecated";

export type TemplateInputContractField = {
  path: string;
  type: string;
  required: boolean;
  description?: string;
  example?: unknown;
  enumValues?: string[];
};

export type TemplateInputContract = {
  schemaVersion: string;
  fields: TemplateInputContractField[];
};

export type TemplateSelectionPolicyDoc = {
  intentKeys: string[];
  requiredFacts: string[];
  optionalFacts?: string[];
  disqualifiers?: string[];
  minScore?: number;
  reasonTemplate?: string;
};

export type TemplatePreviewCase = {
  id: string;
  title: string;
  description?: string;
  payload: Record<string, unknown>;
};

export type TemplateRegistryDefinition = {
  templateId: string;
  version: string;
  status: TemplateRegistryStatus;
  rendererKey: string;
  sourcePath?: string;
  owner?: string;
  updatedAt?: string;
  title: string;
  description: string;
  inputContract: TemplateInputContract;
  selectionPolicyDoc: TemplateSelectionPolicyDoc;
  previewCases: TemplatePreviewCase[];
};
