/**
 * 롤백(Rollback) 대화 케이스 통합 테스트
 *
 * 체크리스트: docs/20260329_rollback-conversation-test-cases.md
 */
import { describe, it, expect, beforeEach } from "vitest";
import { orchestrateChatTurn, type OrchestrateTurnInput } from "@/devops-chat/server/orchestrate-chat-turn";
import { validateSurfaceEnvelope } from "@/devops-chat/templates/validate-surface-envelope";
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

// =====================================================================
// 1. 텍스트로만 대답 (text) — general.qna
// =====================================================================
describe("1. 텍스트 대답 (general.qna)", () => {
  it("1-1: 롤백이 뭐야? → general.qna, text", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "롤백이 뭐야?" }));
    expect(result.intent?.intentKey).toBe("general.qna");
    expect(result.decision.mode).toBe("text");
  });

  it("1-2: canary 롤백이랑 rolling 롤백 차이가 뭐야? → general.qna", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "canary 롤백이랑 rolling 롤백 차이가 뭐야?" }));
    expect(result.intent?.intentKey).toBe("general.qna");
    expect(result.decision.mode).toBe("text");
  });

  it("1-3: dry run이 뭐야? → general.qna", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "dry run이 뭐야?" }));
    expect(result.intent?.intentKey).toBe("general.qna");
    expect(result.decision.mode).toBe("text");
  });

  it("1-4: 롤백하면 데이터는 어떻게 돼? → general.qna", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "롤백하면 데이터는 어떻게 돼?" }));
    expect(result.intent?.intentKey).toBe("general.qna");
    expect(result.decision.mode).toBe("text");
  });

  it("1-5: 고마워 → general.qna", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "고마워" }));
    expect(result.intent?.intentKey).toBe("general.qna");
    expect(result.decision.mode).toBe("text");
  });
});

// =====================================================================
// 2. 데이터 조회 → 텍스트 요약 (text + tool) — rollback.status.check
// =====================================================================
describe("2. 데이터 조회 + 텍스트 요약 (rollback.status.check)", () => {
  it("2-1: 지금 롤백 가능한 서비스 몇 개야? → status.check, text, tool", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "지금 롤백 가능한 서비스 몇 개야?" }));
    expect(result.intent?.intentKey).toBe("rollback.status.check");
    expect(result.decision.mode).toBe("text");
    expect(result.toolResults?.some((t) => t.toolName === "getRollbackCandidates")).toBe(true);
    expect(result.message.text.length).toBeGreaterThan(0);
  });

  it("2-2: payments-api 롤백 상태 알려줘 → status.check", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "payments-api 롤백 상태 알려줘" }));
    expect(result.intent?.intentKey).toBe("rollback.status.check");
    expect(result.decision.mode).toBe("text");
    expect(result.toolResults?.some((t) => t.toolName === "getRollbackCandidates")).toBe(true);
  });

  it("2-3: critical 인시던트 있어? → status.check", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "critical 인시던트 있어?" }));
    expect(result.intent?.intentKey).toBe("rollback.status.check");
    expect(result.decision.mode).toBe("text");
  });

  it("2-4: 롤백 후보 요약해줘 → status.check", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "롤백 후보 요약해줘" }));
    expect(result.intent?.intentKey).toBe("rollback.status.check");
    expect(result.decision.mode).toBe("text");
  });
});

// =====================================================================
// 3. A2UI Surface 렌더링 (render_surface) — rollback.start
// =====================================================================
describe("3. A2UI Surface 렌더링 (rollback.start)", () => {
  it("3-1: 롤백하고 싶어 → 서비스 선택 → target list surface", async () => {
    // Turn 1
    const turn1 = await orchestrateChatTurn(makeInput({ input: "롤백하고 싶어" }));
    expect(turn1.intent?.intentKey).toBe("rollback.start");
    expect(turn1.decision.mode).toBe("ask_followup");
    expect(turn1.awaiting?.slotKey).toBe("rollback.serviceName");

    // Turn 2: select service
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

    expect(turn2.decision.mode).toBe("render_surface");
    expect(turn2.surface).not.toBeNull();
    expect(turn2.surface?.templateId).toBe("rollback_target_list");
  });

  it("3-2: payments-api 롤백해줘 → 바로 serviceName → target list", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "payments-api 롤백해줘" }));
    expect(result.intent?.intentKey).toBe("rollback.start");
    // Should fetch candidates and if serviceName detected, proceed
    expect(result.toolResults?.some((t) => t.toolName === "getRollbackCandidates")).toBe(true);
  });

  it("3-3: 롤백 처리하자 → rollback.start", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "롤백 처리하자" }));
    expect(result.intent?.intentKey).toBe("rollback.start");
  });
});

