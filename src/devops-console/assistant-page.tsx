"use client";

import { useState } from "react";
import { AppFrame } from "@/devops-console/shell/app-frame";
import { TemplateManagerPage } from "@/devops-console/template-admin/template-manager-page";

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
      pageScope="a2ui template manager"
      pageTitle="Template Admin"
      sidebarOpen={sidebarOpen}
    >
      <TemplateManagerPage />
    </AppFrame>
  );
}
