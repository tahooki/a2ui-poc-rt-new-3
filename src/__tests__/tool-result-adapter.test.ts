import { describe, it, expect } from "vitest";
import { adaptToolResult } from "@/devops-chat/server/tools/tool-result-adapter";

describe("tool-result-adapter", () => {
  it("adapts getPreviousDeployments result into facts patch", () => {
    const result = adaptToolResult({
      ok: true,
      toolName: "getPreviousDeployments",
      data: { items: [], images: [{ id: "img-1" }] },
      summary: "배포 요청 0건, 이미지 1건",
    });

    expect(result.factsPatch).toEqual({
      deploy: { previousDeployments: { items: [], images: [{ id: "img-1" }] } },
    });
    expect(result.summary).toBe("배포 요청 0건, 이미지 1건");
  });

  it("adapts getApprovalQueueSummary result", () => {
    const result = adaptToolResult({
      ok: true,
      toolName: "getApprovalQueueSummary",
      data: { items: [], byStatus: {}, byType: {} },
      summary: "총 0건",
    });

    expect(result.factsPatch).toEqual({
      approval: { queueSummary: { items: [], byStatus: {}, byType: {} } },
    });
  });

  it("returns error summary for failed tool", () => {
    const result = adaptToolResult({
      ok: false,
      toolName: "getPreviousDeployments",
      data: null,
      summary: "데이터 조회 실패",
    });

    expect(result.factsPatch).toEqual({});
    expect(result.summary).toBe("데이터 조회 실패");
  });
});
