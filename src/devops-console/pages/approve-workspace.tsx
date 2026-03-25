import styles from "@/devops-console/console-page.module.css";
import { DataTable } from "@/devops-console/foundation/data-table";
import { DetailSidebar } from "@/devops-console/sections/detail-sidebar";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import type { ApprovalItem } from "@/devops-chat/types/domain";
import type { ConsolePageViewModel } from "@/devops-chat/view-models/build-console-view-model";

export function ApproveWorkspace({
  selectedItem,
  viewModel,
  onSelectRow,
}: {
  selectedItem: ApprovalItem | null;
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
                <div className={styles.sectionEyebrow}>Review queue</div>
                <h2 className={styles.panelTitle}>{selectedItem.id}</h2>
                <p className={styles.panelDescription}>
                  리스크와 검증 근거를 먼저 읽도록 재정렬된 승인 워크스페이스입니다.
                </p>
              </div>
              <StatusChip
                label={viewModel.tableRows.find((row) => row.id === selectedItem.id)?.statusLabel ?? selectedItem.status}
                tone={viewModel.tableRows.find((row) => row.id === selectedItem.id)?.statusTone ?? "warning"}
              />
            </div>
            <div className={styles.focusGrid}>
              <div className={styles.warningCard}>
                <div className={styles.metaLabel}>Risk focus</div>
                <div className={styles.detailPrimaryValue}>{selectedItem.riskSummary}</div>
                <div className={styles.propertyValue}>{selectedItem.impactScope}</div>
              </div>
              <div className={styles.calloutCard}>
                <div className={styles.metaLabel}>Verification</div>
                <div className={styles.detailPrimaryValue}>{selectedItem.verificationSummary}</div>
                <div className={styles.propertyValue}>{selectedItem.rollbackAvailability}</div>
              </div>
            </div>
          </section>
        ) : null}

        <DataTable
          columns={viewModel.tableColumns}
          description="승인 대기, 승인 완료, 보류 상태를 같은 큐에서 검토합니다."
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
          title="Approval review"
        />
      </div>
    </div>
  );
}
