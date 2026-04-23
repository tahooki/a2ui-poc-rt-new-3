"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { SurfaceRenderer, type SurfaceEnvelope } from "@a2ui/ui";
import { registerBuiltinTemplates } from "@a2ui/ui/templates/register-all";
import {
  A2UI_IDLE_STATUS,
  reduceA2UISurfaceStatus,
  shouldAutoClearA2UISurfaceStatus,
} from "./status-state";
import { normalizeA2UISurface } from "./surface-normalization";
import type { A2UISurfaceHostLabels, A2UISurfaceHostProps, A2UISurfaceStatus } from "./types";

const DEFAULT_CLEAR_DONE_AFTER_MS = 1200;

const DEFAULT_LABELS = {
  running: "Running action...",
  done: "Action complete",
  error: "Action failed",
  readOnly: "Preview mode",
  invalid: "A2UI surface is not renderable.",
} satisfies Required<A2UISurfaceHostLabels>;

const statusBoxStyle = {
  border: "1px solid rgba(91,141,238,.28)",
  background: "rgba(91,141,238,.08)",
  borderRadius: 8,
  color: "#d7e2ff",
  fontSize: 12,
  lineHeight: 1.4,
  marginBottom: 10,
  padding: "8px 10px",
} satisfies CSSProperties;

function statusMessage(status: A2UISurfaceStatus, labels: Required<A2UISurfaceHostLabels>): string {
  if (status.phase === "running") return status.message ?? labels.running;
  if (status.phase === "done") return status.message ?? labels.done;
  if (status.phase === "error") return status.error ?? status.message ?? labels.error;
  return "";
}

function DefaultStatus({
  labels,
  readOnly,
  status,
}: {
  labels: Required<A2UISurfaceHostLabels>;
  readOnly: boolean;
  status: A2UISurfaceStatus;
}) {
  if (status.phase !== "idle") {
    const tone =
      status.phase === "error"
        ? {
            background: "rgba(244,106,106,.1)",
            borderColor: "rgba(244,106,106,.32)",
            color: "#ffb4b4",
          }
        : undefined;

    return (
      <div style={{ ...statusBoxStyle, ...tone }}>
        {status.actionId ? <strong>{status.actionId}</strong> : null}
        {status.actionId ? " - " : null}
        {statusMessage(status, labels)}
      </div>
    );
  }

  if (!readOnly) return null;
  return <div style={statusBoxStyle}>{labels.readOnly}</div>;
}

function InvalidSurfaceFallback({
  fallback,
  labels,
}: {
  fallback?: ReactNode;
  labels: Required<A2UISurfaceHostLabels>;
}) {
  if (fallback) return <>{fallback}</>;
  return (
    <div
      style={{
        border: "1px solid rgba(244,106,106,.35)",
        background: "rgba(244,106,106,.08)",
        borderRadius: 8,
        color: "#f46a6a",
        fontSize: 13,
        padding: 12,
      }}
    >
      {labels.invalid}
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function disabledAction(action: unknown, reason: string): unknown {
  if (!isRecord(action)) return action;
  return {
    ...action,
    confirm: undefined,
    disabledReason: typeof action.disabledReason === "string" ? action.disabledReason : reason,
    enabled: false,
  };
}

function disabledActionList(actions: unknown, reason: string): unknown {
  return Array.isArray(actions) ? actions.map((action) => disabledAction(action, reason)) : actions;
}

function surfaceWithDisabledActions(surface: SurfaceEnvelope, reason: string): SurfaceEnvelope {
  return {
    ...surface,
    actions: disabledActionList(surface.actions, reason) as SurfaceEnvelope["actions"],
    payload: {
      ...surface.payload,
      ...(Array.isArray(surface.payload.actions)
        ? { actions: disabledActionList(surface.payload.actions, reason) }
        : {}),
    },
  };
}

export function A2UISurfaceHost({
  surface,
  onAction,
  onSurfaceChange,
  onFactsChange,
  onStatusChange,
  disabled = false,
  readOnly = false,
  clearDoneAfterMs = DEFAULT_CLEAR_DONE_AFTER_MS,
  className,
  style,
  labels,
  renderStatus,
  invalidFallback,
  emptyFallback = null,
  registerBuiltins = true,
}: A2UISurfaceHostProps) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const normalizedSurface = useMemo(() => normalizeA2UISurface(surface), [surface]);
  const [status, setStatus] = useState<A2UISurfaceStatus>(A2UI_IDLE_STATUS);
  const actionsLocked = disabled || readOnly || !onAction;
  const rendererSurface = useMemo(() => {
    if (!normalizedSurface) return null;
    return actionsLocked
      ? surfaceWithDisabledActions(normalizedSurface, mergedLabels.readOnly)
      : normalizedSurface;
  }, [actionsLocked, mergedLabels.readOnly, normalizedSurface]);

  if (registerBuiltins) {
    registerBuiltinTemplates();
  }

  useEffect(() => {
    onStatusChange?.(status);
  }, [onStatusChange, status]);

  useEffect(() => {
    if (!shouldAutoClearA2UISurfaceStatus(status) || clearDoneAfterMs <= 0) return;

    const actionId = status.actionId;
    const timer = window.setTimeout(() => {
      setStatus((current) => reduceA2UISurfaceStatus(current, { type: "clear", actionId }));
    }, clearDoneAfterMs);

    return () => window.clearTimeout(timer);
  }, [clearDoneAfterMs, status]);

  const handleAction = useCallback(
    async (event: Parameters<NonNullable<ComponentProps<typeof SurfaceRenderer>["onAction"]>>[0]) => {
      if (!normalizedSurface || disabled || readOnly || !onAction) return;

      setStatus((current) => reduceA2UISurfaceStatus(current, {
        type: "start",
        actionId: event.actionId,
      }));

      try {
        const result = await onAction({
          actionId: event.actionId,
          kind: event.kind,
          params: event.params,
          payload: event.params,
          surface: normalizedSurface,
        });
        const nextSurface = normalizeA2UISurface(result.surface);
        if (nextSurface || result.surface === null) {
          onSurfaceChange?.(nextSurface);
        }
        if (result.facts) {
          onFactsChange?.(result.facts);
        }
        setStatus((current) => reduceA2UISurfaceStatus(current, {
          type: "done",
          actionId: event.actionId,
          message: result.message,
        }));
      } catch (error) {
        setStatus((current) => reduceA2UISurfaceStatus(current, {
          type: "error",
          actionId: event.actionId,
          error: error instanceof Error ? error.message : String(error),
        }));
      }
    },
    [disabled, normalizedSurface, onAction, onFactsChange, onSurfaceChange, readOnly],
  );

  if (!surface) return <>{emptyFallback}</>;

  if (!normalizedSurface) {
    return <InvalidSurfaceFallback fallback={invalidFallback} labels={mergedLabels} />;
  }

  return (
    <div className={className} style={style}>
      {renderStatus ? renderStatus(status) : (
        <DefaultStatus labels={mergedLabels} readOnly={actionsLocked} status={status} />
      )}
      <SurfaceRenderer
        envelope={rendererSurface as SurfaceEnvelope}
        onAction={handleAction}
      />
    </div>
  );
}
