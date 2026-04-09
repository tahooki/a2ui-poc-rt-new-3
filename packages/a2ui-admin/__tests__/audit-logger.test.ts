import { describe, it, expect } from "vitest";
import { logAudit, getAuditLogs, type AuditEntry } from "../src/mcp-server/audit/audit-logger";

describe("Audit Logger", () => {
  it("logAudit → getAuditLogs에서 조회 가능", () => {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      templateId: "test_template",
      resolvers: [
        { name: "api", durationMs: 50, success: true },
        { name: "llm", durationMs: 10, success: true },
      ],
      bindingSuccess: true,
      validationSuccess: true,
    };

    const beforeCount = getAuditLogs().length;
    logAudit(entry);
    const afterCount = getAuditLogs().length;

    expect(afterCount).toBe(beforeCount + 1);
    const last = getAuditLogs()[afterCount - 1];
    expect(last.templateId).toBe("test_template");
    expect(last.resolvers).toHaveLength(2);
  });

  it("실패 엔트리도 기록", () => {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      templateId: "fail_test",
      resolvers: [
        { name: "api", durationMs: 100, success: false, error: "timeout" },
      ],
      bindingSuccess: false,
      validationSuccess: false,
      validationErrors: ["Missing field: items"],
    };

    logAudit(entry);
    const logs = getAuditLogs();
    const last = logs[logs.length - 1];
    expect(last.validationSuccess).toBe(false);
    expect(last.validationErrors).toContain("Missing field: items");
  });
});
