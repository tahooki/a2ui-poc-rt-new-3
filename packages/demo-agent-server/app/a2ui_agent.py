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
    """Python MCP client that communicates with Streamable HTTP."""

    def __init__(self, server_url: Optional[str] = None):
        self.server_url = server_url or settings.mcp_server_url
        self._session_id: Optional[str] = None
        self._request_id = 0

    def _next_id(self) -> int:
        self._request_id += 1
        return self._request_id

    def _headers(self) -> dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        }
        if self._session_id:
            headers["mcp-session-id"] = self._session_id
        return headers

    def _decode_response(self, resp: httpx.Response) -> dict:
        """Decode JSON or single-message SSE responses from MCP."""
        content_type = resp.headers.get("content-type", "")
        text = resp.text.strip()

        if "text/event-stream" in content_type:
            for line in text.splitlines():
                if line.startswith("data:"):
                    return json.loads(line[5:].strip())
            return {}

        if not text:
            return {}

        return resp.json()

    async def _ensure_initialized(self, client: httpx.AsyncClient) -> Optional[dict]:
        """Initialize MCP session before the first tool call."""
        if self._session_id:
            return None

        init_body = {
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "initialize",
            "params": {
                "protocolVersion": "2025-03-26",
                "capabilities": {},
                "clientInfo": {
                    "name": "a2ui-demo-python-agent",
                    "version": "0.1.0",
                },
            },
        }

        resp = await client.post(self.server_url, json=init_body, headers=self._headers())
        if "mcp-session-id" in resp.headers:
            self._session_id = resp.headers["mcp-session-id"]

        if resp.status_code != 200:
            return {"error": f"MCP initialize returned {resp.status_code}: {resp.text}"}

        decoded = self._decode_response(resp)
        if "error" in decoded:
            return {"error": decoded["error"].get("message", "MCP initialize failed")}

        # MCP requires initialized notification after initialize.
        await client.post(
            self.server_url,
            json={
                "jsonrpc": "2.0",
                "method": "notifications/initialized",
                "params": {},
            },
            headers=self._headers(),
        )

        return None

    async def call_tool(self, tool_name: str, args: dict) -> dict:
        """Call an MCP tool via HTTP."""
        async with httpx.AsyncClient() as client:
            init_error = await self._ensure_initialized(client)
            if init_error:
                return init_error

            # MCP Streamable HTTP protocol: send JSON-RPC request
            body = {
                "jsonrpc": "2.0",
                "id": self._next_id(),
                "method": "tools/call",
                "params": {
                    "name": tool_name,
                    "arguments": args,
                },
            }

            resp = await client.post(self.server_url, json=body, headers=self._headers())

            # Extract session ID from response
            if "mcp-session-id" in resp.headers:
                self._session_id = resp.headers["mcp-session-id"]

            if resp.status_code != 200:
                return {"error": f"MCP server returned {resp.status_code}: {resp.text}"}

            result = self._decode_response(resp)

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
                text=decision.get("reason") or decision.get("error") or "이 요청에 대한 A2UI 템플릿이 없습니다.",
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
