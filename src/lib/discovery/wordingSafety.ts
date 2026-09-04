/**
 * §7 Stage-10 — Automated wording-safety lint for outward-facing content.
 *
 * Runs on generated outreach copy before campaign attach, and on any
 * admin-editable outward-facing text (homepage editor etc.). Outward-facing
 * rule: never name the retail channel in text a prospect or the public can
 * see. Internal/admin-only labels are NOT linted — clarity over obfuscation.
 *
 * BANNED_PATTERNS comes from ./banned-patterns.mjs — the shared canonical
 * definition also used by the static gate (scripts/lint-wording.mjs).
 */
import { BANNED_PATTERNS } from './banned-patterns';

export interface WordingLintResult {
  safe: boolean;
  hits: { pattern: string; reason: string; index: number }[];
}

export function lintOutwardWording(text: string): WordingLintResult {
  const hits: WordingLintResult['hits'] = [];
  for (const { re, reason } of BANNED_PATTERNS) {
    re.lastIndex = 0; // shared global regexes are stateful
    const m = re.exec(text);
    if (m) hits.push({ pattern: re.source, reason, index: m.index });
  }
  return { safe: hits.length === 0, hits };
}
