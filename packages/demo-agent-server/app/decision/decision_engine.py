"""Decision Engine — rule-based intent→template 판단 (Python 버전)."""

from pydantic import BaseModel
from typing import Optional


class DecisionResult(BaseModel):
    """Decision engine evaluation result."""

    mode: str  # "render_surface" | "ask_followup" | "text_only"
    template_id: Optional[str] = None
    reason: str
    missing_facts: list[str] = []


# Intent → template mapping with required facts
INTENT_RULES: dict[str, dict] = {
    "deploy.start": {
        "template_id": "deploy_launchpad",
        "required_facts": ["serviceName"],
        "optional_facts": ["environment", "targetVersion"],
    },
    "approval.review": {
        "template_id": "approval_queue_inbox",
        "required_facts": [],
    },
    "rollback.start": {
        "template_id": "rollback_summary",
        "required_facts": ["serviceName"],
    },
}


def evaluate_decision(
    intent_key: str,
    facts: dict[str, str],
) -> DecisionResult:
    """Evaluate intent + facts → render_surface / ask_followup / text_only."""
    rule = INTENT_RULES.get(intent_key)

    if not rule:
        return DecisionResult(
            mode="text_only",
            reason=f"No A2UI rule for intent: {intent_key}",
        )

    missing = [f for f in rule["required_facts"] if not facts.get(f)]

    if missing:
        return DecisionResult(
            mode="ask_followup",
            reason=f"Missing required facts: {', '.join(missing)}",
            missing_facts=missing,
        )

    return DecisionResult(
        mode="render_surface",
        template_id=rule["template_id"],
        reason=f"All required facts present for {rule['template_id']}",
    )
