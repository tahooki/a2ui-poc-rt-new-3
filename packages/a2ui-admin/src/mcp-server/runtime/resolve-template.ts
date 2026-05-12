import type { TemplateRegistration } from "../catalog/template-catalog.js";
import { getTemplateRegistration } from "../catalog/template-catalog.js";
import type { ResolverConfig, StoredTemplateAction } from "../catalog/template-store.js";
import { applyBinding } from "../binding/binding-engine.js";
import { executeApiResolver } from "../resolvers/api-resolver.js";
import { executeAuthResolver } from "../resolvers/auth-resolver.js";
import { executeLlmResolver } from "../resolvers/llm-resolver.js";
import { validatePayload, type ValidationResult } from "../validation/payload-validator.js";

export type ResolverTrace = {
  id: string;
  kind: string;
  phase: string;
  durationMs: number;
  status: "ok" | "skipped" | "failed";
  missingFacts?: string[];
  error?: string;
};

export type ResolveTemplateResult = {
  envelope?: {
    templateId: string;
    version: string;
    sourceIntent: string;
    updatedAt: string;
    payload: Record<string, unknown>;
    actions: StoredTemplateAction[];
    surfaceConfig?: Record<string, unknown>;
    meta: {
      generatedAt: string;
      catalogTemplateId?: string;
      resolverTrace: string[];
      resolverTraceDetail: ResolverTrace[];
    };
  };
  validation?: ValidationResult;
  resolverData?: Record<string, unknown>;
  trace: ResolverTrace[];
  error?: string;
};

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.length > 0;
  return true;
}

function getByPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (current === undefined || current === null) return undefined;
    if (Array.isArray(current) && /^\d+$/.test(part)) return current[Number(part)];
    if (typeof current === "object") return (current as Record<string, unknown>)[part];
    return undefined;
  }, source);
}

function setByPath(target: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = target;
  for (const part of parts.slice(0, -1)) {
    const existing = current[part];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function renderTemplateString(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{([^}]+)\}/g, (_match, key: string) => String(getByPath(values, key) ?? values[key] ?? ""));
}

function missingRequiredFacts(resolver: ResolverConfig, data: Record<string, unknown>): string[] {
  return (resolver.requiredFacts ?? []).filter((fact) => !hasValue(data[fact]));
}

function applyAssignments(resolver: ResolverConfig, resolverData: Record<string, unknown>): void {
  for (const [target, sourcePath] of Object.entries(resolver.assign ?? {})) {
    setByPath(resolverData, target, getByPath(resolverData, sourcePath));
  }
}

function applyStaticDefaults(resolver: ResolverConfig, resolverData: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(resolver.values ?? {})) {
    if (!hasValue(getByPath(resolverData, key))) {
      setByPath(resolverData, key, typeof value === "string" ? renderTemplateString(value, resolverData) : value);
    }
  }
}

function validateResolverOutputs(resolver: ResolverConfig, resolverData: Record<string, unknown>): string[] {
  if (!resolver.outputAlias) return [];
  return (resolver.requiredOutputs ?? []).filter((output) => {
    const fromAlias = getByPath(resolverData, `${resolver.outputAlias}.${output}`);
    const fromRoot = getByPath(resolverData, output);
    return !hasValue(fromAlias) && !hasValue(fromRoot);
  });
}

