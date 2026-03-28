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

  it("returns follow-up for vague input without selection", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "도움" }));
    expect(result.decision.mode).toBe("ask_followup");
    expect(result.awaiting).not.toBeNull();
    expect(result.awaiting?.kind).toBe("free_text");
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
  });

  it("resolves rollback tool for '롤백 후보'", async () => {
    const result = await orchestrateChatTurn(
      makeInput({ input: "롤백 후보 버전 목록" }),
    );
    expect(result.toolResults?.[0].toolName).toBe("getRollbackCandidates");
  });

  it("resolves deployable services tool", async () => {
    const result = await orchestrateChatTurn(
      makeInput({ input: "배포 가능한 서비스 목록" }),
    );
    expect(result.toolResults?.[0].toolName).toBe("getDeployableServices");
  });

  it("falls back to contextual summary when no tool matches and no LLM", async () => {
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

    expect(result.message.text).toContain("REQ-001");
    expect(result.message.text).toContain("api-gateway");
    expect(onDelta).toHaveBeenCalled();
  });

  it("returns generic message when no context, no tool, no LLM", async () => {
    const result = await orchestrateChatTurn(
      makeInput({ input: "오늘 날씨 어때?" }),
    );
    // Should get contextual summary about current page since no tool match
    expect(result.message.text).toContain("배포 페이지");
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
});
