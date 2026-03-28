import { describe, it, expect } from "vitest";
import { resolveSurfaceAction, isSurfaceStale } from "@/devops-chat/templates/surface-lifecycle";
import type { SurfaceEnvelope, ConversationFacts } from "@/devops-chat/types/conversation";

function makeSurface(overrides: Partial<SurfaceEnvelope> = {}): SurfaceEnvelope {
  return {
    templateId: "quick_deploy_launchpad",
    payload: { service: "payments-api" },
    sourceIntent: "deploy.start",
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("resolveSurfaceAction", () => {
  it("replaces surface on render_surface with new surface", () => {
    const newSurface = makeSurface();
    const result = resolveSurfaceAction("render_surface", newSurface, null, "deploy.start");
    expect(result.action).toBe("replace");
  });

  it("keeps existing surface on render_surface when binding failed", () => {
    const existing = makeSurface();
    const result = resolveSurfaceAction("render_surface", null, existing, "deploy.start");
    expect(result.action).toBe("keep");
  });

  it("clears surface on render_surface when binding failed and no existing", () => {
    const result = resolveSurfaceAction("render_surface", null, null, "deploy.start");
    expect(result.action).toBe("clear");
  });

  it("keeps surface on ask_followup if same intent flow", () => {
    const existing = makeSurface({ sourceIntent: "deploy.start" });
    const result = resolveSurfaceAction("ask_followup", null, existing, "deploy.start");
    expect(result.action).toBe("keep");
  });

  it("clears surface on ask_followup if different intent flow", () => {
    const existing = makeSurface({ sourceIntent: "deploy.start" });
    const result = resolveSurfaceAction("ask_followup", null, existing, "rollback.start");
    expect(result.action).toBe("clear");
  });

  it("keeps surface on text if same intent flow", () => {
    const existing = makeSurface({ sourceIntent: "deploy.start" });
    const result = resolveSurfaceAction("text", null, existing, "deploy.start");
    expect(result.action).toBe("keep");
  });

  it("clears surface on text if different intent flow", () => {
    const existing = makeSurface({ sourceIntent: "deploy.start" });
    const result = resolveSurfaceAction("text", null, existing, "general.qna");
    expect(result.action).toBe("clear");
  });

  it("clears when no existing surface on text", () => {
    const result = resolveSurfaceAction("text", null, null, "general.qna");
    expect(result.action).toBe("clear");
  });
});

describe("isSurfaceStale", () => {
  it("detects stale deploy surface when serviceName changed", () => {
    const surface = makeSurface({
      templateId: "quick_deploy_launchpad",
      freshnessKey: "deploy:payments-api:production:v1.0",
    });
    const facts: ConversationFacts = {
      slots: {
        "deploy.serviceName": { value: "orders-api", source: "user", confidence: 1, updatedAt: "" },
        "deploy.environment": { value: "production", source: "user", confidence: 1, updatedAt: "" },
        "deploy.targetVersion": { value: "v1.0", source: "user", confidence: 1, updatedAt: "" },
      },
    };
    expect(isSurfaceStale(surface, facts)).toBe(true);
  });

  it("detects fresh deploy surface when facts match", () => {
    const surface = makeSurface({
      templateId: "quick_deploy_launchpad",
      freshnessKey: "deploy:payments-api:production:v1.0",
    });
    const facts: ConversationFacts = {
      slots: {
        "deploy.serviceName": { value: "payments-api", source: "user", confidence: 1, updatedAt: "" },
        "deploy.environment": { value: "production", source: "user", confidence: 1, updatedAt: "" },
        "deploy.targetVersion": { value: "v1.0", source: "user", confidence: 1, updatedAt: "" },
      },
    };
    expect(isSurfaceStale(surface, facts)).toBe(false);
  });

  it("returns false when no freshnessKey", () => {
    const surface = makeSurface({ freshnessKey: undefined });
    expect(isSurfaceStale(surface, {})).toBe(false);
  });
});
