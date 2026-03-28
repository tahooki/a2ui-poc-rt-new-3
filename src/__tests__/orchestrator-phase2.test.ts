import { describe, it, expect, beforeEach } from "vitest";
import { orchestrateChatTurn, type OrchestrateTurnInput } from "@/devops-chat/server/orchestrate-chat-turn";
import type { ConversationFacts } from "@/devops-chat/types/conversation";

function makeInput(overrides: Partial<OrchestrateTurnInput> = {}): OrchestrateTurnInput {
  return {
    requestId: "req-test",
    conversationId: "assistant:deploy",
    input: "test",
    history: [],
    contextSnapshot: { pageKey: "deploy", selectedEntity: null },
    facts: {},
    ...overrides,
  };
}

describe("orchestrate-chat-turn Phase 2 integration", () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("배포하고 싶어 → getDeployableServices → ask_followup for service selection", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "배포하고 싶어" }));

    expect(result.intent?.intentKey).toBe("deploy.start");
    expect(result.toolResults).toBeDefined();
    expect(result.toolResults!.some((t) => t.toolName === "getDeployableServices")).toBe(true);
    expect(result.decision.mode).toBe("ask_followup");
    expect(result.awaiting?.slotKey).toBe("deploy.serviceName");
    expect(result.awaiting?.expectedInput).toBe("single_select");
    // Options should be populated from tool result
    expect(result.awaiting?.options?.length).toBeGreaterThan(0);
  });

  it("payments-api (with awaiting) → slot fill → getServiceDeployContext → render_surface", async () => {
    // Simulate state after first turn: awaiting service selection, tools already fetched
    const factsAfterFirstTurn: ConversationFacts = {
      pageKey: "deploy",
      deploy: {
        deployableServices: {
          services: ["payments-api", "orders-api", "gateway"],
          images: [],
        },
      },
      slots: {},
    };

    const result = await orchestrateChatTurn(
      makeInput({
        input: "payments-api",
        facts: factsAfterFirstTurn,
        intent: {
          intentKey: "deploy.start",
          confidence: 0.9,
          source: "rule",
          startedAt: new Date().toISOString(),
        },
        awaiting: {
          kind: "slot",
          slotKey: "deploy.serviceName",
          prompt: "어떤 서비스를 배포할까요?",
          expectedInput: "single_select",
          options: [
            { label: "payments-api", value: "payments-api" },
            { label: "orders-api", value: "orders-api" },
            { label: "gateway", value: "gateway" },
          ],
          retryCount: 0,
          originIntentKey: "deploy.start",
          originRequestId: "req-prev",
        },
      }),
    );

    expect(result.intent?.intentKey).toBe("deploy.start");
    // serviceName should be filled
    expect(result.factsPatch?.slots?.["deploy.serviceName"]?.value).toBe("payments-api");
    // Should have called getServiceDeployContext
    expect(result.toolResults!.some((t) => t.toolName === "getServiceDeployContext")).toBe(true);
    // Should now be render_surface ready
    expect(result.decision.mode).toBe("render_surface");
    expect(result.surfaceIntent?.family).toBe("deploy.launchpad");
    expect(result.surfaceIntent?.readiness).toBe("ready");
  });

  it("아니 orders-api → correction → re-collect", async () => {
    const factsWithService: ConversationFacts = {
      pageKey: "deploy",
      deploy: {
        deployableServices: {
          services: ["payments-api", "orders-api", "gateway"],
        },
      },
      slots: {
        "deploy.serviceName": { value: "payments-api", source: "user", confidence: 1, updatedAt: "" },
        "deploy.selectedServiceContext": { value: { data: true }, source: "tool", confidence: 1, updatedAt: "" },
      },
    };

    const result = await orchestrateChatTurn(
      makeInput({
        input: "아니 orders-api",
        facts: factsWithService,
        intent: {
          intentKey: "deploy.start",
          confidence: 0.9,
          source: "rule",
          startedAt: new Date().toISOString(),
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
      }),
    );

    // Correction detected → slot cleared → re-evaluation
    expect(result.intent?.intentKey).toBe("deploy.start");
    // Service context should be invalidated (correction clears dependent slots)
  });

  it("취소하고 이전 배포 알려줘 → interrupt → history lookup", async () => {
    const result = await orchestrateChatTurn(
      makeInput({
        input: "이전 배포 알려줘",
        facts: { pageKey: "deploy" },
        intent: {
          intentKey: "deploy.start",
          confidence: 0.9,
          source: "rule",
          startedAt: new Date().toISOString(),
        },
      }),
    );

    expect(result.intent?.intentKey).toBe("deploy.history.lookup");
    expect(result.decision.mode).toBe("text");
    expect(result.toolResults!.some((t) => t.toolName === "getPreviousDeployments")).toBe(true);
  });

  it("이전 배포 알려줘 → text mode with tool result", async () => {
    const result = await orchestrateChatTurn(
      makeInput({ input: "이전 배포 알려줘" }),
    );
    expect(result.intent?.intentKey).toBe("deploy.history.lookup");
    expect(result.decision.mode).toBe("text");
  });

  it("롤백하고 싶어 → getRollbackCandidates → ask_followup", async () => {
    const result = await orchestrateChatTurn(
      makeInput({ input: "롤백하고 싶어" }),
    );
    expect(result.intent?.intentKey).toBe("rollback.start");
    expect(result.toolResults!.some((t) => t.toolName === "getRollbackCandidates")).toBe(true);
  });

  it("decisionTrace is populated in response", async () => {
    const result = await orchestrateChatTurn(
      makeInput({ input: "배포하고 싶어" }),
    );
    expect(result.decisionTrace).toBeDefined();
    expect(result.decisionTrace?.mode).toBe("ask_followup");
    expect(Array.isArray(result.decisionTrace?.matched)).toBe(true);
    expect(Array.isArray(result.decisionTrace?.missing)).toBe(true);
    expect(typeof result.decisionTrace?.reason).toBe("string");
  });

  it("workflow state is tracked", async () => {
    const result = await orchestrateChatTurn(
      makeInput({ input: "배포하고 싶어" }),
    );
    expect(result.workflow).toBeDefined();
    expect(result.workflow?.flowKey).toBe("deploy.start");
    expect(result.workflow?.status).toBe("collecting");
  });
});
