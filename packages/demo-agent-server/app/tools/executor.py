"""Tool Executor — Mock API 호출을 통한 tool 실행."""

import httpx
from ..config import settings


async def execute_tool(tool_name: str, params: dict) -> dict:
    """Execute a tool by calling the Mock API."""
    async with httpx.AsyncClient(base_url=settings.mock_api_url) as client:
        if tool_name == "get_service_info":
            service_name = params.get("serviceName", "")
            resp = await client.get(f"/api/services/{service_name}")
            resp.raise_for_status()
            return resp.json()

        if tool_name == "get_approvals":
            resp = await client.get("/api/approvals")
            resp.raise_for_status()
            return resp.json()

        if tool_name == "get_incidents":
            resp = await client.get("/api/incidents")
            resp.raise_for_status()
            return resp.json()

        if tool_name in ("deploy", "approve", "rollback"):
            resp = await client.post(f"/api/actions/{tool_name}", json=params)
            resp.raise_for_status()
            return resp.json()

    return {"error": f"Unknown tool: {tool_name}"}
