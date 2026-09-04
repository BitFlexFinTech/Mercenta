/**
 * §7/§28 — Canonical banned outward-facing wording patterns (single source).
 *
 * Imported by BOTH the runtime guard (wordingSafety.ts) and the static source
 * gate (scripts/lint-wording.mjs), so the two can never drift.
 *
 * Each pattern matches the banned term as a STANDALONE WORD (word boundaries)
 * so legitimate internal identifiers are NOT flagged:
 *   live_amazon, under_amazon_review, amazon_partner, amazon_sp_api,
 *   MockAmazonSPAPIClient, resetMockAmazonState, …
 * "Internal/admin-only labels, DB table/column names and JSON schema fields
 * stay clear and accurate — they are intentionally NOT obfuscated."
 */
export const BANNED_PATTERNS = [
  { re: /\bamazon\b/gi, label: 'amazon', reason: 'names the retail channel' },
  { re: /\bvendor\s+central\b/gi, label: 'vendor central', reason: 'names the retail channel programme' },
  { re: /\b1p\b|first[- ]party/gi, label: '1P/first-party', reason: 'retail-channel jargon' },
  { re: /\bseller\s+central\b/gi, label: 'seller central', reason: 'names a retail portal' },
];
