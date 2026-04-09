"use client";

import { useState } from "react";
import { SurfaceRenderer, DataTable, StatusBadge } from "@a2ui/ui";
import { registerBuiltinTemplates } from "@a2ui/ui/templates/register-all";
import type { SurfaceEnvelope } from "@a2ui/ui";

registerBuiltinTemplates();

// --- Static data ---

const TEMPLATES = [
  { templateId: "deploy_launchpad", version: "1.0.0", title: "Deploy Launchpad", status: "published", requiredFields: "service, environment, targetVersion, strategy, state" },
  { templateId: "approval_queue_inbox", version: "1.0.0", title: "Approval Queue Inbox", status: "published", requiredFields: "items" },
  { templateId: "rollback_summary", version: "1.0.0", title: "Rollback Summary", status: "published", requiredFields: "candidates" },
];

const DECISION_RULES = [
  { intentKey: "deploy.start", templateId: "deploy_launchpad", requiredFacts: "serviceName", optionalFacts: "environment, targetVersion" },
  { intentKey: "approval.review", templateId: "approval_queue_inbox", requiredFacts: "(none)", optionalFacts: "" },
  { intentKey: "rollback.start", templateId: "rollback_summary", requiredFacts: "serviceName", optionalFacts: "" },
];

const INTENT_OPTIONS = [
  { key: "deploy.start", label: "deploy.start — Deploy Launchpad" },
  { key: "approval.review", label: "approval.review — Approval Queue" },
  { key: "rollback.start", label: "rollback.start — Rollback Summary" },
  { key: "unknown.intent", label: "unknown.intent — (no match)" },
];

// Mock simulation envelopes
const SIMULATION_ENVELOPES: Record<string, SurfaceEnvelope> = {
  deploy_launchpad: {
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
      strategy: "rolling",
      riskSummary: "이전 배포와 동일한 설정입니다.",
    },
    actions: [],
  },
  approval_queue_inbox: {
    templateId: "approval_queue_inbox",
    version: "1.0.0",
    sourceIntent: "approval.review",
    updatedAt: new Date().toISOString(),
    payload: {
      templateId: "approval_queue_inbox",
      items: [
        { id: "sim-1", type: "config_change", title: "Simulated approval item", environment: "staging", requestedBy: "simulator", riskSummary: "low risk", riskTone: "success", status: "pending" },
      ],
      byStatus: { pending: 1 },
      byType: { config_change: 1 },
    },
    actions: [],
  },
  rollback_summary: {
    templateId: "rollback_summary",
    version: "1.0.0",
    sourceIntent: "rollback.start",
    updatedAt: new Date().toISOString(),
    payload: {
      templateId: "rollback_summary",
      candidates: [
        { id: "sim-svc", service: "payments-api", environment: "production", currentVersion: "v2.3.18", severity: "high", incidentSummary: "Simulated incident", recommendedRollbackVersion: "v2.3.16", eligibleVersions: [{ id: "v1", version: "v2.3.16", status: "ready", rollbackRisk: "low" }] },
      ],
      causeSummary: "시뮬레이션 원인 분석 결과입니다.",
      recommendation: "v2.3.16 롤백을 권장합니다.",
    },
    actions: [],
  },
};

// --- Simulation logic (client-side, no MCP) ---

type SimulationResult = {
  mode: "render_surface" | "ask_followup" | "text_only";
  templateId?: string;
  reason: string;
  missingFacts?: string[];
};

function simulateDecision(intentKey: string, facts: Record<string, string>): SimulationResult {
  const rules: Record<string, { templateId: string; requiredFacts: string[] }> = {
    "deploy.start": { templateId: "deploy_launchpad", requiredFacts: ["serviceName"] },
    "approval.review": { templateId: "approval_queue_inbox", requiredFacts: [] },
    "rollback.start": { templateId: "rollback_summary", requiredFacts: ["serviceName"] },
  };

  const rule = rules[intentKey];
  if (!rule) {
    return { mode: "text_only", reason: `No A2UI rule for intent: ${intentKey}` };
  }

  const missing = rule.requiredFacts.filter((f) => !facts[f]);
  if (missing.length > 0) {
    return { mode: "ask_followup", reason: `Missing: ${missing.join(", ")}`, missingFacts: missing };
  }

  return { mode: "render_surface", templateId: rule.templateId, reason: `Matched → ${rule.templateId}` };
}

// --- Component ---

const sectionStyle = {
  marginBottom: 32,
  padding: 20,
  background: "rgba(13,21,32,.6)",
  border: "1px solid rgba(37,50,68,.76)",
  borderRadius: 10,
};

const sectionTitleStyle = {
  fontSize: 14,
  fontWeight: 700 as const,
  color: "#e4e8ef",
  marginBottom: 14,
  textTransform: "uppercase" as const,
  letterSpacing: ".05em",
};

