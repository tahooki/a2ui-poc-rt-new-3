"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "@/devops-console/console-page.module.css";
import { DataTable } from "@/devops-console/foundation/data-table";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import type { ConsolePageViewModel } from "@/devops-chat/view-models/build-console-view-model";
import type { RollbackItem, ServiceHealth } from "@/devops-chat/types/domain";

const statusToneMap = { critical: "danger", warning: "warning", healthy: "success" } as const;
const statusLabelMap = { critical: "CRITICAL", warning: "WARNING", healthy: "HEALTHY" } as const;

export function RollbackWorkspace({
  selectedItem,
  viewModel,
  serviceHealth,
  onSelectRow,
}: {
  selectedItem: RollbackItem | null;
  viewModel: ConsolePageViewModel;
  serviceHealth: ServiceHealth[];
  onSelectRow: (rowId: string) => void;
}) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<"status" | "rollback">("status");
  const latestStatus =
    selectedItem ? viewModel.tableRows.find((row) => row.id === selectedItem.id) : null;

  return (
    <>
      <nav className={styles.subTabNav}>
        <button
          className={`${styles.subTabButton} ${subTab === "status" ? styles.subTabButtonActive : ""}`}
          onClick={() => setSubTab("status")}
          type="button"
        >
          현황
        </button>
        <button
          className={`${styles.subTabButton} ${subTab === "rollback" ? styles.subTabButtonActive : ""}`}
          onClick={() => setSubTab("rollback")}
          type="button"
        >
          롤백 실행
        </button>
      </nav>

      {subTab === "status" ? (
        <div className={styles.workspaceGridSingle}>
          <div className={styles.mainColumn}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <h2 className={styles.panelTitle}>서비스 인시던트 현황</h2>
                  <p className={styles.panelDescription}>운영 중인 서비스의 상태, 에러율, 응답 시간, 인스턴스 현황을 한눈에 확인합니다.</p>
                </div>
              </div>
            </section>

            <div className={styles.fieldGrid}>
              {serviceHealth.map((svc) => (
                <section
                  className={styles.panel}
                  key={svc.service}
                  style={{
                    borderLeft: `3px solid ${svc.status === "critical" ? "#f46a6a" : svc.status === "warning" ? "#f7c948" : "#34c38f"}`,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    const matchingItem = viewModel.tableRows.find((row) => row.cells.some((c) => c.value === svc.service));
                    if (matchingItem) {
                      onSelectRow(matchingItem.id);
                      setSubTab("rollback");
                    }
                  }}
                >
                  <div className={styles.panelHeader}>
                    <div>
                      <div className={styles.sectionEyebrow}>{svc.version}</div>
                      <h3 className={styles.panelTitle}>{svc.service}</h3>
                    </div>
                    <StatusChip label={statusLabelMap[svc.status]} tone={statusToneMap[svc.status]} />
                  </div>

                  <div className={styles.templateMetaGrid}>
                    <div className={styles.templateMetaCard}>
                      <div className={styles.metaLabel}>에러율</div>
                      <div className={`${styles.detailPrimaryValue} ${styles.mono}`} style={{ color: svc.status === "critical" ? "#f46a6a" : svc.status === "warning" ? "#f7c948" : "inherit" }}>
                        {svc.errorRate}
                      </div>
                      <div className={styles.propertyValue}>평소 {svc.normalErrorRate}</div>
                    </div>
                    <div className={styles.templateMetaCard}>
                      <div className={styles.metaLabel}>p99 응답시간</div>
                      <div className={`${styles.detailPrimaryValue} ${styles.mono}`} style={{ color: svc.status === "critical" ? "#f46a6a" : svc.status === "warning" ? "#f7c948" : "inherit" }}>
                        {svc.p99Latency}
                      </div>
                      <div className={styles.propertyValue}>평소 {svc.normalP99Latency}</div>
                    </div>
                    <div className={styles.templateMetaCard}>
                      <div className={styles.metaLabel}>인스턴스</div>
                      <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>
                        {svc.instances.healthy}/{svc.instances.total}
                      </div>
                      <div className={styles.propertyValue}>
                        {svc.instances.unhealthy > 0 ? `${svc.instances.unhealthy}개 비정상` : "모두 정상"}
                      </div>
                    </div>
                    <div className={styles.templateMetaCard}>
                      <div className={styles.metaLabel}>마지막 배포</div>
                      <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{svc.lastDeployedAt}</div>
                      <div className={styles.propertyValue}>{svc.version}</div>
                    </div>
                  </div>

                  {svc.activeIncident ? (
                    <div className={styles.warningCard} style={{ marginTop: 8 }}>
                      <div className={styles.metaLabel}>활성 인시던트</div>
                      <div className={`${styles.propertyValue} ${styles.mono}`}>
                        {svc.activeIncident.id}: {svc.activeIncident.title}
                      </div>
                      <div className={styles.propertyValue}>
                        Severity {svc.activeIncident.severity} &middot; {svc.activeIncident.startedAt}
                      </div>
                    </div>
                  ) : null}
                </section>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.workspaceGridSingle}>
          <div className={styles.mainColumn}>
            {selectedItem ? (
              <section className={styles.selectedHighlight}>
                <div className={styles.panelHeader}>
                  <div>
                    <div className={styles.sectionEyebrow}>Rollback service</div>
                    <h2 className={styles.panelTitle}>{selectedItem.service}</h2>
                    <p className={styles.panelDescription}>
                      운영 중인 서비스의 현재 상태와 추천 rollback target을 확인한 뒤 상세 페이지에서 배포 이력을 검토합니다.
                    </p>
                  </div>
                  <StatusChip
                    label={latestStatus?.statusLabel ?? selectedItem.latestStatus}
                    tone={latestStatus?.statusTone ?? "danger"}
                  />
                </div>
                <div className={styles.focusGrid}>
                  <div className={styles.warningCard}>
                    <div className={styles.metaLabel}>Current version</div>
                    <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{selectedItem.currentVersion}</div>
                    <div className={styles.propertyValue}>{selectedItem.incidentSummary}</div>
                  </div>
                  <div className={styles.calloutCard}>
                    <div className={styles.metaLabel}>Recommended rollback target</div>
                    <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{selectedItem.recommendedRollbackVersion}</div>
                    <div className={styles.propertyValue}>{selectedItem.blastRadius}</div>
                  </div>
                </div>
              </section>
            ) : null}

            <DataTable
              columns={viewModel.tableColumns}
              description="롤백이 필요한 서비스를 먼저 고르고, 상세 페이지에서 배포 이력 기준으로 rollback target을 선택합니다."
              onSelectRow={(rowId) => {
                onSelectRow(rowId);
                router.push(`/rollback/${rowId}`);
              }}
              rows={viewModel.tableRows}
              title={viewModel.tableTitle}
            />
          </div>
        </div>
      )}
    </>
  );
}
