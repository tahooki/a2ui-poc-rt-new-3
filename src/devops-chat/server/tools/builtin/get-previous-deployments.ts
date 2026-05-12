import deploySeedData from "@/devops-chat/data/seed/deploy.json";
import type { ToolDefinition } from "../tool-registry";

type DeploySeed = {
  items?: Record<string, unknown>[];
  images?: Record<string, unknown>[];
  history?: Record<string, unknown>[];
};

type FactsLike = {
  slots?: Record<string, { value?: unknown }>;
};

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function getRequestedServiceName(facts: FactsLike, contextSnapshot: Record<string, unknown>): string | null {
  const slotValue = facts.slots?.["deploy.serviceName"]?.value;
  if (typeof slotValue === "string" && slotValue.length > 0) return slotValue;

  const contextValue = contextSnapshot.serviceName;
  if (typeof contextValue === "string" && contextValue.length > 0) return contextValue;

  const selectedEntity = contextSnapshot.selectedEntity;
  if (selectedEntity && typeof selectedEntity === "object" && !Array.isArray(selectedEntity)) {
    const service = (selectedEntity as Record<string, unknown>).service;
    if (typeof service === "string" && service.length > 0) return service;
  }

  return null;
}

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
  async execute({ facts, contextSnapshot }) {
    const seed = deploySeedData as DeploySeed;
    const requestedServiceName = getRequestedServiceName(facts, contextSnapshot);

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

    const allHistory = (seed.history ?? []).map((entry) => ({
      id: entry.id,
      service: stringValue(entry.service),
      environment: stringValue(entry.environment, "production"),
      version: stringValue(entry.version ?? entry.targetVersion, "unknown"),
      status: stringValue(entry.status, "unknown"),
      deployedBy: stringValue(entry.deployedBy ?? entry.requestedBy, "unknown"),
      deployedAt: stringValue(entry.deployedAt ?? entry.requestedAt, ""),
    }));

    const history = requestedServiceName
      ? allHistory.filter((entry) => entry.service.toLowerCase() === requestedServiceName.toLowerCase())
      : allHistory;

    const latest = history[0];
    const scope = requestedServiceName ? `${requestedServiceName} ` : "";

    return {
      ok: true,
      toolName: "getPreviousDeployments",
      data: { items, images, history, requestedServiceName },
      summary: latest
        ? `${scope}최근 배포 이력 ${history.length}건, 등록 이미지 ${images.length}건이 확인됩니다. 최신 배포는 ${latest.service} ${latest.version} (${latest.deployedAt})입니다.`
        : `${scope}배포 이력이 없습니다. 등록 이미지 ${images.length}건, 배포 요청 ${items.length}건이 확인됩니다.`,
    };
  },
};
