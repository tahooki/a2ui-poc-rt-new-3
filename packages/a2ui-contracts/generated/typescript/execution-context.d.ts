/* Auto-generated from execution-context.schema.json — do not edit */

/**
 * 런타임 실행 시 필요한 공통 문맥
 */
export interface ExecutionContext {
  user: {
    id: string;
    name: string;
    roles: string[];
  };
  org: {
    id: string;
    name: string;
  };
  project?: {
    id?: string;
    name?: string;
  };
  conversationId: string;
  sessionId: string;
  requestId: string;
  selectedEntity?: {
    type?: string;
    id?: string;
    name?: string;
  };
  environment: "production" | "staging" | "development";
  modelConfig?: {
    provider?: string;
    model?: string;
    maxTokens?: number;
  };
}
