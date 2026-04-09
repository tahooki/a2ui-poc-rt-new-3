"use client";

import { SurfaceCard } from "../primitives/SurfaceCard";
import { StatusBadge } from "../primitives/StatusBadge";
import { ActionButton } from "../primitives/ActionButton";
import { DataTable } from "../primitives/DataTable";
import { PropertyList } from "../primitives/PropertyList";
import type { ActionCallback } from "../types/action-event";

type EligibleVersion = {
  id: string;
  version: string;
  status: string;
  rollbackRisk: string;
};

type Candidate = {
  id: string;
  service: string;
  environment: string;
  currentVersion: string;
  severity: string;
  incidentSummary: string;
  recommendedRollbackVersion: string;
  eligibleVersions: EligibleVersion[];
};

type ServiceHealth = {
  service: string;
  version: string;
  status: string;
  errorRate: string;
  normalErrorRate: string;
  p99Latency: string;
  normalP99Latency: string;
  instances: { total: number; healthy: number; unhealthy: number };
  lastDeployedAt: string;
  activeIncident: { id: string; title: string; severity: string; startedAt: string } | null;
};

type RollbackPayload = {
  candidates: Candidate[];
  serviceHealth?: ServiceHealth[];
  causeSummary?: string;
  recommendation?: string;
  [key: string]: unknown;
};

const severityToLevel: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "success",
};

const statusToLevel: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  critical: "danger",
  warning: "warning",
  healthy: "success",
};

const riskToLevel: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  low: "success",
  medium: "warning",
  high: "danger",
  completed: "info",
};

export function RollbackSummary({
  payload,
  onAction,
}: {
  payload: Record<string, unknown>;
  onAction: ActionCallback;
}) {
  const p = payload as unknown as RollbackPayload;

  return (
    <SurfaceCard
      title="Rollback Summary"
      subtitle={`${p.candidates.length}개 서비스 롤백 대상`}
      status="ready"
    >
      {/* Service Health */}
      {p.serviceHealth && p.serviceHealth.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#8b9ab5", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>
            Service Health
          </div>
          <DataTable
            columns={[
              { key: "service", label: "Service", width: "18%" },
              { key: "version", label: "Version", width: "12%" },
              {
                key: "status",
                label: "Status",
                width: "12%",
                render: (val: unknown) => (
                  <StatusBadge
                    level={statusToLevel[val as string] ?? "neutral"}
                    label={val as string}
                  />
                ),
              },
              { key: "errorRate", label: "Error Rate", width: "14%" },
              { key: "p99Latency", label: "P99 Latency", width: "14%" },
              {
                key: "instances",
                label: "Instances",
                width: "14%",
                render: (val: unknown) => {
                  const inst = val as { total: number; healthy: number; unhealthy: number };
                  return `${inst.healthy}/${inst.total} healthy`;
                },
              },
              { key: "lastDeployedAt", label: "Deployed", width: "12%" },
            ]}
            rows={p.serviceHealth as unknown as Record<string, unknown>[]}
          />
        </div>
      )}

      {/* LLM Analysis */}
      {(p.causeSummary || p.recommendation) && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#8b9ab5", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>
            AI Analysis
          </div>
          <div
            style={{
              padding: "12px 14px",
              background: "rgba(244,106,106,.06)",
              border: "1px solid rgba(244,106,106,.2)",
              borderRadius: 6,
              fontSize: 13,
              color: "#e4e8ef",
              lineHeight: 1.6,
            }}
          >
            {p.causeSummary && (
              <div style={{ marginBottom: p.recommendation ? 8 : 0 }}>
                <strong style={{ color: "#f46a6a" }}>원인 분석:</strong> {p.causeSummary}
              </div>
            )}
            {p.recommendation && (
              <div>
                <strong style={{ color: "#34c38f" }}>권장 사항:</strong> {p.recommendation}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rollback Candidates */}
      {p.candidates.map((candidate) => (
        <div
          key={candidate.id}
          style={{
            marginBottom: 16,
            padding: 14,
            background: "rgba(13,21,32,.5)",
            border: "1px solid rgba(37,50,68,.76)",
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <StatusBadge
              level={severityToLevel[candidate.severity] ?? "neutral"}
              label={candidate.severity.toUpperCase()}
            />
            <span style={{ fontSize: 14, fontWeight: 700, color: "#e4e8ef" }}>
              {candidate.service}
            </span>
            <span style={{ fontSize: 12, color: "#8b9ab5" }}>
              {candidate.environment}
            </span>
          </div>

          <PropertyList
            items={[
              { label: "Current", value: candidate.currentVersion },
              { label: "Recommended", value: candidate.recommendedRollbackVersion },
              { label: "Incident", value: candidate.incidentSummary },
            ]}
          />

          {candidate.eligibleVersions.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <DataTable
                columns={[
                  { key: "version", label: "Version", width: "30%" },
                  { key: "status", label: "Status", width: "35%" },
                  {
                    key: "rollbackRisk",
                    label: "Risk",
                    width: "35%",
                    render: (val: unknown) => (
                      <StatusBadge
                        level={riskToLevel[val as string] ?? "neutral"}
                        label={val as string}
                      />
                    ),
                  },
                ]}
                rows={candidate.eligibleVersions as unknown as Record<string, unknown>[]}
              />
            </div>
          )}
        </div>
      ))}

      {/* Actions */}
      <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <ActionButton
          label="롤백 실행"
          variant="danger"
          onClick={() =>
            onAction({
              actionId: "rollback.execute",
              kind: "submit",
              params: {
                candidates: p.candidates.map((c) => ({
                  service: c.service,
                  targetVersion: c.recommendedRollbackVersion,
                })),
              },
            })
          }
        />
        <ActionButton
          label="로그 보기"
          variant="ghost"
          onClick={() => onAction({ actionId: "rollback.viewLogs", kind: "navigate" })}
        />
      </div>
    </SurfaceCard>
  );
}
