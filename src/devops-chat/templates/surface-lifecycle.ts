/**
 * Surface lifecycle policy.
 *
 * Decides when to keep, replace, clear, or invalidate the active surface
 * based on the current decision mode and conversation state.
 */

import type { SurfaceEnvelope, ConversationFacts, DecisionMode } from "@/devops-chat/types/conversation";

export type SurfaceAction =
  | { action: "replace"; surface: SurfaceEnvelope }
  | { action: "keep" }
  | { action: "clear" };

/**
 * Determine what to do with the active surface after a turn completes.
 *
 * Policy:
 * - render_surface + new surface → replace
 * - render_surface + binding failed → keep existing (or clear if none)
 * - ask_followup + same workflow flow → keep
 * - ask_followup + different flow → clear
 * - text (general query) → clear
 * - text (same workflow supplementary) → keep
 */
export function resolveSurfaceAction(
  decisionMode: DecisionMode,
  newSurface: SurfaceEnvelope | null,
  existingSurface: SurfaceEnvelope | null,
  intentKey: string | null,
): SurfaceAction {
  if (decisionMode === "render_surface") {
    if (newSurface) {
      return { action: "replace", surface: newSurface };
    }
    // Binding failed; keep existing if we have one
    return existingSurface ? { action: "keep" } : { action: "clear" };
  }

  if (decisionMode === "ask_followup") {
    if (!existingSurface) return { action: "clear" };
    // Keep surface if it belongs to the same intent flow
    if (existingSurface.sourceIntent === intentKey) {
      return { action: "keep" };
    }
    return { action: "clear" };
  }

  // text mode
  if (!existingSurface) return { action: "clear" };
  // Keep surface if same intent flow (supplementary text)
  if (existingSurface.sourceIntent === intentKey) {
    return { action: "keep" };
  }
  return { action: "clear" };
}

/**
 * Check if an active surface is stale relative to the current facts.
 * A surface is stale if its freshnessKey no longer matches the current facts state.
 */
export function isSurfaceStale(
  surface: SurfaceEnvelope,
  currentFacts: ConversationFacts,
): boolean {
  if (!surface.freshnessKey) return false;

  // Reconstruct expected freshness key based on templateId
  const slots = currentFacts.slots ?? {};

  if (surface.templateId === "quick_deploy_launchpad") {
    const sn = slots["deploy.serviceName"]?.value ?? "";
    const env = slots["deploy.environment"]?.value ?? "production";
    const ver = slots["deploy.targetVersion"]?.value ?? slots["deploy.recommendedVersion"]?.value ?? "";
    const expected = `deploy:${sn}:${env}:${ver}`;
    return surface.freshnessKey !== expected;
  }

  if (surface.templateId === "deployment_approval_inbox") {
    const rid = slots["approval.requestId"]?.value ?? "";
    const expected = `approval:${rid}`;
    return surface.freshnessKey !== expected;
  }

  if (surface.templateId === "rollback_summary") {
    const sn = slots["rollback.serviceName"]?.value ?? "";
    const env = (currentFacts.rollback?.environment as string) ?? "production";
    const expected = `rollback:${sn}:${env}`;
    return surface.freshnessKey !== expected;
  }

  // For other templates, no staleness check (conservative)
  return false;
}
