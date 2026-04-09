"""Tool Narrator — tool 결과를 자연어로 변환."""


def narrate_tool_result(tool_name: str, result: dict) -> str:
    """Convert tool execution result to natural language summary."""
    if tool_name == "get_service_info":
        svc = result.get("name", "서비스")
        ver = result.get("recommendedVersion", "unknown")
        return f"{svc} 서비스 정보를 조회했습니다. 추천 버전: {ver}"

    if tool_name == "get_approvals":
        items = result.get("items", [])
        return f"승인 대기 항목 {len(items)}건을 조회했습니다."

    if tool_name == "get_incidents":
        candidates = result.get("candidates", [])
        return f"롤백 후보 {len(candidates)}건을 조회했습니다."

    return f"{tool_name} 실행 완료."
