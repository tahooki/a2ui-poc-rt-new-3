"""Tool Planner — intent와 facts 기반으로 다음 실행할 tool 결정."""

from typing import Optional


class ToolPlan:
    """A planned tool execution."""

    def __init__(self, tool_name: str, params: Optional[dict] = None):
        self.tool_name = tool_name
        self.params = params or {}


# Intent → required tools mapping
TOOL_MAP: dict[str, list[str]] = {
    "deploy.start": ["get_service_info"],
    "approval.review": ["get_approvals"],
    "rollback.start": ["get_incidents"],
}


def plan_tools(
    intent_key: str,
    facts: dict[str, str],
    executed: Optional[list[str]] = None,
) -> list[ToolPlan]:
    """Plan which tools to execute based on intent and available facts."""
    executed = executed or []
    tools = TOOL_MAP.get(intent_key, [])

    plans = []
    for tool_name in tools:
        if tool_name in executed:
            continue

        params: dict = {}
        if tool_name == "get_service_info":
            service = facts.get("serviceName")
            if not service:
                continue
            params["serviceName"] = service

        plans.append(ToolPlan(tool_name=tool_name, params=params))

    return plans
