"use client";

import { create } from "zustand";
import type {
  ConversationAwaiting,
  ConversationDecision,
  ConversationFacts,
  ConversationId,
  ConversationIntentState,
  ConversationMessage,
  ConversationState,
  ConversationWorkflowState,
  DecisionTrace,
  PendingToolState,
  SurfaceEnvelope,
  SurfaceIntentCandidate,
} from "@/devops-chat/types/conversation";
import type { AssistantTurnResponse } from "@/devops-chat/types/assistant-response";
import { resolveSurfaceAction } from "@/devops-chat/templates/surface-lifecycle";

type ConversationStoreState = {
  conversations: Record<ConversationId, ConversationState>;
};

type ConversationStoreActions = {
  ensureConversation: (conversationId: ConversationId, seedFacts?: ConversationFacts) => void;
  setIntent: (conversationId: ConversationId, intent: ConversationIntentState | null) => void;
  setWorkflow: (conversationId: ConversationId, workflow: ConversationWorkflowState | null) => void;
  setLastDecisionTrace: (conversationId: ConversationId, trace: DecisionTrace | null) => void;
  setSurfaceIntent: (conversationId: ConversationId, surfaceIntent: SurfaceIntentCandidate | null) => void;
  setComposerText: (conversationId: ConversationId, value: string) => void;
  startUserTurn: (conversationId: ConversationId, input: string, requestId: string) => void;
  appendAssistantDelta: (conversationId: ConversationId, requestId: string, text: string) => void;
  completeAssistantTurn: (conversationId: ConversationId, requestId: string, result: AssistantTurnResponse) => void;
  failAssistantTurn: (conversationId: ConversationId, requestId: string, error: string) => void;
  mergeFacts: (conversationId: ConversationId, factsPatch: Partial<ConversationFacts>) => void;
  setAwaiting: (conversationId: ConversationId, awaiting: ConversationAwaiting) => void;
  setPendingTool: (conversationId: ConversationId, pendingTool: PendingToolState) => void;
  setActiveSurface: (conversationId: ConversationId, surface: SurfaceEnvelope | null) => void;
  dismissSurface: (conversationId: ConversationId) => void;
  clearError: (conversationId: ConversationId) => void;
  resetConversation: (conversationId: ConversationId) => void;
  cancelActiveTurn: (conversationId: ConversationId) => void;
};

type ConversationStore = ConversationStoreState & ConversationStoreActions;

let messageSequence = 0;

function nextMessageId(): string {
  messageSequence += 1;
  return `conv-msg-${messageSequence}`;
}

function createEmptyConversation(id: ConversationId, seedFacts?: ConversationFacts): ConversationState {
  return {
    id,
    messages: [],
    intent: null,
    workflow: null,
    facts: seedFacts ?? {},
    awaiting: null,
    pendingTool: null,
    decision: null,
    lastDecisionTrace: null,
    surfaceIntent: null,
    activeSurface: null,
    activeRequestId: null,
    composerText: "",
    error: null,
  };
}

const MAX_MESSAGES = 40;

function trimMessages(messages: ConversationMessage[]): ConversationMessage[] {
  return messages
    .filter((m) => m.text.trim() || m.status === "streaming")
    .slice(-MAX_MESSAGES);
}

function updateConversation(
  state: ConversationStoreState,
  conversationId: ConversationId,
  updater: (conv: ConversationState) => Partial<ConversationState>,
): ConversationStoreState {
  const conv = state.conversations[conversationId];
  if (!conv) return state;
  return {
    conversations: {
      ...state.conversations,
      [conversationId]: { ...conv, ...updater(conv) },
    },
  };
}

