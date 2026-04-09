"use client";

import type { ReactNode } from "react";

export type PropertyItem = {
  label: string;
  value: ReactNode;
};

export type PropertyListProps = {
  items: PropertyItem[];
  columns?: 1 | 2 | 3;
};

export function PropertyList({ items, columns = 2 }: PropertyListProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: "10px 24px",
        marginBottom: 16,
      }}
    >
      {items.map((item, i) => (
        <div key={i}>
          <div style={{ fontSize: 11, color: "#8b9ab5", marginBottom: 2, textTransform: "uppercase", letterSpacing: ".05em" }}>
            {item.label}
          </div>
          <div style={{ fontSize: 13, color: "#e4e8ef" }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}
