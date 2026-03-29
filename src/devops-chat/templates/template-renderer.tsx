import { ApprovalQueueInbox } from "@/devops-console/templates/approval-queue-inbox";
import { ConfirmAction } from "@/devops-console/templates/confirm-action";
import { DeploymentApprovalInbox } from "@/devops-console/templates/deployment-approval-inbox";
import { DryRunStepper } from "@/devops-console/templates/dry-run-stepper";
import { QuickDeployLaunchpad } from "@/devops-console/templates/quick-deploy-launchpad";
import { RollbackSummary } from "@/devops-console/templates/rollback-summary";
import type { TemplateEnvelope } from "@/devops-chat/types/templates";
import type { SurfaceActionDescriptor } from "@/devops-chat/actions/action-types";

type TemplateRendererProps = {
  template: TemplateEnvelope;
  /** Phase 4: action descriptor callback */
  onAction?: (actionId: string, payload?: Record<string, unknown>) => void;
  /** @deprecated Use onAction instead */
  onPrimaryAction?: () => void;
  /** @deprecated Use onAction instead */
  onSecondaryAction?: () => void;
};

function resolveActions(template: TemplateEnvelope): SurfaceActionDescriptor[] {
  const payload = template as unknown as Record<string, unknown>;
  return (payload.actions as SurfaceActionDescriptor[]) ?? [];
}

function makeActionHandler(
  actions: SurfaceActionDescriptor[],
  variant: "primary" | "secondary" | "danger",
  onAction?: (actionId: string, payload?: Record<string, unknown>) => void,
  fallback?: () => void,
): () => void {
  const action = actions.find((a) => a.variant === variant) ?? actions.find((a) => a.variant === "primary");
  if (action && onAction) {
    return () => onAction(action.actionId, action.payload);
  }
  return fallback ?? (() => {});
}

export function TemplateRenderer({
  template,
  onAction,
  onPrimaryAction,
  onSecondaryAction,
}: TemplateRendererProps) {
  const actions = resolveActions(template);
  const primaryHandler = makeActionHandler(actions, "primary", onAction, onPrimaryAction);
  const secondaryHandler = makeActionHandler(actions, "secondary", onAction, onSecondaryAction)
    || makeActionHandler(actions, "ghost", onAction, onSecondaryAction);

  switch (template.templateId) {
    case "quick_deploy_launchpad":
      return (
        <QuickDeployLaunchpad
          template={template}
          onPrimaryAction={primaryHandler}
          onSecondaryAction={secondaryHandler}
        />
      );
    case "approval_queue_inbox":
      return (
        <ApprovalQueueInbox
          template={template}
          onAction={onAction}
        />
      );
    case "deployment_approval_inbox":
      return (
        <DeploymentApprovalInbox
          template={template}
          onPrimaryAction={primaryHandler}
          onSecondaryAction={secondaryHandler}
        />
      );
    case "rollback_summary":
      return (
        <RollbackSummary
          template={template}
          onPrimaryAction={primaryHandler}
          onSecondaryAction={secondaryHandler}
        />
      );
    case "dry_run_stepper":
      return (
        <DryRunStepper
          template={template}
          onPrimaryAction={primaryHandler}
          onSecondaryAction={secondaryHandler}
        />
      );
    case "confirm_action":
      return (
        <ConfirmAction
          template={template}
          onPrimaryAction={primaryHandler}
          onSecondaryAction={secondaryHandler}
        />
      );
  }
}
