import styles from "@/devops-console/console-page.module.css";
import { StatusChip } from "@/devops-console/foundation/status-chip";
import type { TableRowViewModel } from "@/devops-chat/view-models/build-console-view-model";

type DataTableProps = {
  columns: string[];
  description?: string;
  rows: TableRowViewModel[];
  title: string;
  onSelectRow: (rowId: string) => void;
};

export function DataTable({
  columns,
  description,
  rows,
  title,
  onSelectRow,
}: DataTableProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.tableHeader}>
        <div>
          <h2 className={styles.tableTitle}>{title}</h2>
          {description ? <p className={styles.tableDescription}>{description}</p> : null}
        </div>
        <span className={styles.headerMetaBadge}>{rows.length} rows</span>
      </div>

      <div className={styles.denseTableWrap}>
        <table className={styles.denseTable}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                className={`${styles.denseTableRow} ${row.isSelected ? styles.denseTableRowSelected : ""}`}
                key={row.id}
                onClick={() => onSelectRow(row.id)}
              >
                {row.cells.map((cell, index) => (
                  <td className={cell.mono ? styles.mono : undefined} key={`${row.id}-${index}`}>
                    {index === 0 ? (
                      <div className={styles.tablePrimaryCell}>
                        <span className={styles.tablePrimaryValue}>{cell.value}</span>
                        <span className={styles.tableCellLabel}>{row.id}</span>
                      </div>
                    ) : (
                      cell.value
                    )}
                  </td>
                ))}
                <td>
                  <StatusChip label={row.statusLabel} tone={row.statusTone} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
