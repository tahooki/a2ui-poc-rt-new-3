"use client";

import { useState } from "react";
import styles from "@/devops-console/console-page.module.css";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import { Icon, type IconName } from "@/devops-console/foundation/icon-registry";
import type { ApprovalQueueTemplateData, ApprovalQueueItem } from "@/devops-chat/types/templates";

type ApprovalQueueInboxProps = {
  template: ApprovalQueueTemplateData;
  onAction?: (actionId: string, payload?: Record<string, unknown>) => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
};

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

type CategoryInfo = {
  label: string;
  icon: IconName;
  color: string;
};

const CATEGORY_MAP: Record<string, CategoryInfo> = {
  temporary_access: { label: "임시 접근 권한", icon: "key", color: "#f0ad4e" },
  config_change: { label: "설정 변경", icon: "settings", color: "#4c8dff" },
  data_operation: { label: "데이터 작업", icon: "database", color: "#9b59b6" },
};

function getCategoryInfo(type: string): CategoryInfo {
  return CATEGORY_MAP[type] ?? { label: type, icon: "approve", color: "#888" };
}

function riskTone(tone: string): "warning" | "danger" | "success" {
  if (tone === "danger") return "danger";
  if (tone === "success") return "success";
  return "warning";
}

type CardState = "idle" | "approved" | "held";

function QueueItemCard({
  item,
  onAction,
}: {
  item: ApprovalQueueItem;
  onAction?: (actionId: string, payload?: Record<string, unknown>) => void;
}) {
  const [cardState, setCardState] = useState<CardState>("idle");

  function handleAction(actionId: string) {
    const isApprove = actionId.includes("approve");
    setCardState(isApprove ? "approved" : "held");
    // Delay the actual action call so animation plays first
    setTimeout(() => {
      onAction?.(actionId, { requestId: item.id });
    }, 600);
  }

  // Completed overlay
  if (cardState !== "idle") {
    const isApproved = cardState === "approved";
    return (
      <div
        className={styles.templateCard}
        style={{
          marginBottom: 8,
          overflow: "hidden",
          animation: "deployFadeIn 0.3s ease",
          borderColor: isApproved ? "rgba(52, 195, 143, 0.5)" : "rgba(228, 106, 106, 0.5)",
          transition: "border-color 0.3s, opacity 0.5s",
        }}
      >
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 12px",
          gap: 8,
        }}>
          <span className={styles.deployStepBounce} style={{ fontSize: 32 }}>
            {isApproved ? "✅" : "⏸️"}
          </span>
          <span style={{
            fontSize: 14,
            fontWeight: 600,
            color: isApproved ? "rgba(52, 195, 143, 0.9)" : "rgba(228, 176, 106, 0.9)",
          }}>
            {isApproved ? "승인 완료" : "보류 처리됨"}
          </span>
          <span style={{ fontSize: 12, opacity: 0.5 }}>{item.id}</span>
        </div>
      </div>
    );
  }

  // Normal card
  const cat = getCategoryInfo(item.type);

  return (
    <div className={`${styles.templateCard} ${styles.deployFadeIn}`} style={{ marginBottom: 8, borderLeft: item.riskTone === "danger" ? "3px solid var(--danger, #d32f2f)" : undefined }}>
      {/* Category badge */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "0 12px",
        fontSize: 11,
        fontWeight: 600,
        color: cat.color,
        letterSpacing: "0.02em",
      }}>
        <Icon name={cat.icon} size={14} style={{ color: cat.color }} />
        {cat.label}
      </div>

      <div className={styles.templateHeaderRow}>
        <div>
          <h4 className={styles.templateTitle}>{item.id}</h4>
          <p className={styles.templateDescription}>
            {item.title} / {item.environment}
          </p>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <StatusChip label={item.riskSummary || item.riskTone} tone={riskTone(item.riskTone)} />
          <StatusChip label={item.status} tone="warning" />
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
              onClick={() => handleAction(action.actionId)}
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

// Already processed card (for approved/held sections)
function ProcessedItemCard({ item }: { item: ApprovalQueueItem }) {
  const isApproved = item.status === "approved";
  const cat = getCategoryInfo(item.type);
  return (
    <div
      className={styles.templateCard}
      style={{
        marginBottom: 8,
        opacity: 0.6,
        borderColor: isApproved ? "rgba(52, 195, 143, 0.3)" : "rgba(228, 106, 106, 0.3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px", fontSize: 11, fontWeight: 600, color: cat.color }}>
        <Icon name={cat.icon} size={12} style={{ color: cat.color }} />
        {cat.label}
      </div>
      <div className={styles.templateHeaderRow}>
        <div>
          <h4 className={styles.templateTitle}>{item.id}</h4>
          <p className={styles.templateDescription}>{item.title} / {item.environment}</p>
        </div>
        <StatusChip label={item.status} tone={isApproved ? "success" : "danger"} />
      </div>
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
        <div className={styles.deployFadeIn} style={{
          padding: 24,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}>
          <span className={styles.deployStepBounce} style={{ fontSize: 36 }}>🎉</span>
          <span style={{ fontWeight: 600 }}>모든 요청이 처리되었습니다</span>
        </div>
      )}

      {/* Approved items (collapsed) */}
      {approved.length > 0 ? (
        <details style={{ marginTop: 12 }}>
          <summary className={styles.sectionEyebrow} style={{ cursor: "pointer" }}>
            승인됨 ({approved.length})
          </summary>
          {approved.map((item) => (
            <ProcessedItemCard item={item} key={item.id} />
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
            <ProcessedItemCard item={item} key={item.id} />
          ))}
        </details>
      ) : null}
    </article>
  );
}
