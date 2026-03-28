import type { PageKey } from "./domain";
import type {
  ConversationAwaiting,
  ConversationFacts,
  ConversationId,
  ConversationIntentState,
  ConversationWorkflowState,
  DecisionTrace,
  PendingToolState,
  SurfaceEnvelope,
  SurfaceIntentCandidate,
} from "./conversation";

export type AssistantTurnRequest = {
  conversationId: ConversationId;
  input: string;
  contextSnapshot: ContextSnapshot;
  history: AssistantTurnHistoryItem[];
  facts: ConversationFacts;
  intent?: ConversationIntentState | null;
  workflow?: ConversationWorkflowState | null;
  awaiting?: ConversationAwaiting;
};

export type ContextSnapshot = {
  pageKey: PageKey;
  selectedEntity: Record<string, unknown> | null;
  extra?: Record<string, unknown>;
};

export type AssistantTurnHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type ToolResultEntry = {
  toolName: string;
  summary: string;
};

export type AssistantTurnResponse = {
  requestId: string;
  message: {
    role: "assistant";
    text: string;
  };
  surface: SurfaceEnvelope | null;
  intent?: ConversationIntentState | null;
  workflow?: ConversationWorkflowState | null;
  awaiting: ConversationAwaiting;
  pendingTool: PendingToolState;
  decision: {
    mode: "text" | "ask_followup" | "render_surface";
    reason?: string;
  };
  decisionTrace?: DecisionTrace | null;
  surfaceIntent?: SurfaceIntentCandidate | null;
  toolResults?: ToolResultEntry[];
  factsPatch?: Partial<ConversationFacts>;
};

/**
 * SSE event types emitted by `/api/chat`.
 *
 * - delta: streaming text chunk
 * - tool: tool execution status update
 * - result: final structured turn response
 * - error: server-side error
 * - done: stream end signal
 */
export type SseEventType = "delta" | "tool" | "result" | "error" | "done";

export type SseDeltaPayload = { text: string };
export type SseToolPayload = { toolName: string; status: "running" | "done" | "error"; summary?: string };
export type SseResultPayload = AssistantTurnResponse;
export type SseErrorPayload = { message: string };
export type SseDonePayload = Record<string, never>;
