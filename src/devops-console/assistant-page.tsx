"use client";

import { useState } from "react";
import { AppFrame } from "@/devops-console/shell/app-frame";

export function AssistantPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AppFrame
      activePage="assistant"
      assistantOpen={false}
      hideAssistantTrigger
      lastUpdated=""
      onToggleAssistant={() => {}}
      onToggleSidebar={() => setSidebarOpen((value) => !value)}
      pageScope="a2ui template admin"
      pageTitle="Template Admin"
      sidebarOpen={sidebarOpen}
    >
      <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--console-text-muted)" }}>
        <p style={{ fontSize: 16, marginBottom: 8 }}>Template Admin has moved.</p>
        <p style={{ fontSize: 14 }}>
          Open{" "}
          <a
            href="http://localhost:3100"
            style={{ color: "var(--console-info)" }}
            target="_blank"
            rel="noopener noreferrer"
          >
            http://localhost:3100
          </a>
          {" "}to access the admin console.
        </p>
      </div>
    </AppFrame>
  );
}
