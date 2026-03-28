import type { FactEntry, FactSource, ConversationFacts } from "@/devops-chat/types/conversation";

// ---------------------------------------------------------------------------
// Source precedence (lower index = higher priority)
// ---------------------------------------------------------------------------

const DEFAULT_PRECEDENCE: FactSource[] = ["user", "selection", "tool", "system"];

function sourcePriority(source: FactSource, precedence: FactSource[] = DEFAULT_PRECEDENCE): number {
  const idx = precedence.indexOf(source);
  return idx === -1 ? precedence.length : idx;
}

// ---------------------------------------------------------------------------
// Slot read / write helpers
// ---------------------------------------------------------------------------

export function getSlot(facts: ConversationFacts, slotKey: string): FactEntry | undefined {
  return facts.slots?.[slotKey];
}

export function getSlotValue<T = unknown>(facts: ConversationFacts, slotKey: string): T | undefined {
  return facts.slots?.[slotKey]?.value as T | undefined;
}

export function setSlot(
  facts: ConversationFacts,
  slotKey: string,
  value: unknown,
  source: FactSource,
  confidence = 1.0,
  precedence?: FactSource[],
): ConversationFacts {
  const existing = facts.slots?.[slotKey];
  if (existing) {
    const existingPriority = sourcePriority(existing.source, precedence);
    const newPriority = sourcePriority(source, precedence);
    if (newPriority > existingPriority) {
      return facts; // existing value has higher precedence
    }
  }

  return {
    ...facts,
    slots: {
      ...facts.slots,
      [slotKey]: {
        value,
        source,
        confidence,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

export function clearSlot(facts: ConversationFacts, slotKey: string): ConversationFacts {
  if (!facts.slots?.[slotKey]) return facts;
  const { [slotKey]: _, ...rest } = facts.slots;
  return { ...facts, slots: rest };
}

export function clearNamespace(facts: ConversationFacts, namespace: string): ConversationFacts {
  if (!facts.slots) return facts;
  const prefix = namespace + ".";
  const remaining: Record<string, FactEntry> = {};
  let changed = false;
  for (const [key, entry] of Object.entries(facts.slots)) {
    if (key.startsWith(prefix)) {
      changed = true;
    } else {
      remaining[key] = entry;
    }
  }
  if (!changed) return facts;
  return { ...facts, slots: remaining };
}

// ---------------------------------------------------------------------------
// Facts patch merge
// ---------------------------------------------------------------------------

export type SlotPatch = Record<string, { value: unknown; source: FactSource; confidence?: number }>;

export function mergeSlotPatch(
  facts: ConversationFacts,
  patch: SlotPatch,
  precedence?: FactSource[],
): ConversationFacts {
  let result = facts;
  for (const [key, entry] of Object.entries(patch)) {
    result = setSlot(result, key, entry.value, entry.source, entry.confidence ?? 1.0, precedence);
  }
  return result;
}

export function mergeFactsPatch(
  facts: ConversationFacts,
  factsPatch: Partial<ConversationFacts>,
): ConversationFacts {
  const { slots: patchSlots, ...rest } = factsPatch;
  let merged: ConversationFacts = { ...facts, ...rest };
  if (patchSlots) {
    merged = {
      ...merged,
      slots: { ...merged.slots, ...patchSlots },
    };
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Stale invalidation
// ---------------------------------------------------------------------------

export function invalidateDependentSlots(
  facts: ConversationFacts,
  changedSlotKey: string,
  staleMap: Record<string, string[]>,
): ConversationFacts {
  let result = facts;
  for (const [slotKey, triggers] of Object.entries(staleMap)) {
    if (triggers.includes(changedSlotKey)) {
      result = clearSlot(result, slotKey);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Bulk slot read (extract filled slot values as plain record)
// ---------------------------------------------------------------------------

export function getFilledSlots(facts: ConversationFacts): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (!facts.slots) return result;
  for (const [key, entry] of Object.entries(facts.slots)) {
    if (entry.value != null) {
      result[key] = entry.value;
    }
  }
  return result;
}
