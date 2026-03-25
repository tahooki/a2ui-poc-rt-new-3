import styles from "@/devops-console/console-page.module.css";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import type { DeploymentApprovalTemplateData } from "@/devops-chat/types/templates";

export function DeploymentApprovalInbox({
  template,
  onPrimaryAction,
  onSecondaryAction,
}: {
  template: DeploymentApprovalTemplateData;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
}) {
  const tone = template.state === "approved" ? "success" : template.state === "hold" ? "danger" : "warning";

  return (
    <article className={styles.templateCard}>
      <div className={styles.templateHeaderRow}>
        <div>
          <div className={styles.sectionEyebrow}>Approval inbox</div>
          <h4 className={styles.templateTitle}>{template.requestId}</h4>
          <p className={styles.templateDescription}>
            {template.service} / {template.environment}
          </p>
        </div>
        <StatusChip label={template.state} tone={tone} />
      </div>

      <div className={styles.focusGrid}>
        <div className={styles.warningCard}>{template.riskSummary}</div>
        <div className={styles.calloutCard}>{template.verificationSummary}</div>
      </div>

      <div className={styles.templateMetaGrid}>
        <div className={styles.templateMetaCard}>
          <div className={styles.metaLabel}>Impact scope</div>
          <div className={styles.propertyValue}>{template.impactScope}</div>
        </div>
        <div className={styles.templateMetaCard}>
          <div className={styles.metaLabel}>Rollback</div>
          <div className={styles.propertyValue}>{template.rollbackAvailability}</div>
        </div>
      </div>

      <div className={styles.checkList}>
        {template.checks.map((check) => (
          <div className={styles.checkItem} key={check}>
            <StatusChip label="check" tone="warning" />
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
