import styles from "@/devops-console/console-page.module.css";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import type { ApprovalQueueTemplateData, ApprovalQueueItem } from "@/devops-chat/types/templates";

type ApprovalQueueInboxProps = {
  template: ApprovalQueueTemplateData;
  onAction?: (actionId: string, payload?: Record<string, unknown>) => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
};

function riskTone(tone: string): "warning" | "danger" | "success" {
  if (tone === "danger") return "danger";
  if (tone === "success") return "success";
  return "warning";
}

function statusTone(status: string): "warning" | "danger" | "success" {
  if (status === "approved") return "success";
  if (status === "held") return "danger";
  return "warning";
}

function QueueItemCard({
  item,
  onAction,
}: {
  item: ApprovalQueueItem;
  onAction?: (actionId: string, payload?: Record<string, unknown>) => void;
}) {
  return (
    <div className={styles.templateCard} style={{ marginBottom: 8 }}>
      <div className={styles.templateHeaderRow}>
        <div>
          <div className={styles.sectionEyebrow}>{item.typeLabel}</div>
          <h4 className={styles.templateTitle}>{item.id}</h4>
          <p className={styles.templateDescription}>
            {item.title} / {item.environment}
          </p>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <StatusChip label={item.riskSummary || item.riskTone} tone={riskTone(item.riskTone)} />
          <StatusChip label={item.status} tone={statusTone(item.status)} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, fontSize: 12, opacity: 0.7, padding: "0 12px 8px" }}>
        <span>by {item.requestedBy}</span>
      </div>

      {item.actions.length > 0 ? (
        <div className={styles.templateActions}>
          {item.actions.map((action) => (
            <button
              className={action.variant === "primary" ? styles.primaryButton : styles.secondaryButton}
              disabled={action.disabled}
              key={action.actionId}
              onClick={() => onAction?.(action.actionId, { requestId: item.id })}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ApprovalQueueInbox({
  template,
  onAction,
}: ApprovalQueueInboxProps) {
  const pending = template.items.filter((i) => i.status === "pending");
  const approved = template.items.filter((i) => i.status === "approved");
  const held = template.items.filter((i) => i.status === "held");

  return (
    <article>
      {/* Summary bar */}
      <div className={styles.templateMetaGrid} style={{ marginBottom: 12 }}>
        <div className={styles.templateMetaCard}>
          <div className={styles.metaLabel}>대기</div>
          <div className={styles.propertyValue} style={{ fontWeight: 700, fontSize: 20 }}>
            {template.summary.pending}
          </div>
        </div>
        <div className={styles.templateMetaCard}>
          <div className={styles.metaLabel}>승인됨</div>
          <div className={styles.propertyValue}>{template.summary.approved}</div>
        </div>
        <div className={styles.templateMetaCard}>
          <div className={styles.metaLabel}>보류</div>
          <div className={styles.propertyValue}>{template.summary.held}</div>
        </div>
        <div className={styles.templateMetaCard}>
          <div className={styles.metaLabel}>고위험</div>
          <div className={styles.propertyValue} style={{ color: "var(--danger, #d32f2f)" }}>
            {template.summary.highRisk}
          </div>
        </div>
      </div>

      {/* Pending items */}
      {pending.length > 0 ? (
        <div>
          <div className={styles.sectionEyebrow} style={{ marginBottom: 8 }}>
            대기 중 ({pending.length})
          </div>
          {pending.map((item) => (
            <QueueItemCard item={item} key={item.id} onAction={onAction} />
          ))}
        </div>
      ) : (
        <div style={{ padding: 16, textAlign: "center", opacity: 0.5 }}>
          모든 요청이 처리되었습니다.
        </div>
      )}

      {/* Approved items (collapsed) */}
      {approved.length > 0 ? (
        <details style={{ marginTop: 12 }}>
          <summary className={styles.sectionEyebrow} style={{ cursor: "pointer" }}>
            승인됨 ({approved.length})
          </summary>
          {approved.map((item) => (
            <QueueItemCard item={item} key={item.id} onAction={onAction} />
          ))}
        </details>
      ) : null}

      {/* Held items (collapsed) */}
      {held.length > 0 ? (
        <details style={{ marginTop: 12 }}>
          <summary className={styles.sectionEyebrow} style={{ cursor: "pointer" }}>
            보류 ({held.length})
          </summary>
          {held.map((item) => (
            <QueueItemCard item={item} key={item.id} onAction={onAction} />
          ))}
        </details>
      ) : null}
    </article>
  );
}