function applyBuiltInDerivedFields(registration: TemplateRegistration, resolverData: Record<string, unknown>): void {
  if (registration.templateId === "deploy_history_table") {
    const rows = Array.isArray(resolverData.rows)
      ? resolverData.rows.filter((item): item is Record<string, unknown> => !!item && typeof item === "object" && !Array.isArray(item))
      : [];
    const images = Array.isArray(resolverData.images) ? resolverData.images : [];
    const serviceName = typeof resolverData.serviceName === "string" ? resolverData.serviceName : "";
    const normalizedRows = rows.map((row) => ({
      service: String(row.service ?? "unknown"),
      environment: String(row.environment ?? "production"),
      version: String(row.version ?? row.targetVersion ?? "unknown"),
      status: String(row.status ?? "unknown"),
      deployedBy: String(row.deployedBy ?? row.requestedBy ?? "unknown"),
      deployedAt: String(row.deployedAt ?? row.requestedAt ?? ""),
    }));
    const latest = normalizedRows[0];

    resolverData.rows = normalizedRows;
    resolverData.state = normalizedRows.length > 0 ? "ready" : "empty";
    resolverData.title = serviceName ? `${serviceName} deployment history` : "Deployment history";
    resolverData.summary = normalizedRows.length > 0
      ? `${normalizedRows.length} deployments${serviceName ? ` for ${serviceName}` : ""}`
      : serviceName
        ? `${serviceName} 배포 이력이 없습니다.`
        : "배포 이력이 없습니다.";
    resolverData.summaryItems = [
      { label: "Deployments", value: String(normalizedRows.length) },
      { label: "Images", value: String(images.length) },
      { label: "Scope", value: serviceName || "All services" },
      ...(latest
        ? [
            { label: "Latest", value: `${latest.service} ${latest.version}` },
            { label: "Last deployed", value: latest.deployedAt },
          ]
        : []),
    ];
    resolverData.emptyMessage = serviceName
      ? `${serviceName} 배포 이력이 없습니다.`
      : "배포 이력이 없습니다.";
    return;
  }

  if (registration.templateId !== "deploy_launchpad") return;

  const service = resolverData.service as Record<string, unknown> | undefined;
  if (!hasValue(resolverData.recommendedVersion)) resolverData.recommendedVersion = service?.recommendedVersion;
  if (!hasValue(resolverData.availableImages)) resolverData.availableImages = service?.availableImages;
  if (!hasValue(resolverData.environments)) resolverData.environments = service?.environments;

  const images = resolverData.availableImages as Array<Record<string, unknown>> | undefined;
  if (images?.[0] && !resolverData.imageDetail) {
    resolverData.imageDetail = {
      repository: images[0].repository,
      imageTag: images[0].imageTag,
      imageUri: images[0].imageUri,
      gitRef: images[0].gitRef,
      commitSha: images[0].commitSha,
      imageDigest: images[0].imageDigest,
      buildStatus: images[0].buildStatus,
      pushedAt: images[0].pushedAt,
    };
  }

  const history = resolverData.deploymentHistory as Array<Record<string, unknown>> | undefined;
  if (history?.[0] && !resolverData.lastDeployment) resolverData.lastDeployment = history[0];

  const envs = resolverData.environments as string[] | undefined;
  if (!resolverData.preflightChecks) {
    resolverData.preflightChecks = [
      `${envs?.length ?? 0}개 환경 확인됨`,
      `${images?.length ?? 0}개 이미지 사용 가능`,
    ];
  }

  if (!resolverData.impactSummary) {
    const template = String(resolverData.impactSummaryTemplate ?? "{serviceName} {environment} 환경에 {recommendedVersion} 배포");
    resolverData.impactSummary = renderTemplateString(template, resolverData);
  }
}

async function runResolver(
  registration: TemplateRegistration,
  resolver: ResolverConfig,
  resolverData: Record<string, unknown>,
): Promise<ResolverTrace> {
  const start = Date.now();
  const phase = resolver.phase ?? "blocking";
  const missingFacts = missingRequiredFacts(resolver, resolverData);

  if (missingFacts.length > 0) {
    return {
      id: resolver.id,
      kind: resolver.kind,
      phase,
      durationMs: Date.now() - start,
      status: phase === "blocking" ? "failed" : "skipped",
      missingFacts,
      error: phase === "blocking" ? `Missing required facts: ${missingFacts.join(", ")}` : undefined,
    };
  }

  try {
    switch (resolver.kind) {
      case "http_get": {
        const endpoint = renderTemplateString(resolver.endpoint ?? "", resolverData);
        const result = await executeApiResolver({ endpoint, method: resolver.method ?? "GET" }, resolverData);
        if (resolver.outputAlias) resolverData[resolver.outputAlias] = result;
        applyAssignments(resolver, resolverData);
        break;
      }
      case "static_defaults": {
        applyStaticDefaults(resolver, resolverData);
        if (resolver.outputAlias) resolverData[resolver.outputAlias] = resolver.values ?? {};
        applyAssignments(resolver, resolverData);
        break;
      }
      case "transform_filter": {
        const input = getByPath(resolverData, resolver.inputPath ?? "");
        const fact = resolver.filter ? resolverData[resolver.filter.fact] : undefined;
        const filtered = Array.isArray(input) && resolver.filter
          ? input.filter((item) => (item as Record<string, unknown>)[resolver.filter!.field] === fact)
          : [];
        if (resolver.outputAlias) resolverData[resolver.outputAlias] = filtered;
        applyAssignments(resolver, resolverData);
        break;
      }
      case "llm_summary": {
        const result = await executeLlmResolver(registration.templateId, resolverData);
        Object.assign(resolverData, result);
        if (resolver.outputAlias) resolverData[resolver.outputAlias] = result;
        applyAssignments(resolver, resolverData);
        break;
      }
    }

    const missingOutputs = validateResolverOutputs(resolver, resolverData);
    if (missingOutputs.length > 0 && phase === "blocking") {
      return {
        id: resolver.id,
        kind: resolver.kind,
        phase,
        durationMs: Date.now() - start,
        status: "failed",
        error: `Missing required outputs: ${missingOutputs.join(", ")}`,
      };
    }

    return {
      id: resolver.id,
      kind: resolver.kind,
      phase,
      durationMs: Date.now() - start,
      status: missingOutputs.length > 0 ? "skipped" : "ok",
      error: missingOutputs.length > 0 ? `Missing optional outputs: ${missingOutputs.join(", ")}` : undefined,
    };
  } catch (err) {
    return {
      id: resolver.id,
      kind: resolver.kind,
      phase,
      durationMs: Date.now() - start,
      status: phase === "blocking" ? "failed" : "skipped",
      error: String(err),
    };
  }
}

