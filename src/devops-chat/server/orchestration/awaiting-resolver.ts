import type { ConversationAwaiting, ConversationFacts, FactSource } from "@/devops-chat/types/conversation";
import { matchOption, matchConfirmation, isCorrection, isCancel, isIntentInterruption } from "./entity-resolver";
import { canonicalizeValue, getSlotSchema, type SlotDefinition } from "./slot-definitions";
import { setSlot, clearSlot, invalidateDependentSlots } from "./slot-memory";

const MAX_RETRY = 3;

export type CorrectionEvent = {
  type: "correction" | "cancel" | "interrupt";
  slotKey: string;
  clearedSlots: string[];
  input: string;
  timestamp: string;
};

export type AwaitingResolveResult =
  | { resolved: true; slotKey: string; value: unknown; source: FactSource; facts: ConversationFacts }
  | { resolved: false; reason: "correction"; facts: ConversationFacts; correctionEvent: CorrectionEvent }
  | { resolved: false; reason: "cancel"; facts: ConversationFacts; correctionEvent: CorrectionEvent }
  | { resolved: false; reason: "interrupt"; facts: ConversationFacts; correctionEvent: CorrectionEvent }
  | { resolved: false; reason: "ambiguous"; awaiting: ConversationAwaiting; facts: ConversationFacts }
  | { resolved: false; reason: "no_match"; awaiting: ConversationAwaiting; facts: ConversationFacts }
  | { resolved: false; reason: "no_awaiting"; facts: ConversationFacts };

// ---------------------------------------------------------------------------
// Build stale map from slot schema for a given intent
// ---------------------------------------------------------------------------

function buildStaleMap(intentKey: string): Record<string, string[]> {
  const schema = getSlotSchema(intentKey as never);
  if (!schema) return {};
  const map: Record<string, string[]> = {};
  for (const slot of schema.slots) {
    if (slot.staleWhen) {
      map[slot.slotKey] = slot.staleWhen;
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Find slot definition by key across all schemas
// ---------------------------------------------------------------------------

function findSlotDef(slotKey: string): SlotDefinition | null {
  const ns = slotKey.split(".")[0];
  // Try known intents for the namespace
  const intentKeys = [
    `${ns}.start`,
    `${ns}.history.lookup`,
    `${ns}.review`,
  ];
  for (const ik of intentKeys) {
    const schema = getSlotSchema(ik as never);
    if (schema) {
      const def = schema.slots.find((s) => s.slotKey === slotKey);
      if (def) return def;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main awaiting resolver
// ---------------------------------------------------------------------------

export function resolveAwaiting(
  input: string,
  awaiting: ConversationAwaiting,
  facts: ConversationFacts,
): AwaitingResolveResult {
  if (!awaiting) {
    return { resolved: false, reason: "no_awaiting", facts };
  }

  // Priority 1: explicit interruption (new intent detected)
  if (isIntentInterruption(input)) {
    return { resolved: false, reason: "interrupt", facts };
  }

  // Priority 2: cancel
  if (isCancel(input)) {
    return { resolved: false, reason: "cancel", facts };
  }

  // Priority 3: correction
  if (isCorrection(input)) {
    // Clear the slot being awaited and any dependents
    let newFacts = clearSlot(facts, awaiting.slotKey);
    const staleMap = buildStaleMap(awaiting.originIntentKey);
    newFacts = invalidateDependentSlots(newFacts, awaiting.slotKey, staleMap);
    return { resolved: false, reason: "correction", facts: newFacts };
  }

  // Priority 4: resolve based on expectedInput type
  const { slotKey, expectedInput, options } = awaiting;
  const slotDef = findSlotDef(slotKey);

  if (expectedInput === "confirmation") {
    const confirmed = matchConfirmation(input);
    if (confirmed !== null) {
      const newFacts = setSlot(facts, slotKey, confirmed, "user");
      return { resolved: true, slotKey, value: confirmed, source: "user", facts: newFacts };
    }
    // no match for confirmation
    return buildRetryResult(awaiting, facts, "확인 또는 취소로 답해주세요.");
  }

  if (expectedInput === "single_select" && options && options.length > 0) {
    const match = matchOption(input, options);
    if (match.kind === "exact" || match.kind === "alias") {
      const canonical = slotDef ? canonicalizeValue(slotDef, match.value) : match.value;
      let newFacts = setSlot(facts, slotKey, canonical, "user");
      // invalidate dependents
      const staleMap = buildStaleMap(awaiting.originIntentKey);
      newFacts = invalidateDependentSlots(newFacts, slotKey, staleMap);
      return { resolved: true, slotKey, value: canonical, source: "user", facts: newFacts };
    }
    if (match.kind === "ambiguous") {
      return {
        resolved: false,
        reason: "ambiguous",
        awaiting: {
          ...awaiting,
          options: match.candidates,
          prompt: `여러 후보가 있습니다. 다시 선택해 주세요: ${match.candidates.map((c) => c.label).join(", ")}`,
          retryCount: awaiting.retryCount + 1,
        },
        facts,
      };
    }
    // no match - allow freeform if enabled
    if (awaiting.allowFreeform) {
      const canonical = slotDef ? canonicalizeValue(slotDef, input.trim()) : input.trim();
      let newFacts = setSlot(facts, slotKey, canonical, "user");
      const staleMap = buildStaleMap(awaiting.originIntentKey);
      newFacts = invalidateDependentSlots(newFacts, slotKey, staleMap);
      return { resolved: true, slotKey, value: canonical, source: "user", facts: newFacts };
    }
    return buildRetryResult(
      awaiting,
      facts,
      `선택할 수 있는 항목: ${options.map((o) => o.label).join(", ")}. 다시 입력해 주세요.`,
    );
  }

  // free_text - just store the value
  const canonical = slotDef ? canonicalizeValue(slotDef, input.trim()) : input.trim();
  let newFacts = setSlot(facts, slotKey, canonical, "user");
  const staleMap = buildStaleMap(awaiting.originIntentKey);
  newFacts = invalidateDependentSlots(newFacts, slotKey, staleMap);
  return { resolved: true, slotKey, value: canonical, source: "user", facts: newFacts };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildRetryResult(
  awaiting: NonNullable<ConversationAwaiting>,
  facts: ConversationFacts,
  retryPrompt: string,
): AwaitingResolveResult {
  const newRetryCount = awaiting.retryCount + 1;
  if (newRetryCount >= MAX_RETRY) {
    return {
      resolved: false,
      reason: "no_match",
      awaiting: {
        ...awaiting,
        prompt: "여러 번 시도했지만 입력을 이해하지 못했습니다. 다시 처음부터 말씀해 주세요.",
        retryCount: newRetryCount,
      },
      facts,
    };
  }
  return {
    resolved: false,
    reason: "no_match",
    awaiting: {
      ...awaiting,
      prompt: retryPrompt,
      retryCount: newRetryCount,
    },
    facts,
  };
}
