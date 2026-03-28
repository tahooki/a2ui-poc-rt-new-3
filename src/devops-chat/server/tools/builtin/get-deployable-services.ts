import deploySeedData from "@/devops-chat/data/seed/deploy.json";
import type { ToolDefinition } from "../tool-registry";

export const getDeployableServices: ToolDefinition = {
  name: "getDeployableServices",
  description: "배포 가능한 서비스 및 이미지 목록을 조회합니다.",
  triggerPatterns: [
    /배포\s*가능/,
    /서비스\s*목록/,
    /서비스\s*리스트/,
    /deployable/i,
    /service\s*list/i,
    /available\s*service/i,
  ],
  async execute() {
    const seed = deploySeedData as { images: Record<string, unknown>[] };
    const images = seed.images ?? [];

    const serviceSet = new Set<string>();
    for (const img of images) {
      const services = img.services as string[] | undefined;
      if (services) {
        for (const s of services) serviceSet.add(s);
      }
    }

    const services = Array.from(serviceSet);

    const imageSummaries = images.map((img) => ({
      id: img.id,
      repository: img.repository,
      imageTag: img.imageTag,
      buildStatus: img.buildStatus,
      services: img.services,
    }));

    return {
      ok: true,
      toolName: "getDeployableServices",
      data: { services, images: imageSummaries },
      summary: services.length === 0
        ? "현재 배포 가능한 서비스가 없습니다."
        : `배포 가능한 서비스 ${services.length}개: ${services.join(", ")}. 등록 이미지 ${images.length}건.`,
    };
  },
};
