import styles from "@/devops-console/console-page.module.css";
import { EmptyState } from "@/devops-console/foundation/empty-state";
import { TemplateRenderer } from "@/devops-chat/templates/template-renderer";
import type { TemplateEnvelope } from "@/devops-chat/types/templates";

type TemplateSurfaceProps = {
  template: TemplateEnvelope | null;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
};

export function TemplateSurface({
  template,
  onPrimaryAction,
  onSecondaryAction,
}: TemplateSurfaceProps) {
  return (
    <section className={styles.assistantPanel}>
      <div className={styles.assistantSectionHeader}>
        <div>
          <div className={styles.sectionEyebrow}>Typed surface</div>
          <h3 className={styles.panelTitle}>Operational template</h3>
        </div>
      </div>
      {template ? (
        <TemplateRenderer
          onPrimaryAction={onPrimaryAction}
          onSecondaryAction={onSecondaryAction}
          template={template}
        />
      ) : (
        <EmptyState
          description="테이블에서 항목을 선택하면 현재 문맥에 맞는 템플릿이 여기에 렌더됩니다."
          title="선택된 작업 없음"
        />
      )}
    </section>
  );
}
