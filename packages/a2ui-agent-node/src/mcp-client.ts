/**
 * A2UI MCP Client — MCP 서버와의 통신 래퍼
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export class A2UIMcpClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private serverUrl: string;

  constructor(options?: { serverUrl?: string }) {
    this.serverUrl = options?.serverUrl ?? "http://localhost:3100/mcp";
  }

  async connect(): Promise<void> {
    this.transport = new StreamableHTTPClientTransport(
      new URL(this.serverUrl),
    );
    this.client = new Client(
      { name: "a2ui-agent-node", version: "0.1.0" },
      { capabilities: {} },
    );
    await this.client.connect(this.transport);
  }

  async callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    if (!this.client) {
      throw new Error("Not connected. Call connect() first.");
    }

    const result = await this.client.callTool({ name, arguments: args });

    // MCP tool results come as content array — parse the first text item
    const content = result.content as Array<{ type: string; text?: string }>;
    const textItem = content?.find((c) => c.type === "text");
    if (!textItem?.text) {
      return {};
    }

    try {
      return JSON.parse(textItem.text) as Record<string, unknown>;
    } catch {
      return { raw: textItem.text };
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.transport = null;
    }
  }

  get isConnected(): boolean {
    return this.client !== null;
  }
}
