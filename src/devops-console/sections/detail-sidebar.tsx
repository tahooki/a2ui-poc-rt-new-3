import styles from "@/devops-console/console-page.module.css";
import { EmptyState } from "@/devops-console/foundation/empty-state";
import { PropertyList } from "@/devops-console/foundation/property-list";
import type { DetailSection } from "@/devops-chat/types/domain";

type DetailSidebarProps = {
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  sections: DetailSection[];
  title: string;
};

export function DetailSidebar({
  description,
  emptyDescription,
  emptyTitle,
  sections,
  title,
}: DetailSidebarProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>{title}</h2>
          <p className={styles.panelDescription}>{description}</p>
        </div>
      </div>

      {sections.length ? (
        <div className={styles.sectionList}>
          {sections.map((section) => (
            <div className={styles.sectionCard} key={section.title}>
              <h3 className={styles.sectionCardTitle}>{section.title}</h3>
              <PropertyList items={section.items} />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState description={emptyDescription} title={emptyTitle} />
      )}
    </section>
  );
}
