import { describe, it, expect } from "vitest";
import { executeLlmResolver } from "../src/mcp-server/resolvers/llm-resolver";

describe("LLM Resolver (canned)", () => {
  it("deploy_launchpad → riskSummary 반환", async () => {
    const result = await executeLlmResolver("deploy_launchpad", {});
    expect(result.riskSummary).toBeTruthy();
    expect(typeof result.riskSummary).toBe("string");
  });

  it("approval_queue_inbox → queueSummary 반환", async () => {
    const result = await executeLlmResolver("approval_queue_inbox", {});
    expect(result.queueSummary).toBeTruthy();
  });

  it("rollback_summary → causeSummary + recommendation 반환", async () => {
    const result = await executeLlmResolver("rollback_summary", {});
    expect(result.causeSummary).toBeTruthy();
    expect(result.recommendation).toBeTruthy();
  });

  it("unknown template → 빈 객체", async () => {
    const result = await executeLlmResolver("nonexistent", {});
    expect(Object.keys(result)).toHaveLength(0);
  });
});
