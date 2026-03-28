import type { PageKey } from "./domain";

export type ConversationId = string;

export type ConversationMessageRole = "user" | "assistant" | "tool";

export type ConversationMessageStatus = "complete" | "streaming" | "error";

export type ConversationMessage = {
  id: string;
  role: ConversationMessageRole;
  text: string;
  status: ConversationMessageStatus;
};

export type ConversationFacts = {
  pageKey?: PageKey;
  selectedEntity?: Record<string, unknown> | null;
  deploy?: Record<string, unknown>;
  approval?: Record<string, unknown>;
  rollback?: Record<string, unknown>;
};

export type ConversationAwaiting =
  | null
  | {
      kind: "free_text" | "service_selection" | "confirmation";
      prompt: string;
    };

export type PendingToolState =
  | null
  | {
      toolName: string;
      status: "running" | "done" | "error";
      summary?: string;
    };

export type ConversationDecision = {
  mode: "text" | "ask_followup" | "render_surface";
  reason?: string;
};

export type ConversationState = {
  id: ConversationId;
  messages: ConversationMessage[];
  facts: ConversationFacts;
  awaiting: ConversationAwaiting;
  pendingTool: PendingToolState;
  decision: ConversationDecision | null;
  activeSurface: null | {
    templateId: string;
    payload: Record<string, unknown>;
  };
  activeRequestId: string | null;
  composerText: string;
  error: string | null;
};
