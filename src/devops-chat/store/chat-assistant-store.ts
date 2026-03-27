"use client";

import { create } from "zustand";
import { streamAssistantChat, type AssistantChatRequest } from "@/devops-chat/lib/chat-api";
import type {
  ApprovalItem,
  AssistantMessage,
  AssistantMessageRole,
  DeployItem,
  PageKey,
  RollbackItem,
} from "@/devops-chat/types/domain";

type ChatAssistantSubmitArgs = {
  pageKey: PageKey;
  selectedItem: DeployItem | ApprovalItem | RollbackItem | null;
};

type ChatAssistantStore = {
  composerText: string;
  messages: AssistantMessage[];
  isSubmitting: boolean;
  error: string | null;
  setComposerText: (value: string) => void;
  clearError: () => void;
  submitPrompt: (args: ChatAssistantSubmitArgs) => Promise<void>;
};

let assistantMessageSequence = 0;

function createAssistantMessage(
  role: AssistantMessageRole,
  content: string,
  status: AssistantMessage["status"] = "complete",
): AssistantMessage {
  assistantMessageSequence += 1;

  return {
    id: `chat-assistant-message-${assistantMessageSequence}`,
    role,
    content,
    status,
  };
}

function buildAssistantHistory(messages: AssistantMessage[]) {
  return messages
    .filter((message) => message.status === "complete" && message.content.trim())
    .slice(-10)
    .map(({ role, content }) => ({ role, content }));
}

function trimMessages(messages: AssistantMessage[]) {
  return messages.filter((message) => message.content.trim() || message.status === "streaming").slice(-40);
}

export const useChatAssistantStore = create<ChatAssistantStore>((set, get) => ({
  composerText: "",
  messages: [],
  isSubmitting: false,
  error: null,
  setComposerText: (value) => {
    set({ composerText: value });
  },
  clearError: () => {
    set({ error: null });
  },
  submitPrompt: async ({ pageKey, selectedItem }) => {
    const prompt = get().composerText.trim();
    if (!prompt || get().isSubmitting) {
      return;
    }

    const userMessage = createAssistantMessage("user", prompt);
    const assistantPlaceholder = createAssistantMessage("assistant", "", "streaming");
    const placeholderId = assistantPlaceholder.id;

    const requestPayload: AssistantChatRequest = {
      pageKey,
      prompt,
      templateId: null,
      selectedItem: selectedItem ? structuredClone(selectedItem) : null,
      history: buildAssistantHistory(get().messages),
    };

    set((state) => ({
      composerText: "",
      error: null,
      isSubmitting: true,
      messages: trimMessages([...state.messages, userMessage, assistantPlaceholder]),
    }));

    try {
      await streamAssistantChat(requestPayload, {
        onDelta: (text) => {
          set((state) => ({
            messages: state.messages.map((message) =>
              message.id === placeholderId
                ? {
                    ...message,
                    content: message.content + text,
                  }
                : message,
            ),
          }));
        },
        onDone: () => {
          set((state) => ({
            isSubmitting: false,
            error: null,
            messages: trimMessages(
              state.messages.map((message) =>
                message.id === placeholderId
                  ? {
                      ...message,
                      status: "complete",
                      content: message.content.trim() ? message.content : "응답을 생성하지 못했습니다.",
                    }
                  : message,
              ),
            ),
          }));
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Assistant request failed.";

      set((state) => ({
        isSubmitting: false,
        error: message,
        messages: trimMessages(
          state.messages.map((entry) =>
            entry.id === placeholderId
              ? {
                  ...entry,
                  status: "error",
                  content: entry.content.trim() ? entry.content : "응답을 가져오지 못했습니다.",
                }
              : entry,
          ),
        ),
      }));
    }
  },
}));
