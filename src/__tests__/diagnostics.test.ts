import { describe, it, expect, beforeEach } from "vitest";
import { useConversationStore, selectDiagnostics, pageConversationId } from "@/devops-chat/store/conversation-store";

describe("diagnostics selector", () => {
  const convId = pageConversationId("deploy");

  beforeEach(() => {
    useConversationStore.setState({ conversations: {} });
  });

  it("returns null for non-existent conversation", () => {
    const state = useConversationStore.getState();
    expect(selectDiagnostics(state, "nonexistent")).toBeNull();
  });

  it("returns diagnostics for initialized conversation", () => {
    useConversationStore.getState().ensureConversation(convId, { pageKey: "deploy" });
    const state = useConversationStore.getState();
    const diag = selectDiagnostics(state, convId);
    expect(diag).not.toBeNull();
    expect(diag!.lastDecisionTrace).toBeNull();
    expect(diag!.activeSurfaceMeta).toBeNull();
    expect(diag!.lastError).toBeNull();
    expect(diag!.intentKey).toBeNull();
  });

  it("reflects intent and facts after updates", () => {
    const store = useConversationStore.getState();
    store.ensureConversation(convId);
    store.setIntent(convId, { intentKey: "deploy.start", confidence: 1, source: "rule", startedAt: "" });
    store.mergeFacts(convId, { slots: { "deploy.serviceName": { value: "payments-api", source: "user", confidence: 1, updatedAt: "" } } });

    const state = useConversationStore.getState();
    const diag = selectDiagnostics(state, convId);
    expect(diag!.intentKey).toBe("deploy.start");
    expect(diag!.factsSnapshot).toBeDefined();
  });

  it("reflects error state", () => {
    const store = useConversationStore.getState();
    store.ensureConversation(convId);
    // Simulate a failed turn
    store.startUserTurn(convId, "test", "req-1");
    store.failAssistantTurn(convId, "req-1", "connection failed");

    const state = useConversationStore.getState();
    const diag = selectDiagnostics(state, convId);
    expect(diag!.lastError).toBe("connection failed");
  });

  it("reflects active surface meta after completeAssistantTurn with surface", () => {
    const store = useConversationStore.getState();
    store.ensureConversation(convId);
    store.startUserTurn(convId, "배포하고 싶어", "req-2");
    store.completeAssistantTurn(convId, "req-2", {
      requestId: "req-2",
      message: { role: "assistant", text: "ok" },
      surface: {
        templateId: "quick_deploy_launchpad",
        payload: { service: "payments-api" },
        sourceIntent: "deploy.start",
        updatedAt: "2026-03-29T00:00:00Z",
        freshnessKey: "deploy:payments-api:production:v1",
      },
      awaiting: null,
      pendingTool: null,
      decision: { mode: "render_surface", reason: "ready" },
    });

    const state = useConversationStore.getState();
    const diag = selectDiagnostics(state, convId);
    expect(diag!.activeSurfaceMeta).not.toBeNull();
    expect(diag!.activeSurfaceMeta!.templateId).toBe("quick_deploy_launchpad");
    expect(diag!.activeSurfaceMeta!.freshnessKey).toBe("deploy:payments-api:production:v1");
  });
});
