import type { ConversationFacts } from "@/devops-chat/types/conversation";

export type ToolInput = {
  facts: ConversationFacts;
  contextSnapshot: Record<string, unknown>;
};

export type ToolOutput = {
  ok: boolean;
  toolName: string;
  data: unknown;
  summary: string;
};

export type ToolDefinition = {
  name: string;
  description: string;
  /** Keywords that trigger this tool from user input */
  triggerPatterns: RegExp[];
  execute: (input: ToolInput) => Promise<ToolOutput>;
};

const registry: Map<string, ToolDefinition> = new Map();

export function registerTool(tool: ToolDefinition): void {
  registry.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return registry.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(registry.values());
}

/**
 * Resolve which tool(s) should handle a given user input.
 * Returns the first matching tool based on keyword/pattern matching.
 */
export function resolveToolForInput(input: string, facts: ConversationFacts): ToolDefinition | null {
  const normalizedInput = input.toLowerCase();

  for (const tool of registry.values()) {
    for (const pattern of tool.triggerPatterns) {
      if (pattern.test(normalizedInput)) {
        return tool;
      }
    }
  }

  return null;
}
