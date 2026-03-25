export type PageKey = "deploy" | "approve" | "rollback";

export type SemanticTone = "info" | "success" | "warning" | "danger" | "neutral";

export type DetailItem = {
  label: string;
  value: string;
  mono?: boolean;
  tone?: SemanticTone;
};

export type DetailSection = {
  title: string;
  items: DetailItem[];
};

export type AssistantIntent = {
  id: string;
  label: string;
  prompt: string;
};

export type DeployStatus =
  | "draft_ready"
  | "approval_pending"
  | "deploying"
  | "verifying"
  | "succeeded"
  | "failed";

export type ApprovalStatus = "pending" | "approved" | "held";

export type RollbackStatus =
  | "identified"
  | "dry_run_ready"
  | "dry_run_running"
  | "dry_run_completed"
  | "confirm_ready"
  | "executed";

export type DeployItem = {
  id: string;
  service: string;
  environment: string;
  targetVersion: string;
  recommendedVersion: string;
  strategy: string;
  requestedBy: string;
  updatedAt: string;
  status: DeployStatus;
  baselineDeployment: string;
  baselineVersion: string;
  artifact: string;
  healthCheckPath: string;
  impactSummary: string;
  preflightChecks: string[];
  rolloutConfig: string[];
  healthSignals: string[];
  recentSuccess: {
    version: string;
    strategy: string;
    deployedAt: string;
    releaseId: string;
  };
  activityLog: Array<{ time: string; value: string }>;
  assistantMessages: string[];
};

export type ApprovalItem = {
  id: string;
  service: string;
  environment: string;
  requestedBy: string;
  team: string;
  requestedAt: string;
  requestWindow: string;
  riskSummary: string;
  riskTone: SemanticTone;
  verificationSummary: string;
  verificationChecks: string[];
  impactScope: string;
  changeSummary: string[];
  rollbackAvailability: string;
  notes: string[];
  status: ApprovalStatus;
  assistantMessages: string[];
};

export type RollbackItem = {
  id: string;
  service: string;
  environment: string;
  incident: string;
  severity: string;
  currentVersion: string;
  lastStableVersion: string;
  updatedAt: string;
  status: RollbackStatus;
  evidence: string[];
  blastRadius: string;
  recoveryWindow: string;
  recentDeployHistory: string[];
  dryRunChecks: string[];
  confirmChecklist: string[];
  notes: string[];
  assistantMessages: string[];
};

type BaseSeed<TItem, TPage extends PageKey> = {
  key: TPage;
  navLabel: string;
  pageTitle: string;
  pageDescription: string;
  pageScope: string;
  lastUpdated: string;
  filters: string[];
  primaryActionLabel: string;
  tableTitle: string;
  assistantTitle: string;
  assistantDescription: string;
  composerPlaceholder: string;
  intents: AssistantIntent[];
  selectedId: string | null;
  items: TItem[];
};

export type DeploySeed = BaseSeed<DeployItem, "deploy">;
export type ApprovalSeed = BaseSeed<ApprovalItem, "approve">;
export type RollbackSeed = BaseSeed<RollbackItem, "rollback">;

export type PageSeedMap = {
  deploy: DeploySeed;
  approve: ApprovalSeed;
  rollback: RollbackSeed;
};
