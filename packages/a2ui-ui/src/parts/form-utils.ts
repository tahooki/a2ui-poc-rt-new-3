"use client";

export type RuntimePayloadProps = {
  __a2uiPayload?: unknown;
  __a2uiSetPayload?: unknown;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function stringValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

export function updatePayload(
  props: RuntimePayloadProps,
  updater: (payload: Record<string, unknown>) => Record<string, unknown>,
): boolean {
  if (!isRecord(props.__a2uiPayload) || typeof props.__a2uiSetPayload !== "function") return false;
  props.__a2uiSetPayload(updater(props.__a2uiPayload));
  return true;
}

export function updateTopLevelPayloadValue(
  props: RuntimePayloadProps,
  field: string,
  value: string,
): void {
  updatePayload(props, (payload) => ({
    ...payload,
    [field]: value,
  }));
}

export function updateNestedPayloadValue(
  props: RuntimePayloadProps,
  section: string,
  field: string,
  value: string,
): void {
  updatePayload(props, (payload) => ({
    ...payload,
    [section]: {
      ...(isRecord(payload[section]) ? payload[section] : {}),
      [field]: value,
    },
  }));
}

export const formGridStyle = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
} as const;

export const fieldStyle = {
  background: "rgba(17,24,39,.55)",
  border: "1px solid rgba(37,50,68,.6)",
  borderRadius: 7,
  display: "grid",
  gap: 7,
  padding: 10,
} as const;

export const labelStyle = {
  color: "#8b9ab5",
  fontSize: 11,
  letterSpacing: ".04em",
  textTransform: "uppercase",
} as const;

export const inputStyle = {
  background: "#0b1220",
  border: "1px solid rgba(91,141,238,.28)",
  borderRadius: 6,
  color: "#e4e8ef",
  font: "inherit",
  fontSize: 13,
  minWidth: 0,
  outline: "none",
  padding: "8px 9px",
  width: "100%",
} as const;

export const textareaStyle = {
  ...inputStyle,
  minHeight: 72,
  resize: "vertical",
} as const;

export const choiceGridStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
} as const;

export function choiceButtonStyle(active: boolean) {
  return {
    background: active ? "rgba(91,141,238,.22)" : "rgba(11,18,32,.78)",
    border: active ? "1px solid rgba(91,141,238,.72)" : "1px solid rgba(91,141,238,.22)",
    borderRadius: 6,
    color: active ? "#d7e2ff" : "#b6c2d2",
    cursor: "pointer",
    font: "inherit",
    fontSize: 12,
    padding: "7px 9px",
  } as const;
}
