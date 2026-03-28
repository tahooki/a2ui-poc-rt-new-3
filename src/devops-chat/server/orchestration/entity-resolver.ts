import type { AwaitingOption } from "@/devops-chat/types/conversation";
import { CONFIRMATION_ALIASES, ENVIRONMENT_ALIASES } from "./slot-definitions";

export type MatchResult =
  | { kind: "exact"; value: string; label: string }
  | { kind: "alias"; value: string; label: string }
  | { kind: "ambiguous"; candidates: AwaitingOption[] }
  | { kind: "no_match" };

// ---------------------------------------------------------------------------
// Correction / cancel detection
// ---------------------------------------------------------------------------

const CORRECTION_PATTERNS = [
  /^아니[요]?\s*/,
  /^정정/,
  /^다른\s*걸로/,
  /^그\s*(서비스|환경)\s*말고/,
];

const CANCEL_PATTERNS = [
  /^취소/,
  /^그만/,
  /^처음부터/,
  /^새로\s*시작/,
  /^cancel/i,
];

const INTERRUPT_PATTERNS = [
  /배포\s*말고\s*롤백/,
  /롤백\s*말고\s*배포/,
  /배포\s*말고/,
  /롤백\s*말고/,
  /롤백하고\s*싶/,
  /배포하고\s*싶/,
  /승인\s*검토/,
  /이전\s*배포\s*알려/,
  /배포\s*이력/,
];

export function isCorrection(input: string): boolean {
  return CORRECTION_PATTERNS.some((p) => p.test(input.trim()));
}

export function isCancel(input: string): boolean {
  return CANCEL_PATTERNS.some((p) => p.test(input.trim()));
}

export function isIntentInterruption(input: string): boolean {
  return INTERRUPT_PATTERNS.some((p) => p.test(input.trim()));
}

// ---------------------------------------------------------------------------
// Option matching
// ---------------------------------------------------------------------------

export function matchOption(input: string, options: AwaitingOption[]): MatchResult {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // Exact value match
  for (const opt of options) {
    if (opt.value.toLowerCase() === lower) {
      return { kind: "exact", value: opt.value, label: opt.label };
    }
  }

  // Exact label match
  for (const opt of options) {
    if (opt.label.toLowerCase() === lower) {
      return { kind: "exact", value: opt.value, label: opt.label };
    }
  }

  // Alias match
  for (const opt of options) {
    if (opt.aliases?.some((a) => a.toLowerCase() === lower)) {
      return { kind: "alias", value: opt.value, label: opt.label };
    }
  }

  // Partial / case-insensitive contains match
  const partials = options.filter(
    (opt) =>
      opt.value.toLowerCase().includes(lower) ||
      opt.label.toLowerCase().includes(lower) ||
      lower.includes(opt.value.toLowerCase()),
  );
  if (partials.length === 1) {
    return { kind: "alias", value: partials[0].value, label: partials[0].label };
  }
  if (partials.length > 1) {
    return { kind: "ambiguous", candidates: partials };
  }

  return { kind: "no_match" };
}

// ---------------------------------------------------------------------------
// Confirmation matching
// ---------------------------------------------------------------------------

export function matchConfirmation(input: string): boolean | null {
  const lower = input.trim().toLowerCase();
  const result = CONFIRMATION_ALIASES[lower];
  return result ?? null;
}

// ---------------------------------------------------------------------------
// Environment canonicalization
// ---------------------------------------------------------------------------

export function canonicalizeEnvironment(input: string): string | null {
  const lower = input.trim().toLowerCase();
  return ENVIRONMENT_ALIASES[lower] ?? null;
}

// ---------------------------------------------------------------------------
// Free-text service name extraction
// ---------------------------------------------------------------------------

export function extractServiceName(input: string, knownServices: string[]): string | null {
  const lower = input.trim().toLowerCase();
  // Direct match
  const exact = knownServices.find((s) => s.toLowerCase() === lower);
  if (exact) return exact;
  // Partial match
  const partials = knownServices.filter(
    (s) => s.toLowerCase().includes(lower) || lower.includes(s.toLowerCase()),
  );
  if (partials.length === 1) return partials[0];
  return null;
}
