import { describe, it, expect } from "vitest";
import { validatePayload } from "../src/mcp-server/validation/payload-validator";

describe("Payload Validator (Ajv)", () => {
  describe("deploy_launchpad", () => {
    it("유효한 payload → valid", () => {
      const result = validatePayload("deploy_launchpad", {
        templateId: "deploy_launchpad",
        state: "ready",
        service: "payments-api",
        environment: "production",
        targetVersion: "v2.3.18",
        strategy: "rolling",
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("필수 필드 누락 → invalid", () => {
      const result = validatePayload("deploy_launchpad", {
        templateId: "deploy_launchpad",
        state: "ready",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("잘못된 state enum → invalid", () => {
      const result = validatePayload("deploy_launchpad", {
        templateId: "deploy_launchpad",
        state: "invalid_state",
        service: "x",
        environment: "x",
        targetVersion: "x",
        strategy: "x",
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("deploy_history_table", () => {
    it("rows와 columns가 있으면 valid", () => {
      const result = validatePayload("deploy_history_table", {
        templateId: "deploy_history_table",
        state: "ready",
        summaryItems: [{ label: "Deployments", value: "1" }],
        rows: [
          {
            service: "payments-api",
            environment: "production",
            version: "v2.3.18",
            status: "success",
            deployedBy: "김배포",
            deployedAt: "2026-03-30 00:15 KST",
          },
        ],
        columns: [{ key: "service", label: "Service" }],
      });
      expect(result.valid).toBe(true);
    });

    it("rows 누락 → invalid", () => {
      const result = validatePayload("deploy_history_table", {
        templateId: "deploy_history_table",
        state: "ready",
        summaryItems: [],
        columns: [],
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("approval_queue_inbox", () => {
    it("items 배열 있으면 valid", () => {
      const result = validatePayload("approval_queue_inbox", {
        templateId: "approval_queue_inbox",
        items: [{ id: "a1", type: "access", title: "test", status: "pending" }],
      });
      expect(result.valid).toBe(true);
    });

    it("items 누락 → invalid", () => {
      const result = validatePayload("approval_queue_inbox", {
        templateId: "approval_queue_inbox",
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("rollback_summary", () => {
    it("candidates 있으면 valid", () => {
      const result = validatePayload("rollback_summary", {
        templateId: "rollback_summary",
        candidates: [{ id: "svc-1", service: "api", currentVersion: "v1" }],
      });
      expect(result.valid).toBe(true);
    });

    it("candidates 누락 → invalid", () => {
      const result = validatePayload("rollback_summary", {
        templateId: "rollback_summary",
      });
      expect(result.valid).toBe(false);
    });
  });

  describe("unknown template", () => {
    it("등록되지 않은 templateId → always valid", () => {
      const result = validatePayload("some_unknown", { anything: true });
      expect(result.valid).toBe(true);
    });
  });
});
