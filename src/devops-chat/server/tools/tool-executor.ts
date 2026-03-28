import type { ConversationFacts } from "@/devops-chat/types/conversation";
import type { ToolDefinition, ToolOutput } from "./tool-registry";

export type ToolExecutionResult = {
  ok: boolean;
  toolName: string;
  output: ToolOutput;
  durationMs: number;
};

export async function executeTool(
  tool: ToolDefinition,
  facts: ConversationFacts,
  contextSnapshot: Record<string, unknown>,
): Promise<ToolExecutionResult> {
  const start = Date.now();

  try {
    const output = await tool.execute({ facts, contextSnapshot });
    return {
      ok: output.ok,
      toolName: tool.name,
      output,
      durationMs: Date.now() - start,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tool execution failed.";
    return {
      ok: false,
      toolName: tool.name,
      output: {
        ok: false,
        toolName: tool.name,
        data: null,
        summary: message,
      },
      durationMs: Date.now() - start,
    };
  }
}
