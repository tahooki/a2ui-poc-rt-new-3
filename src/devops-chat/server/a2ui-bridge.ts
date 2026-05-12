/**
 * A2UI Bridge — 기존 orchestrate-chat-turn과 @a2ui/agent-node 연결.
 *
 * MCP 서버가 사용 가능할 때 renderOrFallback()을 통해
 * SurfaceEnvelope을 생성합니다.
 * MCP 연결 실패 시 null을 반환하여 기존 binder로 fallback합니다.
 */

import type { SurfaceEnvelope } from "@/devops-chat/types/conversation";
import type { ConversationFacts, ConversationIntentState } from "@/devops-chat/types/conversation";

const MCP_SERVER_URL = process.env.A2UI_MCP_URL ?? "http://localhost:3100/mcp";

/**
 * MCP 서버를 통해 A2UI SurfaceEnvelope을 생성합니다.
 * MCP 연결 불가 시 null을 반환합니다.
 */
export async function tryRenderA2UISurface(
  intent: ConversationIntentState,
  facts: ConversationFacts,
): Promise<SurfaceEnvelope | null> {
  try {
    // MCP 연결 가능 여부 확인 (health check)
    const healthResponse = await fetch(
      MCP_SERVER_URL.replace("/mcp", "/health"),
      { signal: AbortSignal.timeout(1000) },
    );
    if (!healthResponse.ok) return null;
  } catch {
    // MCP 서버가 실행 중이지 않음 → 기존 binder 사용
    return null;
  }

  try {
    // Dynamic import to avoid build-time dependency issues
    const { A2UIMcpClient, renderOrFallback } = await import("@a2ui/agent-node");

    const client = new A2UIMcpClient({ serverUrl: MCP_SERVER_URL });
    await client.connect();

    // Build facts for MCP
    const slots = facts.slots ?? {};
    const mcpFacts: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(slots)) {
      // Slot keys: "deploy.serviceName" → "serviceName"
      const shortKey = key.includes(".") ? key.split(".").pop()! : key;
      mcpFacts[shortKey] = entry.value;
    }

    const result = await renderOrFallback(client, {
      intentKey: intent.intentKey,
      facts: mcpFacts,
    });

    await client.disconnect();

    if (result.type === "surface" && result.envelope) {
      // Convert to existing SurfaceEnvelope format
      const envelope = result.envelope;
      return {
        templateId: envelope.templateId as string,
        payload: (envelope.payload as Record<string, unknown>) ?? {},
        sourceIntent: intent.intentKey,
        updatedAt: (envelope.updatedAt as string) ?? new Date().toISOString(),
        version: (envelope.version as string) ?? "1.0.0",
        actions: (envelope.actions as Array<Record<string, unknown>>) ?? [],
        surfaceConfig: envelope.surfaceConfig as Record<string, unknown> | undefined,
        meta: (envelope.meta as Record<string, unknown>) ?? {},
      } as SurfaceEnvelope;
    }

    return null;
  } catch (err) {
    console.warn("[a2ui-bridge] MCP render failed, falling back:", err);
    return null;
  }
}

/**
 * A2UI MCP 서버가 실행 중인지 확인합니다.
 */
export async function isA2UIAvailable(): Promise<boolean> {
  try {
    const resp = await fetch(
      MCP_SERVER_URL.replace("/mcp", "/health"),
      { signal: AbortSignal.timeout(500) },
    );
    return resp.ok;
  } catch {
    return false;
  }
}
