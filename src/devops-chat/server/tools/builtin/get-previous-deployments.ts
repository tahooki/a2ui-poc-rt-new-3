import deploySeedData from "@/devops-chat/data/seed/deploy.json";
import type { ToolDefinition } from "../tool-registry";

export const getPreviousDeployments: ToolDefinition = {
  name: "getPreviousDeployments",
  description: "최근 배포 이력과 등록된 이미지 목록을 조회합니다.",
  triggerPatterns: [
    /이전\s*배포/,
    /최근\s*배포/,
    /배포\s*이력/,
    /배포\s*히스토리/,
    /배포\s*목록/,
    /previous\s*deploy/i,
    /recent\s*deploy/i,
    /deploy.*history/i,
  ],
  async execute() {
    const seed = deploySeedData as { items: Record<string, unknown>[]; images: Record<string, unknown>[] };

    const images = (seed.images ?? []).map((img) => ({
      id: img.id,
      repository: img.repository,
      imageTag: img.imageTag,
      buildStatus: img.buildStatus,
      pushedAt: img.pushedAt,
      services: img.services,
    }));

    const items = (seed.items ?? []).map((item) => ({
      id: item.id,
      service: item.service,
      environment: item.environment,
      targetVersion: item.targetVersion,
      status: item.status,
      requestedBy: item.requestedBy,
      requestedAt: item.requestedAt,
    }));

    const total = items.length + images.length;

    return {
      ok: true,
      toolName: "getPreviousDeployments",
      data: { items, images },
      summary: total === 0
        ? "현재 등록된 배포 요청이 없습니다. 등록된 이미지는 확인할 수 있습니다."
        : `배포 요청 ${items.length}건, 등록 이미지 ${images.length}건이 확인됩니다.`,
    };
  },
};
