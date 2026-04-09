"""A2UI Agent — Python 버전의 render_or_fallback 구현.

MCP 서버와 통신하여 SurfaceEnvelope을 생성하거나,
실패 시 텍스트 폴백을 반환합니다.
"""

import httpx
import json
from typing import Optional
from pydantic import BaseModel

from .config import settings


class A2UIResponse(BaseModel):
    """A2UI render result."""

    type: str  # "surface" | "followup" | "text_fallback"
    text: Optional[str] = None
    surface: Optional[dict] = None
    missing_facts: list[str] = []
    reason: Optional[str] = None


class A2UIMcpClient:
    """Python MCP client that communicates via HTTP (not full MCP protocol).

    For PoC, we call the MCP server's tools via direct HTTP POST to /mcp.
    In production, this would use the proper MCP SSE client.
    """

    def __init__(self, server_url: Optional[str] = None):
        self.server_url = server_url or settings.mcp_server_url
        self._session_id: Optional[str] = None

    async def call_tool(self, tool_name: str, args: dict) -> dict:
        """Call an MCP tool via HTTP."""
        async with httpx.AsyncClient() as client:
            # MCP Streamable HTTP protocol: send JSON-RPC request
            body = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": args,
                },
            }

            headers = {"Content-Type": "application/json", "Accept": "application/json"}
            if self._session_id:
                headers["mcp-session-id"] = self._session_id

            resp = await client.post(self.server_url, json=body, headers=headers)

            # Extract session ID from response
            if "mcp-session-id" in resp.headers:
                self._session_id = resp.headers["mcp-session-id"]

            if resp.status_code != 200:
                return {"error": f"MCP server returned {resp.status_code}"}

            result = resp.json()

            # Handle JSON-RPC response
            if "result" in result:
                content = result["result"].get("content", [])
                for item in content:
                    if item.get("type") == "text":
                        try:
                            return json.loads(item["text"])
                        except json.JSONDecodeError:
                            return {"raw": item["text"]}

            if "error" in result:
                return {"error": result["error"].get("message", "Unknown error")}

            return {}


async def render_or_fallback(
    intent_key: str,
    facts: dict,
    mcp_url: Optional[str] = None,
) -> A2UIResponse:
    """Python 버전 renderOrFallback — MCP 서버를 통해 SurfaceEnvelope 생성.

    Steps:
    1. a2ui.recommendTemplate 호출로 템플릿 추천
    2. render_surface면 a2ui.resolveTemplateData 호출
    3. 실패 시 text_fallback 반환
    """
    try:
        client = A2UIMcpClient(server_url=mcp_url)

        # Step 1: Recommend template
        decision = await client.call_tool(
            "a2ui.recommendTemplate",
            {"intentKey": intent_key, "facts": facts},
        )

        mode = decision.get("mode", "")

        if mode == "ask_followup":
            return A2UIResponse(
                type="followup",
                missing_facts=decision.get("missingFacts", []),
                reason=decision.get("reason", "추가 정보가 필요합니다."),
            )

        if mode != "render_surface" or not decision.get("templateId"):
            return A2UIResponse(
                type="text_fallback",
                text=decision.get("reason", "이 요청에 대한 A2UI 템플릿이 없습니다."),
            )

        # Step 2: Resolve template data
        envelope = await client.call_tool(
            "a2ui.resolveTemplateData",
            {
                "templateId": decision["templateId"],
                "context": {**facts, "intentKey": intent_key},
            },
        )

        if "error" in envelope:
            return A2UIResponse(
                type="text_fallback",
                text=f"템플릿 렌더링 실패: {envelope['error']}",
            )

        return A2UIResponse(type="surface", surface=envelope)

    except Exception as e:
        return A2UIResponse(
            type="text_fallback",
            text=f"A2UI 연결 실패. 텍스트로 응답합니다. ({e})",
        )


async def handle_action(
    action_id: str,
    template_id: str,
    params: Optional[dict] = None,
    mcp_url: Optional[str] = None,
) -> dict:
    """UI 액션을 MCP 서버로 전달하여 실행."""
    try:
        client = A2UIMcpClient(server_url=mcp_url)
        result = await client.call_tool(
            "a2ui.executeAction",
            {
                "actionId": action_id,
                "templateId": template_id,
                "params": params or {},
            },
        )
        return result
    except Exception as e:
        return {"error": str(e)}
