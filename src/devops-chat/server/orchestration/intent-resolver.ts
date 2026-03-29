import type {
  ConversationAwaiting,
  ConversationFacts,
  ConversationIntentState,
  IntentKey,
} from "@/devops-chat/types/conversation";
import { clearNamespace } from "./slot-memory";
import { INTENT_SLOT_SCHEMAS } from "./slot-definitions";

// ---------------------------------------------------------------------------
// Rule-based intent patterns
// ---------------------------------------------------------------------------

type IntentRule = {
  intentKey: IntentKey;
  patterns: RegExp[];
  priority: number; // lower = higher priority
};

const INTENT_RULES: IntentRule[] = [
  {
    intentKey: "deploy.start",
    patterns: [
      /배포하고\s*싶/,
      /배포\s*시작/,
      /배포해\s*줘/,
      /배포\s*진행/,
      /배포\s*가능/,
      /배포할\s*수\s*있/,
      /서비스\s*목록/,
      /deploy/i,
      /deployable/i,
    ],
    priority: 1,
  },
  {
    intentKey: "rollback.start",
    patterns: [
      /롤백하고\s*싶/,
      /롤백\s*시작/,
      /롤백해\s*줘/,
      /롤백\s*진행/,
      /롤백\s*후보/,
      /롤백\s*대상/,
      /rollback/i,
    ],
    priority: 1,
  },
  {
    intentKey: "approval.review",
    patterns: [
      /승인\s*검토/,
      /승인\s*요청/,
      /승인\s*확인/,
      /승인\s*대기/,
      /승인\s*현황/,
      /approve/i,
      /approval/i,
    ],
    priority: 1,
  },
  {
    intentKey: "deploy.history.lookup",
    patterns: [
      /이전\s*배포/,
      /배포\s*이력/,
      /배포\s*기록/,
      /배포\s*히스토리/,
      /최근\s*배포/,
      /마지막\s*배포/,
      /배포\s*언제/,
      /deploy\s*history/i,
    ],
    priority: 2,
  },
];

// ---------------------------------------------------------------------------
// Intent carry policy
// ---------------------------------------------------------------------------

type IntentCarryPolicy = {
  /** Intents that can carry (continue) across turns without explicit re-statement */
  carryable: IntentKey[];
  /** Intents that should always reset on new user input */
  nonCarryable: IntentKey[];
};

const CARRY_POLICY: IntentCarryPolicy = {
  carryable: ["deploy.start", "rollback.start", "approval.review"],
  nonCarryable: ["general.qna", "deploy.history.lookup"],
};

// ---------------------------------------------------------------------------
// Main intent resolver
// ---------------------------------------------------------------------------

export type IntentResolveResult = {
  intent: ConversationIntentState;
  isSwitch: boolean;
  facts: ConversationFacts;
};

export function resolveIntent(
  input: string,
  currentIntent: ConversationIntentState | null,
  awaiting: ConversationAwaiting,
  facts: ConversationFacts,
): IntentResolveResult {
  // Step 1: Try rule-based classification
  const ruleMatch = matchRuleIntent(input);

  // Step 2: If we have a match
  if (ruleMatch) {
    // Same intent as current? Just continue.
    if (currentIntent && currentIntent.intentKey === ruleMatch.intentKey) {
      return {
        intent: { ...currentIntent, confidence: Math.max(currentIntent.confidence, ruleMatch.confidence) },
        isSwitch: false,
        facts,
      };
    }

    // Different intent — switch
    const newFacts = handleIntentSwitch(facts, currentIntent, ruleMatch.intentKey);
    return {
      intent: {
        intentKey: ruleMatch.intentKey,
        confidence: ruleMatch.confidence,
        source: "rule",
        startedAt: new Date().toISOString(),
      },
      isSwitch: !!currentIntent,
      facts: newFacts,
    };
  }

  // Step 3: If currently awaiting, carry the current intent
  if (awaiting && currentIntent) {
    return { intent: currentIntent, isSwitch: false, facts };
  }

  // Step 4: Check carry policy for current intent
  if (currentIntent && CARRY_POLICY.carryable.includes(currentIntent.intentKey)) {
    return {
      intent: { ...currentIntent, source: "carry" },
      isSwitch: false,
      facts,
    };
  }

  // Step 5: Default to general.qna
  return {
    intent: {
      intentKey: "general.qna",
      confidence: 0.3,
      source: "rule",
      startedAt: new Date().toISOString(),
    },
    isSwitch: currentIntent?.intentKey !== "general.qna",
    facts,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchRuleIntent(input: string): { intentKey: IntentKey; confidence: number } | null {
  const trimmed = input.trim();
  let bestMatch: { intentKey: IntentKey; confidence: number; priority: number } | null = null;

  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(trimmed)) {
        if (!bestMatch || rule.priority < bestMatch.priority) {
          bestMatch = {
            intentKey: rule.intentKey,
            confidence: 0.9,
            priority: rule.priority,
          };
        }
        break;
      }
    }
  }

  return bestMatch ? { intentKey: bestMatch.intentKey, confidence: bestMatch.confidence } : null;
}

function handleIntentSwitch(
  facts: ConversationFacts,
  oldIntent: ConversationIntentState | null,
  newIntentKey: IntentKey,
): ConversationFacts {
  if (!oldIntent) return facts;

  const oldSchema = INTENT_SLOT_SCHEMAS[oldIntent.intentKey];
  const newSchema = INTENT_SLOT_SCHEMAS[newIntentKey];

  if (!oldSchema) return facts;

  // If same namespace, don't clear (e.g. deploy.start → deploy.history.lookup)
  if (newSchema && oldSchema.namespace === newSchema.namespace) {
    return facts;
  }

  // Clear old namespace
  return clearNamespace(facts, oldSchema.namespace);
}
