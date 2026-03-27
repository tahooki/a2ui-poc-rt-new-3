"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/devops-console/foundation/icon-registry";
import styles from "@/devops-console/console-page.module.css";
import { useChatAssistantStore } from "@/devops-chat/store/chat-assistant-store";
import type { ApprovalItem, DeployItem, PageKey, RollbackItem } from "@/devops-chat/types/domain";

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
  const messages = useChatAssistantStore((state) => state.messages);
  const composerText = useChatAssistantStore((state) => state.composerText);
  const isSubmitting = useChatAssistantStore((state) => state.isSubmitting);
  const error = useChatAssistantStore((state) => state.error);
  const clearError = useChatAssistantStore((state) => state.clearError);
  const setComposerText = useChatAssistantStore((state) => state.setComposerText);
  const submitPrompt = useChatAssistantStore((state) => state.submitPrompt);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

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
        {messages.map((message) => (
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
              {message.content || "응답을 생성하고 있습니다..."}
            </div>
          </div>
        ))}

        {messages.length ? null : <div className={styles.chatThreadEmpty} />}
        <div ref={endRef} />
      </div>

      <div className={styles.chatAssistantComposer}>
        {error ? (
          <div className={styles.assistantError} onAnimationEnd={clearError}>
            {error}
          </div>
        ) : null}
        <div className={styles.chatComposerShell}>
          <textarea
            className={styles.chatComposerInput}
            disabled={isSubmitting}
            onChange={(event) => {
              if (error) {
                clearError();
              }
              setComposerText(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submitPrompt({ pageKey, selectedItem });
              }
            }}
            placeholder="메시지를 입력하세요"
            rows={1}
            value={composerText}
          />
          <button
            className={styles.chatComposerSend}
            disabled={!composerText.trim() || isSubmitting}
            onClick={() => void submitPrompt({ pageKey, selectedItem })}
            type="button"
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
