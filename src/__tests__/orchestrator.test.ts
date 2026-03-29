import { describe, it, expect, vi, beforeEach } from "vitest";
import { orchestrateChatTurn, type OrchestrateTurnInput } from "@/devops-chat/server/orchestrate-chat-turn";

function makeInput(overrides: Partial<OrchestrateTurnInput> = {}): OrchestrateTurnInput {
  return {
    requestId: "req-test",
    conversationId: "assistant:deploy",
    input: "일반적인 질문입니다",
    history: [],
    contextSnapshot: { pageKey: "deploy", selectedEntity: null },
    facts: {},
    ...overrides,
  };
}

describe("orchestrate-chat-turn", () => {
  // Ensure no OPENAI_API_KEY so we test deterministic paths
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("vague input resolves to general.qna text mode", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "도움" }));
    // Phase 2: vague input → general.qna → text mode (no actionable intent)
    expect(result.decision.mode).toBe("text");
    expect(result.intent?.intentKey).toBe("general.qna");
  });

  it("resolves deploy tool for '최근 배포 이력'", async () => {
    const onToolStart = vi.fn();
    const onToolDone = vi.fn();

    const result = await orchestrateChatTurn(
      makeInput({ input: "최근 배포 이력을 보여줘" }),
      { onToolStart, onToolDone },
    );

    expect(onToolStart).toHaveBeenCalledWith("getPreviousDeployments");
    expect(onToolDone).toHaveBeenCalled();
    expect(result.toolResults).toBeDefined();
    expect(result.toolResults![0].toolName).toBe("getPreviousDeployments");
    expect(result.decision.mode).toBe("text");
    expect(result.message.text).toBeTruthy();
  });

  it("resolves approval tool for '승인 대기 현황'", async () => {
    const result = await orchestrateChatTurn(
      makeInput({ input: "승인 대기 현황을 보여줘" }),
    );
    expect(result.toolResults?.[0].toolName).toBe("getApprovalQueueSummary");
    expect(result.intent?.intentKey).toBe("approval.review");
  });

  it("resolves rollback tool for '롤백 후보'", async () => {
    const result = await orchestrateChatTurn(
      makeInput({ input: "롤백 후보 버전 목록" }),
    );
    expect(result.toolResults?.[0].toolName).toBe("getRollbackCandidates");
    // "롤백 후보" now maps to status.check (informational query)
    expect(result.intent?.intentKey).toBe("rollback.status.check");
  });

  it("resolves deployable services tool for deploy intent", async () => {
    const result = await orchestrateChatTurn(
      makeInput({ input: "배포 가능한 서비스 목록" }),
    );
    expect(result.toolResults?.[0].toolName).toBe("getDeployableServices");
    expect(result.intent?.intentKey).toBe("deploy.start");
  });

  it("falls back to mock response when no tool matches and no LLM", async () => {
    const onDelta = vi.fn();

    const result = await orchestrateChatTurn(
      makeInput({
        input: "이 요청에 대해 알려줘",
        contextSnapshot: {
          pageKey: "deploy",
          selectedEntity: {
            id: "req-1",
            requestId: "REQ-001",
            service: "api-gateway",
            environment: "production",
            targetVersion: "v2.1.0",
            status: "draft_ready",
          },
        },
      }),
      { onDelta },
    );

    // Mock response provides meaningful text and triggers onDelta streaming
    expect(result.message.text.length).toBeGreaterThan(10);
    expect(onDelta).toHaveBeenCalled();
  });

  it("returns mock fallback when no context, no tool, no LLM", async () => {
    const result = await orchestrateChatTurn(
      makeInput({ input: "오늘 날씨 어때?" }),
    );
    // Mock fallback guides user to available actions
    expect(result.message.text).toContain("배포");
  });

  it("tool-backed response works without OPENAI_API_KEY", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await orchestrateChatTurn(
      makeInput({ input: "최근 배포 이력" }),
    );
    expect(result.message.text).toBeTruthy();
    expect(result.toolResults).toBeDefined();
    expect(result.decision.mode).toBe("text");
  });

  it("includes requestId in response", async () => {
    const result = await orchestrateChatTurn(
      makeInput({ requestId: "custom-req-id", input: "배포 가능한 서비스" }),
    );
    expect(result.requestId).toBe("custom-req-id");
  });

  it("returns factsPatch from tool execution", async () => {
    const result = await orchestrateChatTurn(
      makeInput({ input: "승인 대기 현황" }),
    );
    expect(result.factsPatch).toBeDefined();
    expect(result.factsPatch?.approval).toBeDefined();
  });

  // Phase 2 specific tests
  it("deploy.start intent triggers ask_followup for missing service name", async () => {
    const result = await orchestrateChatTurn(
      makeInput({ input: "배포하고 싶어" }),
    );
    expect(result.intent?.intentKey).toBe("deploy.start");
    expect(result.decision.mode).toBe("ask_followup");
    expect(result.awaiting).not.toBeNull();
    expect(result.awaiting?.slotKey).toBe("deploy.serviceName");
  });

  it("returns intent and decisionTrace in response", async () => {
    const result = await orchestrateChatTurn(
      makeInput({ input: "배포하고 싶어" }),
    );
    expect(result.intent).toBeDefined();
    expect(result.decisionTrace).toBeDefined();
    expect(result.decisionTrace?.mode).toBe("ask_followup");
    expect(result.decisionTrace?.missing).toContain("deploy.serviceName");
  });
});
