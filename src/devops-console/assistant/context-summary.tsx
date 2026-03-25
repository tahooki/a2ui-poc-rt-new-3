import styles from "@/devops-console/console-page.module.css";

export function ContextSummary({
  context,
}: {
  context: Array<{ label: string; value: string }>;
}) {
  return (
    <section className={styles.assistantPanel}>
      <div className={styles.assistantSectionHeader}>
        <div>
          <div className={styles.sectionEyebrow}>Context</div>
          <h3 className={styles.panelTitle}>Current operator scope</h3>
        </div>
      </div>
      <div className={styles.assistantContextGrid}>
        {context.map((entry) => (
          <div className={styles.templateMetaCard} key={`${entry.label}-${entry.value}`}>
            <div className={styles.metaLabel}>{entry.label}</div>
            <div className={styles.propertyValue}>{entry.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
