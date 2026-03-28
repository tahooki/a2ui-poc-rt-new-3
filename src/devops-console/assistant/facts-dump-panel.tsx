"use client";

import styles from "@/devops-console/console-page.module.css";

type FactsDumpPanelProps = {
  facts: Record<string, unknown>;
};

export function FactsDumpPanel({ facts }: FactsDumpPanelProps) {
  const json = JSON.stringify(facts, null, 2);
  const isEmpty = Object.keys(facts).length === 0;

  return (
    <div>
      {isEmpty ? (
        <div style={{ opacity: 0.5, padding: 8 }}>Facts 없음</div>
      ) : (
        <pre className={styles.factsDump}>{json}</pre>
      )}
    </div>
  );
}