// =====================================================================
// 4. Surface 검증
// =====================================================================
describe("4. Surface 검증", () => {
  async function getTurn2Surface() {
    const turn1 = await orchestrateChatTurn(makeInput({ input: "롤백하고 싶어" }));
    const mergedFacts: ConversationFacts = {
      pageKey: "rollback",
      ...(turn1.factsPatch ?? {}),
      slots: { ...(turn1.factsPatch?.slots ?? {}) },
    };
    return orchestrateChatTurn(
      makeInput({
        input: "payments-api",
        facts: mergedFacts,
        intent: turn1.intent,
        workflow: turn1.workflow,
        awaiting: turn1.awaiting,
      }),
    );
  }

  it("4-1: target list에 targets + service + state 포함", async () => {
    const turn2 = await getTurn2Surface();
    expect(turn2.surface).not.toBeNull();
    const payload = turn2.surface!.payload as Record<string, unknown>;
    expect(payload.targets).toBeDefined();
    expect(Array.isArray(payload.targets)).toBe(true);
    expect(payload.service).toBe("payments-api");
    expect(payload.state).toBe("active");
  });

  it("4-2: target list validation 통과", async () => {
    const turn2 = await getTurn2Surface();
    if (turn2.surface) {
      expect(validateSurfaceEnvelope(turn2.surface).valid).toBe(true);
    }
  });

  it("4-3: eligible target에 select_target 액션", async () => {
    const turn2 = await getTurn2Surface();
    const payload = turn2.surface!.payload as Record<string, unknown>;
    const targets = payload.targets as Array<{ actions: Array<{ actionId: string }> }>;
    const withActions = targets.filter((t) => t.actions.length > 0);
    expect(withActions.length).toBeGreaterThan(0);
    expect(withActions[0].actions[0].actionId).toBe("rollback.select_target");
  });

  it("4-4: targets에 isRecommended 필드 존재", async () => {
    const turn2 = await getTurn2Surface();
    const payload = turn2.surface!.payload as Record<string, unknown>;
    const targets = payload.targets as Array<{ isRecommended: boolean }>;
    // Every target should have isRecommended field (true or false)
    for (const t of targets) {
      expect(typeof t.isRecommended).toBe("boolean");
    }
  });
});

// =====================================================================
// 5. 흐름 전환
// =====================================================================
describe("5. 흐름 전환", () => {
  it("5-1: status.check → start 전환 (텍스트 → surface)", async () => {
    const turn1 = await orchestrateChatTurn(makeInput({ input: "롤백 후보 요약해줘" }));
    expect(turn1.intent?.intentKey).toBe("rollback.status.check");
    expect(turn1.decision.mode).toBe("text");

    const turn2 = await orchestrateChatTurn(
      makeInput({
        input: "롤백하고 싶어",
        intent: turn1.intent,
        facts: { ...(turn1.factsPatch ?? {}) },
      }),
    );
    expect(turn2.intent?.intentKey).toBe("rollback.start");
  });

  it("5-2: target list 중 status.check 전환", async () => {
    const turn1 = await orchestrateChatTurn(makeInput({ input: "롤백하고 싶어" }));
    expect(turn1.intent?.intentKey).toBe("rollback.start");

    const turn2 = await orchestrateChatTurn(
      makeInput({
        input: "롤백 후보 요약해줘",
        intent: turn1.intent,
        facts: { ...(turn1.factsPatch ?? {}) },
      }),
    );
    expect(turn2.intent?.intentKey).toBe("rollback.status.check");
    expect(turn2.decision.mode).toBe("text");
  });

  it("5-3: rollback → deploy 전환", async () => {
    const turn1 = await orchestrateChatTurn(makeInput({ input: "롤백하고 싶어" }));
    expect(turn1.intent?.intentKey).toBe("rollback.start");

    const turn2 = await orchestrateChatTurn(
      makeInput({
        input: "배포하고 싶어",
        intent: turn1.intent,
        facts: { ...(turn1.factsPatch ?? {}) },
      }),
    );
    expect(turn2.intent?.intentKey).toBe("deploy.start");
  });
});
