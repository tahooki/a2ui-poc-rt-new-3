import styles from "@/devops-console/console-page.module.css";
import { Icon } from "@/devops-console/foundation/icon-registry";

type FilterBarProps = {
  filters: string[];
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
};

export function FilterBar({
  filters,
  primaryActionLabel,
  onPrimaryAction,
}: FilterBarProps) {
  return (
    <section className={styles.commandBar}>
      <div className={styles.commandBarFilters}>
        {filters.map((filter) => (
          <span className={styles.filterToken} key={filter}>
            <Icon name="filter" size={14} />
            {filter}
          </span>
        ))}
      </div>
      <div className={styles.commandBarActions}>
        <button className={styles.secondaryButton} type="button">
          <Icon name="search" size={14} />
          Search scope
        </button>
        {primaryActionLabel && onPrimaryAction ? (
          <button className={styles.primaryButton} onClick={onPrimaryAction} type="button">
            <Icon name="tune" size={14} />
            {primaryActionLabel}
          </button>
        ) : null}
      </div>
    </section>
  );
}
