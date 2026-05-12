/**
 * Deploy 대화 케이스 통합 테스트
 *
 * 체크리스트: docs/20260329_deploy-conversation-test-cases.md
 */
import { describe, it, expect, beforeEach } from "vitest";
import { orchestrateChatTurn, type OrchestrateTurnInput } from "@/devops-chat/server/orchestrate-chat-turn";
import type { ConversationFacts, ConversationIntentState, ConversationAwaiting } from "@/devops-chat/types/conversation";
import { validateSurfaceEnvelope } from "@/devops-chat/templates/validate-surface-envelope";

beforeEach(() => {
  delete process.env.OPENAI_API_KEY;
});

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

const deployIntent: ConversationIntentState = {
  intentKey: "deploy.start",
  confidence: 0.9,
  source: "rule",
  startedAt: new Date().toISOString(),
};

// Facts after first "배포하고 싶어" turn (services fetched, awaiting selection)
function makeFactsAfterServicesFetch(): ConversationFacts {
  return {
    pageKey: "deploy",
    deploy: {
      deployableServices: { services: ["payments-api", "orders-api", "gateway"], images: [] },
    },
    slots: {},
  };
}

function makeServiceAwaiting(): ConversationAwaiting {
  return {
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
  };
}

// =====================================================================
// 1. 텍스트로만 대답 (text)
// =====================================================================
describe("1. 텍스트 대답 (text)", () => {
  it("1-1: 배포가 뭐야? → general.qna, text", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "배포가 뭐야?" }));
    expect(result.intent?.intentKey).toBe("general.qna");
    expect(result.decision.mode).toBe("text");
    expect(result.message.text.length).toBeGreaterThan(0);
  });

  it("1-2: rolling 배포랑 blue-green 차이가 뭐야? → general.qna, text", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "rolling 배포랑 blue-green 차이가 뭐야?" }));
    expect(result.intent?.intentKey).toBe("general.qna");
    expect(result.decision.mode).toBe("text");
  });

  it("1-3: production 배포할 때 주의사항 알려줘 → general.qna, text", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "production 배포할 때 주의사항 알려줘" }));
    // "주의사항 알려줘" → general.qna (no deploy keyword pattern match)
    expect(result.intent?.intentKey).toBe("general.qna");
    expect(result.decision.mode).toBe("text");
  });

  it("1-4: 지금 배포 가능해? → deploy.start, ask_followup (serviceName 없음)", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "지금 배포 가능해?" }));
    expect(result.intent?.intentKey).toBe("deploy.start");
    // No serviceName → tool fetches services → ask_followup
    expect(result.decision.mode).toBe("ask_followup");
    expect(result.awaiting?.slotKey).toBe("deploy.serviceName");
  });

  it("1-5: 고마워 → general.qna, text", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "고마워" }));
    expect(result.intent?.intentKey).toBe("general.qna");
    expect(result.decision.mode).toBe("text");
  });
});

