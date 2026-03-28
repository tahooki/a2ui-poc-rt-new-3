import deploySeedData from "@/devops-chat/data/seed/deploy.json";
import type { ToolDefinition } from "../tool-registry";

export const getServiceDeployContext: ToolDefinition = {
  name: "getServiceDeployContext",
  description: "특정 서비스의 배포 컨텍스트(이미지, 환경, 추천 버전)를 조회합니다.",
  triggerPatterns: [
    /서비스\s*배포\s*컨텍스트/,
    /service\s*deploy\s*context/i,
  ],
  async execute({ contextSnapshot }) {
    const serviceName = (contextSnapshot?.serviceName as string) ?? null;

    if (!serviceName) {
      return {
        ok: false,
        toolName: "getServiceDeployContext",
        data: null,
        summary: "서비스 이름이 지정되지 않았습니다.",
      };
    }

    const seed = deploySeedData as {
      images: Array<{
        id: string;
        repository: string;
        imageTag: string;
        imageUri: string;
        buildStatus: string;
        services: string[];
        notes: string[];
        pushedAt: string;
      }>;
    };

    const matchedImages = (seed.images ?? []).filter((img) =>
      img.services.some((s) => s.toLowerCase() === serviceName.toLowerCase()),
    );

    if (matchedImages.length === 0) {
      return {
        ok: false,
        toolName: "getServiceDeployContext",
        data: null,
        summary: `서비스 "${serviceName}"에 대한 배포 이미지를 찾을 수 없습니다.`,
      };
    }

    // Sort by pushedAt descending to recommend latest
    const sorted = [...matchedImages].sort((a, b) =>
      b.pushedAt.localeCompare(a.pushedAt),
    );

    const recommended = sorted[0];

    const environments = ["production", "staging", "development"];

    return {
      ok: true,
      toolName: "getServiceDeployContext",
      data: {
        serviceName,
        availableImages: sorted.map((img) => ({
          id: img.id,
          imageTag: img.imageTag,
          buildStatus: img.buildStatus,
          pushedAt: img.pushedAt,
        })),
        recommendedVersion: recommended.imageTag,
        recommendedImageId: recommended.id,
        environments,
      },
      summary: `${serviceName} 배포 컨텍스트: 이미지 ${sorted.length}건, 추천 버전 ${recommended.imageTag}.`,
    };
  },
};
