import styles from "@/devops-console/console-page.module.css";

export function EmptyState({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className={styles.emptyState}>
      <h3 className={styles.panelTitle}>{title}</h3>
      <p className={styles.panelDescription}>{description}</p>
    </div>
  );
}
