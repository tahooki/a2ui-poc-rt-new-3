"""Intent Resolver — 사용자 입력에서 intent 추출."""

from pydantic import BaseModel
from typing import Optional
import re


class IntentResult(BaseModel):
    """Resolved intent from user input."""

    intent_key: str
    confidence: float
    slots: dict[str, str] = {}
    source: str = "rule"


# Rule-based intent patterns
INTENT_PATTERNS: list[tuple[str, list[str], float]] = [
    ("deploy.start", ["배포", "deploy", "릴리즈", "release"], 0.8),
    ("approval.review", ["승인", "approv", "검토", "review"], 0.8),
    ("rollback.start", ["롤백", "rollback", "되돌", "revert"], 0.8),
]

# Slot extraction patterns
SERVICE_PATTERN = re.compile(
    r"(payments-api|checkout|catalog-api|search-api|billing-api)"
)
ENV_PATTERN = re.compile(
    r"(production|staging|development|프로덕션|스테이징|prod|stg|dev)"
)

ENV_NORMALIZE: dict[str, str] = {
    "프로덕션": "production",
    "스테이징": "staging",
    "prod": "production",
    "stg": "staging",
    "dev": "development",
}


def resolve_intent(
    user_input: str,
    current_intent: Optional[str] = None,
) -> IntentResult:
    """Resolve intent from user input using rule-based matching."""
    lower = user_input.lower()

    # Match intent
    for intent_key, keywords, confidence in INTENT_PATTERNS:
        if any(kw in lower for kw in keywords):
            slots = _extract_slots(user_input)
            return IntentResult(
                intent_key=intent_key,
                confidence=confidence,
                slots=slots,
                source="rule",
            )

    # Fallback: maintain current intent or general
    return IntentResult(
        intent_key=current_intent or "general",
        confidence=0.3,
        source="fallback",
    )


def _extract_slots(user_input: str) -> dict[str, str]:
    """Extract slot values from user input."""
    slots: dict[str, str] = {}

    svc_match = SERVICE_PATTERN.search(user_input)
    if svc_match:
        slots["serviceName"] = svc_match.group(1)

    env_match = ENV_PATTERN.search(user_input.lower())
    if env_match:
        raw = env_match.group(1)
        slots["environment"] = ENV_NORMALIZE.get(raw, raw)

    return slots