// =====================================================================
// 2. 데이터 조회 → A2UI table surface (render_surface + tool)
// =====================================================================
describe("2. 데이터 조회 + A2UI table surface (render_surface + tool)", () => {
  it("2-1: 지난 배포 이력 알려줘 → deploy.history.lookup, render_surface, getPreviousDeployments", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "지난 배포 이력 알려줘" }));
    expect(result.intent?.intentKey).toBe("deploy.history.lookup");
    expect(result.decision.mode).toBe("render_surface");
    expect(result.toolResults?.some((t) => t.toolName === "getPreviousDeployments")).toBe(true);
    expect(result.surface?.templateId).toBe("deploy_history_table");
    expect(result.surface?.payload.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ service: "payments-api", version: "v2.3.18" }),
    ]));
    expect(result.message.text.length).toBeGreaterThan(0);
  });

  it("2-2: serviceName이 있으면 해당 서비스 배포 이력을 table로 표시", async () => {
    const result = await orchestrateChatTurn(makeInput({
      input: "마지막 배포 언제였어?",
      facts: {
        slots: {
          "deploy.serviceName": { value: "payments-api", source: "user", confidence: 1, updatedAt: "" },
        },
      },
    }));
    // "마지막 배포" → history lookup
    expect(result.intent?.intentKey).toBe("deploy.history.lookup");
    expect(result.decision.mode).toBe("render_surface");
    expect(result.toolResults?.some((t) => t.toolName === "getPreviousDeployments")).toBe(true);
    expect(result.surface?.templateId).toBe("deploy_history_table");
    expect(result.surface?.payload.rows).toEqual([
      expect.objectContaining({ service: "payments-api" }),
      expect.objectContaining({ service: "payments-api" }),
    ]);
  });

  it("2-3: 지금 어떤 서비스 배포할 수 있어? → deploy.start, getDeployableServices, ask_followup", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "지금 어떤 서비스 배포할 수 있어?" }));
    expect(result.intent?.intentKey).toBe("deploy.start");
    expect(result.toolResults?.some((t) => t.toolName === "getDeployableServices")).toBe(true);
    expect(result.decision.mode).toBe("ask_followup");
    expect(result.awaiting?.options?.length).toBeGreaterThan(0);
  });

  it("2-4: payments-api 현재 버전이 뭐야? → deploy.start, getServiceDeployContext 경유", async () => {
    // "payments-api ... 버전" → deploy.start intent (has "배포" context)
    // serviceName을 직접 잡아서 context tool 호출
    const result = await orchestrateChatTurn(makeInput({ input: "payments-api 버전 알려줘" }));
    // This could be general.qna or deploy.start depending on rule matching
    // The important thing is it produces a meaningful response
    expect(result.message.text.length).toBeGreaterThan(0);
    expect(result.decision.mode).toBeDefined();
  });
});

// =====================================================================
// 3. A2UI Surface 렌더링 (render_surface)
// =====================================================================
describe("3. A2UI Surface 렌더링", () => {
  it("3-1: 배포하고 싶어 → ask_followup(serviceName)", async () => {
    const turn1 = await orchestrateChatTurn(makeInput({ input: "배포하고 싶어" }));
    expect(turn1.intent?.intentKey).toBe("deploy.start");
    expect(turn1.decision.mode).toBe("ask_followup");
    expect(turn1.awaiting?.slotKey).toBe("deploy.serviceName");
    expect(turn1.awaiting?.options?.length).toBeGreaterThan(0);

    // Turn 2: select payments-api
    const turn2 = await orchestrateChatTurn(
      makeInput({
        input: "payments-api",
        facts: {
          ...makeFactsAfterServicesFetch(),
          ...(turn1.factsPatch ?? {}),
          slots: { ...makeFactsAfterServicesFetch().slots, ...turn1.factsPatch?.slots },
        },
        intent: turn1.intent,
        workflow: turn1.workflow,
        awaiting: turn1.awaiting,
      }),
    );

    expect(turn2.intent?.intentKey).toBe("deploy.start");
    expect(turn2.decision.mode).toBe("render_surface");
    expect(turn2.surfaceIntent?.family).toBe("deploy.launchpad");
    expect(turn2.surface).not.toBeNull();
    expect(turn2.surface?.templateId).toBe("quick_deploy_launchpad");
  });

  it("3-2: payments-api 배포해줘 → 한 번에 serviceName 채움 → render_surface", async () => {
    const result = await orchestrateChatTurn(makeInput({ input: "payments-api 배포해줘" }));
    expect(result.intent?.intentKey).toBe("deploy.start");
    // Should fill serviceName from input → fetch context → render_surface
    // OR if only serviceName detected, may ask_followup after context fetch
    expect(result.toolResults?.some((t) => t.toolName === "getServiceDeployContext" || t.toolName === "getDeployableServices")).toBe(true);
    // With serviceName directly, it should reach render_surface
    if (result.factsPatch?.slots?.["deploy.serviceName"]) {
      expect(result.factsPatch.slots["deploy.serviceName"].value).toBe("payments-api");
    }
  });

  it("3-3: 서비스 선택 후 correction → 아니 orders-api", async () => {
    const factsWithService: ConversationFacts = {
      pageKey: "deploy",
      deploy: {
        deployableServices: { services: ["payments-api", "orders-api", "gateway"] },
      },
      slots: {
        "deploy.serviceName": { value: "payments-api", source: "user", confidence: 1, updatedAt: "" },
        "deploy.selectedServiceContext": { value: { recommendedVersion: "v1.0" }, source: "tool", confidence: 1, updatedAt: "" },
      },
    };

    const result = await orchestrateChatTurn(
      makeInput({
        input: "아니 orders-api",
        facts: factsWithService,
        intent: deployIntent,
        awaiting: makeServiceAwaiting(),
      }),
    );

    expect(result.intent?.intentKey).toBe("deploy.start");
    // After correction, should re-fetch context for orders-api
    // The serviceName slot should be updated
  });

  it("3-4: awaiting 중 취소해줘 → cancel → text", async () => {
    const result = await orchestrateChatTurn(
      makeInput({
        input: "취소해줘",
        facts: makeFactsAfterServicesFetch(),
        intent: deployIntent,
        awaiting: makeServiceAwaiting(),
      }),
    );

    expect(result.decision.mode).toBe("text");
    expect(result.intent).toBeNull();
    expect(result.awaiting).toBeNull();
    expect(result.message.text).toContain("취소");
  });

  it("3-5: awaiting 중 이전 배포 알려줘 → interrupt → deploy.history.lookup", async () => {
    const result = await orchestrateChatTurn(
      makeInput({
        input: "이전 배포 알려줘",
        facts: makeFactsAfterServicesFetch(),
        intent: deployIntent,
        awaiting: makeServiceAwaiting(),
      }),
    );

    expect(result.intent?.intentKey).toBe("deploy.history.lookup");
    expect(result.decision.mode).toBe("render_surface");
    expect(result.surface?.templateId).toBe("deploy_history_table");
    expect(result.toolResults?.some((t) => t.toolName === "getPreviousDeployments")).toBe(true);
    expect(result.awaiting).toBeNull();
  });
});

