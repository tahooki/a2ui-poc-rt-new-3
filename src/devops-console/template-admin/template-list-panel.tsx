"use client";

import styles from "@/devops-console/console-page.module.css";
import { buildTemplateListViewModel, type TemplateListItem } from "@/devops-chat/template-registry/build-template-list-view-model";

type TemplateListPanelProps = {
  selectedId: string | null;
  onSelect: (templateId: string) => void;
};

const STATUS_BADGE: Record<string, string> = {
  active: "success",
  draft: "warning",
  deprecated: "danger",
};

export function TemplateListPanel({ selectedId, onSelect }: TemplateListPanelProps) {
  const items = buildTemplateListViewModel();

  return (
    <div className={styles.templateListPanel}>
      <div className={styles.sectionEyebrow}>Template Registry</div>
      <h3 className={styles.panelTitle}>Templates ({items.length})</h3>
      <div className={styles.templateListItems}>
        {items.map((item) => (
          <button
            className={`${styles.templateListItem} ${item.templateId === selectedId ? styles.templateListItemSelected : ""}`}
            key={item.templateId}
            onClick={() => onSelect(item.templateId)}
            type="button"
          >
            <div className={styles.templateListItemTitle}>{item.title}</div>
            <div className={styles.templateListItemMeta}>
              <span className={styles.templateListItemVersion}>v{item.version}</span>
              <span className={`${styles.templateListItemStatus} ${styles[`status-${item.status}`] ?? ""}`}>
                {item.status}
              </span>
              <span>{item.fieldCount} fields</span>
              <span>{item.previewCaseCount} previews</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
