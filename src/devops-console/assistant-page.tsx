"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "@/devops-console/console-page.module.css";
import { AssistantActivityLog } from "@/devops-console/assistant/activity-log";
import { CommandComposer } from "@/devops-console/assistant/command-composer";
import { ContextSummary } from "@/devops-console/assistant/context-summary";
import { TemplateSurface } from "@/devops-console/assistant/template-surface";
import { SummaryBand } from "@/devops-console/sections/summary-band";
import { AppFrame } from "@/devops-console/shell/app-frame";
import { useDevopsConsoleStore } from "@/devops-chat/store/app-store";
import type { PageKey } from "@/devops-chat/types/domain";
import { buildConsoleViewModel } from "@/devops-chat/view-models/build-console-view-model";

const assistantTabs: Array<{
  pageKey: PageKey;
  label: string;
  title: string;
  description: string;
  href: string;
}> = [
  {
    pageKey: "deploy",
    label: "Deploy",
    title: "Deploy template set",
    description: "image -> request -> run 흐름을 압축하는 deploy a2ui 템플릿을 관리합니다.",
    href: "/deploy/request",
  },
  {
    pageKey: "approve",
    label: "Approvals",
    title: "Approval template set",
    description: "Temporary Access, Config Change, Data Operation 승인 패킷 템플릿을 관리합니다.",
    href: "/approve",
  },
  {
    pageKey: "rollback",
    label: "Rollback",
    title: "Rollback template set",
    description: "summary, dry run, confirm 단계로 구성된 rollback a2ui 템플릿을 관리합니다.",
    href: "/rollback",
  },
];

export function AssistantPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PageKey>("deploy");
  const pages = useDevopsConsoleStore((state) => state.pages);
  const setComposerText = useDevopsConsoleStore((state) => state.setComposerText);
  const activateIntent = useDevopsConsoleStore((state) => state.activateIntent);
  const submitPrompt = useDevopsConsoleStore((state) => state.submitPrompt);
  const runPrimaryTemplateAction = useDevopsConsoleStore((state) => state.runPrimaryTemplateAction);
  const runSecondaryTemplateAction = useDevopsConsoleStore((state) => state.runSecondaryTemplateAction);
  const viewModel = buildConsoleViewModel(activeTab, pages);
  const activeMeta = assistantTabs.find((tab) => tab.pageKey === activeTab) ?? assistantTabs[0];

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
        <span>이 페이지는 chatbot 질문을 a2ui 템플릿으로 연결하는 assistant 전용 관리 화면입니다.</span>
        <span className={styles.headerMetaBadge}>template manager</span>
      </div>

      <section className={styles.pageIntro}>
        <div className={styles.pageTitleRow}>
          <div>
            <div className={styles.sectionEyebrow}>Assistant</div>
            <h1 className={styles.pageTitle}>A2UI template manager</h1>
          </div>
        </div>
        <p className={styles.pageDescription}>
          운영자는 각 admin page에서 실제 작업을 수행하고, 이 페이지에서는 Deploy, Approvals, Rollback에 대응하는 a2ui 템플릿과 chatbot 응답 흐름을 관리합니다.
        </p>
      </section>

      <nav className={styles.workflowNav}>
        {assistantTabs.map((tab) => (
          <button
            className={`${styles.workflowNavItem} ${tab.pageKey === activeTab ? styles.workflowNavItemActive : ""}`}
            key={tab.pageKey}
            onClick={() => setActiveTab(tab.pageKey)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <SummaryBand metrics={viewModel.summaryMetrics} />

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>{activeMeta.title}</h2>
            <p className={styles.panelDescription}>{activeMeta.description}</p>
          </div>
        </div>
        <div className={styles.heroSplit}>
          <div className={styles.templateMetaCard}>
            <div className={styles.metaLabel}>Source workspace</div>
            <div className={styles.detailPrimaryValue}>{viewModel.pageTitle}</div>
            <div className={styles.propertyValue}>{viewModel.pageDescription}</div>
          </div>
          <Link className={styles.templateMetaCard} href={activeMeta.href}>
            <div className={styles.metaLabel}>Open admin page</div>
            <div className={styles.detailPrimaryValue}>{activeMeta.label}</div>
            <div className={styles.propertyValue}>실제 운영 액션은 해당 admin page에서 수행합니다.</div>
          </Link>
        </div>
      </section>

      <div className={styles.workspaceGrid}>
        <div className={styles.mainColumn}>
          <ContextSummary context={viewModel.assistantContext} />
          <AssistantActivityLog messages={viewModel.messages} />
          <TemplateSurface
            onPrimaryAction={() => runPrimaryTemplateAction(activeTab)}
            onSecondaryAction={() => runSecondaryTemplateAction(activeTab)}
            template={viewModel.template}
          />
        </div>
        <div className={styles.detailColumn}>
          <CommandComposer
            composerPlaceholder={viewModel.composerPlaceholder}
            composerText={viewModel.composerText}
            error={viewModel.error}
            intents={viewModel.intents}
            isSubmitting={viewModel.isSubmitting}
            onComposerChange={(value) => setComposerText(activeTab, value)}
            onIntent={(intentId) => activateIntent(activeTab, intentId)}
            onSubmit={() => void submitPrompt(activeTab)}
          />
        </div>
      </div>
    </AppFrame>
  );
}
