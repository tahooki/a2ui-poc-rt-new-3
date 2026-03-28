import type { PageKey } from "./domain";

export type ConversationId = string;

export type ConversationMessageRole = "user" | "assistant" | "tool";

export type ConversationMessageStatus = "complete" | "streaming" | "error";

export type ConversationMessage = {
  id: string;
  role: ConversationMessageRole;
  text: string;
  status: ConversationMessageStatus;
};

// ---------------------------------------------------------------------------
// Fact entry: value + provenance
// ---------------------------------------------------------------------------

export type FactSource = "user" | "tool" | "selection" | "system";

export type FactEntry<T = unknown> = {
  value: T;
  source: FactSource;
  confidence: number;
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Conversation facts (extended for Phase 2)
// ---------------------------------------------------------------------------

export type ConversationFacts = {
  pageKey?: PageKey;
  selectedEntity?: Record<string, unknown> | null;
  deploy?: Record<string, unknown>;
  approval?: Record<string, unknown>;
  rollback?: Record<string, unknown>;
  slots?: Record<string, FactEntry>;
};

// ---------------------------------------------------------------------------
// Intent state
// ---------------------------------------------------------------------------

export type IntentKey =
  | "deploy.start"
  | "deploy.history.lookup"
  | "approval.review"
  | "rollback.start"
  | "general.qna";

export type ConversationIntentState = {
  intentKey: IntentKey;
  confidence: number;
  source: "rule" | "llm" | "carry";
  startedAt: string;
};

// ---------------------------------------------------------------------------
// Workflow state
// ---------------------------------------------------------------------------

export type WorkflowStepStatus = "collecting" | "ready" | "waiting" | "done";

export type ConversationWorkflowState = {
  flowKey: string;
  stepKey: string;
  status: WorkflowStepStatus;
};

// ---------------------------------------------------------------------------
// Awaiting contract (slot-driven)
// ---------------------------------------------------------------------------

export type AwaitingExpectedInput = "free_text" | "single_select" | "confirmation";

export type AwaitingOption = {
  label: string;
  value: string;
  aliases?: string[];
};

export type ConversationAwaiting = null | {
  kind: "slot";
  slotKey: string;
  prompt: string;
  expectedInput: AwaitingExpectedInput;
  options?: AwaitingOption[];
  allowFreeform?: boolean;
  retryCount: number;
  originIntentKey: string;
  originRequestId: string;
};

// ---------------------------------------------------------------------------
// Pending tool
// ---------------------------------------------------------------------------

export type PendingToolState = null | {
  toolName: string;
  status: "running" | "done" | "error";
  summary?: string;
};

// ---------------------------------------------------------------------------
// Decision + trace
// ---------------------------------------------------------------------------

export type DecisionMode = "text" | "ask_followup" | "render_surface";

export type ConversationDecision = {
  mode: DecisionMode;
  reason?: string;
};

export type DecisionTrace = {
  mode: DecisionMode;
  score?: number;
  matched: string[];
  missing: string[];
  disqualified: string[];
  reason: string;
};

// ---------------------------------------------------------------------------
// Surface intent candidate
// ---------------------------------------------------------------------------

export type SurfaceIntentCandidate = {
  family: string;
  intentKey: string;
  readiness: "candidate" | "ready";
};

// ---------------------------------------------------------------------------
// Conversation state (full)
// ---------------------------------------------------------------------------

export type ConversationState = {
  id: ConversationId;
  messages: ConversationMessage[];
  intent: ConversationIntentState | null;
  workflow: ConversationWorkflowState | null;
  facts: ConversationFacts;
  awaiting: ConversationAwaiting;
  pendingTool: PendingToolState;
  decision: ConversationDecision | null;
  lastDecisionTrace: DecisionTrace | null;
  surfaceIntent: SurfaceIntentCandidate | null;
  activeSurface: null | {
    templateId: string;
    payload: Record<string, unknown>;
  };
  activeRequestId: string | null;
  composerText: string;
  error: string | null;
};
