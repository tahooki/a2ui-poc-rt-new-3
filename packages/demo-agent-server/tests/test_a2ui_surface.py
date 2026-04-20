"""Tests for Python agent A2UI surface preservation."""

import asyncio

from app import a2ui_agent
from app.a2ui_agent import render_or_fallback
from app.orchestrate import ChatRequest, orchestrate_chat_turn
from app.orchestration.slot_memory import clear_session


DEPLOY_SURFACE = {
    "templateId": "deploy_launchpad",
    "version": "1.0.0",
    "payload": {
        "templateId": "deploy_launchpad",
        "state": "ready",
        "service": "payments-api",
        "environment": "production",
        "targetVersion": "v2.3.18-rc1",
        "strategy": "rolling",
    },
    "actions": [{"actionId": "deploy.start", "label": "배포 시작", "variant": "primary"}],
    "surfaceConfig": {
        "kind": "a2ui_card",
        "parts": [
            {
                "id": "deploy-artifact",
                "type": "DeployArtifactBlock",
                "props": {"image": {"type": "binding", "path": "payload.imageDetail"}},
            }
        ],
    },
    "sourceIntent": "deploy.start",
    "updatedAt": "2026-04-20T00:00:00.000Z",
}


def test_render_or_fallback_preserves_surface_config(monkeypatch):
    class FakeMcpClient:
        def __init__(self, server_url=None):
            self.server_url = server_url

        async def call_tool(self, tool_name, args):
            if tool_name == "a2ui.recommendTemplate":
                return {"mode": "render_surface", "templateId": "deploy_launchpad"}
            if tool_name == "a2ui.resolveTemplateData":
                return DEPLOY_SURFACE
            return {"error": f"unexpected tool: {tool_name}"}

    monkeypatch.setattr(a2ui_agent, "A2UIMcpClient", FakeMcpClient)

    result = asyncio.run(render_or_fallback("deploy.start", {"serviceName": "payments-api"}))

    assert result.type == "surface"
    assert result.surface["surfaceConfig"]["kind"] == "a2ui_card"
    assert result.surface["surfaceConfig"]["parts"][0]["type"] == "DeployArtifactBlock"


def test_deploy_chat_turn_returns_surface_with_deploy_parts(monkeypatch):
    async def fake_execute_tool(tool_name, params):
        assert tool_name == "get_service_info"
        return {
            "serviceName": params["serviceName"],
            "recommendedVersion": "v2.3.18-rc1",
        }

    async def fake_render_or_fallback(intent_key, facts):
        assert intent_key == "deploy.start"
        assert facts["serviceName"] == "payments-api"
        return a2ui_agent.A2UIResponse(type="surface", surface=DEPLOY_SURFACE)

    from app import orchestrate

    monkeypatch.setattr(orchestrate, "execute_tool", fake_execute_tool)
    monkeypatch.setattr(orchestrate, "render_or_fallback", fake_render_or_fallback)
    clear_session("surface-test")

    result = asyncio.run(
        orchestrate_chat_turn(ChatRequest(conversation_id="surface-test", input="payments-api 배포하고 싶어"))
    )

    assert result.decision_mode == "render_surface"
    assert result.surface["surfaceConfig"]["parts"][0]["type"] == "DeployArtifactBlock"
