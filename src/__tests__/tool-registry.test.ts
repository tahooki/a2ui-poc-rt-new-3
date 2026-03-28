import { describe, it, expect, beforeEach } from "vitest";
import { ensureBuiltinToolsRegistered } from "@/devops-chat/server/tools/register-builtin-tools";
import { getAllTools, resolveToolForInput } from "@/devops-chat/server/tools/tool-registry";

describe("tool-registry", () => {
  beforeEach(() => {
    ensureBuiltinToolsRegistered();
  });

  it("registers all 4 builtin tools", () => {
    const tools = getAllTools();
    const names = tools.map((t) => t.name);
    expect(names).toContain("getPreviousDeployments");
    expect(names).toContain("getDeployableServices");
    expect(names).toContain("getApprovalQueueSummary");
    expect(names).toContain("getRollbackCandidates");
  });

  it("resolves deploy-related queries to deployment tools", () => {
    const tool = resolveToolForInput("최근 배포 이력을 보여줘", {});
    expect(tool?.name).toBe("getPreviousDeployments");
  });

  it("resolves approval queries", () => {
    const tool = resolveToolForInput("승인 대기 목록", {});
    expect(tool?.name).toBe("getApprovalQueueSummary");
  });

  it("resolves rollback queries", () => {
    const tool = resolveToolForInput("롤백 후보 버전", {});
    expect(tool?.name).toBe("getRollbackCandidates");
  });

  it("resolves service list queries", () => {
    const tool = resolveToolForInput("배포 가능한 서비스", {});
    expect(tool?.name).toBe("getDeployableServices");
  });

  it("returns null for unmatched queries", () => {
    const tool = resolveToolForInput("오늘 날씨 어때?", {});
    expect(tool).toBeNull();
  });
});
