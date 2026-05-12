/**
 * Surface envelope validation.
 *
 * Ensures payload has the required fields before reaching the renderer.
 * Validation failures are caught here, not in the renderer.
 */

import type { SurfaceEnvelope } from "@/devops-chat/types/conversation";

export type ValidationResult =
  | { valid: true }
  | { valid: false; errors: string[] };

const REQUIRED_FIELDS: Record<string, string[]> = {
  quick_deploy_launchpad: ["service", "environment", "recommendedVersion", "targetVersion", "state"],
  deploy_history_table: ["state", "summaryItems", "rows", "columns"],
  approval_queue_inbox: ["items", "summary", "state"],
  rollback_target_list: ["service", "targets", "state"],
  deployment_approval_inbox: ["requestId", "title", "environment", "state"],
  rollback_summary: ["service", "environment", "incident", "currentVersion", "recommendedVersion", "state"],
  dry_run_stepper: ["service", "environment", "targetVersion", "steps", "state"],
  confirm_action: ["service", "environment", "targetVersion", "checklist", "state"],
};

export function validateSurfaceEnvelope(surface: SurfaceEnvelope): ValidationResult {
  const errors: string[] = [];

  if (!surface.templateId) {
    errors.push("templateId is required");
  }

  if (!surface.payload) {
    errors.push("payload is required");
    return { valid: false, errors };
  }

  const requiredFields = REQUIRED_FIELDS[surface.templateId];
  if (!requiredFields) {
    errors.push(`unknown templateId: ${surface.templateId}`);
    return { valid: false, errors };
  }

  for (const field of requiredFields) {
    if (surface.payload[field] === undefined || surface.payload[field] === null) {
      errors.push(`missing required field: ${field}`);
    }
  }

  if (!surface.sourceIntent) {
    errors.push("sourceIntent is required");
  }

  if (!surface.updatedAt) {
    errors.push("updatedAt is required");
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
