import { describe, it, expect } from "vitest";
import { selectTemplate, type TemplateSelectionInput } from "@/devops-chat/templates/template-selector";

function makeInput(overrides: Partial<TemplateSelectionInput> = {}): TemplateSelectionInput {
  return {
    intentKey: "deploy.start",
    workflow: null,
    facts: {},
    surfaceIntent: null,
    lastDecisionTrace: null,
    ...overrides,
  };
}

describe("template-selector", () => {
  it("selects quick_deploy_launchpad when deploy facts are present", () => {
    const result = selectTemplate(
      makeInput({
        intentKey: "deploy.start",
        facts: {
          slots: {
            "deploy.serviceName": { value: "payments-api", source: "user", confidence: 1, updatedAt: "" },
            "deploy.selectedServiceContext": { value: { recommendedVersion: "v1.2" }, source: "tool", confidence: 1, updatedAt: "" },
          },
        },
        surfaceIntent: { family: "deploy.launchpad", intentKey: "deploy.start", readiness: "ready" },
      }),
    );

    expect(result.selected).not.toBeNull();
    expect(result.selected!.templateId).toBe("quick_deploy_launchpad");
    expect(result.selected!.eligible).toBe(true);
  });

  it("selects deployment_approval_inbox for approval.review", () => {
    const result = selectTemplate(
      makeInput({
        intentKey: "approval.review",
        facts: {
          slots: {
            "approval.requestId": { value: "REQ-001", source: "user", confidence: 1, updatedAt: "" },
          },
        },
        surfaceIntent: { family: "approval.inbox", intentKey: "approval.review", readiness: "ready" },
      }),
    );

    expect(result.selected).not.toBeNull();
    expect(result.selected!.templateId).toBe("deployment_approval_inbox");
  });

  it("selects rollback_summary for rollback.start with minimal facts", () => {
    const result = selectTemplate(
      makeInput({
        intentKey: "rollback.start",
        facts: {
          slots: {
            "rollback.serviceName": { value: "orders-api", source: "user", confidence: 1, updatedAt: "" },
          },
        },
        surfaceIntent: { family: "rollback.summary", intentKey: "rollback.start", readiness: "ready" },
      }),
    );

    expect(result.selected).not.toBeNull();
    expect(result.selected!.templateId).toBe("rollback_summary");
  });

  it("returns null when required facts are missing", () => {
    const result = selectTemplate(
      makeInput({
        intentKey: "deploy.start",
        facts: {},
        surfaceIntent: { family: "deploy.launchpad", intentKey: "deploy.start", readiness: "ready" },
      }),
    );

    expect(result.selected).toBeNull();
  });

  it("returns null when intent does not match any template", () => {
    const result = selectTemplate(
      makeInput({
        intentKey: "general.qna",
        facts: {},
      }),
    );

    expect(result.selected).toBeNull();
  });

  it("picks higher-scoring candidate on tie-break", () => {
    // rollback.start with both serviceName and context → dry_run_stepper and rollback_summary both eligible
    const result = selectTemplate(
      makeInput({
        intentKey: "rollback.start",
        facts: {
          slots: {
            "rollback.serviceName": { value: "orders-api", source: "user", confidence: 1, updatedAt: "" },
            "rollback.context": { value: { targetVersion: "v2.0" }, source: "tool", confidence: 1, updatedAt: "" },
          },
        },
        surfaceIntent: { family: "rollback.stepper", intentKey: "rollback.start", readiness: "ready" },
      }),
    );

    expect(result.selected).not.toBeNull();
    // dry_run_stepper has more matched facts + family match → higher score
    expect(result.selected!.templateId).toBe("dry_run_stepper");
    expect(result.candidates.filter((c) => c.eligible).length).toBeGreaterThan(1);
  });
});
