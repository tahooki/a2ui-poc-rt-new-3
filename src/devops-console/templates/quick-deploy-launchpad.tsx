import styles from "@/devops-console/console-page.module.css";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import type { QuickDeployTemplateData } from "@/devops-chat/types/templates";

export function QuickDeployLaunchpad({
  template,
  onPrimaryAction,
  onSecondaryAction,
}: {
  template: QuickDeployTemplateData;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}) {
  const tone = template.state === "done" ? "success" : template.state === "deploying" ? "info" : "warning";

  return (
    <article className={styles.templateCard}>
      <div className={styles.templateHeaderRow}>
        <div>
          <div className={styles.sectionEyebrow}>Deploy launchpad</div>
          <h4 className={styles.templateTitle}>{template.service}</h4>
          <p className={styles.templateDescription}>{template.helperText}</p>
        </div>
        <StatusChip label={template.state} tone={tone} />
      </div>

      <div className={styles.templateMetaGrid}>
        <div className={styles.templateMetaCard}>
          <div className={styles.metaLabel}>Environment</div>
          <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{template.environment}</div>
        </div>
        <div className={styles.templateMetaCard}>
          <div className={styles.metaLabel}>Strategy</div>
          <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{template.strategy}</div>
        </div>
        <div className={styles.templateMetaCard}>
          <div className={styles.metaLabel}>Recommended</div>
          <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{template.recommendedVersion}</div>
        </div>
        <div className={styles.templateMetaCard}>
          <div className={styles.metaLabel}>Target</div>
          <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{template.targetVersion}</div>
        </div>
      </div>

      <div className={styles.calloutCard}>{template.impactSummary}</div>

      <div className={styles.checkList}>
        {template.preflightChecks.map((check) => (
          <div className={styles.checkItem} key={check}>
            <StatusChip label="preflight" tone="info" />
            <span className={styles.propertyValue}>{check}</span>
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
