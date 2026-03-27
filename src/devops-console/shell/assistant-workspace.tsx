import styles from "@/devops-console/console-page.module.css";
import { AssistantActivityLog } from "@/devops-console/assistant/activity-log";
import { CommandComposer } from "@/devops-console/assistant/command-composer";
import { ContextSummary } from "@/devops-console/assistant/context-summary";
import { AssistantHeader } from "@/devops-console/assistant/assistant-header";
import { TemplateSurface } from "@/devops-console/assistant/template-surface";
import type { AssistantIntent, AssistantMessage } from "@/devops-chat/types/domain";
import type { TemplateEnvelope } from "@/devops-chat/types/templates";

type AssistantWorkspaceProps = {
  title: string;
  description: string;
  context: Array<{ label: string; value: string }>;
  intents: AssistantIntent[];
  messages: AssistantMessage[];
  isSubmitting: boolean;
  error: string | null;
  composerText: string;
  composerPlaceholder: string;
  template: TemplateEnvelope | null;
  onClose: () => void;
  onComposerChange: (value: string) => void;
  onIntent: (intentId: string) => void;
  onSubmit: () => void;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
};

export function AssistantWorkspace({
  title,
  description,
  context,
  intents,
  messages,
  isSubmitting,
  error,
  composerText,
  composerPlaceholder,
  template,
  onClose,
  onComposerChange,
  onIntent,
  onSubmit,
  onPrimaryAction,
  onSecondaryAction,
}: AssistantWorkspaceProps) {
  return (
    <div className={styles.assistantWorkspace}>
      <AssistantHeader description={description} onClose={onClose} title={title} />
      <ContextSummary context={context} />
      <AssistantActivityLog messages={messages} />
      <TemplateSurface
        onPrimaryAction={onPrimaryAction}
        onSecondaryAction={onSecondaryAction}
        template={template}
      />
      <CommandComposer
        composerPlaceholder={composerPlaceholder}
        composerText={composerText}
        error={error}
        intents={intents}
        isSubmitting={isSubmitting}
        onComposerChange={onComposerChange}
        onIntent={onIntent}
        onSubmit={onSubmit}
      />
    </div>
  );
}
