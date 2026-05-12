"use client";

import type { ReactNode } from "react";

export function PartSection({
  title,
  subtitle,
  children,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        background: "rgba(13,21,32,.62)",
        border: "1px solid rgba(37,50,68,.62)",
        borderRadius: 8,
        padding: 14,
      }}
    >
      {title || subtitle ? (
        <div style={{ marginBottom: 10 }}>
          {title ? (
            <div style={{ color: "#e4e8ef", fontSize: 13, fontWeight: 800 }}>{title}</div>
          ) : null}
          {subtitle ? (
            <div style={{ color: "#8b9ab5", fontSize: 12, marginTop: 3 }}>{subtitle}</div>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyPartState({ label = "No data" }: { label?: string }) {
  return (
    <div
      style={{
        color: "#8b9ab5",
        fontSize: 12,
        padding: "8px 0",
      }}
    >
      {label}
    </div>
  );
}

export function stringifyPartValue(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