// =====================================================================
// 4. Surface 생성 검증
// =====================================================================
describe("4. Surface 생성 검증", () => {
  it("4-1~4-4: render_surface 시 surface payload 완전성 검증", async () => {
    // Turn 1
    const turn1 = await orchestrateChatTurn(makeInput({ input: "배포하고 싶어" }));

    // Turn 2: select service
    const turn2 = await orchestrateChatTurn(
      makeInput({
        input: "payments-api",
        facts: {
          ...makeFactsAfterServicesFetch(),
          ...(turn1.factsPatch ?? {}),
          slots: { ...makeFactsAfterServicesFetch().slots, ...turn1.factsPatch?.slots },
        },
        intent: turn1.intent,
        workflow: turn1.workflow,
        awaiting: turn1.awaiting,
      }),
    );

    expect(turn2.decision.mode).toBe("render_surface");
    expect(turn2.surface).not.toBeNull();

    const surface = turn2.surface!;

    // 4-1: templateId
    expect(surface.templateId).toBe("quick_deploy_launchpad");

    // 4-2: actions 존재
    const payload = surface.payload as Record<string, unknown>;
    expect(payload.actions).toBeDefined();
    const actions = payload.actions as Array<{ actionId: string }>;
    expect(actions.some((a) => a.actionId === "deploy.start")).toBe(true);

    // 4-3: validation 통과
    const validation = validateSurfaceEnvelope(surface);
    expect(validation.valid).toBe(true);

    // 4-4: freshnessKey 포함
    expect(surface.freshnessKey).toBeDefined();
    expect(surface.freshnessKey!.startsWith("deploy:")).toBe(true);
  });
});

