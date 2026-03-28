import { describe, it, expect } from "vitest";
import { resolveAwaiting } from "@/devops-chat/server/orchestration/awaiting-resolver";
import type { ConversationAwaiting, ConversationFacts } from "@/devops-chat/types/conversation";

function makeAwaiting(overrides: Partial<NonNullable<ConversationAwaiting>> = {}): NonNullable<ConversationAwaiting> {
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
    allowFreeform: false,
    retryCount: 0,
    originIntentKey: "deploy.start",
    originRequestId: "req-1",
    ...overrides,
  };
}

const emptyFacts: ConversationFacts = {};

describe("awaiting-resolver", () => {
  it("resolves exact option match", () => {
    const result = resolveAwaiting("payments-api", makeAwaiting(), emptyFacts);
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.slotKey).toBe("deploy.serviceName");
      expect(result.value).toBe("payments-api");
      expect(result.source).toBe("user");
      expect(result.facts.slots?.["deploy.serviceName"]?.value).toBe("payments-api");
    }
  });

  it("resolves partial match when unique", () => {
    const result = resolveAwaiting("payments", makeAwaiting(), emptyFacts);
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.value).toBe("payments-api");
    }
  });

  it("returns ambiguous when multiple partial matches", () => {
    const awaiting = makeAwaiting({
      options: [
        { label: "api-gateway", value: "api-gateway" },
        { label: "api-service", value: "api-service" },
      ],
    });
    const result = resolveAwaiting("api", awaiting, emptyFacts);
    expect(result.resolved).toBe(false);
    if (!result.resolved) {
      expect(result.reason).toBe("ambiguous");
    }
  });

  it("returns no_match when no option matches", () => {
    const result = resolveAwaiting("unknown-service", makeAwaiting(), emptyFacts);
    expect(result.resolved).toBe(false);
    if (!result.resolved) {
      expect(result.reason).toBe("no_match");
    }
  });

  it("increments retryCount on no_match", () => {
    const result = resolveAwaiting("unknown", makeAwaiting({ retryCount: 1 }), emptyFacts);
    expect(result.resolved).toBe(false);
    if (!result.resolved && "awaiting" in result && result.awaiting) {
      expect(result.awaiting.retryCount).toBe(2);
    }
  });

  it("provides safer fallback after max retries", () => {
    const result = resolveAwaiting("unknown", makeAwaiting({ retryCount: 2 }), emptyFacts);
    expect(result.resolved).toBe(false);
    if (!result.resolved && "awaiting" in result && result.awaiting) {
      expect(result.awaiting.retryCount).toBe(3);
      expect(result.awaiting.prompt).toContain("처음부터");
    }
  });

  it("detects cancel input", () => {
    const result = resolveAwaiting("취소", makeAwaiting(), emptyFacts);
    expect(result.resolved).toBe(false);
    if (!result.resolved) {
      expect(result.reason).toBe("cancel");
    }
  });

  it("detects correction input and clears slot", () => {
    const facts: ConversationFacts = {
      slots: {
        "deploy.serviceName": { value: "payments-api", source: "user", confidence: 1, updatedAt: "" },
      },
    };
    const result = resolveAwaiting("아니 다른 걸로", makeAwaiting(), facts);
    expect(result.resolved).toBe(false);
    if (!result.resolved) {
      expect(result.reason).toBe("correction");
    }
  });

  it("detects intent interruption", () => {
    const result = resolveAwaiting("배포 말고 롤백할래", makeAwaiting(), emptyFacts);
    expect(result.resolved).toBe(false);
    if (!result.resolved) {
      expect(result.reason).toBe("interrupt");
    }
  });

  it("resolves confirmation awaiting", () => {
    const awaiting = makeAwaiting({
      slotKey: "deploy.confirm",
      expectedInput: "confirmation",
      options: undefined,
    });
    const result = resolveAwaiting("네", awaiting, emptyFacts);
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.value).toBe(true);
    }
  });

  it("handles free_text awaiting", () => {
    const awaiting = makeAwaiting({
      slotKey: "deploy.targetVersion",
      expectedInput: "free_text",
      options: undefined,
    });
    const result = resolveAwaiting("v2.3.18", awaiting, emptyFacts);
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.value).toBe("v2.3.18");
    }
  });

  it("returns no_awaiting when awaiting is null", () => {
    const result = resolveAwaiting("anything", null, emptyFacts);
    expect(result.resolved).toBe(false);
    if (!result.resolved) {
      expect(result.reason).toBe("no_awaiting");
    }
  });
});
