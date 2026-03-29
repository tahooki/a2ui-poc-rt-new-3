import type { AwaitingExpectedInput, FactSource, IntentKey } from "@/devops-chat/types/conversation";

export type SlotType = "string" | "enum" | "list" | "object" | "boolean";

export type SlotValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

export type SlotDefinition = {
  slotKey: string;
  label: string;
  type: SlotType;
  required: boolean;
  sourcePrecedence: FactSource[];
  validValues?: string[];
  aliases?: Record<string, string>;
  staleWhen?: string[];
  awaitingInput?: AwaitingExpectedInput;
  awaitingPrompt?: string;
  validate?: (value: unknown) => SlotValidationResult;
};

export type IntentSlotSchema = {
  intentKey: IntentKey;
  namespace: string;
  slots: SlotDefinition[];
};

// ---------------------------------------------------------------------------
// Canonical alias tables
// ---------------------------------------------------------------------------

export const ENVIRONMENT_ALIASES: Record<string, string> = {
  프로덕션: "production",
  운영: "production",
  prod: "production",
  production: "production",
  스테이징: "staging",
  staging: "staging",
  stg: "staging",
  개발: "development",
  dev: "development",
  development: "development",
};

export const CONFIRMATION_ALIASES: Record<string, boolean> = {
  응: true,
  네: true,
  yes: true,
  맞아: true,
  그래: true,
  확인: true,
  진행: true,
  ok: true,
  ㅇ: true,
  아니: false,
  아니요: false,
  no: false,
  취소: false,
  ㄴ: false,
};

// ---------------------------------------------------------------------------
// Intent → slot schemas
// ---------------------------------------------------------------------------

export const INTENT_SLOT_SCHEMAS: Record<string, IntentSlotSchema> = {
  "deploy.start": {
    intentKey: "deploy.start",
    namespace: "deploy",
    slots: [
      {
        slotKey: "deploy.serviceName",
        label: "서비스 이름",
        type: "string",
        required: true,
        sourcePrecedence: ["user", "selection", "tool", "system"],
        awaitingInput: "single_select",
        awaitingPrompt: "어떤 서비스를 배포할까요?",
        validate: (v) =>
          typeof v === "string" && v.trim().length > 0
            ? { valid: true }
            : { valid: false, reason: "서비스 이름은 빈 문자열일 수 없습니다" },
      },
      {
        slotKey: "deploy.environment",
        label: "환경",
        type: "enum",
        required: false,
        sourcePrecedence: ["user", "selection", "tool", "system"],
        validValues: ["production", "staging", "development"],
        aliases: ENVIRONMENT_ALIASES,
        awaitingInput: "single_select",
        awaitingPrompt: "어떤 환경에 배포할까요?",
        validate: (v) =>
          typeof v === "string" && ["production", "staging", "development"].includes(v)
            ? { valid: true }
            : { valid: false, reason: "환경은 production, staging, development 중 하나여야 합니다" },
      },
      {
        slotKey: "deploy.targetVersion",
        label: "배포 버전",
        type: "string",
        required: false,
        sourcePrecedence: ["user", "tool", "system"],
      },
      {
        slotKey: "deploy.selectedServiceContext",
        label: "서비스 컨텍스트",
        type: "object",
        required: false,
        sourcePrecedence: ["tool", "selection", "system"],
        staleWhen: ["deploy.serviceName"],
      },
    ],
  },
  "rollback.start": {
    intentKey: "rollback.start",
    namespace: "rollback",
    slots: [
      {
        slotKey: "rollback.serviceName",
        label: "롤백 서비스",
        type: "string",
        required: true,
        sourcePrecedence: ["user", "selection", "tool", "system"],
        awaitingInput: "single_select",
        awaitingPrompt: "어떤 서비스를 롤백할까요?",
      },
      {
        slotKey: "rollback.candidates",
        label: "롤백 후보 목록",
        type: "array",
        required: false,
        sourcePrecedence: ["tool", "system"],
      },
      {
        slotKey: "rollback.selectedTargetId",
        label: "선택된 롤백 대상 ID",
        type: "string",
        required: false,
        sourcePrecedence: ["user", "system"],
      },
      {
        slotKey: "rollback.targetVersion",
        label: "롤백 버전",
        type: "string",
        required: false,
        sourcePrecedence: ["user", "tool", "system"],
      },
      {
        slotKey: "rollback.context",
        label: "롤백 컨텍스트",
        type: "object",
        required: false,
        sourcePrecedence: ["tool", "system"],
        staleWhen: ["rollback.serviceName"],
      },
    ],
  },
  "approval.review": {
    intentKey: "approval.review",
    namespace: "approval",
    slots: [
      {
        slotKey: "approval.queueItems",
        label: "승인 큐 목록",
        type: "array",
        required: false,
        sourcePrecedence: ["tool", "system"],
      },
      {
        slotKey: "approval.requestId",
        label: "승인 요청 ID",
        type: "string",
        required: false,
        sourcePrecedence: ["user", "selection", "tool", "system"],
        awaitingInput: "single_select",
        awaitingPrompt: "어떤 승인 요청을 검토할까요?",
      },
    ],
  },
  "approval.status.check": {
    intentKey: "approval.status.check",
    namespace: "approval",
    slots: [],
  },
  "deploy.history.lookup": {
    intentKey: "deploy.history.lookup",
    namespace: "deploy",
    slots: [],
  },
  "general.qna": {
    intentKey: "general.qna",
    namespace: "general",
    slots: [],
  },
};

