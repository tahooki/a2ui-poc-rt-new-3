import styles from "@/devops-console/console-page.module.css";
import { SidebarNav } from "@/devops-console/shell/sidebar-nav";
import { TopHeader } from "@/devops-console/shell/top-header";
import { WorkspaceLayout } from "@/devops-console/shell/workspace-layout";
import type { PageKey } from "@/devops-chat/types/domain";

type AppFrameProps = {
  activePage: PageKey;
  assistant: React.ReactNode;
  assistantOpen: boolean;
  children: React.ReactNode;
  lastUpdated: string;
  pageScope: string;
  pageTitle: string;
  sidebarOpen: boolean;
  onToggleAssistant: () => void;
  onToggleSidebar: () => void;
};

export function AppFrame({
  activePage,
  assistant,
  assistantOpen,
  children,
  lastUpdated,
  pageScope,
  pageTitle,
  sidebarOpen,
  onToggleAssistant,
  onToggleSidebar,
}: AppFrameProps) {
  return (
    <div className={styles.frame}>
      <SidebarNav activePage={activePage} isOpen={sidebarOpen} />
      <div className={styles.contentShell}>
        <TopHeader
          assistantOpen={assistantOpen}
          lastUpdated={lastUpdated}
          onToggleAssistant={onToggleAssistant}
          onToggleSidebar={onToggleSidebar}
          pageScope={pageScope}
          pageTitle={pageTitle}
        />
        <WorkspaceLayout assistant={assistant} assistantOpen={assistantOpen}>
          {children}
        </WorkspaceLayout>
      </div>
    </div>
  );
}
