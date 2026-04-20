import { describe, it, expect } from "vitest";
import { bindDeployLaunchpad } from "@/devops-chat/templates/binders/bind-deploy-launchpad";
import { bindApprovalInbox } from "@/devops-chat/templates/binders/bind-approval-inbox";
import { bindRollbackSummary } from "@/devops-chat/templates/binders/bind-rollback-summary";
import { bindDryRunStepper } from "@/devops-chat/templates/binders/bind-dry-run-stepper";
import { bindConfirmAction } from "@/devops-chat/templates/binders/bind-confirm-action";
import type { ConversationFacts } from "@/devops-chat/types/conversation";

describe("bind-deploy-launchpad", () => {
  it("produces valid surface when all required facts present", () => {
    const facts: ConversationFacts = {
      slots: {
        "deploy.serviceName": { value: "payments-api", source: "user", confidence: 1, updatedAt: "" },
        "deploy.selectedServiceContext": {
          value: { recommendedVersion: "v1.2.3", environments: ["production"], availableImages: [{ tag: "v1.2.3" }] },
          source: "tool", confidence: 1, updatedAt: "",
        },
        "deploy.environment": { value: "production", source: "user", confidence: 1, updatedAt: "" },
      },
    };

    const result = bindDeployLaunchpad(facts, "deploy.start");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.surface.templateId).toBe("quick_deploy_launchpad");
      expect(result.surface.payload.service).toBe("payments-api");
      expect(result.surface.payload.environment).toBe("production");
      expect(result.surface.actions?.[0]?.actionId).toBe("deploy.start");
      expect(result.surface.surfaceConfig?.kind).toBe("a2ui_card");
      expect(result.surface.freshnessKey).toContain("deploy:payments-api");
      expect(result.surface.bindingTrace!.usedFacts).toContain("deploy.serviceName");
    }
  });

  it("reflects deploy action state in the dynamic surface", () => {
    const facts: ConversationFacts = {
      deploy: { status: "deploying" },
      slots: {
        "deploy.serviceName": { value: "payments-api", source: "user", confidence: 1, updatedAt: "" },
        "deploy.selectedServiceContext": {
          value: { recommendedVersion: "v1.2.3", environments: ["production"], availableImages: [{ tag: "v1.2.3" }] },
          source: "tool", confidence: 1, updatedAt: "",
        },
      },
    };

    const result = bindDeployLaunchpad(facts, "deploy.start");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.surface.payload.state).toBe("deploying");
      expect(result.surface.actions?.[0]?.actionId).toBe("deploy.complete");
    }
  });

  it("fails when serviceName is missing", () => {
    const result = bindDeployLaunchpad({}, "deploy.start");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missingFacts).toContain("deploy.serviceName");
    }
  });
});

describe("bind-approval-inbox", () => {
  it("produces valid surface when requestId is present", () => {
    const facts: ConversationFacts = {
      slots: {
        "approval.requestId": { value: "REQ-001", source: "user", confidence: 1, updatedAt: "" },
      },
      approval: { environment: "staging", riskSummary: "Low risk" },
    };

    const result = bindApprovalInbox(facts, "approval.review");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.surface.templateId).toBe("deployment_approval_inbox");
      expect(result.surface.payload.requestId).toBe("REQ-001");
    }
  });

  it("fails when requestId is missing", () => {
    const result = bindApprovalInbox({}, "approval.review");
    expect(result.ok).toBe(false);
  });
});

describe("bind-rollback-summary", () => {
  it("produces valid surface when serviceName is present", () => {
    const facts: ConversationFacts = {
      slots: {
        "rollback.serviceName": { value: "orders-api", source: "user", confidence: 1, updatedAt: "" },
      },
      rollback: { environment: "production", incidentSummary: "OOM crash", currentVersion: "v3.0", blastRadius: "high" },
    };

    const result = bindRollbackSummary(facts, "rollback.start");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.surface.payload.service).toBe("orders-api");
      expect(result.surface.payload.incident).toBe("OOM crash");
    }
  });
});

describe("bind-dry-run-stepper", () => {
  it("produces valid surface with rollback context", () => {
    const facts: ConversationFacts = {
      slots: {
        "rollback.serviceName": { value: "orders-api", source: "user", confidence: 1, updatedAt: "" },
        "rollback.context": {
          value: { targetVersion: "v2.9", dryRunChecks: ["env check", "dep check"] },
          source: "tool", confidence: 1, updatedAt: "",
        },
      },
      rollback: { environment: "production" },
    };

    const result = bindDryRunStepper(facts, "rollback.start");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.surface.templateId).toBe("dry_run_stepper");
      expect(result.surface.payload.steps).toEqual(["env check", "dep check"]);
    }
  });

  it("fails without context", () => {
    const facts: ConversationFacts = {
      slots: {
        "rollback.serviceName": { value: "orders-api", source: "user", confidence: 1, updatedAt: "" },
      },
    };
    const result = bindDryRunStepper(facts, "rollback.start");
    expect(result.ok).toBe(false);
  });
});

describe("bind-confirm-action", () => {
  it("produces valid surface with context", () => {
    const facts: ConversationFacts = {
      slots: {
        "rollback.serviceName": { value: "orders-api", source: "user", confidence: 1, updatedAt: "" },
        "rollback.context": {
          value: { targetVersion: "v2.9", confirmChecklist: ["final review"] },
          source: "tool", confidence: 1, updatedAt: "",
        },
      },
      rollback: { environment: "production", severity: "critical", blastRadius: "high" },
    };

    const result = bindConfirmAction(facts, "rollback.start");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.surface.templateId).toBe("confirm_action");
      expect(result.surface.payload.checklist).toEqual(["final review"]);
    }
  });
});
