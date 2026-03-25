import styles from "@/devops-console/console-page.module.css";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import type { DryRunStepperTemplateData } from "@/devops-chat/types/templates";

export function DryRunStepper({
  template,
  onPrimaryAction,
  onSecondaryAction,
}: {
  template: DryRunStepperTemplateData;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}) {
  const isCompleted = template.state === "completed";
  const tone = isCompleted ? "success" : template.state === "running" ? "info" : "warning";

  return (
    <article className={styles.templateCard}>
      <div className={styles.templateHeaderRow}>
        <div>
          <div className={styles.sectionEyebrow}>Dry run stage</div>
          <h4 className={styles.templateTitle}>{template.service}</h4>
          <p className={styles.templateDescription}>{template.helperText}</p>
        </div>
        <StatusChip label={template.state} tone={tone} />
      </div>

      <div className={styles.templateMetaCard}>
        <div className={styles.metaLabel}>Rollback target</div>
        <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{template.targetVersion}</div>
      </div>

      <div className={styles.stepList}>
        {template.steps.map((step, index) => (
          <div
            className={`${styles.stepItem} ${isCompleted ? styles.stepItemComplete : ""}`}
            key={step}
          >
            <StatusChip label={`step ${index + 1}`} tone={tone} />
            <span className={styles.propertyValue}>{step}</span>
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
