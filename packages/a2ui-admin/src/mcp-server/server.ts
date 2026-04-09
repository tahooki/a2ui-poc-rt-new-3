import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { randomUUID } from "node:crypto";
import { registerTools } from "./tools/register-tools.js";

const PORT = Number(process.env.PORT ?? 3100);

function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: "a2ui-mcp-server", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );
  registerTools(server);
  return server;
}

// Express app
const app = express();
app.use(express.json());

// Session → transport mapping
const transports = new Map<string, StreamableHTTPServerTransport>();

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res, req.body);
    return;
  }

  // New session — create new McpServer + transport per session
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  transport.onclose = () => {
    const sid = (transport as unknown as { sessionId?: string }).sessionId;
    if (sid) transports.delete(sid);
  };

  const server = createMcpServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);

  // Store transport by session ID from response header
  const newSessionId = res.getHeader("mcp-session-id") as string | undefined;
  if (newSessionId) {
    transports.set(newSessionId, transport);
  }
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
    return;
  }
  res.status(400).json({ error: "No session. Send POST /mcp first." });
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (sessionId && transports.has(sessionId)) {
    const transport = transports.get(sessionId)!;
    await transport.handleRequest(req, res);
    transports.delete(sessionId);
    return;
  }
  res.status(404).json({ error: "Session not found." });
});

// Health
app.get("/health", (_req, res) => res.json({ status: "ok", tools: "registered" }));

app.listen(PORT, () => {
  console.log(`A2UI MCP Server running on http://localhost:${PORT}`);
  console.log(`  MCP endpoint: POST http://localhost:${PORT}/mcp`);
});
