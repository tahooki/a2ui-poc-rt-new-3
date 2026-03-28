"use client";

import styles from "@/devops-console/console-page.module.css";
import type { PendingToolState } from "@/devops-chat/types/conversation";
import type { ToolResultEntry } from "@/devops-chat/types/assistant-response";

type ToolExecutionPanelProps = {
  pendingTool: PendingToolState;
  recentResults?: ToolResultEntry[];
};

export function ToolExecutionPanel({ pendingTool, recentResults }: ToolExecutionPanelProps) {
  const hasContent = pendingTool || (recentResults && recentResults.length > 0);

  if (!hasContent) {
    return <div style={{ opacity: 0.5, padding: 8 }}>Tool 실행 기록 없음</div>;
  }

  return (
    <div>
      {pendingTool ? (
        <div style={{ padding: "4px 0", fontWeight: 600 }}>
          {pendingTool.toolName} — {pendingTool.status}
          {pendingTool.summary ? `: ${pendingTool.summary}` : ""}
        </div>
      ) : null}
      {recentResults && recentResults.length > 0 ? (
        <table className={styles.contractTable}>
          <thead>
            <tr><th>Tool</th><th>Summary</th></tr>
          </thead>
          <tbody>
            {recentResults.map((r, i) => (
              <tr key={i}>
                <td><code>{r.toolName}</code></td>
                <td>{r.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
