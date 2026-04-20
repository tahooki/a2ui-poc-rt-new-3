"use client";

import { StatusBadge } from "../../primitives/StatusBadge";
import { EmptyPartState, PartSection, isRecord, stringifyPartValue } from "../shared";

function levelFor(status: unknown): "success" | "warning" | "danger" | "info" | "neutral" {
  const value = String(status ?? "pass").toLowerCase();
  if (value === "pass" || value === "passed" || value === "success" || value === "ok") return "success";
  if (value === "warn" || value === "warning") return "warning";
  if (value === "fail" || value === "failed" || value === "danger" || value === "error") return "danger";
  return "info";
}

export function DeployPreflightChecklistBlock(props: Record<string, unknown>) {
  const checks = Array.isArray(props.checks) ? props.checks : [];

  return (
    <PartSection subtitle="Readiness signals resolved before the deploy action is enabled." title="Preflight checks">
      {checks.length > 0 ? (
        <div style={{ display: "grid", gap: 9 }}>
          {checks.map((check, index) => {
            const item = isRecord(check) ? check : { label: check, status: "pass" };
            const status = item.status ?? "pass";
            return (
              <div
                key={`${stringifyPartValue(item.label)}-${index}`}
                style={{
                  alignItems: "center",
                  background: "rgba(17,24,39,.55)",
                  border: "1px solid rgba(37,50,68,.46)",
                  borderRadius: 7,
                  display: "flex",
                  gap: 12,
                  justifyContent: "space-between",
                  padding: "9px 10px",
                }}
              >
                <span style={{ color: "#e4e8ef", fontSize: 13 }}>{stringifyPartValue(item.label)}</span>
                <StatusBadge label={stringifyPartValue(status)} level={levelFor(status)} />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyPartState label="No preflight checks available" />
      )}
    </PartSection>
  );
}

