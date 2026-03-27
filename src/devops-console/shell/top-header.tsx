import Link from "next/link";
import styles from "@/devops-console/console-page.module.css";
import { Icon } from "@/devops-console/foundation/icon-registry";

export function TopHeader({
  lastUpdated,
  pageScope,
  pageTitle,
  assistantOpen,
  assistantHref,
  hideAssistantTrigger,
  onToggleAssistant,
  onToggleSidebar,
}: {
  lastUpdated: string;
  pageScope: string;
  pageTitle: string;
  assistantOpen: boolean;
  assistantHref?: string;
  hideAssistantTrigger?: boolean;
  onToggleAssistant: () => void;
  onToggleSidebar: () => void;
}) {
  return (
    <header className={styles.topHeader}>
      <div className={styles.headerMain}>
        <button
          className={`${styles.iconButton} ${styles.mobileMenuButton}`}
          onClick={onToggleSidebar}
          type="button"
        >
          <Icon name="dashboard" size={16} />
        </button>
        <div>
          <div className={styles.brandEyebrow}>Workspace</div>
          <div className={styles.brandTitle}>{pageTitle}</div>
        </div>
        <span className={styles.scopeBadge}>{pageScope}</span>
      </div>
      <div className={styles.headerActions}>
        <span className={styles.headerMetaBadge}>
          <Icon name="history" size={14} />
          {lastUpdated}
        </span>
        {hideAssistantTrigger ? null : assistantHref ? (
          <Link className={styles.iconButton} href={assistantHref}>
            <Icon name="robot" size={16} />
          </Link>
        ) : (
          <button
            className={`${styles.iconButton} ${assistantOpen ? styles.iconButtonActive : ""}`}
            onClick={onToggleAssistant}
            type="button"
          >
            <Icon name="robot" size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
