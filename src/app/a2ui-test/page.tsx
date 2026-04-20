"use client";

import { useState } from "react";
import { SurfaceRenderer } from "@a2ui/ui";
import { registerBuiltinTemplates } from "@a2ui/ui/templates/register-all";
import type { SurfaceEnvelope } from "@a2ui/ui";
import { deployLaunchpadSurfaceConfig } from "@/devops-chat/templates/surface-configs/deploy-launchpad";

// Register all 3 templates
registerBuiltinTemplates();

// --- Mock Envelopes ---

const deployEnvelope: SurfaceEnvelope = {
  templateId: "deploy_launchpad",
  version: "1.0.0",
  sourceIntent: "deploy.start",
  updatedAt: new Date().toISOString(),
  payload: {
    templateId: "deploy_launchpad",
    state: "ready",
    service: "payments-api",
    environment: "production",
    targetVersion: "v2.3.18-rc1",
    recommendedVersion: "v2.3.18-rc1",
    strategy: "rolling",
    impactSummary: "payments-api production 환경에 v2.3.18-rc1 배포",
    preflightChecks: ["3개 환경 확인됨", "1개 이미지 사용 가능"],
    imageDetail: {
      repository: "payments-api",
      imageTag: "v2.3.18-rc1",
      commitSha: "a18fe902",
      buildStatus: "push_verified",
      pushedAt: "2026-03-25 12:10 KST",
    },
    requestDetail: {
      cpu: "1024",
      memory: "2048",
      desiredCount: "4",
      deploymentStrategy: "rolling",
      requestedBy: "AI Assistant",
    },
    riskSummary: "이전 배포와 동일한 설정입니다. 롤링 배포로 안전하게 진행됩니다.",
    primaryActionLabel: "배포 시작",
    secondaryActionLabel: "초안 새로 고침",
  },
  actions: [
    { actionId: "deploy.start", label: "배포 시작", variant: "primary", kind: "submit" },
    { actionId: "deploy.refresh_draft", label: "초안 새로 고침", variant: "ghost", kind: "refresh" },
  ],
  surfaceConfig: deployLaunchpadSurfaceConfig,
};

const approvalEnvelope: SurfaceEnvelope = {
  templateId: "approval_queue_inbox",
  version: "1.0.0",
  sourceIntent: "approval.review",
  updatedAt: new Date().toISOString(),
  payload: {
    templateId: "approval_queue_inbox",
    items: [
      { id: "apr-access-101", type: "temporary_access", title: "payments-prod read access", environment: "production", requestedBy: "mina.cho", riskSummary: "시간 제한 있음 / 범위 제한됨", riskTone: "warning", status: "pending" },
      { id: "apr-access-102", type: "temporary_access", title: "checkout break-glass diagnostics", environment: "production", requestedBy: "d.son", riskSummary: "범위 넓음 / break-glass", riskTone: "danger", status: "held" },
      { id: "apr-access-103", type: "temporary_access", title: "catalog staging support access", environment: "staging", requestedBy: "sora.kim", riskSummary: "staging only / read-write temp scope", riskTone: "warning", status: "pending" },
      { id: "apr-config-201", type: "config_change", title: "payments timeout tuning", environment: "production", requestedBy: "mina.cho", riskSummary: "1 warn / runtime config only", riskTone: "warning", status: "pending" },
      { id: "apr-config-202", type: "config_change", title: "search feature flag enable", environment: "staging", requestedBy: "jin.park", riskSummary: "0 warn / limited rollout", riskTone: "success", status: "approved" },
      { id: "apr-data-301", type: "data_operation", title: "order replay for failed checkout events", environment: "production", requestedBy: "ops.bot", riskSummary: "duplicate processing risk", riskTone: "danger", status: "held" },
      { id: "apr-data-303", type: "data_operation", title: "billing ledger backfill retry", environment: "production", requestedBy: "finance.ops", riskSummary: "duplicate ledger write risk", riskTone: "danger", status: "pending" },
    ],
    byStatus: { pending: 4, held: 2, approved: 1 },
    byType: { temporary_access: 3, config_change: 2, data_operation: 2 },
    queueSummary: "총 7건의 승인 요청이 있으며, 그 중 3건이 고위험으로 분류됩니다. production 환경 요청이 5건으로 우선 검토가 필요합니다.",
  },
  actions: [
    { actionId: "approve.selected", label: "선택 항목 승인", variant: "primary", kind: "submit" },
    { actionId: "approve.hold", label: "보류", variant: "ghost", kind: "submit" },
  ],
};

