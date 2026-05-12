/**
 * MCP 클라이언트 E2E 테스트 — resolveTemplateData 호출
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function main() {
  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:3100/mcp"),
  );

  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(transport);
  console.log("Connected to MCP Server");

  // Test 1: listTemplates
  console.log("\n=== a2ui.listTemplates ===");
  const templates = await client.callTool({ name: "a2ui.listTemplates", arguments: {} });
  console.log(JSON.parse((templates.content as Array<{text: string}>)[0].text));

  // Test 2: recommendTemplate
  console.log("\n=== a2ui.recommendTemplate (deploy.start) ===");
  const recommend = await client.callTool({
    name: "a2ui.recommendTemplate",
    arguments: {
      intentKey: "deploy.start",
      facts: { serviceName: "payments-api" },
    },
  });
  const recContent = recommend.content as Array<{type: string; text?: string}>;
  console.log("raw:", recContent);
  if (recContent[0]?.text) console.log(JSON.parse(recContent[0].text));

  // Test 3: resolveTemplateData — 핵심 E2E
  console.log("\n=== a2ui.resolveTemplateData (deploy_launchpad) ===");
  const resolve = await client.callTool({
    name: "a2ui.resolveTemplateData",
    arguments: {
      templateId: "deploy_launchpad",
      context: {
        serviceName: "payments-api",
        environment: "production",
        intentKey: "deploy.start",
      },
    },
  });
  const envelope = JSON.parse((resolve.content as Array<{text: string}>)[0].text);
  console.log("templateId:", envelope.templateId);
  console.log("version:", envelope.version);
  console.log("payload.service:", envelope.payload?.service);
  console.log("payload.targetVersion:", envelope.payload?.targetVersion);
  console.log("payload.strategy:", envelope.payload?.strategy);
  console.log("payload.riskSummary:", envelope.payload?.riskSummary);
  console.log("actions:", envelope.actions?.length, "개");
  console.log("resolverTrace:", envelope.meta?.resolverTrace);

  // Test 4: executeAction
  console.log("\n=== a2ui.executeAction (deploy.start) ===");
  const action = await client.callTool({
    name: "a2ui.executeAction",
    arguments: {
      actionId: "deploy.start",
      templateId: "deploy_launchpad",
      params: { service: "payments-api", version: "v2.3.18-rc1" },
    },
  });
  console.log(JSON.parse((action.content as Array<{text: string}>)[0].text));

  await client.close();
  console.log("\nAll tests passed!");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
