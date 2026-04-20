import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getTemplateContract,
  listTemplateSummaries,
} from "../catalog/template-catalog.js";
import { evaluateDecision } from "../decision/decision-engine.js";
import { executeApiResolver } from "../resolvers/api-resolver.js";
import { executeAuthResolver } from "../resolvers/auth-resolver.js";
import { logAudit, type AuditEntry } from "../audit/audit-logger.js";
import { resolveTemplateById } from "../runtime/resolve-template.js";

export function registerTools(server: McpServer): void {
  // 1. recommendTemplate
  server.tool(
    "a2ui.recommendTemplate",
    "context 기반 템플릿 추천. intent와 facts로 적절한 템플릿을 판단합니다.",
    {
      intentKey: z.string().describe("Intent key (e.g. deploy.start)"),
      facts: z.record(z.string(), z.unknown()).describe("Collected facts from agent"),
    },
    async ({ intentKey, facts }) => {
      const decision = evaluateDecision(intentKey, facts as Record<string, unknown>);
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify(decision),
        }],
      };
    },
  );

  // 2. listTemplates
  server.tool(
    "a2ui.listTemplates",
    "사용 가능한 A2UI 템플릿 목록을 반환합니다.",
    {},
    async () => {
      return { content: [{ type: "text" as const, text: JSON.stringify(listTemplateSummaries()) }] };
    },
  );

  // 3. checkAccess
  server.tool(
    "a2ui.checkAccess",
    "현재 유저의 템플릿 접근 권한을 확인합니다.",
    {
      templateId: z.string(),
      userId: z.string().optional(),
      roles: z.array(z.string()).optional(),
    },
    async ({ templateId }) => {
      const result = await executeAuthResolver(templateId, {});
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    },
  );

  // 4. resolveTemplateData — 핵심 tool
  server.tool(
    "a2ui.resolveTemplateData",
    "resolver chain을 실행하여 template payload를 생성합니다. SurfaceEnvelope을 반환합니다.",
    {
      templateId: z.string().describe("Template ID"),
      context: z.record(z.string(), z.unknown()).describe("Execution context including facts"),
    },
    async ({ templateId, context }) => {
      const ctx = context as Record<string, unknown>;
      const audit: AuditEntry = {
        timestamp: new Date().toISOString(),
        templateId,
        resolvers: [],
        bindingSuccess: false,
        validationSuccess: false,
      };

      try {
        const result = await resolveTemplateById(templateId, ctx, { checkAuth: true });
        audit.resolvers = result.trace.map((trace) => ({
          name: trace.id,
          durationMs: trace.durationMs,
          success: trace.status === "ok" || trace.status === "skipped",
          error: trace.error,
        }));
        audit.bindingSuccess = !!result.envelope;
        audit.validationSuccess = result.validation?.valid ?? false;
        audit.validationErrors = result.validation?.errors;

        if (result.error || !result.envelope) {
          logAudit(audit);
          return {
            content: [{
              type: "text" as const,
              text: JSON.stringify({
                error: result.error ?? "Template resolution failed",
                errors: result.validation?.errors,
                trace: result.trace,
              }),
            }],
            isError: true,
          };
        }

        logAudit(audit);
        return { content: [{ type: "text" as const, text: JSON.stringify(result.envelope) }] };
      } catch (err) {
        logAudit(audit);
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: String(err) }) }], isError: true };
      }
    },
  );

  // 5. executeAction
  server.tool(
    "a2ui.executeAction",
    "UI 액션을 실행합니다 (배포, 승인, 롤백 등).",
    {
      actionId: z.string(),
      templateId: z.string(),
      params: z.record(z.string(), z.unknown()).optional(),
    },
    async ({ actionId, templateId, params }) => {
      // Route to Mock API
      const actionType = actionId.includes("deploy") ? "deploy"
        : actionId.includes("approv") ? "approve"
        : actionId.includes("rollback") ? "rollback"
        : "unknown";

      try {
        const result = await executeApiResolver(
          { endpoint: `/api/actions/${actionType}`, method: "POST" },
          { ...params, actionId, templateId },
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: String(err) }) }], isError: true };
      }
    },
  );

  // 6. getTemplateContract
  server.tool(
    "a2ui.getTemplateContract",
    "특정 템플릿의 inputSchema를 반환합니다.",
    {
      templateId: z.string(),
    },
    async ({ templateId }) => {
      return { content: [{ type: "text" as const, text: JSON.stringify(getTemplateContract(templateId)) }] };
    },
  );

  console.log("  6 MCP tools registered");
}
