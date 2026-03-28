"use client";

import { useState } from "react";
import styles from "@/devops-console/console-page.module.css";
import { DecisionTracePanel } from "./decision-trace-panel";
import { ToolExecutionPanel } from "./tool-execution-panel";
import { FactsDumpPanel } from "./facts-dump-panel";
import { ValidationErrorPanel } from "./validation-error-panel";
import type { ConversationDiagnostics } from "@/devops-chat/store/conversation-store";
import type { DecisionTrace, PendingToolState } from "@/devops-chat/types/conversation";

type DebugTabKey = "decision" | "tools" | "facts" | "errors";

type DebugDrawerProps = {
  diagnostics: ConversationDiagnostics | null;
  pendingTool?: PendingToolState;
};

const TABS: { key: DebugTabKey; label: string }[] = [
  { key: "decision", label: "Decision" },
  { key: "tools", label: "Tools" },
  { key: "facts", label: "Facts" },
  { key: "errors", label: "Errors" },
];

export function DebugDrawer({ diagnostics, pendingTool }: DebugDrawerProps) {
  const [activeTab, setActiveTab] = useState<DebugTabKey>("decision");

  if (!diagnostics) {
    return <div style={{ opacity: 0.5, padding: 8 }}>Conversation이 초기화되지 않았습니다.</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
        {TABS.map((tab) => (
          <button
            className={styles.chatAwaitingChip}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={activeTab === tab.key ? { fontWeight: 700 } : undefined}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "decision" ? (
        <DecisionTracePanel trace={diagnostics.lastDecisionTrace as DecisionTrace | null} />
      ) : null}

      {activeTab === "tools" ? (
        <ToolExecutionPanel pendingTool={pendingTool ?? null} />
      ) : null}

      {activeTab === "facts" ? (
        <FactsDumpPanel facts={diagnostics.factsSnapshot} />
      ) : null}

      {activeTab === "errors" ? (
        <ValidationErrorPanel
          activeSurfaceMeta={diagnostics.activeSurfaceMeta}
          lastError={diagnostics.lastError}
        />
      ) : null}
    </div>
  );
}
