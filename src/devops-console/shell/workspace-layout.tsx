import styles from "@/devops-console/console-page.module.css";

export function WorkspaceLayout({
  assistant,
  assistantOpen,
  children,
}: {
  assistant: React.ReactNode;
  assistantOpen: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.workspace} ${assistantOpen ? styles.workspaceAssistantOpen : ""}`}>
      <div className={styles.mainArea}>{children}</div>
      <aside
        className={`${styles.assistantArea} ${assistantOpen ? styles.assistantAreaOpen : ""}`}
      >
        {assistant}
      </aside>
    </div>
  );
}
