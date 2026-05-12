import type { ConversationFacts, BindingResult } from "@/devops-chat/types/conversation";
import type {
  DeployHistoryTableColumn,
  DeployHistoryTableRow,
  DeployHistoryTableTemplateData,
} from "@/devops-chat/types/templates";
import { getSlotValue } from "@/devops-chat/server/orchestration/slot-memory";
import { deployHistoryTableSurfaceConfig } from "@/devops-chat/templates/surface-configs/deploy-history-table";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item)) : [];
}

function stringFrom(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function normalizeRows(data: Record<string, unknown>): DeployHistoryTableRow[] {
  return asArray(data.history ?? data.items).map((row) => ({
    service: stringFrom(row.service, "unknown"),
    environment: stringFrom(row.environment, "production"),
    version: stringFrom(row.version ?? row.targetVersion, "unknown"),
    status: stringFrom(row.status, "unknown"),
    deployedBy: stringFrom(row.deployedBy ?? row.requestedBy, "unknown"),
    deployedAt: stringFrom(row.deployedAt ?? row.requestedAt, ""),
  }));
}

const COLUMNS: DeployHistoryTableColumn[] = [
  { key: "service", label: "Service", width: "18%" },
  { key: "environment", label: "Env", width: "14%" },
  { key: "version", label: "Version", width: "16%" },
  { key: "status", label: "Status", width: "14%", format: "status" },
  { key: "deployedBy", label: "Deployed by", width: "18%" },
  { key: "deployedAt", label: "Deployed at" },
];

export function bindDeployHistoryTable(
  facts: ConversationFacts,
  intentKey: string,
): BindingResult {
  const usedFacts: string[] = [];
  const missingFacts: string[] = [];

  const data = asRecord(getSlotValue(facts, "deploy.previousDeployments"));
  if (data) usedFacts.push("deploy.previousDeployments");
  else missingFacts.push("deploy.previousDeployments");

  if (missingFacts.length > 0) {
    return { ok: false, reason: `missing: ${missingFacts.join(", ")}`, missingFacts };
  }

  const rows = normalizeRows(data!);
  const images = asArray(data!.images);
  const requestedServiceName = stringFrom(data!.requestedServiceName);
  const latest = rows[0];
  const state: DeployHistoryTableTemplateData["state"] = rows.length > 0 ? "ready" : "empty";
  const title = requestedServiceName
    ? `${requestedServiceName} deployment history`
    : "Deployment history";
  const summary = rows.length > 0
    ? `${rows.length} deployments${requestedServiceName ? ` for ${requestedServiceName}` : ""}`
    : requestedServiceName
      ? `${requestedServiceName} 배포 이력이 없습니다.`
      : "배포 이력이 없습니다.";

  const summaryItems = [
    { label: "Deployments", value: String(rows.length) },
    { label: "Images", value: String(images.length) },
    { label: "Scope", value: requestedServiceName || "All services" },
  ];

  if (latest) {
    summaryItems.push({ label: "Latest", value: `${latest.service} ${latest.version}` });
    summaryItems.push({ label: "Last deployed", value: latest.deployedAt });
  }

  const payload: DeployHistoryTableTemplateData = {
    templateId: "deploy_history_table",
    state,
    title,
    summary,
    summaryItems,
    rows,
    columns: COLUMNS,
    emptyMessage: requestedServiceName
      ? `${requestedServiceName} 배포 이력이 없습니다.`
      : "배포 이력이 없습니다.",
  };

  return {
    ok: true,
    surface: {
      templateId: "deploy_history_table",
      payload: payload as unknown as Record<string, unknown>,
      actions: [],
      surfaceConfig: deployHistoryTableSurfaceConfig,
      sourceIntent: intentKey,
      updatedAt: new Date().toISOString(),
      freshnessKey: `deploy-history:${requestedServiceName || "all"}:${rows.length}`,
      bindingTrace: { usedFacts, missingFacts },
    },
  };
}
