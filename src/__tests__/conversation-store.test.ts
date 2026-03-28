import { describe, it, expect, beforeEach } from "vitest";
import { useConversationStore, pageConversationId } from "@/devops-chat/store/conversation-store";
import type { AssistantTurnResponse } from "@/devops-chat/types/assistant-response";

function getState() {
  return useConversationStore.getState();
}

function act(fn: () => void) {
  fn();
}

const TEST_ID = "assistant:deploy";

function makeTurnResponse(overrides: Partial<AssistantTurnResponse> = {}): AssistantTurnResponse {
  return {
    requestId: "req-1",
    message: { role: "assistant", text: "test reply" },
    surface: null,
    awaiting: null,
    pendingTool: null,
    decision: { mode: "text" },
    ...overrides,
  };
}

describe("conversation-store", () => {
  beforeEach(() => {
    useConversationStore.setState({ conversations: {} });
  });

  it("pageConversationId produces expected format", () => {
    expect(pageConversationId("deploy")).toBe("assistant:deploy");
    expect(pageConversationId("approve")).toBe("assistant:approve");
  });

  it("ensureConversation creates a new conversation", () => {
    act(() => getState().ensureConversation(TEST_ID, { pageKey: "deploy" }));

    const conv = getState().conversations[TEST_ID];
    expect(conv).toBeDefined();
    expect(conv.id).toBe(TEST_ID);
    expect(conv.messages).toEqual([]);
    expect(conv.facts.pageKey).toBe("deploy");
    expect(conv.activeRequestId).toBeNull();
  });

  it("ensureConversation does not overwrite existing conversation", () => {
    act(() => getState().ensureConversation(TEST_ID, { pageKey: "deploy" }));
    act(() => getState().setComposerText(TEST_ID, "hello"));
    act(() => getState().ensureConversation(TEST_ID, { pageKey: "approve" }));

    const conv = getState().conversations[TEST_ID];
    expect(conv.composerText).toBe("hello");
    expect(conv.facts.pageKey).toBe("deploy");
  });

  it("startUserTurn adds user + streaming placeholder", () => {
    act(() => getState().ensureConversation(TEST_ID));
    act(() => getState().setComposerText(TEST_ID, "how to deploy?"));
    act(() => getState().startUserTurn(TEST_ID, "how to deploy?", "req-1"));

    const conv = getState().conversations[TEST_ID];
    expect(conv.messages).toHaveLength(2);
    expect(conv.messages[0].role).toBe("user");
    expect(conv.messages[0].text).toBe("how to deploy?");
    expect(conv.messages[0].status).toBe("complete");
    expect(conv.messages[1].role).toBe("assistant");
    expect(conv.messages[1].status).toBe("streaming");
    expect(conv.activeRequestId).toBe("req-1");
    expect(conv.composerText).toBe("");
  });

  it("appendAssistantDelta accumulates text", () => {
    act(() => getState().ensureConversation(TEST_ID));
    act(() => getState().startUserTurn(TEST_ID, "test", "req-1"));
    act(() => getState().appendAssistantDelta(TEST_ID, "req-1", "hello "));
    act(() => getState().appendAssistantDelta(TEST_ID, "req-1", "world"));

    const conv = getState().conversations[TEST_ID];
    const streaming = conv.messages.find((m) => m.status === "streaming");
    expect(streaming?.text).toBe("hello world");
  });

  it("appendAssistantDelta ignores stale requestId", () => {
    act(() => getState().ensureConversation(TEST_ID));
    act(() => getState().startUserTurn(TEST_ID, "test", "req-2"));
    act(() => getState().appendAssistantDelta(TEST_ID, "req-STALE", "should not appear"));

    const conv = getState().conversations[TEST_ID];
    const streaming = conv.messages.find((m) => m.status === "streaming");
    expect(streaming?.text).toBe("");
  });

  it("completeAssistantTurn finalizes message and merges facts", () => {
    act(() => getState().ensureConversation(TEST_ID, { pageKey: "deploy" }));
    act(() => getState().startUserTurn(TEST_ID, "test", "req-1"));
    act(() => getState().appendAssistantDelta(TEST_ID, "req-1", "reply text"));

    const response = makeTurnResponse({
      requestId: "req-1",
      awaiting: { kind: "free_text", prompt: "다음 질문을 입력해주세요" },
      decision: { mode: "ask_followup" },
      factsPatch: { deploy: { lastAction: "query" } },
    });

    act(() => getState().completeAssistantTurn(TEST_ID, "req-1", response));

    const conv = getState().conversations[TEST_ID];
    expect(conv.activeRequestId).toBeNull();
    expect(conv.awaiting).toEqual({ kind: "free_text", prompt: "다음 질문을 입력해주세요" });
    expect(conv.decision?.mode).toBe("ask_followup");
    expect(conv.facts.deploy).toEqual({ lastAction: "query" });

    const assistant = conv.messages.find((m) => m.role === "assistant");
    expect(assistant?.status).toBe("complete");
    expect(assistant?.text).toBe("reply text");
  });

  it("completeAssistantTurn ignores stale requestId", () => {
    act(() => getState().ensureConversation(TEST_ID));
    act(() => getState().startUserTurn(TEST_ID, "test", "req-1"));
    act(() => getState().completeAssistantTurn(TEST_ID, "req-STALE", makeTurnResponse()));

    const conv = getState().conversations[TEST_ID];
    expect(conv.activeRequestId).toBe("req-1"); // still active
  });

  it("failAssistantTurn sets error status", () => {
    act(() => getState().ensureConversation(TEST_ID));
    act(() => getState().startUserTurn(TEST_ID, "test", "req-1"));
    act(() => getState().failAssistantTurn(TEST_ID, "req-1", "network error"));

    const conv = getState().conversations[TEST_ID];
    expect(conv.activeRequestId).toBeNull();
    const assistant = conv.messages.find((m) => m.role === "assistant");
    expect(assistant?.status).toBe("error");
  });

  it("cancelActiveTurn removes streaming placeholder", () => {
    act(() => getState().ensureConversation(TEST_ID));
    act(() => getState().startUserTurn(TEST_ID, "test", "req-1"));
    act(() => getState().cancelActiveTurn(TEST_ID));

    const conv = getState().conversations[TEST_ID];
    expect(conv.activeRequestId).toBeNull();
    expect(conv.messages.filter((m) => m.status === "streaming")).toHaveLength(0);
    expect(conv.messages).toHaveLength(1); // only user message
  });

  it("resetConversation clears messages but preserves facts", () => {
    act(() => getState().ensureConversation(TEST_ID, { pageKey: "deploy" }));
    act(() => getState().startUserTurn(TEST_ID, "test", "req-1"));
    act(() => getState().resetConversation(TEST_ID));

    const conv = getState().conversations[TEST_ID];
    expect(conv.messages).toEqual([]);
    expect(conv.facts.pageKey).toBe("deploy");
  });

  it("mergeFacts patches facts without overwriting unrelated keys", () => {
    act(() => getState().ensureConversation(TEST_ID, { pageKey: "deploy", selectedEntity: { id: "1" } }));
    act(() => getState().mergeFacts(TEST_ID, { deploy: { info: "new" } }));

    const conv = getState().conversations[TEST_ID];
    expect(conv.facts.pageKey).toBe("deploy");
    expect(conv.facts.selectedEntity).toEqual({ id: "1" });
    expect(conv.facts.deploy).toEqual({ info: "new" });
  });

  it("mergeFacts overwrites same key", () => {
    act(() => getState().ensureConversation(TEST_ID, { pageKey: "deploy", deploy: { old: true } }));
    act(() => getState().mergeFacts(TEST_ID, { deploy: { new: true } }));

    const conv = getState().conversations[TEST_ID];
    expect(conv.facts.deploy).toEqual({ new: true });
    expect(conv.facts.pageKey).toBe("deploy");
  });

  it("clearError sets error to null", () => {
    act(() => getState().ensureConversation(TEST_ID));
    act(() => getState().startUserTurn(TEST_ID, "test", "req-1"));
    act(() => getState().failAssistantTurn(TEST_ID, "req-1", "some error"));

    expect(getState().conversations[TEST_ID].error).toBe("some error");

    act(() => getState().clearError(TEST_ID));
    expect(getState().conversations[TEST_ID].error).toBeNull();
  });

  // --- Inflight request race condition tests ---

  it("second startUserTurn replaces activeRequestId", () => {
    act(() => getState().ensureConversation(TEST_ID));
    act(() => getState().startUserTurn(TEST_ID, "first", "req-1"));
    act(() => getState().startUserTurn(TEST_ID, "second", "req-2"));

    const conv = getState().conversations[TEST_ID];
    expect(conv.activeRequestId).toBe("req-2");
    // Old streaming placeholder from req-1 should be gone (trimmed or replaced)
  });

  it("completeAssistantTurn from old request is ignored after new turn starts", () => {
    act(() => getState().ensureConversation(TEST_ID));
    act(() => getState().startUserTurn(TEST_ID, "first", "req-1"));
    act(() => getState().startUserTurn(TEST_ID, "second", "req-2"));

    // Late completion from req-1 should be ignored
    act(() => getState().completeAssistantTurn(TEST_ID, "req-1", makeTurnResponse({ requestId: "req-1" })));

    const conv = getState().conversations[TEST_ID];
    // activeRequestId should still be req-2 (not cleared by stale completion)
    expect(conv.activeRequestId).toBe("req-2");
  });

  it("appendAssistantDelta from old request is ignored after new turn", () => {
    act(() => getState().ensureConversation(TEST_ID));
    act(() => getState().startUserTurn(TEST_ID, "first", "req-1"));
    act(() => getState().appendAssistantDelta(TEST_ID, "req-1", "partial"));
    act(() => getState().startUserTurn(TEST_ID, "second", "req-2"));

    // Late delta from req-1 should be ignored because activeRequestId is now req-2
    act(() => getState().appendAssistantDelta(TEST_ID, "req-1", " stale data"));

    const conv = getState().conversations[TEST_ID];
    // The latest streaming placeholder (req-2) should not have stale data
    const streamingMessages = conv.messages.filter((m) => m.status === "streaming");
    const latestStreaming = streamingMessages[streamingMessages.length - 1];
    expect(latestStreaming?.text).toBe("");
    // Ensure stale delta was not appended to any current streaming message
    expect(conv.messages.every((m) => !m.text.includes("stale data"))).toBe(true);
  });

  it("failAssistantTurn from old request is ignored after new turn", () => {
    act(() => getState().ensureConversation(TEST_ID));
    act(() => getState().startUserTurn(TEST_ID, "first", "req-1"));
    act(() => getState().startUserTurn(TEST_ID, "second", "req-2"));

    // Stale failure from req-1
    act(() => getState().failAssistantTurn(TEST_ID, "req-1", "old error"));

    const conv = getState().conversations[TEST_ID];
    expect(conv.activeRequestId).toBe("req-2"); // still active
    expect(conv.error).toBeNull(); // old error not applied
  });

  // --- Selection change stale response test ---

  it("selection change does not clear messages", () => {
    act(() => getState().ensureConversation(TEST_ID, { pageKey: "deploy" }));
    act(() => getState().startUserTurn(TEST_ID, "question", "req-1"));
    act(() => getState().appendAssistantDelta(TEST_ID, "req-1", "answer"));
    act(() => getState().completeAssistantTurn(TEST_ID, "req-1", makeTurnResponse({ requestId: "req-1" })));

    // Simulate selection change by merging new entity
    act(() => getState().mergeFacts(TEST_ID, { selectedEntity: { id: "new-item" } }));

    const conv = getState().conversations[TEST_ID];
    // Messages should still be there (not reset on selection change)
    expect(conv.messages.length).toBeGreaterThan(0);
    expect(conv.facts.selectedEntity).toEqual({ id: "new-item" });
  });
});
