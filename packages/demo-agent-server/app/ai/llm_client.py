"""LLM Client — PoC에서는 mock 응답 반환."""

import os
from typing import Optional

MOCK_RESPONSES: dict[str, str] = {
    "deploy": "payments-api를 production 환경에 v2.3.18-rc1 버전으로 배포를 준비하겠습니다.",
    "approval": "현재 승인 대기 중인 요청을 확인하겠습니다.",
    "rollback": "인시던트 상황을 분석하고 롤백 옵션을 준비하겠습니다.",
    "general": "무엇을 도와드릴까요? 배포, 승인, 롤백 관련 작업을 지원합니다.",
}


def is_llm_available() -> bool:
    """Check if real LLM API is available."""
    return bool(os.getenv("OPENAI_API_KEY"))


async def generate_response(
    user_input: str,
    context: Optional[dict] = None,
    tool_summary: Optional[str] = None,
) -> str:
    """Generate a response — mock for PoC."""
    if tool_summary:
        return tool_summary

    lower = user_input.lower()
    if "배포" in lower or "deploy" in lower:
        return MOCK_RESPONSES["deploy"]
    if "승인" in lower or "approv" in lower:
        return MOCK_RESPONSES["approval"]
    if "롤백" in lower or "rollback" in lower:
        return MOCK_RESPONSES["rollback"]

    return MOCK_RESPONSES["general"]
