import styles from "@/devops-console/console-page.module.css";
import { Icon } from "@/devops-console/foundation/icon-registry";

export function AssistantHeader({
  description,
  title,
  onClose,
}: {
  description: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <section className={styles.assistantPanel}>
      <div className={styles.assistantSectionHeader}>
        <div>
          <h2 className={styles.assistantTitle}>{title}</h2>
          <p className={styles.assistantDescription}>{description}</p>
        </div>
        <button className={styles.iconButton} onClick={onClose} type="button">
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </section>
  );
}
