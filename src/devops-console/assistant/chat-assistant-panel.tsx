/**
 * @deprecated Phase 6: Legacy bubble chat panel.
 *
 * Use AssistantWorkspace + WorkspaceShell instead for the main path.
 * This file is kept for backward compatibility during migration.
 * Do not add new features here.
 */
"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/devops-console/foundation/icon-registry";
import styles from "@/devops-console/console-page.module.css";
import {
  useConversationStore,
  pageConversationId,
  selectConversation,
  isConversationSubmitting,
} from "@/devops-chat/store/conversation-store";
import {
  streamAssistantChat,
  ChatProtocolError,
  type ChatStreamRequest,
} from "@/devops-chat/lib/chat-api";
import { buildContextSnapshot } from "@/devops-chat/lib/context-snapshot";
import type { ApprovalItem, DeployItem, PageKey, RollbackItem } from "@/devops-chat/types/domain";
import type { ConversationMessage } from "@/devops-chat/types/conversation";
import { TemplateSurface } from "@/devops-console/assistant/template-surface";

type ChatAssistantPanelProps = {
  onClose: () => void;
  pageKey: PageKey;
  selectedItem: DeployItem | ApprovalItem | RollbackItem | null;
};

export function ChatAssistantPanel({
  onClose,
  pageKey,
  selectedItem,
}: ChatAssistantPanelProps) {
  const conversationId = pageConversationId(pageKey);

  const ensureConversation = useConversationStore((s) => s.ensureConversation);
  const setComposerText = useConversationStore((s) => s.setComposerText);
  const startUserTurn = useConversationStore((s) => s.startUserTurn);
  const appendAssistantDelta = useConversationStore((s) => s.appendAssistantDelta);
  const completeAssistantTurn = useConversationStore((s) => s.completeAssistantTurn);
  const failAssistantTurn = useConversationStore((s) => s.failAssistantTurn);
  const setPendingTool = useConversationStore((s) => s.setPendingTool);
  const mergeFacts = useConversationStore((s) => s.mergeFacts);
  const clearError = useConversationStore((s) => s.clearError);

  const conversation = useConversationStore((s) => selectConversation(s, conversationId));
  const isSubmitting = useConversationStore((s) => isConversationSubmitting(s, conversationId));

  const messages = conversation?.messages ?? [];
  const composerText = conversation?.composerText ?? "";
  const pendingTool = conversation?.pendingTool ?? null;
  const awaiting = conversation?.awaiting ?? null;
  const intent = conversation?.intent ?? null;
  const workflow = conversation?.workflow ?? null;
  const activeSurface = conversation?.activeSurface ?? null;
  const error = conversation?.error ?? null;

  const endRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Ensure conversation exists
  useEffect(() => {
    ensureConversation(conversationId, { pageKey });
  }, [conversationId, pageKey, ensureConversation]);

  // Sync selected entity into facts
  useEffect(() => {
    if (!conversation) return;
    mergeFacts(conversationId, {
      pageKey,
      selectedEntity: selectedItem ? (structuredClone(selectedItem) as Record<string, unknown>) : null,
    });
  }, [conversationId, pageKey, selectedItem, mergeFacts, !!conversation]);

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function handleOptionSelect(value: string) {
    setComposerText(conversationId, "");
    void handleSubmit(value);
  }

  async function handleSubmit(directInput?: string) {
    const input = directInput ?? composerText.trim();
    if (!input || isSubmitting) return;

    const requestId = crypto.randomUUID();
    const contextSnapshot = buildContextSnapshot(pageKey, selectedItem);

    // Build history from existing messages
    const history = messages
      .filter((m: ConversationMessage) => m.status === "complete" && m.text.trim() && m.role !== "tool")
      .slice(-10)
      .map((m: ConversationMessage) => ({ role: m.role as "user" | "assistant", content: m.text }));

    startUserTurn(conversationId, input, requestId);

    // Abort previous request if any
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const request: ChatStreamRequest = {
      conversationId,
      input,
      contextSnapshot,
      history,
      facts: conversation?.facts ?? {},
      intent,
      workflow,
      awaiting,
    };

    try {
      const result = await streamAssistantChat(
        request,
        {
          onDelta(text) {
            appendAssistantDelta(conversationId, requestId, text);
          },
          onTool(payload) {
            setPendingTool(conversationId, {
              toolName: payload.toolName,
              status: payload.status,
              summary: payload.summary,
            });
          },
          onResult(turnResult) {
            completeAssistantTurn(conversationId, requestId, turnResult);
          },
        },
        controller.signal,
      );

      // If result event wasn't received but stream ended normally
      if (result && conversation?.activeRequestId === requestId) {
        completeAssistantTurn(conversationId, requestId, result);
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      const isProtocol = error instanceof ChatProtocolError;
      const prefix = isProtocol ? "[서버 오류] " : "[연결 오류] ";
      const message = prefix + (error instanceof Error ? error.message : "Assistant request failed.");
      failAssistantTurn(conversationId, requestId, message);
    }
  }

  return (
    <div className={styles.chatAssistantPanel}>
      <div className={styles.chatAssistantHeader}>
        <div>
          <div className={styles.sectionEyebrow}>Assistant</div>
          <h2 className={styles.chatAssistantTitle}>Chat</h2>
        </div>
        <button className={styles.iconButton} onClick={onClose} type="button">
          <Icon name="chevronRight" size={16} />
        </button>
      </div>

      <div className={styles.chatAssistantThread}>
        {messages.map((message: ConversationMessage) => (
          <div
            className={`${styles.chatMessageRow} ${
              message.role === "user" ? styles.chatMessageRowUser : styles.chatMessageRowAssistant
            }`}
            key={message.id}
          >
            <div
              className={`${styles.chatMessageBubble} ${
                message.role === "user" ? styles.chatMessageBubbleUser : styles.chatMessageBubbleAssistant
              } ${
                message.status === "error" ? styles.chatMessageBubbleError : ""
              }`}
            >
              {message.text || "응답을 생성하고 있습니다..."}
            </div>
          </div>
        ))}

        {pendingTool ? (
          <div className={`${styles.chatMessageRow} ${styles.chatMessageRowAssistant}`}>
            <div className={`${styles.chatMessageBubble} ${styles.chatMessageBubbleAssistant}`}>
              🔧 {pendingTool.toolName} {pendingTool.status === "running" ? "실행 중..." : pendingTool.summary ?? ""}
            </div>
          </div>
        ) : null}

        {awaiting ? (
          <>
            <div className={`${styles.chatMessageRow} ${styles.chatMessageRowAssistant}`}>
              <div className={`${styles.chatMessageBubble} ${styles.chatMessageBubbleAssistant}`}
                style={{ opacity: 0.7, fontStyle: "italic" }}>
                {awaiting.prompt}
              </div>
            </div>
            {awaiting.options && awaiting.options.length > 0 ? (
              <div className={styles.chatAwaitingChips}>
                {awaiting.options.map((opt) => (
                  <button
                    className={styles.chatAwaitingChip}
                    key={opt.value}
                    onClick={() => handleOptionSelect(opt.value)}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        {activeSurface ? (
          <div style={{ padding: "8px 0" }}>
            <TemplateSurface
              activeSurface={activeSurface}
              onAction={(actionId, payload) => {
                // TODO: wire to action bridge
                console.log("surface action:", actionId, payload);
              }}
              onDismiss={() => {
                useConversationStore.getState().dismissSurface(conversationId);
              }}
            />
          </div>
        ) : null}

        {messages.length === 0 && !pendingTool && !awaiting && !activeSurface ? <div className={styles.chatThreadEmpty} /> : null}
        <div ref={endRef} />
      </div>

      <div className={styles.chatAssistantComposer}>
        {error ? (
          <div className={styles.assistantError} onAnimationEnd={() => clearError(conversationId)}>
            {error}
          </div>
        ) : null}
        <div className={styles.chatComposerShell}>
          <textarea
            className={styles.chatComposerInput}
            disabled={isSubmitting}
            onChange={(event) => {
              if (error) clearError(conversationId);
              setComposerText(conversationId, event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="메시지를 입력하세요"
            rows={1}
            value={composerText}
          />
          <button
            className={styles.chatComposerSend}
            disabled={!composerText.trim() || isSubmitting}
            onClick={() => void handleSubmit()}
            type="button"
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