export function getSlotSchema(intentKey: IntentKey): IntentSlotSchema | null {
  return INTENT_SLOT_SCHEMAS[intentKey] ?? null;
}

export function getRequiredSlots(intentKey: IntentKey): SlotDefinition[] {
  const schema = getSlotSchema(intentKey);
  if (!schema) return [];
  return schema.slots.filter((s) => s.required);
}

export function getFirstMissingRequiredSlot(
  intentKey: IntentKey,
  filledSlots: Record<string, unknown>,
): SlotDefinition | null {
  const required = getRequiredSlots(intentKey);
  for (const slot of required) {
    if (filledSlots[slot.slotKey] == null) return slot;
  }
  return null;
}

export function validateSlotValue(slotDef: SlotDefinition, value: unknown): SlotValidationResult {
  if (slotDef.validate) {
    return slotDef.validate(value);
  }
  // Default validation by type
  switch (slotDef.type) {
    case "string":
      return typeof value === "string" && value.trim().length > 0
        ? { valid: true }
        : { valid: false, reason: `${slotDef.label}은(는) 빈 값일 수 없습니다` };
    case "enum":
      if (typeof value !== "string") return { valid: false, reason: `${slotDef.label}은(는) 문자열이어야 합니다` };
      if (slotDef.validValues && !slotDef.validValues.includes(value)) {
        return { valid: false, reason: `${slotDef.label}은(는) ${slotDef.validValues.join(", ")} 중 하나여야 합니다` };
      }
      return { valid: true };
    case "boolean":
      return typeof value === "boolean"
        ? { valid: true }
        : { valid: false, reason: `${slotDef.label}은(는) 참/거짓이어야 합니다` };
    case "list":
      return Array.isArray(value)
        ? { valid: true }
        : { valid: false, reason: `${slotDef.label}은(는) 목록이어야 합니다` };
    case "object":
      return value !== null && typeof value === "object" && !Array.isArray(value)
        ? { valid: true }
        : { valid: false, reason: `${slotDef.label}은(는) 객체여야 합니다` };
    default:
      return { valid: true };
  }
}

export function canonicalizeValue(slotDef: SlotDefinition, raw: string): string {
  const lower = raw.trim().toLowerCase();
  if (slotDef.aliases) {
    const mapped = slotDef.aliases[lower];
    if (mapped) return mapped;
  }
  if (slotDef.validValues) {
    const exact = slotDef.validValues.find((v) => v.toLowerCase() === lower);
    if (exact) return exact;
  }
  return raw.trim();
}
