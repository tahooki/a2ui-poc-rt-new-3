"use client";

import { useState } from "react";
import styles from "@/devops-console/console-page.module.css";
import { AssistantWorkspace } from "@/devops-console/shell/assistant-workspace";
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
  const pages = useDevopsConsoleStore((state) => state.pages);
  const selectRow = useDevopsConsoleStore((state) => state.selectRow);
  const setComposerText = useDevopsConsoleStore((state) => state.setComposerText);
  const activateIntent = useDevopsConsoleStore((state) => state.activateIntent);
  const submitPrompt = useDevopsConsoleStore((state) => state.submitPrompt);
  const runPrimaryPageAction = useDevopsConsoleStore((state) => state.runPrimaryPageAction);
  const runPrimaryTemplateAction = useDevopsConsoleStore((state) => state.runPrimaryTemplateAction);
  const runSecondaryTemplateAction = useDevopsConsoleStore((state) => state.runSecondaryTemplateAction);
  const viewModel = buildConsoleViewModel(pageKey, pages);
  const selectedItem = findSelectedItem(pageKey, pages);
  const assistantEnabled = pageKey === "deploy";

  const assistant = (
    <AssistantWorkspace
      composerPlaceholder={viewModel.composerPlaceholder}
      composerText={viewModel.composerText}
      context={viewModel.assistantContext}
      description={viewModel.assistantDescription}
      error={viewModel.error}
      intents={viewModel.intents}
      isSubmitting={viewModel.isSubmitting}
      messages={viewModel.messages}
      onClose={() => setAssistantOpen(false)}
      onComposerChange={(value) => setComposerText(pageKey, value)}
      onIntent={(intentId) => {
        setAssistantOpen(true);
        activateIntent(pageKey, intentId);
      }}
      onPrimaryAction={() => runPrimaryTemplateAction(pageKey)}
      onSecondaryAction={() => runSecondaryTemplateAction(pageKey)}
      onSubmit={() => {
        setAssistantOpen(true);
        void submitPrompt(pageKey);
      }}
      template={viewModel.template}
      title={viewModel.assistantTitle}
    />
  );

  return (
    <AppFrame
      activePage={pageKey}
      assistant={assistantEnabled ? assistant : undefined}
      assistantOpen={assistantEnabled ? assistantOpen : false}
      hideAssistantTrigger={!assistantEnabled}
      lastUpdated={viewModel.lastUpdated}
      onToggleAssistant={() => {
        if (!assistantEnabled) {
          return;
        }
        setAssistantOpen((value) => !value);
      }}
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
        onPrimaryAction={
          assistantEnabled
            ? () => {
                setAssistantOpen(true);
                runPrimaryPageAction(pageKey);
              }
            : undefined
        }
        primaryActionLabel={assistantEnabled ? viewModel.primaryActionLabel : undefined}
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
          viewModel={viewModel}
        />
      )}
    </AppFrame>
  );
}
