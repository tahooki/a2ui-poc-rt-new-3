/**
 * Approval queue inbox integration tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { orchestrateChatTurn, type OrchestrateTurnInput } from "@/devops-chat/server/orchestrate-chat-turn";
import { bindApprovalQueue } from "@/devops-chat/templates/binders/bind-approval-queue";
import { validateSurfaceEnvelope } from "@/devops-chat/templates/validate-surface-envelope";
import { lookupAction } from "@/devops-chat/actions/action-registry";
import { APPROVAL_ACTION_IDS } from "@/devops-chat/actions/action-types";
import type { ConversationFacts } from "@/devops-chat/types/conversation";

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
});

function makeInput(overrides: Partial<OrchestrateTurnInput> = {}): OrchestrateTurnInput {
  return {
    requestId: "req-test",
    conversationId: "assistant:approve",
    input: "test",
    history: [],
    contextSnapshot: { pageKey: "approve", selectedEntity: null },
    facts: {},
    ...overrides,
  };
}

const sampleQueueItems = [
  { id: "apr-101", type: "temporary_access", title: "admin access", environment: "production", requestedBy: "alice", riskSummary: "Medium", riskTone: "warning", status: "pending" },
  { id: "apr-201", type: "config_change", title: "rate limit change", environment: "production", requestedBy: "bob", riskSummary: "High risk", riskTone: "danger", status: "pending" },
  { id: "apr-301", type: "data_operation", title: "delete sessions", environment: "staging", requestedBy: "carol", riskSummary: "Low", riskTone: "success", status: "approved" },
];

// --- Binder tests ---
describe("bind-approval-queue", () => {
  it("binds queue items into approval_queue_inbox payload", () => {
    const facts: ConversationFacts = {
      slots: {
        "approval.queueItems": { value: sampleQueueItems, source: "tool", confidence: 1, updatedAt: "" },
      },
    };

    const result = bindApprovalQueue(facts, "approval.review");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.surface.templateId).toBe("approval_queue_inbox");
    const payload = result.surface.payload as Record<string, unknown>;
    expect(payload.state).toBe("active");

    const items = payload.items as Array<{ id: string; status: string; actions: unknown[] }>;
    expect(items).toHaveLength(3);

    // pending items should have actions
    const pendingItem = items.find((i) => i.id === "apr-101");
    expect(pendingItem!.actions.length).toBe(2);

    // approved items should have no actions
    const approvedItem = items.find((i) => i.id === "apr-301");
    expect(approvedItem!.actions.length).toBe(0);

    const summary = payload.summary as { pending: number; approved: number; held: number; highRisk: number };
    expect(summary.pending).toBe(2);
    expect(summary.approved).toBe(1);
    expect(summary.highRisk).toBe(1);
  });

  it("fails when queueItems missing", () => {
    const result = bindApprovalQueue({}, "approval.review");
    expect(result.ok).toBe(false);
  });

  it("produces valid surface envelope", () => {
    const facts: ConversationFacts = {
      slots: {
        "approval.queueItems": { value: sampleQueueItems, source: "tool", confidence: 1, updatedAt: "" },
      },
    };
    const result = bindApprovalQueue(facts, "approval.review");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const validation = validateSurfaceEnvelope(result.surface);
    expect(validation.valid).toBe(true);
  });

  it("shows all_done when no pending items", () => {
    const allDone = sampleQueueItems.map((i) => ({ ...i, status: "approved" }));
    const facts: ConversationFacts = {
      slots: { "approval.queueItems": { value: allDone, source: "tool", confidence: 1, updatedAt: "" } },
    };
    const result = bindApprovalQueue(facts, "approval.review");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.surface.payload as Record<string, unknown>).state).toBe("all_done");
  });
});

// --- Action tests ---
describe("approval queue actions", () => {
  it("APPROVE_ITEM action is registered", () => {
    expect(lookupAction(APPROVAL_ACTION_IDS.APPROVE_ITEM)).toBeDefined();
    expect(lookupAction(APPROVAL_ACTION_IDS.APPROVE_ITEM)!.domain).toBe("approval");
  });

  it("HOLD_ITEM action is registered", () => {
    expect(lookupAction(APPROVAL_ACTION_IDS.HOLD_ITEM)).toBeDefined();
  });

  it("APPROVE_ALL action is registered", () => {
    expect(lookupAction(APPROVAL_ACTION_IDS.APPROVE_ALL)).toBeDefined();
    expect(lookupAction(APPROVAL_ACTION_IDS.APPROVE_ALL)!.confirmationRequired).toBe(true);
  });
});

// --- Orchestrator integration ---
describe("approval queue orchestrator integration", () => {
  it("승인 요청 확인 → tool 조회 → render_surface (큐)", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "승인 요청 확인해줘" }));

    expect(result.intent?.intentKey).toBe("approval.review");
    expect(result.toolResults?.some((t) => t.toolName === "getApprovalQueueSummary")).toBe(true);

    // After tool fetches queue, decision should be render_surface
    expect(result.decision.mode).toBe("render_surface");
    expect(result.surface).not.toBeNull();
    expect(result.surface?.templateId).toBe("approval_queue_inbox");
  });

  it("승인 현황 보여줘 → 큐 surface with items", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "승인 현황 보여줘" }));

    expect(result.intent?.intentKey).toBe("approval.review");
    expect(result.surface).not.toBeNull();

    if (result.surface) {
      const payload = result.surface.payload as Record<string, unknown>;
      const items = payload.items as unknown[];
      expect(items.length).toBeGreaterThan(0);

      const summary = payload.summary as { pending: number };
      expect(summary.pending).toBeGreaterThanOrEqual(0);
    }
  });

  it("surface has valid envelope", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "승인 대기 확인" }));

    if (result.surface) {
      const validation = validateSurfaceEnvelope(result.surface);
      expect(validation.valid).toBe(true);
    }
  });
});
