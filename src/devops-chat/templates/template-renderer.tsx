import { ConfirmAction } from "@/devops-console/templates/confirm-action";
import { DeploymentApprovalInbox } from "@/devops-console/templates/deployment-approval-inbox";
import { DryRunStepper } from "@/devops-console/templates/dry-run-stepper";
import { QuickDeployLaunchpad } from "@/devops-console/templates/quick-deploy-launchpad";
import { RollbackSummary } from "@/devops-console/templates/rollback-summary";
import type { TemplateEnvelope } from "@/devops-chat/types/templates";

type TemplateRendererProps = {
  template: TemplateEnvelope;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
};

export function TemplateRenderer({
  template,
  onPrimaryAction,
  onSecondaryAction,
}: TemplateRendererProps) {
  switch (template.templateId) {
    case "quick_deploy_launchpad":
      return (
        <QuickDeployLaunchpad
          template={template}
          onPrimaryAction={onPrimaryAction}
          onSecondaryAction={onSecondaryAction}
        />
      );
    case "deployment_approval_inbox":
      return (
        <DeploymentApprovalInbox
          template={template}
          onPrimaryAction={onPrimaryAction}
          onSecondaryAction={onSecondaryAction}
        />
      );
    case "rollback_summary":
      return (
        <RollbackSummary
          template={template}
          onPrimaryAction={onPrimaryAction}
          onSecondaryAction={onSecondaryAction}
        />
      );
    case "dry_run_stepper":
      return (
        <DryRunStepper
          template={template}
          onPrimaryAction={onPrimaryAction}
          onSecondaryAction={onSecondaryAction}
        />
      );
    case "confirm_action":
      return (
        <ConfirmAction
          template={template}
          onPrimaryAction={onPrimaryAction}
          onSecondaryAction={onSecondaryAction}
        />
      );
  }
}
