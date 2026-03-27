"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/devops-console/console-page.module.css";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import { DetailSidebar } from "@/devops-console/sections/detail-sidebar";
import { AppFrame } from "@/devops-console/shell/app-frame";
import { useDevopsConsoleStore } from "@/devops-chat/store/app-store";
import {
  approvalTabMeta,
  buildConsoleViewModel,
} from "@/devops-chat/view-models/build-console-view-model";

export function ApproveDetailPage({ requestId }: { requestId: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pages = useDevopsConsoleStore((state) => state.pages);
  const selectRow = useDevopsConsoleStore((state) => state.selectRow);
  const runPrimaryTemplateAction = useDevopsConsoleStore((state) => state.runPrimaryTemplateAction);
  const runSecondaryTemplateAction = useDevopsConsoleStore((state) => state.runSecondaryTemplateAction);
  const requestItem = pages.approve.items.find((item) => item.id === requestId) ?? null;

  useEffect(() => {
    if (requestItem && pages.approve.selectedId !== requestId) {
      selectRow("approve", requestId);
    }
  }, [pages.approve.selectedId, requestId, requestItem, selectRow]);

  const viewModel = buildConsoleViewModel("approve", pages);
  const synced = pages.approve.selectedId === requestId;
  const selectedItem = synced ? requestItem : null;
  const selectedStatus =
    selectedItem ? viewModel.tableRows.find((row) => row.id === selectedItem.id) : null;
  const meta = requestItem ? approvalTabMeta[requestItem.type] : null;

  return (
    <AppFrame
      activePage="approve"
      assistantOpen={false}
      hideAssistantTrigger
      lastUpdated={viewModel.lastUpdated}
      onToggleAssistant={() => {}}
      onToggleSidebar={() => setSidebarOpen((value) => !value)}
      pageScope={meta ? `${meta.label.toLowerCase()} / approval detail` : "approval detail"}
      pageTitle="Approval Request"
      sidebarOpen={sidebarOpen}
    >
      <div className={styles.noticeStrip}>
        <span>리스트에서 선택한 승인 요청의 상세 내용을 검토하고 승인 또는 보류를 수행합니다.</span>
        <span className={styles.headerMetaBadge}>detail review</span>
      </div>

      <section className={styles.pageIntro}>
        <div className={styles.pageTitleRow}>
          <div>
            <div className={styles.sectionEyebrow}>Approve</div>
            <h1 className={styles.pageTitle}>Approval request detail</h1>
          </div>
          <Link className={styles.workflowNavItem} href="/approve">
            Back to queue
          </Link>
        </div>
        <p className={styles.pageDescription}>
          선택한 승인 요청의 상세 근거를 읽고 최종 승인 또는 보류 결정을 수행하는 상세 페이지입니다.
        </p>
      </section>

      {meta ? (
        <nav className={styles.workflowNav}>
          <span className={`${styles.workflowNavItem} ${styles.workflowNavItemActive}`}>{meta.label}</span>
        </nav>
      ) : null}

      {!requestItem ? (
        <section className={styles.panel}>
          <div className={styles.emptyState}>
            <h3 className={styles.panelTitle}>승인 요청을 찾을 수 없음</h3>
            <p className={styles.panelDescription}>
              요청 ID가 없거나 현재 seed에 존재하지 않습니다. 승인 큐로 돌아가 요청을 다시 선택하세요.
            </p>
          </div>
        </section>
      ) : !synced ? (
        <section className={styles.panel}>
          <div className={styles.emptyState}>
            <h3 className={styles.panelTitle}>승인 요청 로딩 중</h3>
            <p className={styles.panelDescription}>선택한 승인 요청의 상세 정보를 준비하고 있습니다.</p>
          </div>
        </section>
      ) : (
        <div className={styles.workspaceGridSingle}>
          <div className={styles.mainColumn}>
            <DetailSidebar
              description="선택한 승인 요청의 상세 근거와 승인 판단 포인트를 보여줍니다."
              emptyDescription={viewModel.emptyDetailDescription}
              emptyTitle={viewModel.emptyDetailTitle}
              footer={
                selectedItem ? (
                  <div className={styles.sectionCard}>
                    <div className={styles.panelHeader}>
                      <div>
                        <h3 className={styles.sectionCardTitle}>Approval decision</h3>
                        <p className={styles.panelDescription}>
                          상세 검토가 끝났다면 아래에서 승인 또는 보류를 수행합니다.
                        </p>
                      </div>
                      <StatusChip
                        label={selectedStatus?.statusLabel ?? requestItem.status}
                        tone={selectedStatus?.statusTone ?? "warning"}
                      />
                    </div>
                    <div className={styles.decisionActions}>
                      <button
                        className={`${styles.primaryButton} ${styles.decisionButton}`}
                        onClick={() => runPrimaryTemplateAction("approve")}
                        type="button"
                      >
                        {requestItem.status === "approved" ? "승인됨" : "승인"}
                      </button>
                      <button
                        className={`${styles.secondaryButton} ${styles.decisionButton}`}
                        onClick={() => runSecondaryTemplateAction("approve")}
                        type="button"
                      >
                        {requestItem.status === "held" ? "보류됨" : "보류"}
                      </button>
                    </div>
                  </div>
                ) : null
              }
              sections={viewModel.detailSections}
              title="Approval detail"
            />
          </div>
        </div>
      )}
    </AppFrame>
  );
}
