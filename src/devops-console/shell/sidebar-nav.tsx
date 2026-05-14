import Link from "next/link";
import styles from "@/devops-console/console-page.module.css";
import { Icon, type IconName } from "@/devops-console/foundation/icon-registry";
import type { PageKey } from "@/devops-chat/types/domain";

export type NavKey = PageKey | "assistant" | "story" | "a2ui" | "codeGuide";

const navItems: Array<{ href: string; key: NavKey; label: string; icon: IconName }> = [
  { href: "/story", key: "story", label: "Story", icon: "story" },
  { href: "/code-guide", key: "codeGuide", label: "기능별 코드 설명", icon: "terminal" },
  { href: "/deploy/image", key: "deploy", label: "Deploy", icon: "deploy" },
  { href: "/approve", key: "approve", label: "Approve", icon: "approve" },
  { href: "/rollback", key: "rollback", label: "Rollback", icon: "rollback" },
  { href: "/a2ui-components", key: "a2ui", label: "A2UI", icon: "dashboard" },
];

export function SidebarNav({
  activePage,
  isOpen,
}: {
  activePage: NavKey;
  isOpen: boolean;
}) {
  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}>
      <div className={styles.brandBlock}>
        <div className={styles.brandEyebrow}>Product</div>
        <div className={styles.brandTitle}>DevOps Console</div>
        <div className={styles.brandMeta}>
          <span className={styles.envBadge}>prod / kr-central</span>
        </div>
      </div>

      <nav className={styles.navList}>
        {navItems.map((item) => {
          const isActive = item.key === activePage;
          return (
            <Link
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
              href={item.href}
              key={item.key}
            >
              <span className={styles.navItemText}>
                <Icon name={item.icon} size={18} />
                {item.label}
              </span>
              <Icon name="chevronRight" size={16} />
            </Link>
          );
        })}
      </nav>

      <div className={styles.sidebarFooter}>
        <div className={styles.brandEyebrow}>Icon system</div>
        <div className={styles.propertyValue}>
          Single local registry using Material-style outlined admin glyphs.
        </div>
      </div>
    </aside>
  );
}
