import approveSeedData from "@/devops-chat/data/seed/approve.json";
import type { ToolDefinition } from "../tool-registry";

export const getApprovalQueueSummary: ToolDefinition = {
  name: "getApprovalQueueSummary",
  description: "현재 승인 대기열 요약 정보를 조회합니다.",
  triggerPatterns: [
    /승인\s*대기/,
    /승인\s*큐/,
    /승인\s*목록/,
    /승인\s*현황/,
    /pending\s*approval/i,
    /approval\s*queue/i,
    /approval\s*summary/i,
  ],
  async execute() {
    const seed = approveSeedData as { items: Record<string, unknown>[] };
    const items = seed.items ?? [];

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const item of items) {
      const status = item.status as string;
      const type = item.type as string;
      byStatus[status] = (byStatus[status] ?? 0) + 1;
      byType[type] = (byType[type] ?? 0) + 1;
    }

    const summaryItems = items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      environment: item.environment,
      requestedBy: item.requestedBy,
      riskSummary: item.riskSummary,
      riskTone: item.riskTone,
      status: item.status,
    }));

    const statusParts = Object.entries(byStatus)
      .map(([status, count]) => `${status} ${count}건`)
      .join(", ");

    const typeParts = Object.entries(byType)
      .map(([type, count]) => `${type} ${count}건`)
      .join(", ");

    return {
      ok: true,
      toolName: "getApprovalQueueSummary",
      data: { items: summaryItems, byStatus, byType },
      summary: items.length === 0
        ? "현재 승인 대기 항목이 없습니다."
        : `총 ${items.length}건 (${statusParts}). 유형별: ${typeParts}.`,
    };
  },
};
