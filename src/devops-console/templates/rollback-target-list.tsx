import styles from "@/devops-console/console-page.module.css";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import type { RollbackTargetListTemplateData, RollbackTargetItem } from "@/devops-chat/types/templates";

type RollbackTargetListProps = {
  template: RollbackTargetListTemplateData;
  onAction?: (actionId: string, payload?: Record<string, unknown>) => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
};

function riskTone(risk: string): "warning" | "danger" | "success" {
  if (risk === "high") return "danger";
  if (risk === "low" || risk === "completed") return "success";
  return "warning";
}

function TargetCard({
  target,
  onAction,
}: {
  target: RollbackTargetItem;
  onAction?: (actionId: string, payload?: Record<string, unknown>) => void;
}) {
  return (
    <div className={styles.templateCard} style={{ marginBottom: 8 }}>
      <div className={styles.templateHeaderRow}>
        <div>
          <div className={styles.sectionEyebrow}>
            {target.isRecommended ? "⭐ 추천" : ""} {target.strategy}
          </div>
          <h4 className={styles.templateTitle}>{target.version}</h4>
          <p className={styles.templateDescription}>{target.whyThisTarget}</p>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <StatusChip label={target.rollbackRisk} tone={riskTone(target.rollbackRisk)} />
          <StatusChip label={target.status} tone={target.status === "executed" ? "success" : "warning"} />
        </div>
      </div>

      {target.evidence.length > 0 ? (
        <div style={{ padding: "0 12px 8px", fontSize: 12, opacity: 0.7 }}>
          {target.evidence.map((e, i) => (
            <div key={i}>· {e}</div>
          ))}
        </div>
      ) : null}

      {target.deployedAt ? (
        <div style={{ padding: "0 12px 8px", fontSize: 12, opacity: 0.5 }}>
          배포일: {target.deployedAt}
        </div>
      ) : null}

      {target.actions.length > 0 ? (
        <div className={styles.templateActions}>
          {target.actions.map((action) => (
            <button
              className={action.variant === "primary" ? styles.primaryButton : styles.secondaryButton}
              disabled={action.disabled}
              key={action.actionId}
              onClick={() => onAction?.(action.actionId, { deploymentId: target.id })}
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

export function RollbackTargetList({
  template,
  onAction,
}: RollbackTargetListProps) {
  const eligible = template.targets.filter((t) => t.rollbackEligible);
  const notEligible = template.targets.filter((t) => !t.rollbackEligible);

  const severityTone = template.severity === "critical" ? "danger" : template.severity === "high" ? "warning" : "success";

  return (
    <article>
      {/* Service header */}
      <div className={styles.templateCard} style={{ marginBottom: 16 }}>
        <div className={styles.templateHeaderRow}>
          <div>
            <div className={styles.sectionEyebrow}>{template.environment}</div>
            <h4 className={styles.templateTitle}>{template.service} 롤백 대상</h4>
            <p className={styles.templateDescription}>
              현재 {template.currentVersion} · {template.incidentSummary}
            </p>
          </div>
          <StatusChip label={template.severity} tone={severityTone} />
        </div>
      </div>

      {/* Eligible targets */}
      {eligible.length > 0 ? (
        <div>
          <div className={styles.sectionEyebrow} style={{ marginBottom: 8 }}>
            롤백 가능 ({eligible.length})
          </div>
          {eligible.map((target) => (
            <TargetCard key={target.id} onAction={onAction} target={target} />
          ))}
        </div>
      ) : (
        <div style={{ padding: 16, textAlign: "center", opacity: 0.5 }}>
          롤백 가능한 배포 인스턴스가 없습니다.
        </div>
      )}

      {/* Not eligible (collapsed) */}
      {notEligible.length > 0 ? (
        <details style={{ marginTop: 12 }}>
          <summary className={styles.sectionEyebrow} style={{ cursor: "pointer" }}>
            롤백 불가 ({notEligible.length})
          </summary>
          {notEligible.map((target) => (
            <TargetCard key={target.id} onAction={onAction} target={target} />
          ))}
        </details>
      ) : null}
    </article>
  );
}
