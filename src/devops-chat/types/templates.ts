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
};

export type TemplateEnvelope =
  | QuickDeployTemplateData
  | DeploymentApprovalTemplateData
  | RollbackSummaryTemplateData
  | DryRunStepperTemplateData
  | ConfirmActionTemplateData;
