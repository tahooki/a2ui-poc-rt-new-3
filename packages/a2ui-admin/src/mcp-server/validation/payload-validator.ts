/**
 * Payload Validator — Ajv JSON Schema 기반 검증
 */

import Ajv from "ajv";

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
): ValidationResult {
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
