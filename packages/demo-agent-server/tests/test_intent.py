"""Tests for intent resolver."""

from app.orchestration.intent_resolver import resolve_intent


def test_deploy_intent():
    result = resolve_intent("payments-api 배포해줘")
    assert result.intent_key == "deploy.start"
    assert result.slots.get("serviceName") == "payments-api"


def test_approval_intent():
    result = resolve_intent("승인 요청 목록 보여줘")
    assert result.intent_key == "approval.review"


def test_rollback_intent():
    result = resolve_intent("checkout 롤백해야 해")
    assert result.intent_key == "rollback.start"
    assert result.slots.get("serviceName") == "checkout"


def test_unknown_input():
    result = resolve_intent("오늘 날씨 어때?")
    assert result.intent_key == "general"
    assert result.confidence < 0.5


def test_environment_extraction():
    result = resolve_intent("payments-api production에 배포")
    assert result.slots.get("serviceName") == "payments-api"
    assert result.slots.get("environment") == "production"


def test_service_alias_normalization():
    result = resolve_intent("payment-api")
    assert result.slots.get("serviceName") == "payments-api"


def test_extract_slots_when_carrying_current_intent():
    result = resolve_intent("payment-api", current_intent="deploy.start")
    assert result.intent_key == "deploy.start"
    assert result.slots.get("serviceName") == "payments-api"
