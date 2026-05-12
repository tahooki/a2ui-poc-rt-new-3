import type { CSSProperties, ReactNode } from "react";
import type { ActionCallback, SurfaceEnvelope } from "@a2ui/ui";

export type A2UIRenderableSurface = Omit<SurfaceEnvelope, "version"> & {
  version?: string;
};

export type A2UISurfaceStatusPhase = "idle" | "running" | "done" | "error";

export type A2UISurfaceStatus = {
  phase: A2UISurfaceStatusPhase;
  actionId?: string;
  message?: string;
  error?: string;
};

export type A2UISurfaceActionInput = {
  actionId: string;
  kind?: Parameters<ActionCallback>[0]["kind"];
  params?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  surface: SurfaceEnvelope;
};

export type A2UISurfaceActionResult = {
  surface?: unknown | null;
  facts?: Record<string, unknown>;
  message?: string;
};

export type A2UISurfaceActionAdapter = (
  input: A2UISurfaceActionInput,
) => Promise<A2UISurfaceActionResult> | A2UISurfaceActionResult;

export type A2UISurfaceHostLabels = {
  running?: string;
  done?: string;
  error?: string;
  readOnly?: string;
  invalid?: string;
};

export type A2UISurfaceHostProps = {
  surface: A2UIRenderableSurface | SurfaceEnvelope | unknown | null | undefined;
  onAction?: A2UISurfaceActionAdapter;
  onSurfaceChange?: (surface: SurfaceEnvelope | null) => void;
  onFactsChange?: (facts: Record<string, unknown>) => void;
  onStatusChange?: (status: A2UISurfaceStatus) => void;
  disabled?: boolean;
  readOnly?: boolean;
  clearDoneAfterMs?: number;
  className?: string;
  style?: CSSProperties;
  labels?: A2UISurfaceHostLabels;
  renderStatus?: (status: A2UISurfaceStatus) => ReactNode;
  invalidFallback?: ReactNode;
  emptyFallback?: ReactNode;
  registerBuiltins?: boolean;
};

export type A2UIChatSurfacePart = {
  type: "a2ui_surface";
  id?: string;
  surface: A2UIRenderableSurface | SurfaceEnvelope | unknown;
};

export type A2UIMessageSurfaceProps = Omit<A2UISurfaceHostProps, "surface"> & {
  part: A2UIChatSurfacePart | null | undefined;
};
