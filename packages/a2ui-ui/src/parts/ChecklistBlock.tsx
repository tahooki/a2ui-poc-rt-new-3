"use client";

import { StatusBadge } from "../primitives/StatusBadge";
import { EmptyPartState, PartSection, isRecord, stringifyPartValue } from "./shared";

type ChecklistItem = {
  label?: unknown;
  status?: unknown;
};

function statusLevel(status: unknown): "success" | "warning" | "danger" | "info" | "neutral" {
  const value = String(status ?? "success").toLowerCase();
  if (value === "pass" || value === "passed" || value === "success" || value === "ok") return "success";
  if (value === "warn" || value === "warning") return "warning";
  if (value === "fail" || value === "failed" || value === "danger" || value === "error") return "danger";
  return "info";
}

export function ChecklistBlock(props: Record<string, unknown>) {
  const title = typeof props.title === "string" ? props.title : undefined;
  const checks = Array.isArray(props.checks) ? props.checks : [];

  return (
    <PartSection title={title}>
      {checks.length > 0 ? (
        <div style={{ display: "grid", gap: 8 }}>
          {checks.map((check, index) => {
            const item: ChecklistItem = isRecord(check) ? check : { label: check, status: "pass" };
            const status = item.status ?? "pass";
            return (
              <div
                key={`${stringifyPartValue(item.label)}-${index}`}
                style={{
                  alignItems: "center",
                  display: "flex",
                  gap: 10,
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: "#e4e8ef", fontSize: 13 }}>{stringifyPartValue(item.label)}</span>
                <StatusBadge label={stringifyPartValue(status)} level={statusLevel(status)} />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyPartState label="No checks configured" />
      )}
    </PartSection>
  );
}

