"use client";

import styles from "@/devops-console/console-page.module.css";

type ValidationErrorPanelProps = {
  lastError: string | null;
  activeSurfaceMeta: {
    templateId: string;
    updatedAt: string;
    freshnessKey?: string;
  } | null;
};

export function ValidationErrorPanel({ lastError, activeSurfaceMeta }: ValidationErrorPanelProps) {
  const hasContent = lastError || activeSurfaceMeta;

  if (!hasContent) {
    return <div style={{ opacity: 0.5, padding: 8 }}>오류/검증 이력 없음</div>;
  }

  return (
    <div>
      {lastError ? (
        <div className={styles.editorError} style={{ marginBottom: 8 }}>
          <strong>Last Error:</strong> {lastError}
        </div>
      ) : null}
      {activeSurfaceMeta ? (
        <table className={styles.contractTable}>
          <tbody>
            <tr><td><strong>Active Template</strong></td><td><code>{activeSurfaceMeta.templateId}</code></td></tr>
            <tr><td><strong>Updated</strong></td><td>{activeSurfaceMeta.updatedAt}</td></tr>
            {activeSurfaceMeta.freshnessKey ? (
              <tr><td><strong>Freshness Key</strong></td><td><code>{activeSurfaceMeta.freshnessKey}</code></td></tr>
            ) : null}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
