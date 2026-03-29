/**
 * AI resolver unit tests.
 *
 * Tests the AI intent resolver and awaiting resolver logic
 * by mocking the LLM client.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the llm-client module
vi.mock("@/devops-chat/server/ai/llm-client", () => ({
  isLlmAvailable: vi.fn(() => true),
  callLlmStructured: vi.fn(),
}));

import { isLlmAvailable, callLlmStructured } from "@/devops-chat/server/ai/llm-client";
import { resolveIntentWithAi } from "@/devops-chat/server/ai/ai-intent-resolver";
import { resolveAwaitingWithAi } from "@/devops-chat/server/ai/ai-awaiting-resolver";
import { orchestrateChatTurn, type OrchestrateTurnInput } from "@/devops-chat/server/orchestrate-chat-turn";
import type { ConversationAwaiting, ConversationFacts } from "@/devops-chat/types/conversation";

const mockCallLlm = callLlmStructured as ReturnType<typeof vi.fn>;
const mockIsAvailable = isLlmAvailable as ReturnType<typeof vi.fn>;

function makeInput(overrides: Partial<OrchestrateTurnInput> = {}): OrchestrateTurnInput {
  return {
    requestId: "req-ai-test",
    conversationId: "assistant:deploy",
    input: "test",
    history: [],
    contextSnapshot: { pageKey: "deploy", selectedEntity: null },
    facts: {},
    ...overrides,
  };
}

describe("AI Intent Resolver", () => {
  beforeEach(() => {
    mockIsAvailable.mockReturnValue(true);
    mockCallLlm.mockReset();
  });

  it("classifies deploy intent and extracts slots in one call", async () => {
    mockCallLlm.mockResolvedValueOnce({
      intentKey: "deploy.start",
      confidence: 0.95,
      slots: {
        "deploy.serviceName": "payments-api",
        "deploy.environment": "production",
        "deploy.targetVersion": "v1.3.0",
      },
      reasoning: "User wants to deploy payments-api to production with v1.3.0",
    });

    const result = await resolveIntentWithAi(
      "payments-api를 프로덕션에 v1.3.0으로 배포해줘",
      null,
      [],
    );

    expect(result).not.toBeNull();
    expect(result!.intentKey).toBe("deploy.start");
    expect(result!.slots["deploy.serviceName"]).toBe("payments-api");
    expect(result!.slots["deploy.environment"]).toBe("production");
    expect(result!.slots["deploy.targetVersion"]).toBe("v1.3.0");
  });

  it("classifies history lookup intent", async () => {
    mockCallLlm.mockResolvedValueOnce({
      intentKey: "deploy.history.lookup",
      confidence: 0.9,
      slots: {},
      reasoning: "User asks about deployment history",
    });

    const result = await resolveIntentWithAi("아까 그 서비스 언제 배포했었지?", null, []);
    expect(result!.intentKey).toBe("deploy.history.lookup");
  });

  it("returns null on LLM failure", async () => {
    mockCallLlm.mockResolvedValueOnce(null);
    const result = await resolveIntentWithAi("test", null, []);
    expect(result).toBeNull();
  });

  it("rejects invalid intent key from LLM", async () => {
    mockCallLlm.mockResolvedValueOnce({
      intentKey: "invalid.intent",
      confidence: 0.9,
      slots: {},
      reasoning: "test",
    });
    const result = await resolveIntentWithAi("test", null, []);
    expect(result).toBeNull();
  });
});

describe("AI Awaiting Resolver", () => {
  beforeEach(() => {
    mockIsAvailable.mockReturnValue(true);
    mockCallLlm.mockReset();
  });

  const awaiting: NonNullable<ConversationAwaiting> = {
    kind: "slot",
    slotKey: "deploy.serviceName",
    prompt: "어떤 서비스를 배포할까요?",
    expectedInput: "single_select",
    options: [
      { label: "payments-api", value: "payments-api" },
      { label: "orders-api", value: "orders-api" },
    ],
    retryCount: 0,
    originIntentKey: "deploy.start",
    originRequestId: "req-1",
  };

  it("fills slot from natural language", async () => {
    mockCallLlm.mockResolvedValueOnce({
      action: "fill_slot",
      value: "payments-api",
      reasoning: "User selected payments-api",
    });

    const result = await resolveAwaitingWithAi("페이먼츠 API로 해줘", awaiting);
    expect(result!.action).toBe("fill_slot");
    expect(result!.value).toBe("payments-api");
  });

  it("detects cancel", async () => {
    mockCallLlm.mockResolvedValueOnce({
      action: "cancel",
      reasoning: "User said stop",
    });

    const result = await resolveAwaitingWithAi("됐어 그만할래", awaiting);
    expect(result!.action).toBe("cancel");
  });

  it("detects interrupt with new intent", async () => {
    mockCallLlm.mockResolvedValueOnce({
      action: "interrupt",
      reasoning: "User wants to check history instead",
      newIntentHint: "deploy.history.lookup",
    });

    const result = await resolveAwaitingWithAi("그거 말고 이전 배포 내역 좀 볼래", awaiting);
    expect(result!.action).toBe("interrupt");
    expect(result!.newIntentHint).toBe("deploy.history.lookup");
  });

  it("returns null on LLM failure", async () => {
    mockCallLlm.mockResolvedValueOnce(null);
    const result = await resolveAwaitingWithAi("test", awaiting);
    expect(result).toBeNull();
  });
});

describe("Orchestrator with AI (mocked)", () => {
  beforeEach(() => {
    mockIsAvailable.mockReturnValue(true);
    mockCallLlm.mockReset();
  });

  it("uses AI to extract multiple slots from one sentence", async () => {
    // First call: AI intent resolver
    mockCallLlm.mockResolvedValueOnce({
      intentKey: "deploy.start",
      confidence: 0.95,
      slots: { "deploy.serviceName": "payments-api" },
      reasoning: "User wants to deploy payments-api",
    });

    const result = await orchestrateChatTurn(makeInput({
      input: "payments-api 배포해줘",
    }));

    expect(result.intent?.intentKey).toBe("deploy.start");
    expect(result.intent?.source).toBe("llm");
    // AI extracted serviceName → should lead to context fetch → render_surface
    expect(result.factsPatch?.slots?.["deploy.serviceName"]?.value).toBe("payments-api");
  });

  it("falls back to rule-based when AI confidence is low", async () => {
    mockCallLlm.mockResolvedValueOnce({
      intentKey: "general.qna",
      confidence: 0.3,
      slots: {},
      reasoning: "Unclear",
    });

    const result = await orchestrateChatTurn(makeInput({
      input: "배포하고 싶어",
    }));

    // AI confidence too low → falls through to rule-based
    // Rule-based catches "배포하고 싶" → deploy.start
    expect(result.intent?.intentKey).toBe("deploy.start");
    expect(result.intent?.source).toBe("rule");
  });

  it("falls back to rule-based when AI is unavailable", async () => {
    mockIsAvailable.mockReturnValue(false);

    const result = await orchestrateChatTurn(makeInput({
      input: "배포하고 싶어",
    }));

    expect(result.intent?.intentKey).toBe("deploy.start");
    expect(result.intent?.source).toBe("rule");
  });

  it("AI awaiting resolver fills slot", async () => {
    // Turn with awaiting: AI resolves the input
    mockCallLlm.mockResolvedValueOnce({
      action: "fill_slot",
      value: "payments-api",
      reasoning: "User said payments API in Korean",
    });
    // Second call may be for intent resolution — not needed if awaiting was resolved
    mockCallLlm.mockResolvedValueOnce({
      intentKey: "deploy.start",
      confidence: 0.95,
      slots: {},
      reasoning: "Continuing deploy flow",
    });

    const result = await orchestrateChatTurn(makeInput({
      input: "페이먼츠 API로 해줘",
      intent: {
        intentKey: "deploy.start",
        confidence: 0.9,
        source: "rule",
        startedAt: new Date().toISOString(),
      },
      facts: {
        pageKey: "deploy",
        deploy: { deployableServices: { services: ["payments-api", "orders-api"] } },
      },
      awaiting: {
        kind: "slot",
        slotKey: "deploy.serviceName",
        prompt: "어떤 서비스를 배포할까요?",
        expectedInput: "single_select",
        options: [
          { label: "payments-api", value: "payments-api" },
          { label: "orders-api", value: "orders-api" },
        ],
        retryCount: 0,
        originIntentKey: "deploy.start",
        originRequestId: "req-prev",
      },
    }));

    expect(result.factsPatch?.slots?.["deploy.serviceName"]?.value).toBe("payments-api");
  });
});
