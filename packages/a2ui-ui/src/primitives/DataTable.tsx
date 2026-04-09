"use client";

import type { ReactNode } from "react";

export type DataTableColumn<T = Record<string, unknown>> = {
  key: string;
  label: string;
  render?: (value: unknown, row: T) => ReactNode;
  width?: string;
};

export type DataTableProps<T = Record<string, unknown>> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          color: "#e4e8ef",
        }}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  textAlign: "left",
                  padding: "8px 12px",
                  borderBottom: "1px solid rgba(37,50,68,.76)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#8b9ab5",
                  textTransform: "uppercase",
                  letterSpacing: ".05em",
                  width: col.width,
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              style={{
                cursor: onRowClick ? "pointer" : "default",
                borderBottom: "1px solid rgba(37,50,68,.4)",
              }}
            >
              {columns.map((col) => (
                <td key={col.key} style={{ padding: "10px 12px" }}>
                  {col.render
                    ? col.render(row[col.key], row)
                    : String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
