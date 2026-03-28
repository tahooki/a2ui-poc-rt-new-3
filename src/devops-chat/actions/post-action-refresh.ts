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

export function refreshAfterAction(
  actionResult: ActionExecutionResult,
  currentFacts: ConversationFacts,
  currentSurface: SurfaceEnvelope | null,
  intentKey: string | null,
): PostActionRefreshResult {
  // 1. Merge facts patch
  const updatedFacts: ConversationFacts = actionResult.factsPatch
    ? { ...currentFacts, ...actionResult.factsPatch }
    : currentFacts;

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
