import { describe, it, expect } from "vitest";
import { executeSurfaceAction, type ActionBridgeInput } from "@/devops-chat/actions/action-bridge";
import { lookupAction, getAllActionIds } from "@/devops-chat/actions/action-registry";
import { dispatchAction } from "@/devops-chat/actions/action-dispatcher";
import { refreshAfterAction } from "@/devops-chat/actions/post-action-refresh";
import { buildActionLogEntry, buildActionResultEntry } from "@/devops-chat/actions/activity-log-builder";
import {
  DEPLOY_ACTION_IDS,
  APPROVAL_ACTION_IDS,
  ROLLBACK_ACTION_IDS,
  type SurfaceActionDescriptor,
  type ActionExecutionContext,
  type ActivityEvent,
} from "@/devops-chat/actions/action-types";
import type { SurfaceEnvelope, ConversationFacts } from "@/devops-chat/types/conversation";

function makeSurface(templateId = "quick_deploy_launchpad"): SurfaceEnvelope {
  return {
    templateId,
    payload: { service: "payments-api" },
    sourceIntent: "deploy.start",
    updatedAt: new Date().toISOString(),
  };
}

function makeAction(actionId: string, overrides: Partial<SurfaceActionDescriptor> = {}): SurfaceActionDescriptor {
  return {
    actionId,
    label: "Test",
    variant: "primary",
    ...overrides,
  };
}

// --- Action Registry ---
describe("action-registry", () => {
  it("looks up deploy.start", () => {
    const def = lookupAction(DEPLOY_ACTION_IDS.START);
    expect(def).toBeDefined();
    expect(def!.domain).toBe("deploy");
  });

  it("looks up approval.approve", () => {
    const def = lookupAction(APPROVAL_ACTION_IDS.APPROVE);
    expect(def).toBeDefined();
    expect(def!.confirmationRequired).toBe(true);
  });

  it("looks up rollback.confirm", () => {
    const def = lookupAction(ROLLBACK_ACTION_IDS.CONFIRM);
    expect(def).toBeDefined();
    expect(def!.domain).toBe("rollback");
    expect(def!.confirmationRequired).toBe(true);
  });

  it("returns undefined for unknown action", () => {
    expect(lookupAction("unknown.action")).toBeUndefined();
  });

  it("lists all action ids", () => {
    const ids = getAllActionIds();
    expect(ids.length).toBeGreaterThan(5);
    expect(ids).toContain(DEPLOY_ACTION_IDS.START);
    expect(ids).toContain(APPROVAL_ACTION_IDS.APPROVE);
    expect(ids).toContain(ROLLBACK_ACTION_IDS.CONFIRM);
  });
});

// --- Action Dispatcher ---
describe("action-dispatcher", () => {
  it("dispatches deploy.start successfully", async () => {
    const ctx: ActionExecutionContext = {
      actionId: DEPLOY_ACTION_IDS.START,
      conversationId: "conv-1",
      surfaceTemplateId: "quick_deploy_launchpad",
      targetRef: { entityType: "deploy", entityId: "payments-api" },
      facts: {},
    };
    const result = await dispatchAction(ctx);
    expect(result.ok).toBe(true);
    expect(result.outcome).toBe("succeeded");
    expect(result.activityEvent).toBeDefined();
  });

  it("rejects unknown action", async () => {
    const ctx: ActionExecutionContext = {
      actionId: "unknown.action",
      conversationId: "conv-1",
      surfaceTemplateId: "quick_deploy_launchpad",
      facts: {},
    };
    const result = await dispatchAction(ctx);
    expect(result.ok).toBe(false);
    expect(result.outcome).toBe("rejected");
  });
});

// --- Action Bridge ---
describe("action-bridge", () => {
  it("executes valid action", async () => {
    const input: ActionBridgeInput = {
      conversationId: "conv-1",
      activeSurface: makeSurface(),
      actionDescriptor: makeAction(DEPLOY_ACTION_IDS.START, {
        targetRef: { entityType: "deploy", entityId: "payments-api" },
      }),
      facts: {},
    };
    const result = await executeSurfaceAction(input);
    expect(result.ok).toBe(true);
  });

  it("rejects when no active surface", async () => {
    const input: ActionBridgeInput = {
      conversationId: "conv-1",
      activeSurface: null,
      actionDescriptor: makeAction(DEPLOY_ACTION_IDS.START),
      facts: {},
    };
    const result = await executeSurfaceAction(input);
    expect(result.ok).toBe(false);
    expect(result.outcome).toBe("rejected");
  });

  it("rejects disabled action", async () => {
    const input: ActionBridgeInput = {
      conversationId: "conv-1",
      activeSurface: makeSurface(),
      actionDescriptor: makeAction(DEPLOY_ACTION_IDS.START, { disabled: true }),
      facts: {},
    };
    const result = await executeSurfaceAction(input);
    expect(result.ok).toBe(false);
    expect(result.outcome).toBe("rejected");
  });

  it("rejects unknown action id", async () => {
    const input: ActionBridgeInput = {
      conversationId: "conv-1",
      activeSurface: makeSurface(),
      actionDescriptor: makeAction("unknown.action"),
      facts: {},
    };
    const result = await executeSurfaceAction(input);
    expect(result.ok).toBe(false);
    expect(result.outcome).toBe("rejected");
  });
});

// --- Post-action Refresh ---
describe("post-action-refresh", () => {
  it("merges facts patch after successful action", () => {
    const result = refreshAfterAction(
      {
        ok: true,
        actionId: DEPLOY_ACTION_IDS.START,
        outcome: "succeeded",
        summary: "ok",
        factsPatch: { deploy: { status: "deploying" } },
        activityEvent: { kind: "action", status: "succeeded", title: "test", timestamp: new Date().toISOString() },
      },
      { pageKey: "deploy" } as ConversationFacts,
      makeSurface(),
      "deploy.start",
    );
    expect(result.updatedFacts.deploy).toEqual({ status: "deploying" });
    expect(result.activityEvent).not.toBeNull();
    expect(result.userFacingMessage).toBeNull();
  });

  it("keeps existing surface on failure", () => {
    const existing = makeSurface();
    const result = refreshAfterAction(
      {
        ok: false,
        actionId: DEPLOY_ACTION_IDS.START,
        outcome: "failed",
        summary: "error",
      },
      {},
      existing,
      "deploy.start",
    );
    expect(result.updatedSurface).toBe(existing);
  });
});

// --- Activity Log Builder ---
describe("activity-log-builder", () => {
  it("builds action log entry", () => {
    const event: ActivityEvent = {
      kind: "action",
      status: "succeeded",
      title: "배포 시작",
      timestamp: new Date().toISOString(),
    };
    const entry = buildActionLogEntry(event);
    expect(entry.type).toBe("action");
    expect(entry.actionStatus).toBe("succeeded");
    expect(entry.title).toBe("배포 시작");
  });

  it("builds entry from action result", () => {
    const entry = buildActionResultEntry({
      ok: true,
      actionId: "deploy.start",
      outcome: "succeeded",
      summary: "ok",
      activityEvent: { kind: "action", status: "succeeded", title: "test", timestamp: new Date().toISOString() },
    });
    expect(entry).not.toBeNull();
    expect(entry!.type).toBe("action");
  });

  it("returns null when no activity event", () => {
    const entry = buildActionResultEntry({
      ok: true,
      actionId: "deploy.start",
      outcome: "noop",
      summary: "no change",
    });
    expect(entry).toBeNull();
  });
});
