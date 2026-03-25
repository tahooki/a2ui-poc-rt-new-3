import styles from "@/devops-console/console-page.module.css";
import { DataTable } from "@/devops-console/foundation/data-table";
import { DetailSidebar } from "@/devops-console/sections/detail-sidebar";
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
  return (
    <div className={styles.workspaceGrid}>
      <div className={styles.mainColumn}>
        {selectedItem ? (
          <section className={styles.selectedHighlight}>
            <div className={styles.panelHeader}>
              <div>
                <div className={styles.sectionEyebrow}>Recovery context</div>
                <h2 className={styles.panelTitle}>{selectedItem.incident}</h2>
                <p className={styles.panelDescription}>
                  현재 문제 버전과 마지막 안정 버전을 명확히 대비해 보여주는 복구 워크스페이스입니다.
                </p>
              </div>
              <StatusChip
                label={viewModel.tableRows.find((row) => row.id === selectedItem.id)?.statusLabel ?? selectedItem.status}
                tone={viewModel.tableRows.find((row) => row.id === selectedItem.id)?.statusTone ?? "danger"}
              />
            </div>
            <div className={styles.focusGrid}>
              <div className={styles.warningCard}>
                <div className={styles.metaLabel}>Current version</div>
                <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{selectedItem.currentVersion}</div>
                <div className={styles.propertyValue}>{selectedItem.severity} severity incident</div>
              </div>
              <div className={styles.calloutCard}>
                <div className={styles.metaLabel}>Last stable</div>
                <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{selectedItem.lastStableVersion}</div>
                <div className={styles.propertyValue}>{selectedItem.recoveryWindow}</div>
              </div>
            </div>
          </section>
        ) : null}

        <DataTable
          columns={viewModel.tableColumns}
          description="오픈 인시던트와 롤백 후보를 안정 버전 중심으로 정렬합니다."
          onSelectRow={onSelectRow}
          rows={viewModel.tableRows}
          title={viewModel.tableTitle}
        />
      </div>

      <div className={styles.detailColumn}>
        <DetailSidebar
          description={viewModel.detailDescription}
          emptyDescription={viewModel.emptyDetailDescription}
          emptyTitle={viewModel.emptyDetailTitle}
          sections={viewModel.detailSections}
          title="Recovery analysis"
        />
      </div>
    </div>
  );
}