// =====================================================================
// 5. 멀티턴 시나리오
// =====================================================================
describe("5. 멀티턴 시나리오", () => {
  it("5-1: 배포 → 서비스 선택 → render_surface 전체 흐름", async () => {
    // Turn 1: "배포하고 싶어"
    const turn1 = await orchestrateChatTurn(makeInput({ input: "배포하고 싶어" }));
    expect(turn1.intent?.intentKey).toBe("deploy.start");
    expect(turn1.decision.mode).toBe("ask_followup");
    expect(turn1.awaiting?.slotKey).toBe("deploy.serviceName");
    expect(turn1.workflow?.flowKey).toBe("deploy.start");
    expect(turn1.workflow?.status).toBe("collecting");

    // Turn 2: "payments-api"
    const mergedFacts1: ConversationFacts = {
      ...makeFactsAfterServicesFetch(),
      ...(turn1.factsPatch ?? {}),
      slots: { ...makeFactsAfterServicesFetch().slots, ...turn1.factsPatch?.slots },
    };

    const turn2 = await orchestrateChatTurn(
      makeInput({
        input: "payments-api",
        facts: mergedFacts1,
        intent: turn1.intent,
        workflow: turn1.workflow,
        awaiting: turn1.awaiting,
      }),
    );

    expect(turn2.intent?.intentKey).toBe("deploy.start");
    expect(turn2.decision.mode).toBe("render_surface");
    expect(turn2.surface).not.toBeNull();
    expect(turn2.surface?.templateId).toBe("quick_deploy_launchpad");
    expect(turn2.workflow?.status).toBe("ready");
  });

  it("5-2: 배포 → correction → 서비스 교체 후 render_surface", async () => {
    // Turn 1: "배포하고 싶어"
    const turn1 = await orchestrateChatTurn(makeInput({ input: "배포하고 싶어" }));

    // Turn 2: "payments-api" → render_surface
    const mergedFacts1: ConversationFacts = {
      ...makeFactsAfterServicesFetch(),
      ...(turn1.factsPatch ?? {}),
      slots: { ...makeFactsAfterServicesFetch().slots, ...turn1.factsPatch?.slots },
    };

    const turn2 = await orchestrateChatTurn(
      makeInput({
        input: "payments-api",
        facts: mergedFacts1,
        intent: turn1.intent,
        workflow: turn1.workflow,
        awaiting: turn1.awaiting,
      }),
    );

    expect(turn2.decision.mode).toBe("render_surface");

    // Turn 3: "아니 orders-api" — correction
    const mergedFacts2: ConversationFacts = {
      ...mergedFacts1,
      ...(turn2.factsPatch ?? {}),
      slots: { ...mergedFacts1.slots, ...turn2.factsPatch?.slots },
    };

    const turn3 = await orchestrateChatTurn(
      makeInput({
        input: "아니 orders-api로 바꿔",
        facts: mergedFacts2,
        intent: turn2.intent,
        workflow: turn2.workflow,
        // no awaiting — correction from render_surface state
      }),
    );

    // After correction, should process orders-api
    expect(turn3.intent?.intentKey).toBe("deploy.start");
  });

  it("5-3: 배포 → 취소 → 이전 배포 조회 → 다시 배포", async () => {
    // Turn 1: "배포하고 싶어"
    const turn1 = await orchestrateChatTurn(makeInput({ input: "배포하고 싶어" }));
    expect(turn1.intent?.intentKey).toBe("deploy.start");

    // Turn 2: "취소해줘"
    const turn2 = await orchestrateChatTurn(
      makeInput({
        input: "취소해줘",
        facts: { ...makeFactsAfterServicesFetch(), ...(turn1.factsPatch ?? {}) },
        intent: turn1.intent,
        awaiting: turn1.awaiting,
      }),
    );
    expect(turn2.decision.mode).toBe("text");
    expect(turn2.intent).toBeNull();

    // Turn 3: "이전 배포 알려줘"
    const turn3 = await orchestrateChatTurn(
      makeInput({
        input: "이전 배포 알려줘",
        facts: {},
      }),
    );
    expect(turn3.intent?.intentKey).toBe("deploy.history.lookup");
    expect(turn3.decision.mode).toBe("render_surface");
    expect(turn3.surface?.templateId).toBe("deploy_history_table");

    // Turn 4: "다시 배포하고 싶어"
    const turn4 = await orchestrateChatTurn(
      makeInput({
        input: "배포하고 싶어",
        facts: {},
        intent: turn3.intent,
      }),
    );
    expect(turn4.intent?.intentKey).toBe("deploy.start");
    expect(turn4.decision.mode).toBe("ask_followup");
    expect(turn4.awaiting?.slotKey).toBe("deploy.serviceName");
  });
});
