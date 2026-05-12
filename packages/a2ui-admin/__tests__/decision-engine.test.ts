import { describe, it, expect } from "vitest";
import { evaluateDecision } from "../src/mcp-server/decision/decision-engine";

describe("Decision Engine", () => {
  it("deploy.start — facts 충족 시 render_surface", () => {
    const result = evaluateDecision("deploy.start", { serviceName: "payments-api" });
    expect(result.mode).toBe("render_surface");
    expect(result.templateId).toBe("deploy_launchpad");
  });

  it("deploy.start — serviceName 누락 시 ask_followup", () => {
    const result = evaluateDecision("deploy.start", {});
    expect(result.mode).toBe("ask_followup");
    expect(result.missingFacts).toContain("serviceName");
  });

  it("deploy.history.lookup — required facts 없이도 render_surface", () => {
    const result = evaluateDecision("deploy.history.lookup", {});
    expect(result.mode).toBe("render_surface");
    expect(result.templateId).toBe("deploy_history_table");
  });

  it("approval.review — required facts 없이도 render_surface", () => {
    const result = evaluateDecision("approval.review", {});
    expect(result.mode).toBe("render_surface");
    expect(result.templateId).toBe("approval_queue_inbox");
  });

  it("rollback.start — serviceName 있으면 render_surface", () => {
    const result = evaluateDecision("rollback.start", { serviceName: "checkout" });
    expect(result.mode).toBe("render_surface");
    expect(result.templateId).toBe("rollback_summary");
  });

  it("rollback.start — serviceName 없으면 ask_followup", () => {
    const result = evaluateDecision("rollback.start", {});
    expect(result.mode).toBe("ask_followup");
  });

  it("unknown intent → text_only", () => {
    const result = evaluateDecision("random.stuff", { serviceName: "x" });
    expect(result.mode).toBe("text_only");
  });
});
