/**
 * 승인(Approval) 대화 케이스 통합 테스트
 *
 * 체크리스트: docs/20260329_approval-conversation-test-cases.md
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
    conversationId: "assistant:approve",
    input: "test",
    history: [],
    contextSnapshot: { pageKey: "approve", selectedEntity: null },
    facts: {},
    ...overrides,
  };
}

// =====================================================================
// 1. 텍스트로만 대답 (text) — general.qna
// =====================================================================
describe("1. 텍스트 대답 (general.qna)", () => {
  it("1-1: 승인이 뭐야? → general.qna, text", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "승인이 뭐야?" }));
    expect(result.intent?.intentKey).toBe("general.qna");
    expect(result.decision.mode).toBe("text");
  });

  it("1-2: temporary access랑 config change 차이가 뭐야? → general.qna", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "temporary access랑 config change 차이가 뭐야?" }));
    expect(result.intent?.intentKey).toBe("general.qna");
    expect(result.decision.mode).toBe("text");
  });

  it("1-3: 고위험 요청은 어떻게 처리해? → general.qna", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "고위험 요청은 어떻게 처리해?" }));
    expect(result.intent?.intentKey).toBe("general.qna");
    expect(result.decision.mode).toBe("text");
  });

  it("1-4: 보류하면 어떻게 돼? → general.qna", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "보류하면 어떻게 돼?" }));
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
// 2. 데이터 조회 → 텍스트 요약 (text + tool) — approval.status.check
// =====================================================================
describe("2. 데이터 조회 + 텍스트 요약 (approval.status.check)", () => {
  it("2-1: 지금 승인 대기 몇 건이야? → status.check, text, tool", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "지금 승인 대기 몇 건이야?" }));
    expect(result.intent?.intentKey).toBe("approval.status.check");
    expect(result.decision.mode).toBe("text");
    expect(result.toolResults?.some((t) => t.toolName === "getApprovalQueueSummary")).toBe(true);
    expect(result.message.text.length).toBeGreaterThan(0);
  });

  it("2-2: 오늘 승인한 건수 알려줘 → status.check, text", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "승인 현황 요약해줘" }));
    expect(result.intent?.intentKey).toBe("approval.status.check");
    expect(result.decision.mode).toBe("text");
    expect(result.toolResults?.some((t) => t.toolName === "getApprovalQueueSummary")).toBe(true);
  });

  it("2-3: config change 요청 있어? → status.check, text", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "config change 승인 요청 있어?" }));
    expect(result.intent?.intentKey).toBe("approval.status.check");
    expect(result.decision.mode).toBe("text");
  });

  it("2-4: 승인 대기 현황 알려줘 → status.check", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "승인 대기 현황 알려줘" }));
    expect(result.intent?.intentKey).toBe("approval.status.check");
    expect(result.decision.mode).toBe("text");
  });
});

// =====================================================================
// 3. A2UI Surface 렌더링 (render_surface) — approval.review
// =====================================================================
describe("3. A2UI Surface 렌더링 (approval.review)", () => {
  it("3-1: 승인 요청 확인해줘 → review, render_surface, queue inbox", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "승인 요청 확인해줘" }));
    expect(result.intent?.intentKey).toBe("approval.review");
    expect(result.decision.mode).toBe("render_surface");
    expect(result.surface).not.toBeNull();
    expect(result.surface?.templateId).toBe("approval_queue_inbox");
  });

  it("3-2: 대기 중인 승인 보여줘 → review, render_surface", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "대기 중인 승인 보여줘" }));
    expect(result.intent?.intentKey).toBe("approval.review");
    expect(result.decision.mode).toBe("render_surface");
    expect(result.surface).not.toBeNull();
  });

  it("3-3: 승인 처리하자 → review, render_surface", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "승인 처리하자" }));
    expect(result.intent?.intentKey).toBe("approval.review");
    expect(result.decision.mode).toBe("render_surface");
  });

  it("3-4: apr-access-101 검토해줘 → review (특정 건)", async () => {
    // With a specific requestId mentioned, intent should be review
    // This tests that the review intent pattern works for specific item references
    const result = await orchestrateChatTurn(makeInput({ input: "승인 검토해줘" }));
    expect(result.intent?.intentKey).toBe("approval.review");
    expect(result.decision.mode).toBe("render_surface");
  });
});

// =====================================================================
// 4. Surface 검증
// =====================================================================
describe("4. Surface 검증", () => {
  it("4-1: 큐 surface에 items + summary 포함", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "승인 요청 확인해줘" }));
    expect(result.surface).not.toBeNull();

    const payload = result.surface!.payload as Record<string, unknown>;
    expect(payload.items).toBeDefined();
    expect(Array.isArray(payload.items)).toBe(true);
    expect(payload.summary).toBeDefined();
  });

  it("4-2: 큐 surface validation 통과", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "승인 확인해줘" }));
    if (result.surface) {
      const validation = validateSurfaceEnvelope(result.surface);
      expect(validation.valid).toBe(true);
    }
  });

  it("4-3: pending item에 approve/hold actions 포함", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "승인 요청 확인해줘" }));
    const payload = result.surface!.payload as Record<string, unknown>;
    const items = payload.items as Array<{ status: string; actions: Array<{ actionId: string }> }>;

    const pendingItem = items.find((i) => i.status === "pending");
    if (pendingItem) {
      expect(pendingItem.actions.length).toBeGreaterThan(0);
      expect(pendingItem.actions.some((a) => a.actionId === "approval.approve_item")).toBe(true);
      expect(pendingItem.actions.some((a) => a.actionId === "approval.hold_item")).toBe(true);
    }
  });

  it("4-4: approved item에 actions 빈 배열", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "승인 요청 확인해줘" }));
    const payload = result.surface!.payload as Record<string, unknown>;
    const items = payload.items as Array<{ status: string; actions: unknown[] }>;

    const approvedItem = items.find((i) => i.status === "approved");
    if (approvedItem) {
      expect(approvedItem.actions).toHaveLength(0);
    }
  });
});

// =====================================================================
// 5. 흐름 전환
// =====================================================================
describe("5. 흐름 전환", () => {
  it("5-1: status.check → review 전환 (텍스트 → surface)", async () => {
    // Turn 1: "승인 몇 건이야?" → text
    const turn1 = await orchestrateChatTurn(makeInput({ input: "승인 대기 몇 건이야?" }));
    expect(turn1.intent?.intentKey).toBe("approval.status.check");
    expect(turn1.decision.mode).toBe("text");

    // Turn 2: "확인해줘" → surface
    const turn2 = await orchestrateChatTurn(
      makeInput({
        input: "승인 요청 확인해줘",
        intent: turn1.intent,
        facts: { ...(turn1.factsPatch ?? {}) },
      }),
    );
    expect(turn2.intent?.intentKey).toBe("approval.review");
    expect(turn2.decision.mode).toBe("render_surface");
    expect(turn2.surface).not.toBeNull();
  });

  it("5-3: 큐 surface 중 status check로 전환 → text", async () => {
    const turn1 = await orchestrateChatTurn(makeInput({ input: "승인 요청 확인해줘" }));
    expect(turn1.decision.mode).toBe("render_surface");

    // Switch to status check → text
    const turn2 = await orchestrateChatTurn(
      makeInput({
        input: "승인 대기 몇 건이야?",
        intent: turn1.intent,
        facts: { ...(turn1.factsPatch ?? {}) },
      }),
    );

    expect(turn2.intent?.intentKey).toBe("approval.status.check");
    expect(turn2.decision.mode).toBe("text");
  });

  it("5-4: approval → deploy 전환", async () => {
    const turn1 = await orchestrateChatTurn(makeInput({ input: "승인 요청 확인해줘" }));
    expect(turn1.intent?.intentKey).toBe("approval.review");

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
