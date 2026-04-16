"""8-Step Orchestration Pipeline — Python Agent Server 핵심 로직.

1. Awaiting response handling (slot filling)
2. Intent resolution (rule-based)
3. Workflow state update
4. Tool planning + execution (max 3 iterations)
5. Facts merging
6. Decision Engine evaluation
7. Text response generation
8. A2UI surface generation via render_or_fallback()
"""

from typing import Optional, AsyncIterator
from pydantic import BaseModel
import json

from .orchestration.intent_resolver import resolve_intent
from .orchestration.slot_memory import get_or_create_session
from .orchestration.tool_planner import plan_tools
from .decision.decision_engine import evaluate_decision
from .tools.executor import execute_tool
from .ai.llm_client import generate_response
from .ai.narrator import narrate_tool_result
from .a2ui_agent import render_or_fallback


MAX_ITERATIONS = 3


class ChatRequest(BaseModel):
    """Incoming chat request."""

    conversation_id: str = "default"
    input: str
    context: dict = {}


class ChatResponse(BaseModel):
    """Full chat response."""

    request_id: str
    text: str
    surface: Optional[dict] = None
    intent: Optional[str] = None
    decision_mode: str = "text"
    decision_reason: Optional[str] = None
    tool_results: list[dict] = []


async def orchestrate_chat_turn(request: ChatRequest) -> ChatResponse:
    """Execute the 8-step orchestration pipeline."""
    import uuid

    request_id = str(uuid.uuid4())
    session = get_or_create_session(request.conversation_id)

    # Step 1: Slot filling (simplified — no awaiting in PoC)
    # Just use existing slots

    # Step 2: Intent resolution
    intent_result = resolve_intent(
        request.input,
        current_intent=session.intent_key,
    )
    session.intent_key = intent_result.intent_key
    session.merge_slots(intent_result.slots)

    # Step 3: Workflow state update
    facts = session.to_facts()

    # Step 4-5: Tool planning + execution + facts merging
    tool_results: list[dict] = []
    executed: list[str] = []

    for _ in range(MAX_ITERATIONS):
        plans = plan_tools(intent_result.intent_key, facts, executed)
        if not plans:
            break

        plan = plans[0]
        try:
            result = await execute_tool(plan.tool_name, plan.params)
            summary = narrate_tool_result(plan.tool_name, result)
            tool_results.append({
                "tool_name": plan.tool_name,
                "summary": summary,
                "data": result,
            })
            executed.append(plan.tool_name)

            # Merge tool results into facts
            if isinstance(result, dict):
                for k, v in result.items():
                    if isinstance(v, (str, int, float, bool)):
                        facts[k] = str(v)
        except Exception as e:
            tool_results.append({
                "tool_name": plan.tool_name,
                "summary": f"실행 실패: {e}",
                "data": {},
            })
            executed.append(plan.tool_name)

    # Step 6: Decision Engine evaluation
    decision = evaluate_decision(intent_result.intent_key, facts)

    # Step 7: Text response generation
    tool_summary = "\n".join(t["summary"] for t in tool_results) if tool_results else None
    text = await generate_response(request.input, request.context, tool_summary)

    # Step 8: A2UI surface generation
    surface = None
    if decision.mode == "render_surface":
        a2ui_result = await render_or_fallback(
            intent_key=intent_result.intent_key,
            facts=facts,
        )
        if a2ui_result.type == "surface":
            surface = a2ui_result.surface
            text = f"{text}\n\n필요한 정보가 모두 준비되었습니다."
        elif a2ui_result.type == "followup":
            text = a2ui_result.reason or "추가 정보가 필요합니다."
    elif decision.mode == "ask_followup":
        if "serviceName" in decision.missing_facts:
            text = "어떤 서비스를 배포할까요? 예: payments-api, checkout, catalog-api"
        else:
            text = f"추가 정보가 필요합니다: {', '.join(decision.missing_facts)}"

    return ChatResponse(
        request_id=request_id,
        text=text,
        surface=surface,
        intent=intent_result.intent_key,
        decision_mode=decision.mode,
        decision_reason=decision.reason,
        tool_results=[{"tool_name": t["tool_name"], "summary": t["summary"]} for t in tool_results],
    )


async def orchestrate_chat_turn_sse(request: ChatRequest) -> AsyncIterator[str]:
    """SSE streaming version of orchestrate_chat_turn."""
    import uuid

    request_id = str(uuid.uuid4())

    # Yield initial state
    yield _sse_event("state", {"intent": None, "status": "processing"})

    # Run the full pipeline
    result = await orchestrate_chat_turn(request)

    # Stream text
    yield _sse_event("text", {"chunk": result.text})

    # Stream surface if available
    if result.surface:
        yield _sse_event("surface", result.surface)

    # Stream final state
    yield _sse_event("state", {
        "intent": result.intent,
        "decision_mode": result.decision_mode,
    })

    yield _sse_event("done", {})


def _sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"
