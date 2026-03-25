import styles from "@/devops-console/console-page.module.css";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import type { ConfirmActionTemplateData } from "@/devops-chat/types/templates";

export function ConfirmAction({
  template,
  onPrimaryAction,
  onSecondaryAction,
}: {
  template: ConfirmActionTemplateData;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}) {
  const tone = template.state === "executed" ? "success" : "danger";

  return (
    <article className={styles.templateCard}>
      <div className={styles.templateHeaderRow}>
        <div>
          <div className={styles.sectionEyebrow}>Final confirmation</div>
          <h4 className={styles.templateTitle}>{template.service}</h4>
          <p className={styles.templateDescription}>{template.environment}</p>
        </div>
        <StatusChip label={template.state} tone={tone} />
      </div>

      <div className={styles.warningCard}>{template.warning}</div>

      <div className={styles.templateMetaCard}>
        <div className={styles.metaLabel}>Rollback target</div>
        <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{template.targetVersion}</div>
      </div>

      <div className={styles.checkList}>
        {template.checklist.map((item) => (
          <div className={styles.checkItem} key={item}>
            <StatusChip label="confirm" tone={tone} />
            <span className={styles.propertyValue}>{item}</span>
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