const rollbackEnvelope: SurfaceEnvelope = {
  templateId: "rollback_summary",
  version: "1.0.0",
  sourceIntent: "rollback.start",
  updatedAt: new Date().toISOString(),
  payload: {
    templateId: "rollback_summary",
    candidates: [
      {
        id: "svc-payments-api",
        service: "payments-api",
        environment: "production",
        currentVersion: "v2.3.18",
        severity: "high",
        incidentSummary: "INC-842 card timeout increase",
        recommendedRollbackVersion: "v2.3.16",
        eligibleVersions: [
          { id: "deploy-pay-316", version: "v2.3.16", status: "dry_run_ready", rollbackRisk: "low" },
          { id: "deploy-pay-314", version: "v2.3.14", status: "identified", rollbackRisk: "medium" },
        ],
      },
      {
        id: "svc-checkout",
        service: "checkout",
        environment: "production",
        currentVersion: "v1.8.42",
        severity: "critical",
        incidentSummary: "INC-835 auth retries",
        recommendedRollbackVersion: "v1.8.39",
        eligibleVersions: [
          { id: "deploy-check-1839", version: "v1.8.39", status: "confirm_ready", rollbackRisk: "low" },
          { id: "deploy-check-1837", version: "v1.8.37", status: "identified", rollbackRisk: "medium" },
        ],
      },
    ],
    serviceHealth: [
      {
        service: "payments-api", version: "v2.3.18", status: "critical",
        errorRate: "12.4%", normalErrorRate: "0.3%",
        p99Latency: "4,200ms", normalP99Latency: "320ms",
        instances: { total: 4, healthy: 3, unhealthy: 1 },
        lastDeployedAt: "2시간 전",
        activeIncident: { id: "INC-842", title: "card timeout spike", severity: "HIGH", startedAt: "2026-03-30 02:10 KST" },
      },
      {
        service: "checkout", version: "v1.8.42", status: "warning",
        errorRate: "2.1%", normalErrorRate: "0.8%",
        p99Latency: "890ms", normalP99Latency: "450ms",
        instances: { total: 3, healthy: 3, unhealthy: 0 },
        lastDeployedAt: "6시간 전",
        activeIncident: { id: "INC-835", title: "auth retries", severity: "MEDIUM", startedAt: "2026-03-30 01:45 KST" },
      },
    ],
    causeSummary: "최근 배포에서 timeout 설정 변경이 원인으로 추정됩니다.",
    recommendation: "v2.3.16 버전이 24시간 안정 운영되었으므로 추천합니다.",
  },
  actions: [
    { actionId: "rollback.execute", label: "롤백 실행", variant: "danger", kind: "submit" },
  ],
};

// --- Tab config ---

const TABS = [
  { key: "deploy", label: "Deploy Launchpad", envelope: deployEnvelope },
  { key: "approval", label: "Approval Queue", envelope: approvalEnvelope },
  { key: "rollback", label: "Rollback Summary", envelope: rollbackEnvelope },
] as const;

export default function A2UITestPage() {
  const [activeTab, setActiveTab] = useState<string>("deploy");
  const [actionLog, setActionLog] = useState<string[]>([]);

  const currentTab = TABS.find((t) => t.key === activeTab) ?? TABS[0];

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "40px auto",
        padding: "0 20px",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
        color: "#e4e8ef",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        A2UI PoC — E2E Test
      </h1>
      <p style={{ fontSize: 14, color: "#8b9ab5", marginBottom: 24 }}>
        3개 시나리오 (Deploy / Approval / Rollback) 렌더링 검증
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid rgba(37,50,68,.76)" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: 600,
              color: activeTab === tab.key ? "#5b8dee" : "#8b9ab5",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab.key ? "2px solid #5b8dee" : "2px solid transparent",
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Surface */}
      <SurfaceRenderer
        envelope={currentTab.envelope}
        onAction={(event) => {
          setActionLog((prev) => [
            `[${new Date().toLocaleTimeString()}] ${event.actionId} (${event.kind ?? "unknown"}) ${event.params ? JSON.stringify(event.params) : ""}`,
            ...prev,
          ]);
        }}
      />

      {/* Action Log */}
      {actionLog.length > 0 && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "#0d1520",
            border: "1px solid rgba(37,50,68,.76)",
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#8b9ab5" }}>
              Action Log ({actionLog.length})
            </span>
            <button
              onClick={() => setActionLog([])}
              style={{ fontSize: 11, color: "#5b8dee", background: "none", border: "none", cursor: "pointer" }}
            >
              Clear
            </button>
          </div>
          {actionLog.map((log, i) => (
            <div key={i} style={{ fontSize: 12, color: "#34c38f", fontFamily: "monospace", marginBottom: 2 }}>
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
