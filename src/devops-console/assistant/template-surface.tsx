import styles from "@/devops-console/console-page.module.css";
import { EmptyState } from "@/devops-console/foundation/empty-state";
import { TemplateRenderer } from "@/devops-chat/templates/template-renderer";
import type { TemplateEnvelope } from "@/devops-chat/types/templates";
import type { SurfaceEnvelope } from "@/devops-chat/types/conversation";

type TemplateSurfaceProps = {
  /** Legacy: direct template envelope from view-model (selected item based) */
  template?: TemplateEnvelope | null;
  /** Phase 3: conversation-driven active surface */
  activeSurface?: SurfaceEnvelope | null;
  /** Phase 4: action descriptor callback */
  onAction?: (actionId: string, payload?: Record<string, unknown>) => void;
  /** @deprecated Use onAction */
  onPrimaryAction?: () => void;
  /** @deprecated Use onAction */
  onSecondaryAction?: () => void;
  onDismiss?: () => void;
};

export function TemplateSurface({
  template,
  activeSurface,
  onAction,
  onPrimaryAction,
  onSecondaryAction,
  onDismiss,
}: TemplateSurfaceProps) {
  // Prefer activeSurface (conversation-driven) over legacy template (selected item)
  const resolvedTemplate: TemplateEnvelope | null =
    activeSurface
      ? (activeSurface.payload as unknown as TemplateEnvelope)
      : template ?? null;

  return (
    <section className={styles.assistantPanel}>
      <div className={styles.assistantSectionHeader}>
        <div>
          <div className={styles.sectionEyebrow}>Typed surface</div>
          <h3 className={styles.panelTitle}>Operational template</h3>
        </div>
        {resolvedTemplate && onDismiss ? (
          <button className={styles.iconButton} onClick={onDismiss} type="button">
            ✕
          </button>
        ) : null}
      </div>
      {resolvedTemplate ? (
        <TemplateRenderer
          onAction={onAction}
          onPrimaryAction={onPrimaryAction}
          onSecondaryAction={onSecondaryAction}
          template={resolvedTemplate}
        />
      ) : (
        <EmptyState
          description="대화를 통해 필요한 정보가 준비되면 문맥에 맞는 템플릿이 여기에 렌더됩니다."
          title="준비된 작업 없음"
        />
      )}
    </section>
  );
}
