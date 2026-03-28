import { describe, it, expect } from "vitest";
import { resolveIntent } from "@/devops-chat/server/orchestration/intent-resolver";
import type { ConversationFacts, ConversationIntentState } from "@/devops-chat/types/conversation";

const emptyFacts: ConversationFacts = {};

function makeIntent(intentKey: string, source: "rule" | "carry" = "rule"): ConversationIntentState {
  return {
    intentKey: intentKey as ConversationIntentState["intentKey"],
    confidence: 0.9,
    source,
    startedAt: new Date().toISOString(),
  };
}

describe("intent-resolver", () => {
  it("classifies deploy intent", () => {
    const result = resolveIntent("배포하고 싶어", null, null, emptyFacts);
    expect(result.intent.intentKey).toBe("deploy.start");
    expect(result.isSwitch).toBe(false);
  });

  it("classifies rollback intent", () => {
    const result = resolveIntent("롤백하고 싶어", null, null, emptyFacts);
    expect(result.intent.intentKey).toBe("rollback.start");
  });

  it("classifies approval intent", () => {
    const result = resolveIntent("승인 검토 해줘", null, null, emptyFacts);
    expect(result.intent.intentKey).toBe("approval.review");
  });

  it("classifies deploy history lookup", () => {
    const result = resolveIntent("이전 배포 알려줘", null, null, emptyFacts);
    expect(result.intent.intentKey).toBe("deploy.history.lookup");
  });

  it("falls back to general.qna for unknown input", () => {
    const result = resolveIntent("오늘 날씨 어때", null, null, emptyFacts);
    expect(result.intent.intentKey).toBe("general.qna");
  });

  it("carries current intent when awaiting", () => {
    const current = makeIntent("deploy.start");
    const awaiting = {
      kind: "slot" as const,
      slotKey: "deploy.serviceName",
      prompt: "서비스 이름?",
      expectedInput: "free_text" as const,
      retryCount: 0,
      originIntentKey: "deploy.start",
      originRequestId: "req-1",
    };
    const result = resolveIntent("payments-api", current, awaiting, emptyFacts);
    expect(result.intent.intentKey).toBe("deploy.start");
    expect(result.isSwitch).toBe(false);
  });

  it("carries carryable intent across turns without awaiting", () => {
    const current = makeIntent("deploy.start");
    const result = resolveIntent("그래 진행해", current, null, emptyFacts);
    expect(result.intent.intentKey).toBe("deploy.start");
    expect(result.intent.source).toBe("carry");
  });

  it("switches intent when new intent detected during carry", () => {
    const current = makeIntent("deploy.start");
    const result = resolveIntent("롤백하고 싶어", current, null, emptyFacts);
    expect(result.intent.intentKey).toBe("rollback.start");
    expect(result.isSwitch).toBe(true);
  });

  it("clears namespace on intent switch between different namespaces", () => {
    const current = makeIntent("deploy.start");
    const facts: ConversationFacts = {
      slots: {
        "deploy.serviceName": { value: "payments-api", source: "user", confidence: 1, updatedAt: "" },
      },
    };
    const result = resolveIntent("롤백하고 싶어", current, null, facts);
    expect(result.isSwitch).toBe(true);
    expect(result.facts.slots?.["deploy.serviceName"]).toBeUndefined();
  });

  it("preserves slots on intent switch within same namespace", () => {
    const current = makeIntent("deploy.start");
    const facts: ConversationFacts = {
      slots: {
        "deploy.serviceName": { value: "payments-api", source: "user", confidence: 1, updatedAt: "" },
      },
    };
    const result = resolveIntent("이전 배포 알려줘", current, null, facts);
    expect(result.isSwitch).toBe(true);
    expect(result.facts.slots?.["deploy.serviceName"]?.value).toBe("payments-api");
  });
});
