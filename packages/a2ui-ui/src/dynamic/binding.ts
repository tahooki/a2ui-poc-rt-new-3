import type { BindingValue, SurfaceConfigValue } from "./schema";

export type BindingContext = {
  payload: Record<string, unknown>;
  actions?: unknown[];
  meta?: Record<string, unknown>;
  context?: Record<string, unknown>;
};

export function getByPath(source: unknown, path: string): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<unknown>((current, part) => {
    if (current === undefined || current === null) return undefined;
    if (Array.isArray(current) && /^\d+$/.test(part)) return current[Number(part)];
    if (typeof current === "object") return (current as Record<string, unknown>)[part];
    return undefined;
  }, source);
}

export function isBindingValue(value: unknown): value is BindingValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    (record.type === "static" && "value" in record) ||
    (record.type === "binding" && typeof record.path === "string")
  );
}

export function resolveBindingValue(value: BindingValue, bindingContext: BindingContext): unknown {
  if (value.type === "static") return value.value;

  const resolved = getByPath(bindingContext, value.path);
  if (resolved === undefined || resolved === null || resolved === "") {
    return value.fallback;
  }
  return resolved;
}

export function resolveConfigValue(value: SurfaceConfigValue | undefined, bindingContext: BindingContext): unknown {
  if (value === undefined) return undefined;
  if (isBindingValue(value)) return resolveBindingValue(value, bindingContext);
  if (Array.isArray(value)) return value.map((item) => resolveConfigValue(item, bindingContext));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveConfigValue(item, bindingContext)]),
    );
  }
  return value;
}

export function resolveProps(
  props: Record<string, SurfaceConfigValue> | undefined,
  bindingContext: BindingContext,
): Record<string, unknown> {
  if (!props) return {};
  return Object.fromEntries(
    Object.entries(props).map(([key, value]) => [key, resolveConfigValue(value, bindingContext)]),
  );
}

