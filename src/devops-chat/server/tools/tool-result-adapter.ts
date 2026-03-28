import type { ConversationFacts } from "@/devops-chat/types/conversation";
import type { ToolOutput } from "./tool-registry";

export type FactsPatch = Partial<ConversationFacts>;

export type AdaptedToolResult = {
  factsPatch: FactsPatch;
  summary: string;
};

/**
 * Convert a tool output into a facts patch and a human-readable summary.
 * Each tool's data shape is different, so this adapter normalizes the result
 * for the conversation store and the assistant message.
 */
export function adaptToolResult(output: ToolOutput): AdaptedToolResult {
  if (!output.ok) {
    return {
      factsPatch: {},
      summary: output.summary || `${output.toolName} 실행 중 오류가 발생했습니다.`,
    };
  }

  switch (output.toolName) {
    case "getPreviousDeployments":
      return {
        factsPatch: { deploy: { previousDeployments: output.data } },
        summary: output.summary,
      };

    case "getDeployableServices":
      return {
        factsPatch: { deploy: { deployableServices: output.data } },
        summary: output.summary,
      };

    case "getApprovalQueueSummary":
      return {
        factsPatch: { approval: { queueSummary: output.data } },
        summary: output.summary,
      };

    case "getRollbackCandidates":
      return {
        factsPatch: { rollback: { candidates: output.data } },
        summary: output.summary,
      };

    default:
      return {
        factsPatch: {},
        summary: output.summary,
      };
  }
}
