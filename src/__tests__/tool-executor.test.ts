import { describe, it, expect } from "vitest";
import { executeTool } from "@/devops-chat/server/tools/tool-executor";
import type { ToolDefinition } from "@/devops-chat/server/tools/tool-registry";

const mockTool: ToolDefinition = {
  name: "testTool",
  description: "A test tool",
  triggerPatterns: [/test/],
  async execute() {
    return {
      ok: true,
      toolName: "testTool",
      data: { result: 42 },
      summary: "결과: 42",
    };
  },
};

const failingTool: ToolDefinition = {
  name: "failTool",
  description: "A failing tool",
  triggerPatterns: [/fail/],
  async execute() {
    throw new Error("boom");
  },
};

describe("tool-executor", () => {
  it("executes a tool and returns result with duration", async () => {
    const result = await executeTool(mockTool, {}, {});
    expect(result.ok).toBe(true);
    expect(result.toolName).toBe("testTool");
    expect(result.output.data).toEqual({ result: 42 });
    expect(result.output.summary).toBe("결과: 42");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("catches tool errors and returns error result", async () => {
    const result = await executeTool(failingTool, {}, {});
    expect(result.ok).toBe(false);
    expect(result.output.summary).toBe("boom");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
