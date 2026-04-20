"use client";

import { useState } from "react";
import styles from "@/devops-console/console-page.module.css";
import { runTemplateSimulator, type SimulatorResult } from "@/devops-chat/template-registry/run-template-simulator";
import { TemplateLivePreview } from "./template-live-preview";
import { getRegistryDefinition } from "@/devops-chat/template-registry/template-registry";

export function DecisionSimulator() {
  const [intentKey, setIntentKey] = useState("deploy.start");
  const [factsJson, setFactsJson] = useState("{}");
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleRun() {
    try {
      const facts = JSON.parse(factsJson);
      const simResult = runTemplateSimulator({ intentKey, facts });
      setResult(simResult);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      setResult(null);
    }
  }

  const selectedDef = result?.selectedTemplateId
    ? getRegistryDefinition(result.selectedTemplateId)
    : null;

  const previewPayload = selectedDef?.previewCases[0]
    ? JSON.stringify(selectedDef.previewCases[0].payload, null, 2)
    : "{}";

  return (
    <div>
      <div className={styles.sectionEyebrow}>Decision Simulator</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select onChange={(e) => setIntentKey(e.target.value)} value={intentKey}>
          <option value="deploy.start">deploy.start</option>
          <option value="deploy.history.lookup">deploy.history.lookup</option>
          <option value="approval.review">approval.review</option>
          <option value="rollback.start">rollback.start</option>
          <option value="general.qna">general.qna</option>
        </select>
        <button className={styles.chatAwaitingChip} onClick={handleRun} type="button">
          Run
        </button>
      </div>
      <textarea
        className={styles.payloadEditor}
        onChange={(e) => setFactsJson(e.target.value)}
        placeholder='{"slots": {"deploy.serviceName": {"value": "payments-api", "source": "user", "confidence": 1, "updatedAt": ""}}}'
        rows={6}
        spellCheck={false}
        value={factsJson}
      />
      {error ? <div className={styles.editorError}>{error}</div> : null}
      {result ? (
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              padding: "10px 14px",
              background: result.decisionMode === "render_surface"
                ? "rgba(52,195,143,.08)"
                : result.decisionMode === "ask_followup"
                  ? "rgba(240,179,90,.08)"
                  : "rgba(125,139,159,.08)",
              border: `1px solid ${
                result.decisionMode === "render_surface"
                  ? "rgba(52,195,143,.3)"
                  : result.decisionMode === "ask_followup"
                    ? "rgba(240,179,90,.3)"
                    : "rgba(125,139,159,.3)"
              }`,
              borderRadius: "var(--console-radius)",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                  color: result.decisionMode === "render_surface"
                    ? "var(--console-success)"
                    : result.decisionMode === "ask_followup"
                      ? "var(--console-warning)"
                      : "var(--console-text-muted)",
                }}
              >
                {result.decisionMode}
              </span>
              {result.selectedTemplateId ? (
                <span style={{ color: "var(--console-info)", fontWeight: 600 }}>
                  {result.selectedTemplateId}
                </span>
              ) : null}
            </div>
            <div style={{ color: "var(--console-text-secondary)" }}>{result.decisionReason}</div>
            {result.decisionMissing.length > 0 ? (
              <div style={{ color: "var(--console-warning)", marginTop: 4 }}>
                Missing: {result.decisionMissing.join(", ")}
              </div>
            ) : null}
          </div>

          {result.decisionMode === "render_surface" && result.selectedTemplateId && selectedDef ? (
            <TemplateLivePreview
              templateId={result.selectedTemplateId}
              payloadJson={previewPayload}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
