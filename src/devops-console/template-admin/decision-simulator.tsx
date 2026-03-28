"use client";

import { useState } from "react";
import styles from "@/devops-console/console-page.module.css";
import { runTemplateSimulator, type SimulatorResult } from "@/devops-chat/template-registry/run-template-simulator";

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
          Run Simulator
        </button>
      </div>
      <textarea
        className={styles.payloadEditor}
        onChange={(e) => setFactsJson(e.target.value)}
        placeholder='{"slots": {"deploy.serviceName": {"value": "payments-api", "source": "user", "confidence": 1, "updatedAt": ""}}}'
        rows={8}
        spellCheck={false}
        value={factsJson}
      />
      {error ? <div className={styles.editorError}>{error}</div> : null}
      {result ? (
        <div style={{ marginTop: 12 }}>
          <table className={styles.contractTable}>
            <tbody>
              <tr>
                <td><strong>Decision</strong></td>
                <td>{result.decisionMode}</td>
              </tr>
              <tr>
                <td><strong>Reason</strong></td>
                <td>{result.decisionReason}</td>
              </tr>
              <tr>
                <td><strong>Matched</strong></td>
                <td>{result.decisionMatched.join(", ") || "—"}</td>
              </tr>
              <tr>
                <td><strong>Missing</strong></td>
                <td>{result.decisionMissing.join(", ") || "—"}</td>
              </tr>
              <tr>
                <td><strong>Selected Template</strong></td>
                <td>{result.selectedTemplateId ?? "none"}</td>
              </tr>
            </tbody>
          </table>
          <div className={styles.sectionEyebrow} style={{ marginTop: 12 }}>Candidates</div>
          <table className={styles.contractTable}>
            <thead>
              <tr>
                <th>Template</th>
                <th>Eligible</th>
                <th>Score</th>
                <th>Matched</th>
                <th>Missing</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {result.selectionCandidates.map((c) => (
                <tr key={c.templateId}>
                  <td><code>{c.templateId}</code></td>
                  <td>{c.eligible ? "Y" : ""}</td>
                  <td>{c.score}</td>
                  <td>{c.matched.join(", ")}</td>
                  <td>{c.missing.join(", ")}</td>
                  <td>{c.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
