import type { ConversationFacts } from "@/devops-chat/types/conversation";
import type { ToolOutput } from "./tool-registry";

export type FactsPatch = Partial<ConversationFacts>;

export type SlotPatchEntry = { value: unknown; source: "tool"; confidence?: number };

export type AdaptedToolResult = {
  factsPatch: FactsPatch;
  slotPatch: Record<string, SlotPatchEntry>;
  summary: string;
};

/**
 * Convert a tool output into a facts patch, slot patch, and a human-readable summary.
 */
export function adaptToolResult(output: ToolOutput): AdaptedToolResult {
  if (!output.ok) {
    return {
      factsPatch: {},
      slotPatch: {},
      summary: output.summary || `${output.toolName} 실행 중 오류가 발생했습니다.`,
    };
  }

  switch (output.toolName) {
    case "getPreviousDeployments":
      return {
        factsPatch: { deploy: { previousDeployments: output.data } },
        slotPatch: {
          "deploy.previousDeployments": { value: output.data, source: "tool" },
        },
        summary: output.summary,
      };

    case "getDeployableServices": {
      const data = output.data as { services?: string[] } | null;
      return {
        factsPatch: { deploy: { deployableServices: output.data } },
        slotPatch: data?.services
          ? { "deploy.availableServices": { value: data.services, source: "tool" } }
          : {},
        summary: output.summary,
      };
    }

    case "getServiceDeployContext": {
      const data = output.data as {
        serviceName?: string;
        recommendedVersion?: string;
        environments?: string[];
      } | null;
      const slotPatch: Record<string, SlotPatchEntry> = {};
      if (data) {
        slotPatch["deploy.selectedServiceContext"] = { value: data, source: "tool" };
        if (data.recommendedVersion) {
          slotPatch["deploy.targetVersion"] = { value: data.recommendedVersion, source: "tool" };
        }
      }
      return {
        factsPatch: { deploy: { serviceDeployContext: output.data } },
        slotPatch,
        summary: output.summary,
      };
    }

    case "getApprovalQueueSummary": {
      const queueData = output.data as { items?: Array<Record<string, unknown>> } | null;
      const queueItems = queueData?.items ?? [];
      return {
        factsPatch: { approval: { queueSummary: output.data, queueItems } },
        slotPatch: queueItems.length > 0
          ? { "approval.queueItems": { value: queueItems, source: "tool" } }
          : {},
        summary: output.summary,
      };
    }

    case "getRollbackCandidates": {
      const rbData = output.data as { candidates?: unknown[]; serviceHealth?: unknown[] } | null;
      const rbCandidates = rbData?.candidates ?? [];
      const rbServiceHealth = rbData?.serviceHealth ?? [];
      return {
        factsPatch: { rollback: { candidates: output.data, serviceHealth: rbServiceHealth } },
        slotPatch: rbCandidates.length > 0
          ? { "rollback.candidates": { value: rbCandidates, source: "tool" } }
          : {},
        summary: output.summary,
      };
    }

    default:
      return {
        factsPatch: {},
        slotPatch: {},
        summary: output.summary,
      };
  }
}
