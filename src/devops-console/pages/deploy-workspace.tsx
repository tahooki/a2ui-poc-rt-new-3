import styles from "@/devops-console/console-page.module.css";
import { DataTable } from "@/devops-console/foundation/data-table";
import { ActivityTimeline } from "@/devops-console/sections/activity-timeline";
import { DetailSidebar } from "@/devops-console/sections/detail-sidebar";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import type { DeployItem } from "@/devops-chat/types/domain";
import type { ConsolePageViewModel } from "@/devops-chat/view-models/build-console-view-model";

export function DeployWorkspace({
  selectedItem,
  viewModel,
  onSelectRow,
}: {
  selectedItem: DeployItem | null;
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
                <div className={styles.sectionEyebrow}>Release focus</div>
                <h2 className={styles.panelTitle}>{selectedItem.service}</h2>
                <p className={styles.panelDescription}>{selectedItem.impactSummary}</p>
              </div>
              <StatusChip
                label={viewModel.tableRows.find((row) => row.id === selectedItem.id)?.statusLabel ?? selectedItem.status}
                tone={viewModel.tableRows.find((row) => row.id === selectedItem.id)?.statusTone ?? "info"}
              />
            </div>

            <div className={`${styles.selectedHighlightGrid} ${styles.selectedHighlightWide}`}>
              <div className={styles.templateMetaCard}>
                <div className={styles.metaLabel}>Service scope</div>
                <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{selectedItem.service}</div>
                <div className={styles.propertyValue}>{selectedItem.environment}</div>
              </div>
              <div className={styles.templateMetaCard}>
                <div className={styles.metaLabel}>Recommended target</div>
                <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{selectedItem.recommendedVersion}</div>
                <div className={styles.propertyValue}>Strategy {selectedItem.strategy}</div>
              </div>
              <div className={styles.templateMetaCard}>
                <div className={styles.metaLabel}>Baseline</div>
                <div className={`${styles.detailPrimaryValue} ${styles.mono}`}>{selectedItem.baselineVersion}</div>
                <div className={styles.propertyValue}>{selectedItem.baselineDeployment}</div>
              </div>
            </div>
          </section>
        ) : null}

        <DataTable
          columns={viewModel.tableColumns}
          description="배포 준비와 실행 중인 릴리스를 한 화면에서 비교합니다."
          onSelectRow={onSelectRow}
          rows={viewModel.tableRows}
          title={viewModel.tableTitle}
        />

        {selectedItem ? (
          <ActivityTimeline
            description="최근 자동 초안 생성, 검증, 상태 반영 이력을 압축해서 보여줍니다."
            entries={selectedItem.activityLog}
            title="Release activity"
          />
        ) : null}
      </div>

      <div className={styles.detailColumn}>
        <DetailSidebar
          description={viewModel.detailDescription}
          emptyDescription={viewModel.emptyDetailDescription}
          emptyTitle={viewModel.emptyDetailTitle}
          sections={viewModel.detailSections}
          title="Release detail"
        />
      </div>
    </div>
  );
}
