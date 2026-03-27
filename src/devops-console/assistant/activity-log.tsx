"use client";

import { useEffect, useRef } from "react";
import styles from "@/devops-console/console-page.module.css";
import type { AssistantMessage } from "@/devops-chat/types/domain";

export function AssistantActivityLog({ messages }: { messages: AssistantMessage[] }) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <section className={styles.assistantPanel}>
      <div className={styles.assistantSectionHeader}>
        <div>
          <div className={styles.sectionEyebrow}>Recent log</div>
          <h3 className={styles.panelTitle}>Contextual assistant output</h3>
        </div>
      </div>
      <div className={styles.assistantLog}>
        {messages.length ? (
          messages.map((message) => (
            <div
              className={`${styles.assistantLogItem} ${
                message.role === "user" ? styles.assistantLogItemUser : styles.assistantLogItemAssistant
              } ${message.status === "streaming" ? styles.assistantLogItemStreaming : ""} ${
                message.status === "error" ? styles.assistantLogItemError : ""
              }`}
              key={message.id}
            >
              <div className={styles.assistantLogMeta}>
                <span>{message.role === "user" ? "Operator" : "Assistant"}</span>
                <span>
                  {message.status === "streaming"
                    ? "streaming"
                    : message.status === "error"
                      ? "fallback"
                      : "ready"}
                </span>
              </div>
              <div>{message.content || "응답을 생성하고 있습니다..."}</div>
            </div>
          ))
        ) : (
          <div className={styles.assistantLogEmpty}>아직 대화가 없습니다.</div>
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
}
