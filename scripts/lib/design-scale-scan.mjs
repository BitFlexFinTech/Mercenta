/**
 * §PHASE C4 — ONE IMPLEMENTATION OF "WHAT IS A CLASS LIST IN THIS FILE".
 *
 * WHY THIS FILE EXISTS (single source of truth, rule 03)
 * ------------------------------------------------------
 * Two programs must agree, exactly, about which text in `src/` is a class list:
 *
 *   · `scripts/migrate-radius-elevation.mjs` — REWRITES unnamed radii/shadows onto
 *     the canonical tokens, and must never touch English prose.
 *   · `scripts/validate-radius-elevation-scale.mjs` — FAILS if an unnamed radius or
 *     shadow reappears, and must see exactly what the migration would rewrite.
 *
 * If those two disagreed by one character, the gate would report PASS while the
 * migration had missed a site (or the reverse: the gate would accuse prose). That
 * is not a hypothetical — it is the same class of defect as the validator whose
 * "finds nothing" lookup had silently gone vacuous. So the test lives HERE, once,
 * and both programs import it. Neither keeps a copy.
 *
 * WHAT A CLASS LIST IS
 * --------------------
 * A string literal on one line whose content carries at least one other
 * Tailwind-ish token (`bg-`, `text-`, `border`, `px-`, `flex`, …). That is what
 * separates `'bg-ink-900 border rounded px-2 py-1'` (a class list) from
 * `"never rounded into a claim"` and `"a rounded banner"` (English prose).
 *
 * BLOCK COMMENTS ARE NOT CODE
 * ---------------------------
 * The project documents its changes in `/* … *\/` blocks that QUOTE class names in
 * backticks — e.g. a §PHASE C4 comment explaining that `Modal` moved from one step
 * to another. Read naively, the text between two backticks looks like a string
 * literal, and a single class-like token in backticks then looks like a real class
 * list. Measured on 2026-10-13: the first version of this scanner reported two
 * offenders in `src/components/ui.tsx` that were both inside the comment describing
 * the fix — a FALSE POSITIVE that would have punished the very documentation the
 * rules require. Comments are therefore excluded, quote-aware, so a `/*` inside a
 * string is still just a string.
 */

/** A string literal on ONE line, with its quote character. */
export const STRING = /(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g;

/**
 * Does this string look like a CLASS LIST rather than English prose? True when it
 * carries at least one other Tailwind-ish token.
 */
export const CLASSISH = /(^|\s)(?:[a-z-]+:)?(?:bg-|text-|border|px-|py-|p-|m-|w-|h-|flex|grid|gap-|items-|justify-|rounded-|shadow-|font-|leading-|tracking-|overflow-|space-|divide-|translate-|scale-|animate-|transition|opacity-|z-|sr-only|cursor-|truncate|capitalize|inline|block|absolute|relative|fixed|sticky|hidden|hover:|focus:|disabled:)/;

/** Half-open `[start, end)` ranges of block comments, quote-aware. */
export function blockCommentRanges(text) {
  const ranges = [];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? text.length : end + 2;
      ranges.push([i, stop]);
      i = stop - 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      // Skip the string, so a `/*` inside it never opens a comment.
      for (let j = i + 1; j < text.length; j += 1) {
        if (text[j] === '\\') {
          j += 1;
          continue;
        }
        if (text[j] === ch) {
          i = j;
          break;
        }
      }
    }
  }
  return ranges;
}

export function insideAny(ranges, index) {
  return ranges.some(([start, end]) => index >= start && index < end);
}

/**
 * Every class-list string in a SOURCE TEXT, with its index, EXCLUDING any that sits
 * inside a block comment. Note that CLASSISH matches any string containing
 * `rounded-` or `shadow-`, so no radius/shadow token can hide in a string this
 * function does not return — the only place such a token may live and be excluded
 * is a comment, which is not code.
 */
export function classStrings(text) {
  const comments = blockCommentRanges(text);
  const out = [];
  for (const m of text.matchAll(STRING)) {
    if (insideAny(comments, m.index)) continue;
    if (!CLASSISH.test(m[2])) continue;
    out.push({ body: m[2], index: m.index, quote: m[1] });
  }
  return out;
}

/** The full extent of a string literal found by `classStrings`. */
export function literalEnd(s) {
  return s.index + s.quote.length + s.body.length + s.quote.length;
}
