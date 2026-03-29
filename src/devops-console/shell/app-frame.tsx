import styles from "@/devops-console/console-page.module.css";
import { SidebarNav, type NavKey } from "@/devops-console/shell/sidebar-nav";
import { TopHeader } from "@/devops-console/shell/top-header";
import { WorkspaceLayout } from "@/devops-console/shell/workspace-layout";

type AppFrameProps = {
  activePage: NavKey;
  assistant?: React.ReactNode;
  assistantOpen: boolean;
  assistantHref?: string;
  hideAssistantTrigger?: boolean;
  aiEnabled?: boolean;
  children: React.ReactNode;
  lastUpdated: string;
  pageScope: string;
  pageTitle: string;
  sidebarOpen: boolean;
  onToggleAssistant: () => void;
  onToggleSidebar: () => void;
  onToggleAi?: () => void;
};

export function AppFrame({
  activePage,
  assistant,
  assistantOpen,
  assistantHref,
  hideAssistantTrigger,
  aiEnabled,
  children,
  lastUpdated,
  pageScope,
  pageTitle,
  sidebarOpen,
  onToggleAssistant,
  onToggleSidebar,
  onToggleAi,
}: AppFrameProps) {
  return (
    <div className={styles.frame}>
      <SidebarNav activePage={activePage} isOpen={sidebarOpen} />
      <div className={styles.contentShell}>
        <TopHeader
          aiEnabled={aiEnabled}
          assistantOpen={assistantOpen}
          assistantHref={assistantHref}
          hideAssistantTrigger={hideAssistantTrigger}
          lastUpdated={lastUpdated}
          onToggleAi={onToggleAi}
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
