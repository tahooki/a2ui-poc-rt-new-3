"use client";

import { SurfaceCard } from "../primitives/SurfaceCard";
import { PropertyList } from "../primitives/PropertyList";
import { StatusBadge } from "../primitives/StatusBadge";
import { ActionButton } from "../primitives/ActionButton";
import { DataTable } from "../primitives/DataTable";
import type { ActionCallback, TemplateAction } from "../types/action-event";
import { emitAction, isActionDisabled, resolveActions } from "./action-utils";

type DeployLaunchpadPayload = {
  service: string;
  environment: string;
  targetVersion: string;
  recommendedVersion?: string;
  strategy: string;
  state: "ready" | "deploying" | "done";
  impactSummary?: string;
  preflightChecks?: string[];
  imageDetail?: Record<string, string>;
  requestDetail?: Record<string, string>;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  lastDeployment?: { version: string; deployedBy: string; deployedAt: string; status: string };
  deploymentHistory?: { version: string; deployedBy: string; deployedAt: string; status: string }[];
  [key: string]: unknown;
};

export function DeployLaunchpad({
  payload,
  actions,
  onAction,
}: {
  payload: Record<string, unknown>;
  actions?: TemplateAction[];
  onAction: ActionCallback;
}) {
  const p = payload as unknown as DeployLaunchpadPayload;
  const renderedActions = resolveActions(actions, [
    { actionId: "deploy.start", label: p.primaryActionLabel ?? "배포 시작", variant: "primary", kind: "submit" },
    { actionId: "deploy.refresh", label: p.secondaryActionLabel ?? "새로 고침", variant: "ghost", kind: "refresh" },
  ]);

  const stateLabel =
    p.state === "deploying" ? "배포 중..." : p.state === "done" ? "배포 완료" : "배포 준비";
  const stateLevel =
    p.state === "deploying" ? "warning" : p.state === "done" ? "success" : "info";

  return (
    <SurfaceCard
      title="Deploy Launchpad"
      subtitle={`${p.service} / ${p.environment}`}
      status={p.state === "done" ? "success" : "ready"}
    >
      {/* Status */}
      <div style={{ marginBottom: 16 }}>
        <StatusBadge level={stateLevel} label={stateLabel} />
      </div>

      {/* Service Info */}
      <PropertyList
        items={[
          { label: "Service", value: p.service },
          { label: "Environment", value: p.environment },
          { label: "Target Version", value: p.targetVersion },
          { label: "Strategy", value: p.strategy },
          ...(p.recommendedVersion
            ? [{ label: "Recommended", value: p.recommendedVersion }]
            : []),
          ...(p.impactSummary
            ? [{ label: "Impact", value: p.impactSummary }]
            : []),
        ]}
      />

      {/* Preflight Checks */}
      {p.preflightChecks && p.preflightChecks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#8b9ab5", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>
            Preflight Checks
          </div>
          {p.preflightChecks.map((check, i) => (
            <div key={i} style={{ fontSize: 13, color: "#34c38f", marginBottom: 2 }}>
              ✓ {check}
            </div>
          ))}
        </div>
      )}

      {/* Image Detail */}
      {p.imageDetail && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#8b9ab5", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>
            Image
          </div>
          <DataTable
            columns={[
              { key: "field", label: "Field", width: "40%" },
              { key: "value", label: "Value" },
            ]}
            rows={Object.entries(p.imageDetail).map(([k, v]) => ({
              field: k,
              value: v,
            }))}
          />
        </div>
      )}

      {/* Request Detail */}
      {p.requestDetail && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#8b9ab5", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>
            Request
          </div>
          <DataTable
            columns={[
              { key: "field", label: "Field", width: "40%" },
              { key: "value", label: "Value" },
            ]}
            rows={Object.entries(p.requestDetail).map(([k, v]) => ({
              field: k,
              value: v,
            }))}
          />
        </div>
      )}

      {/* Last Deployment */}
      {p.lastDeployment && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#8b9ab5", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>
            Last Deployment
          </div>
          <PropertyList
            items={[
              { label: "Version", value: p.lastDeployment.version },
              { label: "Deployed by", value: p.lastDeployment.deployedBy },
              { label: "Deployed at", value: p.lastDeployment.deployedAt },
              { label: "Status", value: p.lastDeployment.status },
            ]}
          />
        </div>
      )}

      {/* Deployment History */}
      {p.deploymentHistory && p.deploymentHistory.length > 1 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#8b9ab5", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>
            Deployment History
          </div>
          <DataTable
            columns={[
              { key: "version", label: "Version", width: "25%" },
              { key: "status", label: "Status", width: "15%" },
              { key: "deployedBy", label: "Deployed by", width: "25%" },
              { key: "deployedAt", label: "Deployed at" },
            ]}
            rows={p.deploymentHistory}
          />
        </div>
      )}

      {/* Actions */}
      {p.state === "ready" && (
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          {renderedActions.map((action) => (
            <ActionButton
              key={action.actionId}
              label={action.label}
              variant={action.variant}
              disabled={isActionDisabled(action, payload)}
              onClick={() => emitAction(action, onAction)}
            />
          ))}
        </div>
      )}
    </SurfaceCard>
  );
}
