"use client";

import { ActionButton } from "../primitives/ActionButton";
import { DataTable } from "../primitives/DataTable";
import { PropertyList } from "../primitives/PropertyList";
import { StatusBadge } from "../primitives/StatusBadge";
import { SurfaceCard } from "../primitives/SurfaceCard";
import type { ActionCallback, TemplateAction } from "../types/action-event";
import { emitAction, isActionDisabled, resolveActions } from "./action-utils";

type SmokeRow = {
  name: string;
  value: string;
  status: "success" | "warning" | "danger" | "info" | "neutral";
};

type ComponentSmokePayload = {
  templateId: "component_smoke_test";
  headline: string;
  summary?: string;
  metricLabel: string;
  metricValue: string;
  statusTone: "success" | "warning" | "danger" | "info" | "neutral";
  rows: SmokeRow[];
  footerNote?: string;
  [key: string]: unknown;
};

export function ComponentSmokeTest({
  payload,
  actions,
  onAction,
}: {
  payload: Record<string, unknown>;
  actions?: TemplateAction[];
  onAction: ActionCallback;
}) {
  const p = payload as unknown as ComponentSmokePayload;
  const cardStatus = p.statusTone === "danger" ? "error" : p.statusTone === "neutral" ? "info" : p.statusTone;
  const renderedActions = resolveActions(actions, [
    { actionId: "smoke.ack", label: "Acknowledge", variant: "primary", kind: "submit" },
    { actionId: "smoke.refresh", label: "Refresh", variant: "ghost", kind: "refresh" },
  ]);

  return (
    <SurfaceCard
      title="Component Smoke Test"
      subtitle={p.headline}
      status={cardStatus}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <StatusBadge level={p.statusTone} label={p.statusTone.toUpperCase()} />
          <span style={{ color: "#8b9ab5", fontSize: 13 }}>
            Rendered from Admin-bound payload
          </span>
        </div>

        <PropertyList
          items={[
            { label: p.metricLabel, value: p.metricValue },
            { label: "Template", value: p.templateId },
            ...(p.summary ? [{ label: "Summary", value: p.summary }] : []),
          ]}
        />

        <div>
          <div style={{ color: "#8b9ab5", fontSize: 11, fontWeight: 700, letterSpacing: ".05em", marginBottom: 6, textTransform: "uppercase" }}>
            Bound Rows
          </div>
          <DataTable
            columns={[
              { key: "name", label: "Name", width: "38%" },
              { key: "value", label: "Value", width: "34%" },
              {
                key: "status",
                label: "Status",
                render: (value) => <StatusBadge level={String(value) as SmokeRow["status"]} label={String(value)} />,
              },
            ]}
            rows={p.rows}
          />
        </div>

        {p.footerNote && (
          <div style={{ color: "#8b9ab5", fontSize: 12, borderTop: "1px solid rgba(37,50,68,.76)", paddingTop: 12 }}>
            {p.footerNote}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {renderedActions.map((action) => (
            <ActionButton
              key={action.actionId}
              label={action.label}
              variant={action.variant}
              disabled={isActionDisabled(action, payload)}
              onClick={() => emitAction(action, onAction)}
            />
          ))}
        </div>
      </div>
    </SurfaceCard>
  );
}
