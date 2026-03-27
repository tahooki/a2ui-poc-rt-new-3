"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "@/devops-console/console-page.module.css";
import { EmptyState } from "@/devops-console/foundation/empty-state";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import { AppFrame } from "@/devops-console/shell/app-frame";
import { useDevopsConsoleStore } from "@/devops-chat/store/app-store";
import { rollbackStatusMeta } from "@/devops-chat/lib/status";

export function RollbackTargetDetailPage({
  deploymentId,
  serviceId,
}: {
  deploymentId: string;
  serviceId: string;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pages = useDevopsConsoleStore((state) => state.pages);
  const selectRow = useDevopsConsoleStore((state) => state.selectRow);
  const setRollbackTarget = useDevopsConsoleStore((state) => state.setRollbackTarget);
  const startRollbackDryRun = useDevopsConsoleStore((state) => state.startRollbackDryRun);
  const completeRollbackDryRun = useDevopsConsoleStore((state) => state.completeRollbackDryRun);
  const confirmRollback = useDevopsConsoleStore((state) => state.confirmRollback);
  const service = pages.rollback.items.find((item) => item.id === serviceId) ?? null;
  const deployment = service?.deploymentHistory.find((item) => item.id === deploymentId) ?? null;

  useEffect(() => {
    if (service) {
      if (pages.rollback.selectedId !== serviceId) {
        selectRow("rollback", serviceId);
      }
      if (pages.rollback.activeDeploymentId !== deploymentId) {
        setRollbackTarget(serviceId, deploymentId);
      }
    }
  }, [deploymentId, pages.rollback.activeDeploymentId, pages.rollback.selectedId, selectRow, service, serviceId, setRollbackTarget]);

  const tone = deployment ? rollbackStatusMeta[deployment.status].tone : "warning";
  const canRunDryRun = deployment?.status === "identified" || deployment?.status === "dry_run_ready";
  const canCompleteDryRun = deployment?.status === "dry_run_running";
  const canConfirm = deployment?.status === "confirm_ready" || deployment?.status === "dry_run_completed";

  return (
    <AppFrame
      activePage="rollback"
      assistantOpen={false}
      hideAssistantTrigger
      lastUpdated={pages.rollback.seed.lastUpdated}
      onToggleAssistant={() => {}}
      onToggleSidebar={() => setSidebarOpen((value) => !value)}
      pageScope="rollback target detail"
      pageTitle="Rollback Target"
      sidebarOpen={sidebarOpen}
    >
      <div className={styles.noticeStrip}>
        <span>특정 과거 배포를 rollback target으로 놓고 dry run과 confirm을 거쳐 최종 복귀를 수행합니다.</span>
        <span className={styles.headerMetaBadge}>target review</span>
      </div>

      <section className={styles.pageIntro}>
        <div className={styles.pageTitleRow}>
          <div>
            <div className={styles.sectionEyebrow}>Rollback</div>
            <h1 className={styles.pageTitle}>Rollback target detail</h1>
          </div>
          <Link className={styles.workflowNavItem} href={`/rollback/${serviceId}`}>
            Back to service
          </Link>
        </div>
        <p className={styles.pageDescription}>
          현재 버전과 rollback target을 최종 비교하고, dry run을 수행한 뒤 confirm checklist를 거쳐 복귀를 확정합니다.
        </p>
      </section>

      {!service || !deployment ? (
        <section className={styles.panel}>
          <EmptyState
            description="선택한 서비스 또는 target deployment를 찾을 수 없습니다. 서비스 상세로 돌아가 다시 선택하세요."
            title="Rollback target을 찾을 수 없음"
          />
        </section>
      ) : (
        <div className={styles.workspaceGridSingle}>
          <div className={styles.mainColumn}>
            <section className={styles.selectedHighlight}>
              <div className={styles.panelHeader}>
                <div>
                  <div className={styles.sectionEyebrow}>Current vs target</div>
                  <h2 className={styles.panelTitle}>{service.service}</h2>
                  <p className={styles.panelDescription}>{deployment.releaseSummary}</p>
                </div>
                <StatusChip label={rollbackStatusMeta[deployment.status].label} tone={tone} />
              </div>
              <div className={styles.focusGrid}>
                <div className={styles.warningCard}>
                  <div className={styles.metaLabel}>Current version</div>
                  <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{service.currentVersion}</div>
                  <div className={styles.propertyValue}>{service.incidentSummary}</div>
                </div>
                <div className={styles.calloutCard}>
                  <div className={styles.metaLabel}>Rollback target</div>
                  <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{deployment.version}</div>
                  <div className={styles.propertyValue}>{deployment.deployedAt}</div>
                </div>
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Why this target</h2>
                  <p className={styles.panelDescription}>{deployment.whyThisTarget}</p>
                </div>
              </div>
              <div className={styles.checkList}>
                {deployment.evidence.map((item) => (
                  <div className={styles.checkItem} key={item}>
                    <StatusChip label="evidence" tone="warning" />
                    <span className={styles.propertyValue}>{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Dry run</h2>
                  <p className={styles.panelDescription}>rollback target을 실제 실행하기 전에 핵심 안전 체크를 검증합니다.</p>
                </div>
              </div>
              <div className={styles.checkList}>
                {deployment.dryRunChecks.map((item) => (
                  <div className={styles.checkItem} key={item}>
                    <StatusChip label="dry run" tone={deployment.status === "dry_run_running" ? "info" : "warning"} />
                    <span className={styles.propertyValue}>{item}</span>
                  </div>
                ))}
              </div>
              <div className={styles.decisionActions}>
                <button
                  className={`${styles.primaryButton} ${styles.decisionButton}`}
                  disabled={!canRunDryRun}
                  onClick={() => startRollbackDryRun(service.id, deployment.id)}
                  type="button"
                >
                  Dry run 시작
                </button>
                <button
                  className={`${styles.secondaryButton} ${styles.decisionButton}`}
                  disabled={!canCompleteDryRun}
                  onClick={() => completeRollbackDryRun(service.id, deployment.id)}
                  type="button"
                >
                  Dry run 완료
                </button>
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Final confirm</h2>
                  <p className={styles.panelDescription}>최종 rollback 전 확인이 필요한 checklist와 recovery window를 검토합니다.</p>
                </div>
              </div>
              <div className={styles.propertyList}>
                <div className={styles.propertyItem}>
                  <div className={styles.metaLabel}>Recovery window</div>
                  <div className={styles.propertyValue}>{deployment.recoveryWindow}</div>
                </div>
                <div className={styles.propertyItem}>
                  <div className={styles.metaLabel}>Blast radius</div>
                  <div className={styles.propertyValue}>{service.blastRadius}</div>
                </div>
                <div className={styles.propertyItem}>
                  <div className={styles.metaLabel}>Rollback risk</div>
                  <div className={styles.propertyValue}>{deployment.rollbackRisk}</div>
                </div>
              </div>
              <div className={styles.checkList}>
                {deployment.confirmChecklist.map((item) => (
                  <div className={styles.checkItem} key={item}>
                    <StatusChip label="confirm" tone="danger" />
                    <span className={styles.propertyValue}>{item}</span>
                  </div>
                ))}
              </div>
              <div className={styles.decisionActions}>
                <button
                  className={`${styles.primaryButton} ${styles.decisionButton}`}
                  disabled={!canConfirm}
                  onClick={() => confirmRollback(service.id, deployment.id)}
                  type="button"
                >
                  Rollback 확정
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </AppFrame>
  );
}
