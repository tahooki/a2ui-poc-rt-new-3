import styles from "@/devops-console/console-page.module.css";

export function AssistantActivityLog({ messages }: { messages: string[] }) {
  return (
    <section className={styles.assistantPanel}>
      <div className={styles.assistantSectionHeader}>
        <div>
          <div className={styles.sectionEyebrow}>Recent log</div>
          <h3 className={styles.panelTitle}>Contextual assistant output</h3>
        </div>
      </div>
      <div className={styles.assistantLog}>
        {messages.map((message) => (
          <div className={styles.assistantLogItem} key={message}>
            {message}
          </div>
        ))}
      </div>
    </section>
  );
}
