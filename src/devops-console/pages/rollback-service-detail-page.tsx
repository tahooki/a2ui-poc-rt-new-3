"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "@/devops-console/console-page.module.css";
import { EmptyState } from "@/devops-console/foundation/empty-state";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import { SummaryBand } from "@/devops-console/sections/summary-band";
import { AppFrame } from "@/devops-console/shell/app-frame";
import { useDevopsConsoleStore } from "@/devops-chat/store/app-store";
import { rollbackStatusMeta } from "@/devops-chat/lib/status";

export function RollbackServiceDetailPage({ serviceId }: { serviceId: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pages = useDevopsConsoleStore((state) => state.pages);
  const selectRow = useDevopsConsoleStore((state) => state.selectRow);
  const setRollbackTarget = useDevopsConsoleStore((state) => state.setRollbackTarget);
  const quickRollback = useDevopsConsoleStore((state) => state.quickRollback);
  const service = pages.rollback.items.find((item) => item.id === serviceId) ?? null;
  const selectedDeployment = service?.deploymentHistory.find(
    (deployment) => deployment.id === pages.rollback.activeDeploymentId,
  ) ?? service?.deploymentHistory.find((deployment) => deployment.id === service?.recommendedRollbackDeploymentId) ?? null;

  useEffect(() => {
    if (service && pages.rollback.selectedId !== serviceId) {
      selectRow("rollback", serviceId);
    }
  }, [pages.rollback.selectedId, selectRow, service, serviceId]);

  const summaryMetrics = useMemo(
    () => [
      { label: "Current version", value: service?.currentVersion ?? "-", tone: "danger" as const },
      { label: "Recommended target", value: service?.recommendedRollbackVersion ?? "-", tone: "warning" as const },
      { label: "Deployments", value: `${service?.deploymentHistory.length ?? 0}`, tone: "info" as const },
      { label: "Status", value: service?.latestStatus ?? "-", tone: service?.latestStatus === "recovered" ? ("success" as const) : ("warning" as const) },
    ],
    [service],
  );

  return (
    <AppFrame
      activePage="rollback"
      assistantOpen={false}
      hideAssistantTrigger
      lastUpdated={pages.rollback.seed.lastUpdated}
      onToggleAssistant={() => {}}
      onToggleSidebar={() => setSidebarOpen((value) => !value)}
      pageScope="rollback service detail"
      pageTitle="Rollback Service"
      sidebarOpen={sidebarOpen}
    >
      <div className={styles.noticeStrip}>
        <span>서비스 단위로 배포 이력을 검토하고 rollback target을 선택합니다.</span>
        <span className={styles.headerMetaBadge}>service history</span>
      </div>

      <section className={styles.pageIntro}>
        <div className={styles.pageTitleRow}>
          <div>
            <div className={styles.sectionEyebrow}>Rollback</div>
            <h1 className={styles.pageTitle}>{service?.service ?? "Rollback service detail"}</h1>
          </div>
          <Link className={styles.workflowNavItem} href="/rollback">
            Back to services
          </Link>
        </div>
        <p className={styles.pageDescription}>
          선택한 서비스의 현재 상태와 배포 이력을 비교한 뒤, 빠르게 롤백하거나 target 상세로 들어가 신중하게 확정합니다.
        </p>
      </section>

      <SummaryBand metrics={summaryMetrics} />

      {!service ? (
        <section className={styles.panel}>
          <EmptyState
            description="해당 서비스 ID를 찾을 수 없습니다. rollback 큐로 돌아가 다시 선택하세요."
            title="서비스를 찾을 수 없음"
          />
        </section>
      ) : (
        <div className={styles.workspaceGridSingle}>
          <div className={styles.mainColumn}>
            <section className={styles.selectedHighlight}>
              <div className={styles.panelHeader}>
                <div>
                  <div className={styles.sectionEyebrow}>Service summary</div>
                  <h2 className={styles.panelTitle}>{service.service}</h2>
                  <p className={styles.panelDescription}>{service.incidentSummary}</p>
                </div>
                <StatusChip
                  label={service.latestStatus}
                  tone={service.latestStatus === "critical" ? "danger" : service.latestStatus === "recovered" ? "success" : "warning"}
                />
              </div>
              <div className={styles.focusGrid}>
                <div className={styles.warningCard}>
                  <div className={styles.metaLabel}>Current version</div>
                  <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{service.currentVersion}</div>
                  <div className={styles.propertyValue}>{service.severity} severity</div>
                </div>
                <div className={styles.calloutCard}>
                  <div className={styles.metaLabel}>Recommended rollback target</div>
                  <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{service.recommendedRollbackVersion}</div>
                  <div className={styles.propertyValue}>{service.blastRadius}</div>
                </div>
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>Deployment history</h2>
                  <p className={styles.panelDescription}>과거 배포를 비교해 빠르게 rollback 하거나, 상세 페이지에서 dry run / confirm을 수행할 수 있습니다.</p>
                </div>
              </div>
              <div className={styles.denseTableWrap}>
                <table className={styles.denseTable}>
                  <thead>
                    <tr>
                      {["Deployment", "Version", "Deployed At", "Strategy", "Health", "Verification", "Rollback", "Status"].map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {service.deploymentHistory.map((deployment) => {
                      const tone = rollbackStatusMeta[deployment.status].tone;

                      return (
                        <tr
                          className={`${styles.denseTableRow} ${deployment.id === selectedDeployment?.id ? styles.denseTableRowSelected : ""}`}
                          key={deployment.id}
                          onClick={() => {
                            setRollbackTarget(service.id, deployment.id);
                            router.push(`/rollback/${service.id}/${deployment.id}`);
                          }}
                        >
                          <td className={styles.mono}>{deployment.id}</td>
                          <td className={styles.mono}>{deployment.version}</td>
                          <td className={styles.mono}>{deployment.deployedAt}</td>
                          <td className={styles.mono}>{deployment.strategy}</td>
                          <td>{deployment.healthSummary}</td>
                          <td>{deployment.verification}</td>
                          <td>
                            {deployment.rollbackEligible ? (
                              <button
                                className={styles.secondaryButton}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  quickRollback(service.id, deployment.id);
                                }}
                                type="button"
                              >
                                Rollback to this
                              </button>
                            ) : (
                              <span className={styles.propertyValue}>not eligible</span>
                            )}
                          </td>
                          <td>
                            <StatusChip label={rollbackStatusMeta[deployment.status].label} tone={tone} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedDeployment ? (
              <section className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <h2 className={styles.panelTitle}>Selected rollback target</h2>
                    <p className={styles.panelDescription}>{selectedDeployment.whyThisTarget}</p>
                  </div>
                </div>
                <div className={styles.propertyList}>
                  <div className={styles.propertyItem}>
                    <div className={styles.metaLabel}>Target version</div>
                    <div className={`${styles.propertyValue} ${styles.mono}`}>{selectedDeployment.version}</div>
                  </div>
                  <div className={styles.propertyItem}>
                    <div className={styles.metaLabel}>Release summary</div>
                    <div className={styles.propertyValue}>{selectedDeployment.releaseSummary}</div>
                  </div>
                  <div className={styles.propertyItem}>
                    <div className={styles.metaLabel}>Rollback risk</div>
                    <div className={styles.propertyValue}>{selectedDeployment.rollbackRisk}</div>
                  </div>
                </div>
              </section>
            ) : null}
          </div>
        </div>
      )}
    </AppFrame>
  );
}
