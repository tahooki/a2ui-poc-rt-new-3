import type { A2UIPartConfig, SurfaceConfig, SurfaceConfigValue } from "../../dynamic/schema";

export type A2UIPartCategory =
  | "shared"
  | "deploy"
  | "approval"
  | "rollback";

export type A2UIPartEditorField =
  | {
      kind: "bindingPath";
      prop: string;
      label: string;
      defaultPath: string;
      fallback?: unknown;
      required?: boolean;
      description?: string;
    }
  | {
      kind: "staticStringList";
      prop: string;
      label: string;
      defaultValue: string[];
      required?: boolean;
      description?: string;
    }
  | {
      kind: "staticText";
      prop: string;
      label: string;
      defaultValue?: string;
      required?: boolean;
      description?: string;
    }
  | {
      kind: "select";
      prop: string;
      label: string;
      options: Array<{ label: string; value: string }>;
      defaultValue?: string;
      required?: boolean;
      description?: string;
    }
  | {
      kind: "staticJson";
      prop: string;
      label: string;
      defaultValue: SurfaceConfigValue;
      required?: boolean;
      description?: string;
      rows?: number;
    };

export type A2UIPartDefinition = {
  type: string;
  label: string;
  category: A2UIPartCategory;
  description?: string;
  defaultIdPrefix?: string;
  defaultProps: Record<string, SurfaceConfigValue>;
  editorFields: A2UIPartEditorField[];
  previewPayload?: Record<string, unknown>;
  requiredPayloadPaths?: string[];
};

export type A2UIPartDefinitionFilter = {
  categories?: A2UIPartCategory[];
};

export type PartPreviewSurfaceOptions = {
  title?: string;
  subtitle?: string;
};

export type PartPreviewSurfaceConfig = SurfaceConfig & {
  parts: [A2UIPartConfig];
};
