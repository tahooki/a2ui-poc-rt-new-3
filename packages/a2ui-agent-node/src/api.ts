/**
 * A2UI Agent Node — 고수준 API
 *
 * renderOrFallback: intent + facts → SurfaceEnvelope 또는 텍스트 폴백
 * handleA2UIAction: UI 액션 실행
 */

import type { A2UIMcpClient } from "./mcp-client.js";

export type RenderResult =
  | { type: "surface"; envelope: Record<string, unknown> }
  | { type: "followup"; missingFacts: string[]; reason: string }
  | { type: "text_fallback"; text: string };

export type ActionResult = {
  ok: boolean;
  data: Record<string, unknown>;
};

/**
 * intent + facts로 템플릿 추천 → resolve → SurfaceEnvelope 반환.
 * 실패 시 text_fallback으로 graceful degradation.
 */
export async function renderOrFallback(
  client: A2UIMcpClient,
  options: {
    intentKey: string;
    facts: Record<string, unknown>;
  },
): Promise<RenderResult> {
  try {
    // Step 1: 템플릿 추천
    const decision = await client.callTool("a2ui.recommendTemplate", {
      intentKey: options.intentKey,
      facts: options.facts,
    });

    const mode = decision.mode as string;

    if (mode === "ask_followup") {
      return {
        type: "followup",
        missingFacts: (decision.missingFacts as string[]) ?? [],
        reason: (decision.reason as string) ?? "추가 정보가 필요합니다.",
      };
    }

    if (mode !== "render_surface" || !decision.templateId) {
      return {
        type: "text_fallback",
        text: (decision.reason as string) ?? "이 요청에 대한 A2UI 템플릿이 없습니다.",
      };
    }

    // Step 2: 템플릿 데이터 resolve
    const envelope = await client.callTool("a2ui.resolveTemplateData", {
      templateId: decision.templateId,
      context: {
        ...options.facts,
        intentKey: options.intentKey,
      },
    });

    if (envelope.error) {
      return {
        type: "text_fallback",
        text: `템플릿 렌더링 실패: ${envelope.error}`,
      };
    }

    return { type: "surface", envelope };
  } catch (err) {
    return {
      type: "text_fallback",
      text: `A2UI 연결 실패. 텍스트로 응답합니다. (${err instanceof Error ? err.message : String(err)})`,
    };
  }
}

/**
 * UI에서 발생한 액션 이벤트를 MCP 서버로 전달하여 실행.
 */
export async function handleA2UIAction(
  client: A2UIMcpClient,
  event: {
    actionId: string;
    templateId: string;
    params?: Record<string, unknown>;
  },
): Promise<ActionResult> {
  try {
    const result = await client.callTool("a2ui.executeAction", {
      actionId: event.actionId,
      templateId: event.templateId,
      params: event.params ?? {},
    });

    if (result.error) {
      return { ok: false, data: result };
    }

    return { ok: true, data: result };
  } catch (err) {
    return {
      ok: false,
      data: { error: err instanceof Error ? err.message : String(err) },
    };
  }
}
