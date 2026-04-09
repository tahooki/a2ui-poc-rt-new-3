import { registerTemplate } from "../renderer/TemplateRegistry";
import { DeployLaunchpad } from "./DeployLaunchpad";
import { ApprovalQueueInbox } from "./ApprovalQueueInbox";
import { RollbackSummary } from "./RollbackSummary";

export function registerBuiltinTemplates() {
  registerTemplate({
    templateId: "deploy_launchpad",
    version: "1.0.0",
    component: DeployLaunchpad,
  });
  registerTemplate({
    templateId: "approval_queue_inbox",
    version: "1.0.0",
    component: ApprovalQueueInbox,
  });
  registerTemplate({
    templateId: "rollback_summary",
    version: "1.0.0",
    component: RollbackSummary,
  });
}
