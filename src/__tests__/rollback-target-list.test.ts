/**
 * Rollback target list integration tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { orchestrateChatTurn, type OrchestrateTurnInput } from "@/devops-chat/server/orchestrate-chat-turn";
import { bindRollbackTargetList } from "@/devops-chat/templates/binders/bind-rollback-target-list";
import { validateSurfaceEnvelope } from "@/devops-chat/templates/validate-surface-envelope";
import { lookupAction } from "@/devops-chat/actions/action-registry";
import { ROLLBACK_ACTION_IDS } from "@/devops-chat/actions/action-types";
import type { ConversationFacts } from "@/devops-chat/types/conversation";

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
});

function makeInput(overrides: Partial<OrchestrateTurnInput> = {}): OrchestrateTurnInput {
  return {
    requestId: "req-test",
    conversationId: "assistant:rollback",
    input: "test",
    history: [],
    contextSnapshot: { pageKey: "rollback", selectedEntity: null },
    facts: {},
    ...overrides,
  };
}

const sampleCandidates = [
  {
    id: "rb-payments",
    service: "payments-api",
    environment: "production",
    currentVersion: "v2.3.18",
    severity: "high",
    incidentSummary: "INC-842 card timeout",
    recommendedRollbackVersion: "v2.3.16",
    recommendedRollbackDeploymentId: "deploy-pay-316",
    eligibleVersions: [
      { id: "deploy-pay-316", version: "v2.3.16", status: "dry_run_ready", rollbackRisk: "low", rollbackEligible: true, whyThisTarget: "안정 릴리즈", evidence: ["카드 정상"] },
      { id: "deploy-pay-314", version: "v2.3.14", status: "identified", rollbackRisk: "medium", rollbackEligible: true, whyThisTarget: "2주 전", evidence: [] },
    ],
  },
  {
    id: "rb-checkout",
    service: "checkout",
    environment: "production",
    currentVersion: "v1.8.42",
    severity: "critical",
    incidentSummary: "INC-835 auth retries",
    recommendedRollbackVersion: "v1.8.39",
    eligibleVersions: [
      { id: "deploy-check-1839", version: "v1.8.39", status: "confirm_ready", rollbackRisk: "low", rollbackEligible: true, whyThisTarget: "추천", evidence: [] },
    ],
  },
];

// --- Binder tests ---
describe("bind-rollback-target-list", () => {
  it("binds target list for selected service", () => {
    const facts: ConversationFacts = {
      slots: {
        "rollback.serviceName": { value: "payments-api", source: "user", confidence: 1, updatedAt: "" },
        "rollback.candidates": { value: sampleCandidates, source: "tool", confidence: 1, updatedAt: "" },
      },
    };

    const result = bindRollbackTargetList(facts, "rollback.start");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.surface.templateId).toBe("rollback_target_list");
    const payload = result.surface.payload as Record<string, unknown>;
    expect(payload.service).toBe("payments-api");
    expect(payload.state).toBe("active");

    const targets = payload.targets as Array<{ id: string; isRecommended: boolean; actions: unknown[] }>;
    expect(targets).toHaveLength(2);

    const recommended = targets.find((t) => t.isRecommended);
    expect(recommended).toBeDefined();
    expect(recommended!.id).toBe("deploy-pay-316");
    expect(recommended!.actions.length).toBeGreaterThan(0);
  });

  it("filters to correct service", () => {
    const facts: ConversationFacts = {
      slots: {
        "rollback.serviceName": { value: "checkout", source: "user", confidence: 1, updatedAt: "" },
        "rollback.candidates": { value: sampleCandidates, source: "tool", confidence: 1, updatedAt: "" },
      },
    };

    const result = bindRollbackTargetList(facts, "rollback.start");
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const payload = result.surface.payload as Record<string, unknown>;
    expect(payload.service).toBe("checkout");
    expect((payload.targets as unknown[]).length).toBe(1);
  });

  it("fails when service not in candidates", () => {
    const facts: ConversationFacts = {
      slots: {
        "rollback.serviceName": { value: "unknown-service", source: "user", confidence: 1, updatedAt: "" },
        "rollback.candidates": { value: sampleCandidates, source: "tool", confidence: 1, updatedAt: "" },
      },
    };
    const result = bindRollbackTargetList(facts, "rollback.start");
    expect(result.ok).toBe(false);
  });

  it("produces valid surface envelope", () => {
    const facts: ConversationFacts = {
      slots: {
        "rollback.serviceName": { value: "payments-api", source: "user", confidence: 1, updatedAt: "" },
        "rollback.candidates": { value: sampleCandidates, source: "tool", confidence: 1, updatedAt: "" },
      },
    };
    const result = bindRollbackTargetList(facts, "rollback.start");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(validateSurfaceEnvelope(result.surface).valid).toBe(true);
    }
  });
});

// --- Action tests ---
describe("rollback select_target action", () => {
  it("SELECT_TARGET is registered", () => {
    expect(lookupAction(ROLLBACK_ACTION_IDS.SELECT_TARGET)).toBeDefined();
    expect(lookupAction(ROLLBACK_ACTION_IDS.SELECT_TARGET)!.domain).toBe("rollback");
  });
});

// --- Orchestrator integration ---
describe("rollback target list orchestrator integration", () => {
  it("롤백하고 싶어 → 서비스 선택 → target list surface", async () => {
    // Turn 1: "롤백하고 싶어"
    const turn1 = await orchestrateChatTurn(makeInput({ input: "롤백하고 싶어" }));
    expect(turn1.intent?.intentKey).toBe("rollback.start");
    expect(turn1.toolResults?.some((t) => t.toolName === "getRollbackCandidates")).toBe(true);
    expect(turn1.decision.mode).toBe("ask_followup");
    expect(turn1.awaiting?.slotKey).toBe("rollback.serviceName");

    // Turn 2: "payments-api" — merge all facts from turn1
    const mergedFacts: ConversationFacts = {
      pageKey: "rollback",
      ...(turn1.factsPatch ?? {}),
      slots: { ...(turn1.factsPatch?.slots ?? {}) },
    };

    const turn2 = await orchestrateChatTurn(
      makeInput({
        input: "payments-api",
        facts: mergedFacts,
        intent: turn1.intent,
        workflow: turn1.workflow,
        awaiting: turn1.awaiting,
      }),
    );

    expect(turn2.intent?.intentKey).toBe("rollback.start");
    // After serviceName fill + candidates in facts → render_surface (target list)
    expect(turn2.decision.mode).toBe("render_surface");
    expect(turn2.surface).not.toBeNull();
    expect(turn2.surface?.templateId).toBe("rollback_target_list");

    // Verify targets
    const payload = turn2.surface!.payload as Record<string, unknown>;
    const targets = payload.targets as unknown[];
    expect(targets.length).toBeGreaterThan(0);
  });

  it("surface has per-instance rollback actions", async () => {
    const turn1 = await orchestrateChatTurn(makeInput({ input: "롤백하고 싶어" }));
    const mergedFacts: ConversationFacts = {
      ...(turn1.factsPatch ?? {}),
      slots: { ...turn1.factsPatch?.slots },
    };

    const turn2 = await orchestrateChatTurn(
      makeInput({
        input: "payments-api",
        facts: mergedFacts,
        intent: turn1.intent,
        workflow: turn1.workflow,
        awaiting: turn1.awaiting,
      }),
    );

    if (turn2.surface) {
      const payload = turn2.surface.payload as Record<string, unknown>;
      const targets = payload.targets as Array<{ actions: Array<{ actionId: string }> }>;
      const withActions = targets.filter((t) => t.actions.length > 0);
      expect(withActions.length).toBeGreaterThan(0);
      expect(withActions[0].actions[0].actionId).toBe("rollback.select_target");
    }
  });
});
