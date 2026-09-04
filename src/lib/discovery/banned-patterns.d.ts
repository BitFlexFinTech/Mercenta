/** Type declaration companion for banned-patterns.mjs (plain JS module). */
export interface BannedPattern {
  re: RegExp;
  label: string;
  reason: string;
}

export const BANNED_PATTERNS: BannedPattern[];
