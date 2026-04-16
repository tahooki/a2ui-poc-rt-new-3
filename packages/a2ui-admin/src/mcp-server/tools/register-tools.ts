import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getTemplateContract,
  getTemplateRegistration,
  listTemplateSummaries,
  type TemplateRegistration,
} from "../catalog/template-catalog.js";
import { evaluateDecision } from "../decision/decision-engine.js";
import { executeApiResolver } from "../resolvers/api-resolver.js";
import { executeLlmResolver } from "../resolvers/llm-resolver.js";
import { executeAuthResolver } from "../resolvers/auth-resolver.js";
import { applyBinding } from "../binding/binding-engine.js";
import { validatePayload } from "../validation/payload-validator.js";
import { logAudit, type AuditEntry } from "../audit/audit-logger.js";

function renderTemplateString(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{([^}]+)\}/g, (_match, key: string) => String(values[key] ?? ""));
}

async function resolveCatalogData(
  registration: TemplateRegistration,
  ctx: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const resolverData: Record<string, unknown> = { ...ctx };

  switch (registration.resolver.kind) {
    case "deploy_service": {
      const serviceName = ctx[registration.resolver.serviceNameFact];
      if (typeof serviceName !== "string" || !serviceName) return resolverData;

      const endpoint = registration.resolver.endpointTemplate.replace("{serviceName}", serviceName);
      const serviceData = await executeApiResolver({ endpoint }, ctx);
      const environment = ctx.environment ?? registration.resolver.defaultEnvironment;

      Object.assign(resolverData, {
        serviceName,
        environment,
        recommendedVersion: serviceData.recommendedVersion,
        availableImages: serviceData.availableImages,
        environments: serviceData.environments,
      });

      const images = serviceData.availableImages as Array<Record<string, unknown>> | undefined;
      if (images?.[0]) {
        resolverData.imageDetail = {
          repository: images[0].repository,
          imageTag: images[0].imageTag,
          commitSha: images[0].commitSha,
          buildStatus: images[0].buildStatus,
          pushedAt: images[0].pushedAt,
        };
      }

      resolverData.requestDetail = registration.resolver.defaultRequestDetail;

      const envs = serviceData.environments as string[] | undefined;
      resolverData.preflightChecks = [
        `${envs?.length ?? 0}개 환경 확인됨`,
        `${images?.length ?? 0}개 이미지 사용 가능`,
      ];
      resolverData.impactSummary = renderTemplateString(
        registration.resolver.impactSummaryTemplate,
        {
          serviceName,
          environment,
          recommendedVersion: serviceData.recommendedVersion,
        },
      );

      return resolverData;
    }

    case "approval_queue": {
      const approvalData = await executeApiResolver({ endpoint: registration.resolver.endpoint }, ctx);
      Object.assign(resolverData, approvalData);
      return resolverData;
    }

    case "rollback_incidents": {
      const incidentData = await executeApiResolver({ endpoint: registration.resolver.endpoint }, ctx);
      Object.assign(resolverData, incidentData);
      return resolverData;
    }
  }
}

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
      const registration = getTemplateRegistration(templateId);
      const audit: AuditEntry = {
        timestamp: new Date().toISOString(),
        templateId,
        resolvers: [],
        bindingSuccess: false,
        validationSuccess: false,
      };

      try {
        if (!registration) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: "Template not found" }) }],
            isError: true,
          };
        }

        // Step 1: Auth check
        const authStart = Date.now();
        const auth = await executeAuthResolver(templateId, ctx);
        audit.resolvers.push({ name: "auth", durationMs: Date.now() - authStart, success: auth.allowed });
        if (!auth.allowed) {
          return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Access denied" }) }], isError: true };
        }

        // Step 2: API resolver
        let resolverData: Record<string, unknown> = { ...ctx };
        const apiStart = Date.now();
        try {
          resolverData = await resolveCatalogData(registration, ctx);
          audit.resolvers.push({ name: "api", durationMs: Date.now() - apiStart, success: true });
        } catch (err) {
          audit.resolvers.push({ name: "api", durationMs: Date.now() - apiStart, success: false, error: String(err) });
        }

        // Step 3: LLM resolver
        const llmStart = Date.now();
        try {
          const llmData = await executeLlmResolver(templateId, resolverData);
          Object.assign(resolverData, llmData);
          audit.resolvers.push({ name: "llm", durationMs: Date.now() - llmStart, success: true });
        } catch (err) {
          audit.resolvers.push({ name: "llm", durationMs: Date.now() - llmStart, success: false, error: String(err) });
        }

        // Step 4: Binding
        const payload = applyBinding(registration.bindingRecipe, resolverData);
        audit.bindingSuccess = true;

        // Step 5: Validation
        const validation = validatePayload(templateId, payload);
        audit.validationSuccess = validation.valid;
        audit.validationErrors = validation.errors;

        if (!validation.valid) {
          logAudit(audit);
          return {
            content: [{ type: "text" as const, text: JSON.stringify({ error: "Payload validation failed", errors: validation.errors }) }],
            isError: true,
          };
        }

        // Step 6: Build SurfaceEnvelope
        const envelope = {
          templateId,
          version: registration.version,
          payload,
          sourceIntent: (ctx.intentKey as string) ?? templateId,
          updatedAt: new Date().toISOString(),
          actions: registration.actions,
          meta: {
            generatedAt: new Date().toISOString(),
            resolverTrace: audit.resolvers.map((r) => `${r.name}:${r.durationMs}ms:${r.success ? "ok" : "fail"}`),
          },
        };

        logAudit(audit);
        return { content: [{ type: "text" as const, text: JSON.stringify(envelope) }] };
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
