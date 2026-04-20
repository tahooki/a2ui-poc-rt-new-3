"use client";

import type { ActionCallback, TemplateAction } from "../types/action-event";

export function getByPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (current === undefined || current === null) return undefined;
    if (Array.isArray(current) && /^\d+$/.test(part)) return current[Number(part)];
    if (typeof current === "object") return (current as Record<string, unknown>)[part];
    return undefined;
  }, value);
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function resolveActions(actions: TemplateAction[] | undefined, fallback: TemplateAction[]): TemplateAction[] {
  return actions && actions.length > 0 ? actions : fallback;
}

export function isActionDisabled(action: TemplateAction, payload: Record<string, unknown>): boolean {
  if (action.enabled === false) return true;
  const missing = (action.requiredPayloadFields ?? []).some((field) => !hasValue(getByPath(payload, field)));
  if (missing) return true;
  if (!action.enableWhen) return false;
  const value = getByPath(payload, action.enableWhen.field);
  if ("equals" in action.enableWhen) return value !== action.enableWhen.equals;
  if ("exists" in action.enableWhen) return !hasValue(value);
  return false;
}

export function emitAction(
  action: TemplateAction,
  onAction: ActionCallback,
  params?: Record<string, unknown>,
): void {
  if (action.confirm) {
    const message = action.confirm.message ?? action.confirm.title ?? "Run this action?";
    if (typeof window !== "undefined" && !window.confirm(message)) return;
  }
  onAction({
    actionId: action.actionId,
    kind: action.kind,
    params: {
      ...(action.params ?? {}),
      ...(params ?? {}),
    },
  });
}
