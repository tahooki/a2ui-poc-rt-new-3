export type BindingValue =
  | { type: "static"; value: unknown }
  | { type: "binding"; path: string; fallback?: unknown };

export type SurfaceConfigValue =
  | BindingValue
  | string
  | number
  | boolean
  | null
  | SurfaceConfigValue[]
  | { [key: string]: SurfaceConfigValue };

export type A2UICardTone = "ready" | "warning" | "error" | "success" | "info";

export type A2UICardShellConfig = {
  title?: BindingValue;
  subtitle?: BindingValue;
  description?: BindingValue;
  tone?: BindingValue;
  footerNote?: BindingValue;
  actions?: {
    source: "templateActions";
  };
};

export type A2UIPartConfig = {
  id: string;
  type: string;
  props?: Record<string, SurfaceConfigValue>;
};

export type A2UICardSurfaceConfig = {
  kind: "a2ui_card";
  version?: number;
  card?: A2UICardShellConfig;
  parts: A2UIPartConfig[];
};

export type SurfaceConfig = A2UICardSurfaceConfig;

export type DynamicA2UIEnvelope = {
  templateId: string;
  version?: string;
  payload: Record<string, unknown>;
  actions?: unknown[];
  sourceIntent: string;
  updatedAt: string;
  freshnessKey?: string;
  meta?: Record<string, unknown>;
  surfaceConfig?: SurfaceConfig;
};