export const useConversationStore = create<ConversationStore>((set) => ({
  conversations: {},

  ensureConversation: (conversationId, seedFacts) => {
    set((state) => {
      if (state.conversations[conversationId]) return state;
      return {
        conversations: {
          ...state.conversations,
          [conversationId]: createEmptyConversation(conversationId, seedFacts),
        },
      };
    });
  },

  setIntent: (conversationId, intent) => {
    set((state) => updateConversation(state, conversationId, () => ({ intent })));
  },

  setWorkflow: (conversationId, workflow) => {
    set((state) => updateConversation(state, conversationId, () => ({ workflow })));
  },

  setLastDecisionTrace: (conversationId, trace) => {
    set((state) => updateConversation(state, conversationId, () => ({ lastDecisionTrace: trace })));
  },

  setSurfaceIntent: (conversationId, surfaceIntent) => {
    set((state) => updateConversation(state, conversationId, () => ({ surfaceIntent })));
  },

  setComposerText: (conversationId, value) => {
    set((state) => updateConversation(state, conversationId, () => ({ composerText: value })));
  },

  startUserTurn: (conversationId, input, requestId) => {
    set((state) => {
      const conv = state.conversations[conversationId];
      if (!conv) return state;

      const userMessage: ConversationMessage = {
        id: nextMessageId(),
        role: "user",
        text: input,
        status: "complete",
      };

      const assistantPlaceholder: ConversationMessage = {
        id: nextMessageId(),
        role: "assistant",
        text: "",
        status: "streaming",
      };

      return {
        conversations: {
          ...state.conversations,
          [conversationId]: {
            ...conv,
            messages: trimMessages([...conv.messages, userMessage, assistantPlaceholder]),
            activeRequestId: requestId,
            composerText: "",
            awaiting: null,
            pendingTool: null,
            decision: null,
          },
        },
      };
    });
  },

  appendAssistantDelta: (conversationId, requestId, text) => {
    set((state) => {
      const conv = state.conversations[conversationId];
      if (!conv || conv.activeRequestId !== requestId) return state;

      const messages = conv.messages.map((m) =>
        m.role === "assistant" && m.status === "streaming"
          ? { ...m, text: m.text + text }
          : m,
      );

      return {
        conversations: {
          ...state.conversations,
          [conversationId]: { ...conv, messages },
        },
      };
    });
  },

  completeAssistantTurn: (conversationId, requestId, result) => {
    set((state) => {
      const conv = state.conversations[conversationId];
      if (!conv || conv.activeRequestId !== requestId) return state;

      const messages = trimMessages(
        conv.messages.map((m) =>
          m.role === "assistant" && m.status === "streaming"
            ? {
                ...m,
                text: m.text.trim() || result.message.text,
                status: "complete" as const,
              }
            : m,
        ),
      );

      const mergedFacts = result.factsPatch
        ? { ...conv.facts, ...result.factsPatch }
        : conv.facts;

      // Resolve surface lifecycle
      const surfaceAction = resolveSurfaceAction(
        result.decision.mode,
        result.surface,
        conv.activeSurface,
        (result.intent ?? conv.intent)?.intentKey ?? null,
      );
      const nextSurface =
        surfaceAction.action === "replace" ? surfaceAction.surface
        : surfaceAction.action === "keep" ? conv.activeSurface
        : null;

      return {
        conversations: {
          ...state.conversations,
          [conversationId]: {
            ...conv,
            messages,
            intent: result.intent ?? conv.intent,
            workflow: result.workflow ?? conv.workflow,
            facts: mergedFacts,
            awaiting: result.awaiting,
            pendingTool: null,
            decision: result.decision,
            lastDecisionTrace: result.decisionTrace ?? conv.lastDecisionTrace,
            surfaceIntent: result.surfaceIntent ?? null,
            activeSurface: nextSurface,
            activeRequestId: null,
            error: null,
          },
        },
      };
    });
  },

  failAssistantTurn: (conversationId, requestId, error) => {
    set((state) => {
      const conv = state.conversations[conversationId];
      if (!conv || conv.activeRequestId !== requestId) return state;

      const messages = trimMessages(
        conv.messages.map((m) =>
          m.role === "assistant" && m.status === "streaming"
            ? {
                ...m,
                text: m.text.trim() || "응답을 가져오지 못했습니다.",
                status: "error" as const,
              }
            : m,
        ),
      );

      return {
        conversations: {
          ...state.conversations,
          [conversationId]: {
            ...conv,
            messages,
            error,
            pendingTool: null,
            activeRequestId: null,
          },
        },
      };
    });
  },

  mergeFacts: (conversationId, factsPatch) => {
    set((state) =>
      updateConversation(state, conversationId, (conv) => ({
        facts: { ...conv.facts, ...factsPatch },
      })),
    );
  },

  setActiveSurface: (conversationId, surface) => {
    set((state) =>
      updateConversation(state, conversationId, () => ({ activeSurface: surface })),
    );
  },

  dismissSurface: (conversationId) => {
    set((state) =>
      updateConversation(state, conversationId, () => ({ activeSurface: null })),
    );
  },

  clearError: (conversationId) => {
    set((state) =>
      updateConversation(state, conversationId, () => ({ error: null })),
    );
  },

  setAwaiting: (conversationId, awaiting) => {
    set((state) =>
      updateConversation(state, conversationId, () => ({ awaiting })),
    );
  },

  setPendingTool: (conversationId, pendingTool) => {
    set((state) =>
      updateConversation(state, conversationId, () => ({ pendingTool })),
    );
  },

  resetConversation: (conversationId) => {
    set((state) => {
      const conv = state.conversations[conversationId];
      if (!conv) return state;
      return {
        conversations: {
          ...state.conversations,
          [conversationId]: createEmptyConversation(conversationId, conv.facts),
        },
      };
    });
  },

  cancelActiveTurn: (conversationId) => {
    set((state) => {
      const conv = state.conversations[conversationId];
      if (!conv || !conv.activeRequestId) return state;

      const messages = trimMessages(
        conv.messages.filter((m) => !(m.role === "assistant" && m.status === "streaming")),
      );

      return {
        conversations: {
          ...state.conversations,
          [conversationId]: {
            ...conv,
            messages,
            activeRequestId: null,
            pendingTool: null,
          },
        },
      };
    });
  },
}));

