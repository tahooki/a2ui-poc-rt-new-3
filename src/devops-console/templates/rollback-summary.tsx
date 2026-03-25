import styles from "@/devops-console/console-page.module.css";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import type { RollbackSummaryTemplateData } from "@/devops-chat/types/templates";

export function RollbackSummary({
  template,
  onPrimaryAction,
  onSecondaryAction,
}: {
  template: RollbackSummaryTemplateData;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}) {
  return (
    <article className={styles.templateCard}>
      <div className={styles.templateHeaderRow}>
        <div>
          <div className={styles.sectionEyebrow}>Rollback summary</div>
          <h4 className={styles.templateTitle}>{template.incident}</h4>
          <p className={styles.templateDescription}>{template.service}</p>
        </div>
        <StatusChip label={template.state} tone="warning" />
      </div>

      <div className={styles.focusGrid}>
        <div className={styles.warningCard}>
          <div className={styles.metaLabel}>Current version</div>
          <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{template.currentVersion}</div>
        </div>
        <div className={styles.calloutCard}>
          <div className={styles.metaLabel}>Recommended stable</div>
          <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{template.recommendedVersion}</div>
        </div>
      </div>

      <div className={styles.templateMetaGrid}>
        <div className={styles.templateMetaCard}>
          <div className={styles.metaLabel}>Environment</div>
          <div className={`${styles.propertyValue} ${styles.mono}`}>{template.environment}</div>
        </div>
        <div className={styles.templateMetaCard}>
          <div className={styles.metaLabel}>Blast radius</div>
          <div className={styles.propertyValue}>{template.blastRadius}</div>
        </div>
      </div>

      <div className={styles.stackList}>
        {template.evidence.map((evidence) => (
          <div className={styles.checkItem} key={evidence}>
            <StatusChip label="evidence" tone="warning" />
            <span className={styles.propertyValue}>{evidence}</span>
          </div>
        ))}
      </div>

      <div className={styles.templateActions}>
        <button className={styles.primaryButton} onClick={onPrimaryAction} type="button">
          {template.primaryActionLabel}
        </button>
        <button className={styles.secondaryButton} onClick={onSecondaryAction} type="button">
          {template.secondaryActionLabel}
        </button>
      </div>
    </article>
  );
}
