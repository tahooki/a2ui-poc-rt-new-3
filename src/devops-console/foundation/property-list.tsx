import styles from "@/devops-console/console-page.module.css";
import type { DetailItem } from "@/devops-chat/types/domain";

export function PropertyList({ items }: { items: DetailItem[] }) {
  return (
    <div className={styles.propertyList}>
      {items.map((item) => (
        <div className={styles.propertyItem} key={`${item.label}-${item.value}`}>
          <div className={styles.metaLabel}>{item.label}</div>
          <div className={`${styles.propertyValue} ${item.mono ? styles.mono : ""}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}
