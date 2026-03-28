import rollbackSeedData from "@/devops-chat/data/seed/rollback.json";
import type { ToolDefinition } from "../tool-registry";

export const getRollbackCandidates: ToolDefinition = {
  name: "getRollbackCandidates",
  description: "롤백 대상 서비스 및 후보 버전 목록을 조회합니다.",
  triggerPatterns: [
    /롤백\s*후보/,
    /롤백\s*대상/,
    /롤백\s*가능/,
    /롤백\s*목록/,
    /rollback\s*candidate/i,
    /rollback\s*target/i,
    /rollback\s*list/i,
  ],
  async execute() {
    const seed = rollbackSeedData as { items: Record<string, unknown>[] };
    const items = seed.items ?? [];

    const candidates = items.map((item) => {
      const history = (item.deploymentHistory as Record<string, unknown>[] | undefined) ?? [];
      const eligible = history.filter((d) => d.rollbackEligible === true);

      return {
        id: item.id,
        service: item.service,
        environment: item.environment,
        currentVersion: item.currentVersion,
        severity: item.severity,
        incidentSummary: item.incidentSummary,
        recommendedRollbackVersion: item.recommendedRollbackVersion,
        eligibleVersions: eligible.map((d) => ({
          id: d.id,
          version: d.version,
          status: d.status,
          rollbackRisk: d.rollbackRisk,
        })),
      };
    });

    const totalEligible = candidates.reduce((sum, c) => sum + c.eligibleVersions.length, 0);

    return {
      ok: true,
      toolName: "getRollbackCandidates",
      data: { candidates },
      summary: candidates.length === 0
        ? "현재 롤백 대상 서비스가 없습니다."
        : `롤백 대상 서비스 ${candidates.length}개, 롤백 가능 버전 총 ${totalEligible}건.`,
    };
  },
};
