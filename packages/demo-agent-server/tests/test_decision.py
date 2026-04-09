"""Tests for the Python decision engine."""

from app.decision.decision_engine import evaluate_decision


def test_deploy_with_service_renders_surface():
    result = evaluate_decision("deploy.start", {"serviceName": "payments-api"})
    assert result.mode == "render_surface"
    assert result.template_id == "deploy_launchpad"


def test_deploy_without_service_asks_followup():
    result = evaluate_decision("deploy.start", {})
    assert result.mode == "ask_followup"
    assert "serviceName" in result.missing_facts


def test_approval_no_facts_needed():
    result = evaluate_decision("approval.review", {})
    assert result.mode == "render_surface"
    assert result.template_id == "approval_queue_inbox"


def test_rollback_with_service():
    result = evaluate_decision("rollback.start", {"serviceName": "checkout"})
    assert result.mode == "render_surface"
    assert result.template_id == "rollback_summary"


def test_unknown_intent():
    result = evaluate_decision("chat.general", {})
    assert result.mode == "text_only"
