import styles from "@/devops-console/console-page.module.css";

export type TimelineEntry = {
  time: string;
  value: string;
};

export function ActivityTimeline({
  entries,
  title,
  description,
}: {
  entries: TimelineEntry[];
  title: string;
  description: string;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>{title}</h2>
          <p className={styles.panelDescription}>{description}</p>
        </div>
      </div>
      <div className={styles.timeline}>
        {entries.map((entry) => (
          <div className={styles.timelineItem} key={`${entry.time}-${entry.value}`}>
            <span className={`${styles.timelineTime} ${styles.mono}`}>{entry.time}</span>
            <div className={styles.timelineValue}>{entry.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
