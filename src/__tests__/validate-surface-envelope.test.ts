import { describe, it, expect } from "vitest";
import { validateSurfaceEnvelope } from "@/devops-chat/templates/validate-surface-envelope";
import type { SurfaceEnvelope } from "@/devops-chat/types/conversation";

describe("validateSurfaceEnvelope", () => {
  it("validates a complete deploy launchpad envelope", () => {
    const envelope: SurfaceEnvelope = {
      templateId: "quick_deploy_launchpad",
      payload: {
        templateId: "quick_deploy_launchpad",
        state: "ready",
        service: "payments-api",
        environment: "production",
        recommendedVersion: "v1.2",
        targetVersion: "v1.2",
        strategy: "rolling",
        impactSummary: "test",
        preflightChecks: [],
        helperText: "",
        primaryActionLabel: "Deploy",
        secondaryActionLabel: "Cancel",
      },
      sourceIntent: "deploy.start",
      updatedAt: new Date().toISOString(),
    };
    const result = validateSurfaceEnvelope(envelope);
    expect(result.valid).toBe(true);
  });

  it("rejects envelope missing required fields", () => {
    const envelope: SurfaceEnvelope = {
      templateId: "quick_deploy_launchpad",
      payload: { state: "ready" },
      sourceIntent: "deploy.start",
      updatedAt: new Date().toISOString(),
    };
    const result = validateSurfaceEnvelope(envelope);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain("missing required field: service");
      expect(result.errors).toContain("missing required field: environment");
    }
  });

  it("rejects unknown templateId", () => {
    const envelope: SurfaceEnvelope = {
      templateId: "unknown_template",
      payload: {},
      sourceIntent: "deploy.start",
      updatedAt: new Date().toISOString(),
    };
    const result = validateSurfaceEnvelope(envelope);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain("unknown templateId");
    }
  });

  it("rejects envelope without sourceIntent", () => {
    const envelope = {
      templateId: "quick_deploy_launchpad",
      payload: {
        state: "ready",
        service: "x",
        environment: "y",
        recommendedVersion: "v1",
        targetVersion: "v1",
      },
      sourceIntent: "",
      updatedAt: new Date().toISOString(),
    } as SurfaceEnvelope;
    const result = validateSurfaceEnvelope(envelope);
    expect(result.valid).toBe(false);
  });

  it("validates approval inbox envelope", () => {
    const envelope: SurfaceEnvelope = {
      templateId: "deployment_approval_inbox",
      payload: {
        templateId: "deployment_approval_inbox",
        state: "pending",
        requestId: "REQ-001",
        title: "Access Request",
        environment: "production",
        requestTypeLabel: "Temporary Access",
        riskSummary: "Low",
        verificationSummary: "",
        impactScope: "",
        decisionGuidance: "",
        checks: [],
        keyFacts: [],
        primaryActionLabel: "Approve",
        secondaryActionLabel: "Hold",
      },
      sourceIntent: "approval.review",
      updatedAt: new Date().toISOString(),
    };
    const result = validateSurfaceEnvelope(envelope);
    expect(result.valid).toBe(true);
  });
});
