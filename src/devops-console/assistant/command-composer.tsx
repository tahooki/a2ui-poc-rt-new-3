import styles from "@/devops-console/console-page.module.css";
import { Icon } from "@/devops-console/foundation/icon-registry";
import type { AssistantIntent } from "@/devops-chat/types/domain";

type CommandComposerProps = {
  composerPlaceholder: string;
  composerText: string;
  intents: AssistantIntent[];
  onComposerChange: (value: string) => void;
  onIntent: (intentId: string) => void;
  onSubmit: () => void;
};

export function CommandComposer({
  composerPlaceholder,
  composerText,
  intents,
  onComposerChange,
  onIntent,
  onSubmit,
}: CommandComposerProps) {
  return (
    <>
      <section className={styles.assistantPanel}>
        <div className={styles.assistantSectionHeader}>
          <div>
            <div className={styles.sectionEyebrow}>Suggested intents</div>
            <h3 className={styles.panelTitle}>Operator shortcuts</h3>
          </div>
        </div>
        <div className={styles.intentGrid}>
          {intents.map((intent) => (
            <button
              className={styles.intentChip}
              key={intent.id}
              onClick={() => onIntent(intent.id)}
              type="button"
            >
              <Icon name="assistant" size={14} />
              {intent.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.assistantPanel}>
        <div className={styles.assistantSectionHeader}>
          <div>
            <div className={styles.sectionEyebrow}>Command composer</div>
            <h3 className={styles.panelTitle}>Issue a focused request</h3>
          </div>
        </div>
        <div className={styles.composer}>
          <textarea
            className={styles.composerInput}
            onChange={(event) => onComposerChange(event.target.value)}
            placeholder={composerPlaceholder}
            value={composerText}
          />
          <div className={styles.composerHint}>{composerPlaceholder}</div>
          <button className={styles.primaryButton} onClick={onSubmit} type="button">
            <Icon name="terminal" size={14} />
            Run assistant step
          </button>
        </div>
      </section>
    </>
  );
}
