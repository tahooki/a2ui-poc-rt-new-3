"use client";

import styles from "@/devops-console/console-page.module.css";
import type { DecisionTrace } from "@/devops-chat/types/conversation";

type DecisionTracePanelProps = {
  trace: DecisionTrace | null;
};

export function DecisionTracePanel({ trace }: DecisionTracePanelProps) {
  if (!trace) {
    return <div style={{ opacity: 0.5, padding: 8 }}>Decision trace 없음</div>;
  }

  return (
    <div>
      <table className={styles.contractTable}>
        <tbody>
          <tr><td><strong>Mode</strong></td><td>{trace.mode}</td></tr>
          <tr><td><strong>Reason</strong></td><td>{trace.reason}</td></tr>
          {trace.score !== undefined ? <tr><td><strong>Score</strong></td><td>{trace.score}</td></tr> : null}
          <tr><td><strong>Matched</strong></td><td>{trace.matched.join(", ") || "—"}</td></tr>
          <tr><td><strong>Missing</strong></td><td>{trace.missing.join(", ") || "—"}</td></tr>
          <tr><td><strong>Disqualified</strong></td><td>{trace.disqualified.join(", ") || "—"}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
