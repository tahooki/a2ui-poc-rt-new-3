/**
 * Template preview runner: validates payload and prepares it for the runtime renderer.
 */

import type { TemplateEnvelope } from "@/devops-chat/types/templates";
import { validateSurfaceEnvelope } from "@/devops-chat/templates/validate-surface-envelope";
import type { SurfaceEnvelope } from "@/devops-chat/types/conversation";

export type PreviewInput = {
  templateId: string;
  payloadJson: string;
};

export type PreviewResult =
  | { ok: true; template: TemplateEnvelope }
  | { ok: false; error: "parse_error"; message: string }
  | { ok: false; error: "validation_error"; errors: string[] };

export function runTemplatePreview(input: PreviewInput): PreviewResult {
  // Parse JSON
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(input.payloadJson) as Record<string, unknown>;
  } catch (e) {
    return {
      ok: false,
      error: "parse_error",
      message: e instanceof Error ? e.message : "Invalid JSON",
    };
  }

  // Validate via surface envelope validator
  const envelope: SurfaceEnvelope = {
    templateId: input.templateId,
    payload,
    sourceIntent: "preview",
    updatedAt: new Date().toISOString(),
  };

  const validation = validateSurfaceEnvelope(envelope);
  if (!validation.valid) {
    return { ok: false, error: "validation_error", errors: validation.errors };
  }

  // Cast to TemplateEnvelope for the renderer
  return { ok: true, template: payload as unknown as TemplateEnvelope };
}
