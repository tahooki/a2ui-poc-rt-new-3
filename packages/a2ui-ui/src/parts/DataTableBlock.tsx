"use client";

import { DataTable, type DataTableColumn } from "../primitives/DataTable";
import { StatusBadge } from "../primitives/StatusBadge";
import { EmptyPartState, PartSection, isRecord, stringifyPartValue } from "./shared";

type ColumnConfig = {
  label?: unknown;
  field?: unknown;
  key?: unknown;
  format?: unknown;
  width?: unknown;
};

export function DataTableBlock(props: Record<string, unknown>) {
  const title = typeof props.title === "string" ? props.title : undefined;
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
          ? (value) => <StatusBadge label={stringifyPartValue(value)} level="info" />
          : undefined,
      };
    });

  return (
    <PartSection title={title}>
      {rows.length > 0 && columns.length > 0 ? (
        <DataTable columns={columns} rows={rows} />
      ) : (
        <EmptyPartState label="No rows configured" />
      )}
    </PartSection>
  );
}

