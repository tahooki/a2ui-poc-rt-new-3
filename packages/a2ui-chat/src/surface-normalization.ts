import type { SurfaceEnvelope } from "@a2ui/ui";
import type { A2UIRenderableSurface } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isActionArray(value: unknown): value is SurfaceEnvelope["actions"] {
  return Array.isArray(value);
}

export function normalizeA2UISurface(
  surface: A2UIRenderableSurface | SurfaceEnvelope | unknown | null | undefined,
): SurfaceEnvelope | null {
  if (!isRecord(surface)) return null;

  const { templateId, payload, sourceIntent, updatedAt } = surface;
  if (typeof templateId !== "string" || !templateId) return null;
  if (!isRecord(payload)) return null;
  if (typeof sourceIntent !== "string" || !sourceIntent) return null;
  if (typeof updatedAt !== "string" || !updatedAt) return null;

  return {
    templateId,
    version: typeof surface.version === "string" && surface.version ? surface.version : "1.0.0",
    payload,
    actions: isActionArray(surface.actions) ? surface.actions : undefined,
    surfaceConfig: isRecord(surface.surfaceConfig) ? surface.surfaceConfig : undefined,
    sourceIntent,
    updatedAt,
    freshnessKey: typeof surface.freshnessKey === "string" ? surface.freshnessKey : undefined,
    meta: isRecord(surface.meta) ? surface.meta : undefined,
  };
}

export function canRenderA2UISurface(surface: unknown): boolean {
  return normalizeA2UISurface(surface) !== null;
}

export function createA2UIChatSurfacePart(
  surface: A2UIRenderableSurface | SurfaceEnvelope | unknown,
  id?: string,
) {
  return {
    type: "a2ui_surface" as const,
    id,
    surface,
  };
}
