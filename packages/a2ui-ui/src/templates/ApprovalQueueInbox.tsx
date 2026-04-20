"use client";

import { useState } from "react";
import { SurfaceCard } from "../primitives/SurfaceCard";
import { StatusBadge } from "../primitives/StatusBadge";
import { ActionButton } from "../primitives/ActionButton";
import { DataTable } from "../primitives/DataTable";
import type { ActionCallback, TemplateAction } from "../types/action-event";
import { emitAction, isActionDisabled, resolveActions } from "./action-utils";

type ApprovalItem = {
  id: string;
  type: string;
  title: string;
  environment: string;
  requestedBy: string;
  riskSummary: string;
  riskTone: string;
  status: string;
};

type ApprovalQueuePayload = {
  items: ApprovalItem[];
  byStatus?: Record<string, number>;
  byType?: Record<string, number>;
  queueSummary?: string;
  [key: string]: unknown;
};

const toneToLevel: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "info",
};

const statusToLevel: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  pending: "warning",
  approved: "success",
  held: "danger",
};

export function ApprovalQueueInbox({
  payload,
  actions,
  onAction,
}: {
  payload: Record<string, unknown>;
  actions?: TemplateAction[];
  onAction: ActionCallback;
}) {
  const p = payload as unknown as ApprovalQueuePayload;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const renderedActions = resolveActions(actions, [
    { actionId: "approve.selected", label: "선택 항목 승인", variant: "primary", kind: "submit" },
    { actionId: "approve.hold", label: "보류", variant: "ghost", kind: "submit" },
  ]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pendingCount = p.byStatus?.pending ?? p.items.filter((i) => i.status === "pending").length;

  return (
    <SurfaceCard
      title="Approval Queue Inbox"
      subtitle={`${pendingCount}건 승인 대기`}
      status="ready"
    >
      {/* Status Summary */}
      {p.byStatus && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {Object.entries(p.byStatus).map(([status, count]) => (
            <StatusBadge
              key={status}
              level={statusToLevel[status] ?? "neutral"}
              label={`${status}: ${count}`}
            />
          ))}
        </div>
      )}

      {/* LLM Queue Summary */}
      {p.queueSummary && (
        <div
          style={{
            padding: "10px 14px",
            marginBottom: 16,
            background: "rgba(91,141,238,.08)",
            border: "1px solid rgba(91,141,238,.2)",
            borderRadius: 6,
            fontSize: 13,
            color: "#b0c4ef",
            lineHeight: 1.5,
          }}
        >
          {p.queueSummary}
        </div>
      )}

      {/* Items Table */}
      <DataTable
        columns={[
          {
            key: "_select",
            label: "",
            width: "36px",
            render: (_: unknown, row: Record<string, unknown>) => (
              <input
                type="checkbox"
                checked={selected.has(row.id as string)}
                onChange={() => toggleSelect(row.id as string)}
                style={{ accentColor: "#5b8dee" }}
              />
            ),
          },
          { key: "type", label: "Type", width: "15%" },
          { key: "title", label: "Title" },
          { key: "environment", label: "Env", width: "10%" },
          { key: "requestedBy", label: "Requested By", width: "12%" },
          {
            key: "riskSummary",
            label: "Risk",
            width: "20%",
            render: (_: unknown, row: Record<string, unknown>) => (
              <span>
                <StatusBadge
                  level={toneToLevel[row.riskTone as string] ?? "neutral"}
                  label={row.riskSummary as string}
                />
              </span>
            ),
          },
          {
            key: "status",
            label: "Status",
            width: "10%",
            render: (val: unknown) => (
              <StatusBadge
                level={statusToLevel[val as string] ?? "neutral"}
                label={val as string}
              />
            ),
          },
        ]}
        rows={p.items as unknown as Record<string, unknown>[]}
      />

      {/* Actions */}
      <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
        {renderedActions.map((action) => (
          <ActionButton
            key={action.actionId}
            label={action.actionId === "approve.selected" ? `${action.label} (${selected.size})` : action.label}
            variant={action.variant}
            disabled={isActionDisabled(action, payload)}
            onClick={() => emitAction(action, onAction, { selectedIds: Array.from(selected) })}
          />
        ))}
      </div>
    </SurfaceCard>
  );
}
