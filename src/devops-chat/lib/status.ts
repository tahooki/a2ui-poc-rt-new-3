import type {
  ApprovalStatus,
  DeployStatus,
  RollbackStatus,
  SemanticTone,
} from "@/devops-chat/types/domain";

type StatusMeta = {
  label: string;
  tone: SemanticTone;
};

export const deployStatusMeta: Record<DeployStatus, StatusMeta> = {
  draft_ready: { label: "draft ready", tone: "info" },
  approval_pending: { label: "approval pending", tone: "warning" },
  deploying: { label: "deploying", tone: "info" },
  verifying: { label: "verifying", tone: "info" },
  succeeded: { label: "succeeded", tone: "success" },
  failed: { label: "failed", tone: "danger" },
};

export const approvalStatusMeta: Record<ApprovalStatus, StatusMeta> = {
  pending: { label: "pending", tone: "warning" },
  approved: { label: "approved", tone: "success" },
  held: { label: "held", tone: "danger" },
};

export const rollbackStatusMeta: Record<RollbackStatus, StatusMeta> = {
  identified: { label: "identified", tone: "warning" },
  dry_run_ready: { label: "dry run ready", tone: "warning" },
  dry_run_running: { label: "dry run running", tone: "info" },
  dry_run_completed: { label: "dry run completed", tone: "success" },
  confirm_ready: { label: "confirm ready", tone: "danger" },
  executed: { label: "executed", tone: "success" },
};

export function semanticToneToLabelColor(tone: SemanticTone) {
  switch (tone) {
    case "info":
      return "blue";
    case "success":
      return "green";
    case "warning":
      return "orange";
    case "danger":
      return "red";
    default:
      return "grey";
  }
}