export default function AdminPage() {
  const [selectedIntent, setSelectedIntent] = useState("deploy.start");
  const [factsInput, setFactsInput] = useState("serviceName=payments-api");
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  const runSimulation = () => {
    const facts: Record<string, string> = {};
    factsInput.split(",").forEach((pair) => {
      const [k, v] = pair.trim().split("=");
      if (k && v) facts[k.trim()] = v.trim();
    });
    setSimResult(simulateDecision(selectedIntent, facts));
  };

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: "0 20px",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
        color: "#e4e8ef",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>
        A2UI Admin Console
      </h1>
      <p style={{ fontSize: 14, color: "#8b9ab5", marginBottom: 28 }}>
        Template Registry / Decision Rules / Simulation
      </p>

      {/* Section 1: Template List */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Template Registry</div>
        <DataTable
          columns={[
            { key: "templateId", label: "Template ID", width: "25%" },
            { key: "version", label: "Version", width: "10%" },
            { key: "title", label: "Title", width: "20%" },
            {
              key: "status",
              label: "Status",
              width: "12%",
              render: (val: unknown) => (
                <StatusBadge level="success" label={val as string} />
              ),
            },
            { key: "requiredFields", label: "Required Fields" },
          ]}
          rows={TEMPLATES}
        />
      </div>

      {/* Section 2: Decision Rules */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Decision Rules</div>
        <DataTable
          columns={[
            { key: "intentKey", label: "Intent Key", width: "20%" },
            { key: "templateId", label: "Template ID", width: "25%" },
            { key: "requiredFacts", label: "Required Facts", width: "25%" },
            { key: "optionalFacts", label: "Optional Facts" },
          ]}
          rows={DECISION_RULES}
        />
      </div>

      {/* Section 3: Simulation */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Simulation</div>

        <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 11, color: "#8b9ab5", display: "block", marginBottom: 4 }}>Intent Key</label>
            <select
              value={selectedIntent}
              onChange={(e) => setSelectedIntent(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: 13,
                color: "#e4e8ef",
                background: "#0d1520",
                border: "1px solid rgba(37,50,68,.76)",
                borderRadius: 6,
              }}
            >
              {INTENT_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 2, minWidth: 300 }}>
            <label style={{ fontSize: 11, color: "#8b9ab5", display: "block", marginBottom: 4 }}>
              Facts (key=value, comma-separated)
            </label>
            <input
              type="text"
              value={factsInput}
              onChange={(e) => setFactsInput(e.target.value)}
              placeholder="serviceName=payments-api, environment=production"
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: 13,
                color: "#e4e8ef",
                background: "#0d1520",
                border: "1px solid rgba(37,50,68,.76)",
                borderRadius: 6,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              onClick={runSimulation}
              style={{
                padding: "8px 20px",
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                background: "#5b8dee",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              Simulate
            </button>
          </div>
        </div>

        {/* Simulation Result */}
        {simResult && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                padding: "10px 14px",
                marginBottom: 16,
                background: simResult.mode === "render_surface"
                  ? "rgba(52,195,143,.08)"
                  : simResult.mode === "ask_followup"
                    ? "rgba(247,201,72,.08)"
                    : "rgba(139,154,181,.08)",
                border: `1px solid ${
                  simResult.mode === "render_surface"
                    ? "rgba(52,195,143,.3)"
                    : simResult.mode === "ask_followup"
                      ? "rgba(247,201,72,.3)"
                      : "rgba(139,154,181,.3)"
                }`,
                borderRadius: 6,
                fontSize: 13,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <StatusBadge
                  level={
                    simResult.mode === "render_surface" ? "success"
                      : simResult.mode === "ask_followup" ? "warning"
                        : "neutral"
                  }
                  label={simResult.mode}
                />
                {simResult.templateId && (
                  <span style={{ color: "#5b8dee", fontWeight: 600 }}>{simResult.templateId}</span>
                )}
              </div>
              <div style={{ color: "#b0c4ef" }}>{simResult.reason}</div>
              {simResult.missingFacts && (
                <div style={{ color: "#f7c948", marginTop: 4 }}>
                  Missing facts: {simResult.missingFacts.join(", ")}
                </div>
              )}
            </div>

            {/* Preview rendered surface */}
            {simResult.mode === "render_surface" && simResult.templateId && SIMULATION_ENVELOPES[simResult.templateId] && (
              <div>
                <div style={{ fontSize: 11, color: "#8b9ab5", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".05em" }}>
                  Preview
                </div>
                <SurfaceRenderer
                  envelope={SIMULATION_ENVELOPES[simResult.templateId]}
                  onAction={() => {}}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
