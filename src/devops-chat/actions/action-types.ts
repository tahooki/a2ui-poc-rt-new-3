/**
 * Phase 4: Action runtime types.
 *
 * These types define the contract between surface buttons,
 * the action bridge, domain command adapters, and post-action refresh.
 */

// ---------------------------------------------------------------------------
// Surface action descriptor — embedded in template payload
// ---------------------------------------------------------------------------

export type SurfaceActionVariant = "primary" | "secondary" | "danger" | "ghost";

export type SurfaceActionDescriptor = {
  actionId: string;
  label: string;
  variant: SurfaceActionVariant;
  disabled?: boolean;
  pending?: boolean;
  confirmationRequired?: boolean;
  confirmationMessage?: string;
  targetRef?: {
    entityType: string;
    entityId: string;
    entityVersion?: string;
  };
  payload?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Action execution result — returned by domain command adapters
// ---------------------------------------------------------------------------

export type ActionOutcome = "succeeded" | "failed" | "noop" | "rejected";

export type ActivityEvent = {
  kind: "action";
  status: "started" | "succeeded" | "failed";
  title: string;
  detail?: string;
  timestamp: string;
};

export type ActionExecutionResult = {
  ok: boolean;
  actionId: string;
  outcome: ActionOutcome;
  summary: string;
  factsPatch?: Record<string, unknown>;
  userFacingMessage?: string;
  activityEvent?: ActivityEvent;
};

// ---------------------------------------------------------------------------
// Action registry definition
// ---------------------------------------------------------------------------

export type ActionHandlerFn = (
  context: ActionExecutionContext,
) => ActionExecutionResult | Promise<ActionExecutionResult>;

export type ActionDefinition = {
  actionId: string;
  domain: "deploy" | "approval" | "rollback";
  confirmationRequired: boolean;
  handler: ActionHandlerFn;
};

export type ActionExecutionContext = {
  actionId: string;
  conversationId: string;
  surfaceTemplateId: string;
  targetRef?: SurfaceActionDescriptor["targetRef"];
  payload?: Record<string, unknown>;
  /** Current conversation facts snapshot */
  facts: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Action id constants
// ---------------------------------------------------------------------------

export const DEPLOY_ACTION_IDS = {
  START: "deploy.start",
  COMPLETE: "deploy.complete",
  REFRESH_DRAFT: "deploy.refresh_draft",
} as const;

export const APPROVAL_ACTION_IDS = {
  APPROVE: "approval.approve",
  HOLD: "approval.hold",
} as const;

export const ROLLBACK_ACTION_IDS = {
  START_DRY_RUN: "rollback.start_dry_run",
  COMPLETE_DRY_RUN: "rollback.complete_dry_run",
  OPEN_CONFIRM: "rollback.open_confirm",
  CONFIRM: "rollback.confirm",
  BACK_TO_SUMMARY: "rollback.back_to_summary",
} as const;
