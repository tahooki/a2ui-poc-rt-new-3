"use client";

import { useState } from "react";
import { ChatAssistantPanel } from "@/devops-console/assistant/chat-assistant-panel";
import styles from "@/devops-console/console-page.module.css";
import { AppFrame } from "@/devops-console/shell/app-frame";
import { ApproveWorkspace } from "@/devops-console/pages/approve-workspace";
import { DeployWorkspace } from "@/devops-console/pages/deploy-workspace";
import { RollbackWorkspace } from "@/devops-console/pages/rollback-workspace";
import { FilterBar } from "@/devops-console/sections/filter-bar";
import { SummaryBand } from "@/devops-console/sections/summary-band";
import { useDevopsConsoleStore } from "@/devops-chat/store/app-store";
import type { ApprovalItem, DeployItem, PageKey, RollbackItem } from "@/devops-chat/types/domain";
import {
  buildConsoleViewModel,
  type RuntimePageMap,
} from "@/devops-chat/view-models/build-console-view-model";

function findSelectedItem(pageKey: PageKey, pages: RuntimePageMap) {
  switch (pageKey) {
    case "deploy":
      return (pages.deploy.items.find((item) => item.id === pages.deploy.selectedId) ?? null) as DeployItem | null;
    case "approve":
      return (pages.approve.items.find((item) => item.id === pages.approve.selectedId) ?? null) as ApprovalItem | null;
    case "rollback":
      return (pages.rollback.items.find((item) => item.id === pages.rollback.selectedId) ?? null) as RollbackItem | null;
  }
}

export function DevopsConsolePage({ pageKey }: { pageKey: PageKey }) {
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const pages = useDevopsConsoleStore((state) => state.pages);
  const selectRow = useDevopsConsoleStore((state) => state.selectRow);
  const viewModel = buildConsoleViewModel(pageKey, pages);
  const selectedItem = findSelectedItem(pageKey, pages);

  const assistant = <ChatAssistantPanel aiEnabled={aiEnabled} onClose={() => setAssistantOpen(false)} pageKey={pageKey} selectedItem={selectedItem} />;

  return (
    <AppFrame
      activePage={pageKey}
      aiEnabled={aiEnabled}
      assistant={assistant}
      assistantOpen={assistantOpen}
      lastUpdated={viewModel.lastUpdated}
      onToggleAi={() => setAiEnabled((v) => !v)}
      onToggleAssistant={() => setAssistantOpen((value) => !value)}
      onToggleSidebar={() => setSidebarOpen((value) => !value)}
      pageScope={viewModel.pageScope}
      pageTitle={viewModel.pageTitle}
      sidebarOpen={sidebarOpen}
    >
      <div className={styles.noticeStrip}>
        <span>이 데모 상태는 새로고침하면 seed 기준 초기 상태로 돌아갑니다.</span>
        <span className={styles.headerMetaBadge}>engine preserved / UI rebuilt</span>
      </div>

      <section className={styles.pageIntro}>
        <div className={styles.pageTitleRow}>
          <div>
            <div className={styles.sectionEyebrow}>{viewModel.navLabel}</div>
            <h1 className={styles.pageTitle}>{viewModel.pageTitle}</h1>
          </div>
        </div>
        <p className={styles.pageDescription}>{viewModel.pageDescription}</p>
      </section>

      <SummaryBand metrics={viewModel.summaryMetrics} />

      <FilterBar
        filters={viewModel.filters}
        onPrimaryAction={() => setAssistantOpen(true)}
        primaryActionLabel={viewModel.primaryActionLabel}
      />

      {pageKey === "deploy" ? (
        <DeployWorkspace
          onSelectRow={(rowId) => {
            selectRow(pageKey, rowId);
          }}
          selectedItem={selectedItem as DeployItem | null}
          viewModel={viewModel}
        />
      ) : pageKey === "approve" ? (
        <ApproveWorkspace
          onSelectRow={(rowId) => {
            selectRow(pageKey, rowId);
          }}
          selectedItem={selectedItem as ApprovalItem | null}
          viewModel={viewModel}
        />
      ) : (
        <RollbackWorkspace
          onSelectRow={(rowId) => {
            selectRow(pageKey, rowId);
          }}
          selectedItem={selectedItem as RollbackItem | null}
          serviceHealth={pages.rollback.serviceHealth}
          viewModel={viewModel}
        />
      )}
    </AppFrame>
  );
}
