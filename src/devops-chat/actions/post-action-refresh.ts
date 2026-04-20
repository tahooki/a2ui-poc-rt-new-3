/**
 * Post-action refresh pipeline.
 *
 * After a surface action executes:
 * 1. Merge facts patch from action result
 * 2. Re-evaluate decision engine (optional — kept simple for phase4)
 * 3. Re-run selector/binder to refresh active surface
 * 4. Build activity log entry
 */

import type { ConversationFacts, SurfaceEnvelope } from "@/devops-chat/types/conversation";
import type { ActionExecutionResult, ActivityEvent } from "./action-types";
import { selectTemplate } from "@/devops-chat/templates/template-selector";
import { getBinder } from "@/devops-chat/templates/binders";
import { validateSurfaceEnvelope } from "@/devops-chat/templates/validate-surface-envelope";

export type PostActionRefreshResult = {
  updatedFacts: ConversationFacts;
  updatedSurface: SurfaceEnvelope | null;
  activityEvent: ActivityEvent | null;
  userFacingMessage: string | null;
};

function mergeFactsPatch(currentFacts: ConversationFacts, factsPatch?: Record<string, unknown>): ConversationFacts {
  if (!factsPatch) return currentFacts;
  const merged: ConversationFacts = { ...currentFacts, ...factsPatch };
  for (const key of ["deploy", "approval", "rollback"] as const) {
    const currentValue = currentFacts[key];
    const patchValue = factsPatch[key];
    if (
      currentValue &&
      patchValue &&
      typeof currentValue === "object" &&
      typeof patchValue === "object" &&
      !Array.isArray(currentValue) &&
      !Array.isArray(patchValue)
    ) {
      merged[key] = {
        ...(currentValue as Record<string, unknown>),
        ...(patchValue as Record<string, unknown>),
      };
    }
  }
  return merged;
}

export function refreshAfterAction(
  actionResult: ActionExecutionResult,
  currentFacts: ConversationFacts,
  currentSurface: SurfaceEnvelope | null,
  intentKey: string | null,
): PostActionRefreshResult {
  // 1. Merge facts patch
  const updatedFacts = mergeFactsPatch(currentFacts, actionResult.factsPatch);

  // 2. Try to refresh the surface if we have an intent
  let updatedSurface = currentSurface;

  if (intentKey && actionResult.ok) {
    const selectionResult = selectTemplate({
      intentKey,
      workflow: null,
      facts: updatedFacts,
      surfaceIntent: null,
      lastDecisionTrace: null,
    });

    if (selectionResult.selected) {
      const binder = getBinder(selectionResult.selected.templateId);
      if (binder) {
        const bindingResult = binder(updatedFacts, intentKey);
        if (bindingResult.ok) {
          const validation = validateSurfaceEnvelope(bindingResult.surface);
          if (validation.valid) {
            updatedSurface = bindingResult.surface;
          }
        }
      }
    }
  }

  // For failed actions, keep existing surface
  if (!actionResult.ok) {
    updatedSurface = currentSurface;
  }

  return {
    updatedFacts,
    updatedSurface,
    activityEvent: actionResult.activityEvent ?? null,
    userFacingMessage: actionResult.userFacingMessage ?? null,
  };
}
