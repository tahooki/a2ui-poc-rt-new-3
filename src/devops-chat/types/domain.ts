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

export type AssistantMessageRole = "user" | "assistant";

export type AssistantMessageStatus = "complete" | "streaming" | "error";

export type AssistantMessage = {
  id: string;
  role: AssistantMessageRole;
  content: string;
  status: AssistantMessageStatus;
};

export type DeployStatus =
  | "draft_ready"
  | "approval_pending"
  | "deploying"
  | "verifying"
  | "succeeded"
  | "failed";

export type ApprovalType = "temporary_access" | "config_change" | "data_operation";

export type ApprovalStatus = "pending" | "approved" | "held";

export type RollbackStatus =
  | "identified"
  | "dry_run_ready"
  | "dry_run_running"
  | "dry_run_completed"
  | "confirm_ready"
  | "executed";

export type DeployImage = {
  id: string;
  repository: string;
  imageTag: string;
  imageUri: string;
  gitRef: string;
  commitSha: string;
  imageDigest: string;
  buildStatus: string;
  pushedAt: string;
  updatedAt: string;
  services: string[];
  notes: string[];
};

export type DeployItem = {
  id: string;
  requestId: string;
  selectedImageId: string;
  service: string;
  environment: string;
  targetVersion: string;
  recommendedVersion: string;
  strategy: string;
  requestedBy: string;
  requestedAt: string;
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
  cpu: string;
  memory: string;
  containerPort: string;
  desiredCount: string;
  minimumHealthyPercent: string;
  maximumPercent: string;
  healthCheckGracePeriod: string;
  rollbackBaseline: string;
  executionProfile: string;
  operatorNote: string;
  taskDefinitionRevision: string;
  currentStage: string;
  rolloutProgress: string;
  healthStatus: string;
  verificationStatus: string;
  runningCount: string;
  events: string[];
  recentSuccess: {
    version: string;
    strategy: string;
    deployedAt: string;
    releaseId: string;
  };
  activityLog: Array<{ time: string; value: string }>;
  assistantMessages: string[];
};

type BaseApprovalItem = {
  id: string;
  type: ApprovalType;
  title: string;
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
  rollbackAvailability: string;
  notes: string[];
  status: ApprovalStatus;
  assistantMessages: string[];
};

export type TemporaryAccessApprovalItem = BaseApprovalItem & {
  type: "temporary_access";
  detail: {
    principal: string;
    resource: string;
    scope: string;
    duration: string;
    justification: string;
    safeguards: string[];
    expiresAt: string;
  };
};

export type ConfigChangeApprovalItem = BaseApprovalItem & {
  type: "config_change";
  detail: {
    service: string;
    changeType: string;
    currentValue: string;
    proposedValue: string;
    rollbackMethod: string;
    targetConfig: string;
    verificationEvidence: string[];
  };
};

export type DataOperationApprovalItem = BaseApprovalItem & {
  type: "data_operation";
  detail: {
    operationType: string;
    target: string;
    executionWindow: string;
    recoveryMethod: string;
    blastRadius: string;
    recordCount: string;
    executionChecks: string[];
  };
};

export type ApprovalItem =
  | TemporaryAccessApprovalItem
  | ConfigChangeApprovalItem
  | DataOperationApprovalItem;

export type RollbackDeployment = {
  id: string;
  version: string;
  deployedAt: string;
  strategy: string;
  healthSummary: string;
  verification: string;
  rollbackEligible: boolean;
  releaseSummary: string;
  rollbackRisk: string;
  status: RollbackStatus;
  whyThisTarget: string;
  evidence: string[];
  dryRunChecks: string[];
  confirmChecklist: string[];
  recoveryWindow: string;
  notes: string[];
};

export type RollbackItem = {
  id: string;
  service: string;
  environment: string;
  currentVersion: string;
  latestDeploymentId: string;
  latestStatus: string;
  incidentSummary: string;
  severity: string;
  recommendedRollbackDeploymentId: string;
  recommendedRollbackVersion: string;
  blastRadius: string;
  lastUpdated: string;
  deploymentHistory: RollbackDeployment[];
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

export type DeploySeed = BaseSeed<DeployItem, "deploy"> & {
  images: DeployImage[];
};

export type ApprovalSeed = BaseSeed<ApprovalItem, "approve">;
export type RollbackSeed = BaseSeed<RollbackItem, "rollback">;

export type PageSeedMap = {
  deploy: DeploySeed;
  approve: ApprovalSeed;
  rollback: RollbackSeed;
};
