import { useRouter } from "next/navigation";
import styles from "@/devops-console/console-page.module.css";
import { DataTable } from "@/devops-console/foundation/data-table";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import type { ConsolePageViewModel } from "@/devops-chat/view-models/build-console-view-model";
import type { RollbackItem } from "@/devops-chat/types/domain";

export function RollbackWorkspace({
  selectedItem,
  viewModel,
  onSelectRow,
}: {
  selectedItem: RollbackItem | null;
  viewModel: ConsolePageViewModel;
  onSelectRow: (rowId: string) => void;
}) {
  const router = useRouter();
  const latestStatus =
    selectedItem ? viewModel.tableRows.find((row) => row.id === selectedItem.id) : null;

  return (
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
  );
}
