"use client";

import { useState } from "react";
import { ChatAssistantPanel } from "@/devops-console/assistant/chat-assistant-panel";
import styles from "@/devops-console/console-page.module.css";
import { AppFrame } from "@/devops-console/shell/app-frame";
import { useDevopsConsoleStore } from "@/devops-chat/store/app-store";
import type { ApprovalItem, DeployItem, PageKey, RollbackItem } from "@/devops-chat/types/domain";
import { buildConsoleViewModel } from "@/devops-chat/view-models/build-console-view-model";

function findSelectedItem(pageKey: PageKey, pages: ReturnType<typeof useDevopsConsoleStore.getState>["pages"]) {
  switch (pageKey) {
    case "deploy":
      return (pages.deploy.items.find((item) => item.id === pages.deploy.selectedId) ?? null) as DeployItem | null;
    case "approve":
      return (pages.approve.items.find((item) => item.id === pages.approve.selectedId) ?? null) as ApprovalItem | null;
    case "rollback":
      return (pages.rollback.items.find((item) => item.id === pages.rollback.selectedId) ?? null) as RollbackItem | null;
  }
}

export function AssistantPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PageKey>("deploy");
  const pages = useDevopsConsoleStore((state) => state.pages);
  const viewModel = buildConsoleViewModel(activeTab, pages);
  const selectedItem = findSelectedItem(activeTab, pages);

  return (
    <AppFrame
      activePage="assistant"
      assistantOpen={false}
      hideAssistantTrigger
      lastUpdated={viewModel.lastUpdated}
      onToggleAssistant={() => {}}
      onToggleSidebar={() => setSidebarOpen((value) => !value)}
      pageScope="a2ui template manager / cross-workflow"
      pageTitle="Assistant"
      sidebarOpen={sidebarOpen}
    >
      <div className={styles.noticeStrip}>
        <span>페이지 문맥 카드 없이 대화만 표시하는 전용 chat 화면입니다.</span>
        <span className={styles.headerMetaBadge}>{viewModel.pageTitle}</span>
      </div>

      <nav className={styles.workflowNav}>
        {(["deploy", "approve", "rollback"] as PageKey[]).map((tab) => (
          <button
            className={`${styles.workflowNavItem} ${tab === activeTab ? styles.workflowNavItemActive : ""}`}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className={styles.chatAssistantStandalone}>
        <ChatAssistantPanel onClose={() => {}} pageKey={activeTab} selectedItem={selectedItem} />
      </div>
    </AppFrame>
  );
}
