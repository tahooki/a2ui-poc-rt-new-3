export type QuickDeployTemplateState = "ready" | "deploying" | "done";

export type DeploymentApprovalTemplateState = "pending" | "approved" | "hold";

export type RollbackSummaryTemplateState = "identified" | "dry_run_ready";

export type DryRunStepperState = "not_started" | "running" | "completed";

export type ConfirmActionState = "confirm_ready" | "executed";

export type QuickDeployTemplateData = {
  templateId: "quick_deploy_launchpad";
  state: QuickDeployTemplateState;
  service: string;
  environment: string;
  recommendedVersion: string;
  targetVersion: string;
  strategy: string;
  impactSummary: string;
  preflightChecks: string[];
  helperText: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  actions?: unknown[];
};

export type DeploymentApprovalTemplateData = {
  templateId: "deployment_approval_inbox";
  state: DeploymentApprovalTemplateState;
  requestId: string;
  requestTypeLabel: string;
  title: string;
  environment: string;
  riskSummary: string;
  verificationSummary: string;
  impactScope: string;
  decisionGuidance: string;
  checks: string[];
  keyFacts: Array<{ label: string; value: string; mono?: boolean }>;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  actions?: unknown[];
};

export type RollbackSummaryTemplateData = {
  templateId: "rollback_summary";
  state: RollbackSummaryTemplateState;
  service: string;
  environment: string;
  incident: string;
  currentVersion: string;
  recommendedVersion: string;
  evidence: string[];
  blastRadius: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  actions?: unknown[];
};

export type DryRunStepperTemplateData = {
  templateId: "dry_run_stepper";
  state: DryRunStepperState;
  service: string;
  environment: string;
  targetVersion: string;
  steps: string[];
  helperText: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  actions?: unknown[];
};

export type ConfirmActionTemplateData = {
  templateId: "confirm_action";
  state: ConfirmActionState;
  service: string;
  environment: string;
  targetVersion: string;
  warning: string;
  checklist: string[];
  primaryActionLabel: string;
  secondaryActionLabel: string;
  actions?: unknown[];
};

// ---------------------------------------------------------------------------
// Approval queue inbox (multi-item)
// ---------------------------------------------------------------------------

export type ApprovalQueueItemStatus = "pending" | "approved" | "held";

export type ApprovalQueueItem = {
  id: string;
  type: string;
  typeLabel: string;
  title: string;
  environment: string;
  requestedBy: string;
  riskSummary: string;
  riskTone: "warning" | "danger" | "success";
  status: ApprovalQueueItemStatus;
  keyFacts: Array<{ label: string; value: string }>;
  actions: Array<{
    actionId: string;
    label: string;
    variant: "primary" | "secondary" | "danger" | "ghost";
    disabled?: boolean;
    confirmationRequired?: boolean;
    confirmationMessage?: string;
    targetRef?: { entityType: string; entityId: string };
    payload?: Record<string, unknown>;
  }>;
};

export type ApprovalQueueSummary = {
  pending: number;
  approved: number;
  held: number;
  highRisk: number;
};

export type ApprovalQueueTemplateData = {
  templateId: "approval_queue_inbox";
  state: "active" | "all_done";
  items: ApprovalQueueItem[];
  summary: ApprovalQueueSummary;
  expandedItemId: string | null;
  primaryActionLabel: string;
  secondaryActionLabel: string;
};

// ---------------------------------------------------------------------------
// Rollback target list (multi-instance)
// ---------------------------------------------------------------------------

export type RollbackTargetItem = {
  id: string;
  version: string;
  deployedAt: string;
  strategy: string;
  status: string;
  rollbackRisk: string;
  rollbackEligible: boolean;
  whyThisTarget: string;
  evidence: string[];
  isRecommended: boolean;
  actions: Array<{
    actionId: string;
    label: string;
    variant: "primary" | "secondary" | "danger" | "ghost";
    disabled?: boolean;
    confirmationRequired?: boolean;
    confirmationMessage?: string;
    targetRef?: { entityType: string; entityId: string };
    payload?: Record<string, unknown>;
  }>;
};

export type RollbackTargetListTemplateData = {
  templateId: "rollback_target_list";
  state: "active" | "selected";
  service: string;
  environment: string;
  currentVersion: string;
  incidentSummary: string;
  severity: string;
  targets: RollbackTargetItem[];
  recommendedTargetId: string | null;
  primaryActionLabel: string;
  secondaryActionLabel: string;
};

export type TemplateEnvelope =
  | QuickDeployTemplateData
  | DeploymentApprovalTemplateData
  | ApprovalQueueTemplateData
  | RollbackTargetListTemplateData
  | RollbackSummaryTemplateData
  | DryRunStepperTemplateData
  | ConfirmActionTemplateData;
