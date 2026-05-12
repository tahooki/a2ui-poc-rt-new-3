"""Tests for slot memory."""

from app.orchestration.slot_memory import SlotMemory, get_or_create_session


def test_slot_set_get():
    mem = SlotMemory()
    mem.set_slot("serviceName", "api")
    assert mem.get_slot("serviceName") == "api"


def test_merge_slots():
    mem = SlotMemory(slots={"serviceName": "api"})
    mem.merge_slots({"environment": "production", "serviceName": "new-api"})
    assert mem.get_slot("serviceName") == "new-api"
    assert mem.get_slot("environment") == "production"


def test_to_facts():
    mem = SlotMemory(slots={"a": "1", "b": "2"})
    facts = mem.to_facts()
    assert facts == {"a": "1", "b": "2"}


def test_clear():
    mem = SlotMemory(slots={"a": "1"}, intent_key="deploy.start")
    mem.clear()
    assert mem.get_slot("a") is None
    assert mem.intent_key is None


def test_session_store():
    s1 = get_or_create_session("conv-1")
    s1.set_slot("x", "1")
    s2 = get_or_create_session("conv-1")
    assert s2.get_slot("x") == "1"
