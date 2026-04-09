"use client";

import type { ReactNode } from "react";

export type SurfaceCardProps = {
  title: string;
  subtitle?: string;
  status?: "ready" | "warning" | "error" | "success" | "info";
  children: ReactNode;
};

const statusColors: Record<string, string> = {
  ready: "#5b8dee",
  warning: "#f7c948",
  error: "#f46a6a",
  success: "#34c38f",
  info: "#a78bfa",
};

export function SurfaceCard({ title, subtitle, status, children }: SurfaceCardProps) {
  const borderColor = status ? statusColors[status] ?? "#5b8dee" : "#5b8dee";

  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid rgba(37,50,68,.76)",
        borderTop: `3px solid ${borderColor}`,
        borderRadius: 10,
        padding: "20px 24px",
        color: "#e4e8ef",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 13, color: "#8b9ab5", marginTop: 4 }}>{subtitle}</div>
        )}
      </div>
      {children}
    </div>
  );
}
