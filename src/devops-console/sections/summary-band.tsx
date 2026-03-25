import styles from "@/devops-console/console-page.module.css";
import type { SummaryMetricViewModel } from "@/devops-chat/view-models/build-console-view-model";

const toneColorVar: Record<SummaryMetricViewModel["tone"], string> = {
  info: "var(--console-info)",
  success: "var(--console-success)",
  warning: "var(--console-warning)",
  danger: "var(--console-danger)",
  neutral: "var(--console-border-strong)",
};

export function SummaryBand({ metrics }: { metrics: SummaryMetricViewModel[] }) {
  return (
    <section className={styles.summaryBand}>
      {metrics.map((metric) => (
        <article className={styles.metricCard} key={metric.label}>
          <div className={styles.metricLabel}>{metric.label}</div>
          <div className={styles.metricValueRow}>
            <strong className={styles.metricValue}>{metric.value}</strong>
            <div className={styles.toneBar} style={{ background: toneColorVar[metric.tone] }} />
          </div>
        </article>
      ))}
    </section>
  );
}
