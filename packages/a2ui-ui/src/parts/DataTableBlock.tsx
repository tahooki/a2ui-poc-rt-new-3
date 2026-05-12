"use client";

import { DataTable, type DataTableColumn } from "../primitives/DataTable";
import { StatusBadge, type StatusBadgeProps } from "../primitives/StatusBadge";
import { EmptyPartState, PartSection, isRecord, stringifyPartValue } from "./shared";

type ColumnConfig = {
  label?: unknown;
  field?: unknown;
  key?: unknown;
  format?: unknown;
  width?: unknown;
};

function statusLevel(value: unknown): StatusBadgeProps["level"] {
  const normalized = stringifyPartValue(value).toLowerCase();
  if (["success", "succeeded", "healthy", "passed", "approved", "done", "complete", "completed"].includes(normalized)) {
    return "success";
  }
  if (["warning", "pending", "running", "in_progress", "progress", "hold", "held"].includes(normalized)) {
    return "warning";
  }
  if (["failed", "failure", "error", "danger", "rejected", "cancelled", "canceled"].includes(normalized)) {
    return "danger";
  }
  if (["neutral", "unknown", "skipped"].includes(normalized)) {
    return "neutral";
  }
  return "info";
}

export function DataTableBlock(props: Record<string, unknown>) {
  const title = typeof props.title === "string" ? props.title : undefined;
  const emptyMessage = typeof props.emptyMessage === "string" ? props.emptyMessage : "No rows configured";
  const rows = Array.isArray(props.rows) ? props.rows.filter(isRecord) : [];
  const rawColumns = Array.isArray(props.columns) ? props.columns : [];
  const columns: DataTableColumn[] = rawColumns
    .filter((column): column is ColumnConfig => !!column && typeof column === "object")
    .map((column) => {
      const key = stringifyPartValue(column.field ?? column.key);
      const format = typeof column.format === "string" ? column.format : undefined;
      return {
        key,
        label: stringifyPartValue(column.label ?? key),
        width: typeof column.width === "string" ? column.width : undefined,
        render: format === "status"
          ? (value) => <StatusBadge label={stringifyPartValue(value)} level={statusLevel(value)} />
          : undefined,
      };
    });

  return (
    <PartSection title={title}>
      {rows.length > 0 && columns.length > 0 ? (
        <DataTable columns={columns} rows={rows} />
      ) : (
        <EmptyPartState label={emptyMessage} />
      )}
    </PartSection>
  );
}
