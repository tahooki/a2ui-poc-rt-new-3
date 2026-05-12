"use client";

import type { ReactNode } from "react";
import { ActionButton } from "../primitives/ActionButton";
import { StatusBadge } from "../primitives/StatusBadge";
import type { ActionCallback, TemplateAction } from "../types/action-event";
import { emitAction, isActionDisabled } from "../templates/action-utils";
import type { A2UICardTone } from "./schema";

export type A2UICardShellProps = {
  title: string;
  subtitle?: string;
  description?: string;
  tone?: A2UICardTone;
  footerNote?: string;
  actions?: TemplateAction[];
  payload: Record<string, unknown>;
  onAction: ActionCallback;
  children: ReactNode;
};

const toneBorder: Record<A2UICardTone, string> = {
  ready: "#5b8dee",
  warning: "#f7c948",
  error: "#f46a6a",
  success: "#34c38f",
  info: "#a78bfa",
};

const toneBadge: Record<A2UICardTone, { level: "success" | "warning" | "danger" | "info" | "neutral"; label: string }> = {
  ready: { level: "info", label: "ready" },
  warning: { level: "warning", label: "attention" },
  error: { level: "danger", label: "blocked" },
  success: { level: "success", label: "done" },
  info: { level: "info", label: "info" },
};

export function A2UICardShell({
  title,
  subtitle,
  description,
  tone = "ready",
  footerNote,
  actions,
  payload,
  onAction,
  children,
}: A2UICardShellProps) {
  const badge = toneBadge[tone] ?? toneBadge.ready;

  return (
    <article
      style={{
        background: "#111827",
        border: "1px solid rgba(37,50,68,.76)",
        borderTop: `3px solid ${toneBorder[tone] ?? toneBorder.ready}`,
        borderRadius: 8,
        padding: "20px 22px",
        color: "#e4e8ef",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
        boxShadow: "0 18px 48px rgba(0,0,0,.18)",
      }}
    >
      <header style={{ display: "flex", justifyContent: "space-between", gap: 18, marginBottom: 18 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.25 }}>{title}</div>
          {subtitle ? (
            <div style={{ color: "#8b9ab5", fontSize: 13, marginTop: 5, overflowWrap: "anywhere" }}>
              {subtitle}
            </div>
          ) : null}
          {description ? (
            <p style={{ color: "#b6c2d2", fontSize: 13, lineHeight: 1.45, margin: "10px 0 0" }}>
              {description}
            </p>
          ) : null}
        </div>
        <div style={{ flex: "0 0 auto" }}>
          <StatusBadge label={badge.label} level={badge.level} />
        </div>
      </header>

      <div style={{ display: "grid", gap: 14 }}>{children}</div>

      {(actions && actions.length > 0) || footerNote ? (
        <footer
          style={{
            borderTop: "1px solid rgba(37,50,68,.58)",
            marginTop: 18,
            paddingTop: 14,
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {footerNote ? (
            <div style={{ color: "#8b9ab5", fontSize: 12 }}>{footerNote}</div>
          ) : <span />}
          {actions && actions.length > 0 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {actions.map((action) => (
                <ActionButton
                  disabled={isActionDisabled(action, payload)}
                  key={action.actionId}
                  label={action.label}
                  onClick={() => emitAction(action, onAction, { payload })}
                  variant={action.variant}
                />
              ))}
            </div>
          ) : null}
        </footer>
      ) : null}
    </article>
  );
}
