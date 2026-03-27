import { useRouter } from "next/navigation";
import styles from "@/devops-console/console-page.module.css";
import { DataTable } from "@/devops-console/foundation/data-table";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import { useDevopsConsoleStore } from "@/devops-chat/store/app-store";
import type { ApprovalItem, ApprovalType } from "@/devops-chat/types/domain";
import {
  approvalTabMeta,
  type ConsolePageViewModel,
} from "@/devops-chat/view-models/build-console-view-model";

const approvalTabs = Object.keys(approvalTabMeta) as ApprovalType[];

function renderSelectedHighlight(item: ApprovalItem) {
  if (item.type === "temporary_access") {
    return (
      <div className={styles.focusGrid}>
        <div className={styles.warningCard}>
          <div className={styles.metaLabel}>Principal / Resource</div>
          <div className={styles.detailPrimaryValue}>{item.detail.principal}</div>
          <div className={styles.propertyValue}>{item.detail.resource}</div>
        </div>
        <div className={styles.calloutCard}>
          <div className={styles.metaLabel}>Scope / Duration</div>
          <div className={styles.detailPrimaryValue}>{item.detail.scope}</div>
          <div className={styles.propertyValue}>{item.detail.duration} · expires {item.detail.expiresAt}</div>
        </div>
      </div>
    );
  }

  if (item.type === "config_change") {
    return (
      <div className={styles.focusGrid}>
        <div className={styles.warningCard}>
          <div className={styles.metaLabel}>Config diff</div>
          <div className={styles.detailPrimaryValue}>{item.detail.currentValue}</div>
          <div className={styles.propertyValue}>to {item.detail.proposedValue}</div>
        </div>
        <div className={styles.calloutCard}>
          <div className={styles.metaLabel}>Target / Rollback</div>
          <div className={styles.detailPrimaryValue}>{item.detail.targetConfig}</div>
          <div className={styles.propertyValue}>{item.detail.rollbackMethod}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.focusGrid}>
      <div className={styles.warningCard}>
        <div className={styles.metaLabel}>Operation / Target</div>
        <div className={styles.detailPrimaryValue}>{item.detail.operationType}</div>
        <div className={styles.propertyValue}>{item.detail.target}</div>
      </div>
      <div className={styles.calloutCard}>
        <div className={styles.metaLabel}>Execution / Recovery</div>
        <div className={styles.detailPrimaryValue}>{item.detail.executionWindow}</div>
        <div className={styles.propertyValue}>{item.detail.recoveryMethod}</div>
      </div>
    </div>
  );
}

export function ApproveWorkspace({
  selectedItem,
  viewModel,
  onSelectRow,
}: {
  selectedItem: ApprovalItem | null;
  viewModel: ConsolePageViewModel;
  onSelectRow: (rowId: string) => void;
}) {
  const router = useRouter();
  const activeTab = useDevopsConsoleStore((state) => state.pages.approve.activeTab);
  const setApprovalTab = useDevopsConsoleStore((state) => state.setApprovalTab);
  const meta = approvalTabMeta[activeTab];
  const selectedStatus =
    selectedItem ? viewModel.tableRows.find((row) => row.id === selectedItem.id) : null;

  return (
    <div className={styles.workspaceGridSingle}>
      <div className={styles.mainColumn}>
        <nav className={styles.workflowNav}>
          {approvalTabs.map((tab) => (
            <button
              className={`${styles.workflowNavItem} ${tab === activeTab ? styles.workflowNavItemActive : ""}`}
              key={tab}
              onClick={() => setApprovalTab(tab)}
              type="button"
            >
              {approvalTabMeta[tab].label}
            </button>
          ))}
        </nav>

        {selectedItem ? (
          <section className={styles.selectedHighlight}>
            <div className={styles.panelHeader}>
              <div>
                <div className={styles.sectionEyebrow}>{meta.label}</div>
                <h2 className={styles.panelTitle}>{selectedItem.id}</h2>
                <p className={styles.panelDescription}>{meta.role}</p>
              </div>
              <StatusChip
                label={selectedStatus?.statusLabel ?? selectedItem.status}
                tone={selectedStatus?.statusTone ?? "warning"}
              />
            </div>
            {renderSelectedHighlight(selectedItem)}
          </section>
        ) : null}

        <DataTable
          columns={viewModel.tableColumns}
          description={meta.tableDescription}
          onSelectRow={(rowId) => {
            onSelectRow(rowId);
            router.push(`/approve/${rowId}`);
          }}
          rows={viewModel.tableRows}
          title={viewModel.tableTitle}
        />
      </div>
    </div>
  );
}
