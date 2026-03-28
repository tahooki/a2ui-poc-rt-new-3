import { describe, it, expect } from "vitest";
import { evaluateDecision } from "@/devops-chat/server/decision/decision-engine";

describe("decision-engine", () => {
  describe("deploy.start policy", () => {
    it("returns ask_followup when serviceName is missing", () => {
      const result = evaluateDecision("deploy.start", {}, null);
      expect(result.trace.mode).toBe("ask_followup");
      expect(result.trace.missing).toContain("deploy.serviceName");
      expect(result.surfaceIntent).toBeNull();
    });

    it("returns ask_followup when serviceName present but context missing", () => {
      const result = evaluateDecision(
        "deploy.start",
        { "deploy.serviceName": "payments-api" },
        null,
      );
      expect(result.trace.mode).toBe("ask_followup");
      expect(result.trace.matched).toContain("deploy.serviceName");
      expect(result.trace.missing).toContain("deploy.selectedServiceContext");
      expect(result.surfaceIntent?.readiness).toBe("candidate");
    });

    it("returns render_surface when all ready-set slots filled", () => {
      const result = evaluateDecision(
        "deploy.start",
        {
          "deploy.serviceName": "payments-api",
          "deploy.selectedServiceContext": { data: true },
        },
        null,
      );
      expect(result.trace.mode).toBe("render_surface");
      expect(result.trace.reason).toContain("준비됨");
      expect(result.surfaceIntent?.family).toBe("deploy.launchpad");
      expect(result.surfaceIntent?.readiness).toBe("ready");
    });
  });

  describe("deploy.history.lookup policy", () => {
    it("always returns text mode", () => {
      const result = evaluateDecision("deploy.history.lookup", {}, null);
      expect(result.trace.mode).toBe("text");
      expect(result.surfaceIntent).toBeNull();
    });
  });

  describe("approval.review policy", () => {
    it("returns ask_followup when requestId missing", () => {
      const result = evaluateDecision("approval.review", {}, null);
      expect(result.trace.mode).toBe("ask_followup");
      expect(result.trace.missing).toContain("approval.requestId");
    });

    it("returns render_surface when requestId present", () => {
      const result = evaluateDecision(
        "approval.review",
        { "approval.requestId": "req-123" },
        null,
      );
      expect(result.trace.mode).toBe("render_surface");
      expect(result.surfaceIntent?.family).toBe("approval.inbox");
    });
  });

  describe("rollback.start policy", () => {
    it("returns ask_followup when serviceName missing", () => {
      const result = evaluateDecision("rollback.start", {}, null);
      expect(result.trace.mode).toBe("ask_followup");
      expect(result.trace.missing).toContain("rollback.serviceName");
    });

    it("returns render_surface when all ready-set filled", () => {
      const result = evaluateDecision(
        "rollback.start",
        {
          "rollback.serviceName": "api",
          "rollback.context": { data: true },
        },
        null,
      );
      expect(result.trace.mode).toBe("render_surface");
      expect(result.surfaceIntent?.family).toBe("rollback.summary");
    });
  });

  describe("general.qna policy", () => {
    it("always returns text mode", () => {
      const result = evaluateDecision("general.qna", {}, null);
      expect(result.trace.mode).toBe("text");
    });
  });

  describe("decision trace shape", () => {
    it("trace always has matched/missing/disqualified/reason", () => {
      const result = evaluateDecision("deploy.start", {}, null);
      expect(result.trace).toHaveProperty("mode");
      expect(result.trace).toHaveProperty("matched");
      expect(result.trace).toHaveProperty("missing");
      expect(result.trace).toHaveProperty("disqualified");
      expect(result.trace).toHaveProperty("reason");
      expect(Array.isArray(result.trace.matched)).toBe(true);
      expect(Array.isArray(result.trace.missing)).toBe(true);
      expect(Array.isArray(result.trace.disqualified)).toBe(true);
    });
  });
});