/** Helper: derive conversation ID from page key */
export function pageConversationId(pageKey: string): ConversationId {
  return `assistant:${pageKey}`;
}

/** Selector: get a conversation by ID (returns undefined if not initialized) */
export function selectConversation(
  state: ConversationStoreState,
  conversationId: ConversationId,
): ConversationState | undefined {
  return state.conversations[conversationId];
}

/** Check if a conversation has an active (inflight) request */
export function isConversationSubmitting(
  state: ConversationStoreState,
  conversationId: ConversationId,
): boolean {
  return state.conversations[conversationId]?.activeRequestId != null;
}

// ---------------------------------------------------------------------------
// Diagnostics selector (Phase 6)
// ---------------------------------------------------------------------------

export type ConversationDiagnostics = {
  lastDecisionTrace: unknown | null;
  factsSnapshot: Record<string, unknown>;
  activeSurfaceMeta: {
    templateId: string;
    updatedAt: string;
    freshnessKey?: string;
  } | null;
  lastError: string | null;
  intentKey: string | null;
  workflowStep: string | null;
};

export function selectDiagnostics(
  state: ConversationStoreState,
  conversationId: ConversationId,
): ConversationDiagnostics | null {
  const conv = state.conversations[conversationId];
  if (!conv) return null;

  return {
    lastDecisionTrace: conv.lastDecisionTrace,
    factsSnapshot: conv.facts as unknown as Record<string, unknown>,
    activeSurfaceMeta: conv.activeSurface
      ? {
          templateId: conv.activeSurface.templateId,
          updatedAt: conv.activeSurface.updatedAt,
          freshnessKey: conv.activeSurface.freshnessKey,
        }
      : null,
    lastError: conv.error,
    intentKey: conv.intent?.intentKey ?? null,
    workflowStep: conv.workflow?.stepKey ?? null,
  };
}
