import type { ActionEvent } from "@a2ui/contracts";

export function createActionEvent(
  actionId: string,
  templateId: string,
  sessionContext: { conversationId: string; userId: string },
  options?: {
    kind?: "submit" | "select" | "refresh" | "navigate";
    params?: Record<string, unknown>;
  },
): ActionEvent {
  return {
    actionId,
    templateId,
    kind: options?.kind,
    params: options?.params,
    sessionContext: {
      ...sessionContext,
      requestId: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    },
  };
}
