"""Slot Memory — 대화 상태 관리."""

from pydantic import BaseModel
from typing import Optional


class SlotMemory(BaseModel):
    """In-memory slot store for a conversation session."""

    slots: dict[str, str] = {}
    intent_key: Optional[str] = None
    conversation_id: Optional[str] = None

    def set_slot(self, key: str, value: str) -> None:
        self.slots[key] = value

    def get_slot(self, key: str) -> Optional[str]:
        return self.slots.get(key)

    def clear(self) -> None:
        self.slots.clear()
        self.intent_key = None

    def merge_slots(self, new_slots: dict[str, str]) -> None:
        for k, v in new_slots.items():
            if v:
                self.slots[k] = v

    def to_facts(self) -> dict[str, str]:
        return {**self.slots}


# In-memory session store (conversation_id → SlotMemory)
_sessions: dict[str, SlotMemory] = {}


def get_or_create_session(conversation_id: str) -> SlotMemory:
    if conversation_id not in _sessions:
        _sessions[conversation_id] = SlotMemory(conversation_id=conversation_id)
    return _sessions[conversation_id]


def clear_session(conversation_id: str) -> None:
    _sessions.pop(conversation_id, None)
