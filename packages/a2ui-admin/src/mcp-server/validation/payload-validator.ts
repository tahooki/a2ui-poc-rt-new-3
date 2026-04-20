/**
 * Payload Validator — Ajv JSON Schema 기반 검증
 */

import Ajv from "ajv";
import type { GeneratedValidation } from "../catalog/template-store.js";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

const ajv = new Ajv({ allErrors: true, strict: false });

// 템플릿별 JSON Schema 정의
const TEMPLATE_SCHEMAS: Record<string, object> = {
  deploy_launchpad: {
    type: "object",
    required: ["templateId", "state", "service", "environment", "targetVersion", "strategy"],
    properties: {
      templateId: { type: "string", const: "deploy_launchpad" },
      state: { type: "string", enum: ["ready", "deploying", "done"] },
      service: { type: "string" },
      environment: { type: "string" },
      targetVersion: { type: "string" },
      strategy: { type: "string" },
      recommendedVersion: { type: "string" },
      impactSummary: { type: "string" },
      riskSummary: { type: "string" },
      preflightChecks: { type: "array", items: { type: "string" } },
      imageDetail: { type: "object" },
      requestDetail: { type: "object" },
      lastDeployment: { type: "object" },
      deploymentHistory: { type: "array" },
    },
    additionalProperties: true,
  },
  approval_queue_inbox: {
    type: "object",
    required: ["templateId", "items"],
    properties: {
      templateId: { type: "string", const: "approval_queue_inbox" },
      items: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "type", "title", "status"],
          properties: {
            id: { type: "string" },
            type: { type: "string" },
            title: { type: "string" },
            environment: { type: "string" },
            requestedBy: { type: "string" },
            riskSummary: { type: "string" },
            riskTone: { type: "string" },
            status: { type: "string" },
          },
        },
      },
      byStatus: { type: "object" },
      byType: { type: "object" },
      queueSummary: { type: "string" },
    },
    additionalProperties: true,
  },
  rollback_summary: {
    type: "object",
    required: ["templateId", "candidates"],
    properties: {
      templateId: { type: "string", const: "rollback_summary" },
      candidates: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "service", "currentVersion"],
          properties: {
            id: { type: "string" },
            service: { type: "string" },
            environment: { type: "string" },
            currentVersion: { type: "string" },
            severity: { type: "string" },
            incidentSummary: { type: "string" },
            recommendedRollbackVersion: { type: "string" },
            eligibleVersions: { type: "array" },
          },
        },
      },
      serviceHealth: { type: "array" },
      causeSummary: { type: "string" },
      recommendation: { type: "string" },
    },
    additionalProperties: true,
  },
  component_smoke_test: {
    type: "object",
    required: ["templateId", "headline", "metricLabel", "metricValue", "statusTone", "rows"],
    properties: {
      templateId: { type: "string", const: "component_smoke_test" },
      headline: { type: "string" },
      summary: { type: "string" },
      metricLabel: { type: "string" },
      metricValue: { type: "string" },
      statusTone: { type: "string", enum: ["success", "warning", "danger", "info", "neutral"] },
      rows: {
        type: "array",
        items: {
          type: "object",
          required: ["name", "value", "status"],
          properties: {
            name: { type: "string" },
            value: { type: "string" },
            status: { type: "string", enum: ["success", "warning", "danger", "info", "neutral"] },
          },
        },
      },
      footerNote: { type: "string" },
    },
    additionalProperties: true,
  },
};

// 컴파일된 validator 캐시
const validators = new Map<string, ReturnType<typeof ajv.compile>>();

function getValidator(templateId: string) {
  if (validators.has(templateId)) return validators.get(templateId)!;
  const schema = TEMPLATE_SCHEMAS[templateId];
  if (!schema) return null;
  const validate = ajv.compile(schema);
  validators.set(templateId, validate);
  return validate;
}

export function validatePayload(
  templateId: string,
  payload: Record<string, unknown>,
  generatedValidation?: Pick<GeneratedValidation, "renderRequiredPayloadFields">,
): ValidationResult {
  const generatedErrors = validateGeneratedPayloadRules(payload, generatedValidation);
  if (generatedErrors.length > 0) {
    return { valid: false, errors: generatedErrors };
  }

  const validate = getValidator(templateId);

  if (!validate) {
    return { valid: true, errors: [] };
  }

  const valid = validate(payload) as boolean;

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors = (validate.errors ?? []).map(
    (e) => `${e.instancePath || "/"}: ${e.message}`,
  );

  return { valid: false, errors };
}

function getByPath(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => {
    if (current === undefined || current === null) return undefined;
    if (Array.isArray(current) && /^\d+$/.test(part)) {
      return current[Number(part)];
    }
    if (typeof current === "object") {
      return (current as Record<string, unknown>)[part];
    }
    return undefined;
  }, value);
}

function hasValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.length > 0;
  return true;
}

function validateGeneratedPayloadRules(
  payload: Record<string, unknown>,
  generatedValidation?: Pick<GeneratedValidation, "renderRequiredPayloadFields">,
): string[] {
  if (!generatedValidation) return [];
  return generatedValidation.renderRequiredPayloadFields
    .filter((field) => !hasValue(getByPath(payload, field)))
    .map((field) => `/${field}: is required by generated validation`);
}
