"""LLM Client — OpenAI 호출, 미설정 시 mock 응답 fallback."""

import json
from typing import Optional

import httpx

from ..config import settings

MOCK_RESPONSES: dict[str, str] = {
    "deploy": "payments-api를 production 환경에 v2.3.18-rc1 버전으로 배포를 준비하겠습니다.",
    "approval": "현재 승인 대기 중인 요청을 확인하겠습니다.",
    "rollback": "인시던트 상황을 분석하고 롤백 옵션을 준비하겠습니다.",
    "general": "무엇을 도와드릴까요? 배포, 승인, 롤백 관련 작업을 지원합니다.",
}


def is_llm_available() -> bool:
    """Check if real LLM API is available."""
    return bool(settings.openai_api_key)


def _mock_response(user_input: str, tool_summary: Optional[str] = None) -> str:
    """Return deterministic text when OpenAI is not configured or fails."""
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


def _compact_json(value: object) -> str:
    """Serialize context compactly and cap prompt size."""
    try:
        text = json.dumps(value, ensure_ascii=False, default=str)
    except TypeError:
        text = str(value)
    return text[:4000]


async def generate_response(
    user_input: str,
    context: Optional[dict] = None,
    tool_summary: Optional[str] = None,
) -> str:
    """Generate a Korean assistant response using OpenAI when configured."""
    if not is_llm_available():
        return _mock_response(user_input, tool_summary)

    messages = [
        {
            "role": "system",
            "content": (
                "너는 한국어로 답하는 친절한 AI assistant다. "
                "일반 지식 질문은 자연스럽게 답한다. "
                "사용자가 배포, 승인, 롤백, 운영 콘솔, A2UI 관련 작업을 요청하면 "
                "제공된 도구 결과와 컨텍스트를 근거로 짧고 명확하게 돕는다. "
                "확정되지 않은 사실은 단정하지 않는다."
            ),
        },
        {
            "role": "user",
            "content": (
                f"사용자 입력: {user_input}\n"
                f"컨텍스트: {_compact_json(context or {})}\n"
                f"도구 결과 요약: {tool_summary or '(없음)'}"
            ),
        },
    ]

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{settings.openai_base_url.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.openai_model,
                    "messages": messages,
                    "temperature": 0.2,
                    "max_tokens": 600,
                },
            )

        if not response.is_success:
            return _mock_response(user_input, tool_summary)

        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content")
        if isinstance(content, str) and content.strip():
            return content.strip()

        return _mock_response(user_input, tool_summary)
    except Exception:
        return _mock_response(user_input, tool_summary)