function actionAvailability(action: StoredTemplateAction, payload: Record<string, unknown>): StoredTemplateAction {
  const missingFields = (action.requiredPayloadFields ?? []).filter((field) => !hasValue(getByPath(payload, field)));
  let enabled = missingFields.length === 0;
  let disabledReason = missingFields.length > 0 ? `Missing: ${missingFields.join(", ")}` : undefined;

  if (enabled && action.enableWhen) {
    const value = getByPath(payload, action.enableWhen.field);
    if ("equals" in action.enableWhen && value !== action.enableWhen.equals) {
      enabled = false;
      disabledReason = `${action.enableWhen.field} must equal ${String(action.enableWhen.equals)}`;
    }
    if ("exists" in action.enableWhen && action.enableWhen.exists === true && !hasValue(value)) {
      enabled = false;
      disabledReason = `${action.enableWhen.field} is required`;
    }
  }

  return {
    ...action,
    enabled,
    disabledReason,
  } as StoredTemplateAction;
}

export async function resolveTemplateRegistration(
  registration: TemplateRegistration,
  context: Record<string, unknown>,
): Promise<ResolveTemplateResult> {
  const resolverData: Record<string, unknown> = { ...context };
  const trace: ResolverTrace[] = [];

  for (const resolver of registration.resolvers) {
    if (resolver.enabled === false) continue;
    const result = await runResolver(registration, resolver, resolverData);
    trace.push(result);
    if (result.status === "failed" && result.phase === "blocking") {
      return { trace, resolverData, error: result.error ?? `Resolver failed: ${resolver.id}` };
    }
  }

  applyBuiltInDerivedFields(registration, resolverData);

  const payload = applyBinding(registration.bindingRecipe, resolverData);
  const validation = validatePayload(registration.bindingRecipeId, payload, registration.generatedValidation);
  if (!validation.valid) {
    return { trace, resolverData, validation, error: "Payload validation failed" };
  }

  const actions = registration.actions.map((action) => actionAvailability(action, payload));
  const generatedAt = new Date().toISOString();
  return {
    trace,
    resolverData,
    validation,
    envelope: {
      templateId: registration.bindingRecipeId,
      version: registration.version,
      sourceIntent: (context.intentKey as string) ?? registration.templateId,
      updatedAt: generatedAt,
      payload,
      actions,
      surfaceConfig: registration.surfaceConfig,
      meta: {
        generatedAt,
        catalogTemplateId: registration.templateId,
        resolverTrace: trace.map((item) => `${item.id}:${item.durationMs}ms:${item.status}`),
        resolverTraceDetail: trace,
      },
    },
  };
}

export async function resolveTemplateById(
  templateId: string,
  context: Record<string, unknown>,
  options: { checkAuth?: boolean } = {},
): Promise<ResolveTemplateResult> {
  const registration = getTemplateRegistration(templateId);
  if (!registration) {
    return { trace: [], error: "Template not found" };
  }

  const trace: ResolverTrace[] = [];
  if (options.checkAuth) {
    const start = Date.now();
    const auth = await executeAuthResolver(templateId, context);
    trace.push({
      id: "auth",
      kind: "auth",
      phase: "blocking",
      durationMs: Date.now() - start,
      status: auth.allowed ? "ok" : "failed",
      error: auth.allowed ? undefined : "Access denied",
    });
    if (!auth.allowed) return { trace, error: "Access denied" };
  }

  const result = await resolveTemplateRegistration(registration, context);
  return {
    ...result,
    trace: [...trace, ...result.trace],
    envelope: result.envelope
      ? {
          ...result.envelope,
          meta: {
            ...result.envelope.meta,
            resolverTrace: [...trace, ...result.trace].map((item) => `${item.id}:${item.durationMs}ms:${item.status}`),
            resolverTraceDetail: [...trace, ...result.trace],
          },
        }
      : result.envelope,
  };
}
