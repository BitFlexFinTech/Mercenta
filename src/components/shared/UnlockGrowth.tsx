/**
 * §DESIGN OVERHAUL (2026-09-28) — "Unlock growth with data".
 *
 * Was: a rounded banner carrying a decorative CSS bar motif (seven bars,
 * aria-hidden) sitting directly beside a chip reading "Live platform data".
 * The bars were illustrative and the chip claimed live data, so together they
 * read as real figures — decoration presented as evidence, which is exactly
 * what this platform's rules forbid. Both are removed rather than restyled.
 *
 * What remains is the claim that is actually true and checkable: every number
 * on Mercenta is derived from real, tenant-scoped records. It is presented as
 * a document note — a brass rule, a display line, a body line — consistent
 * with the rest of the public pages.
 *
 * The `unlock-growth` test id and the default eyebrow wording are preserved:
 * `e2e/uiux-foundation.spec.ts` asserts both.
 */
export function UnlockGrowth({
  eyebrow = 'Unlock growth with data',
  body = 'Your catalogue, orders and market intelligence — in one clear view. Every number on Mercenta is derived from real, tenant-scoped records.',
}: { eyebrow?: string; body?: string } = {}) {
  return (
    <div
      data-testid="unlock-growth"
      className="border-t-2 pt-5"
      style={{ borderColor: 'var(--mr-accent)' }}
    >
      <p className="font-display text-lg font-semibold tracking-tight text-soft">
        {eyebrow}
      </p>
      <p
        className="mt-2 max-w-[44ch] text-sm leading-relaxed"
        style={{ color: 'var(--mr-text-muted)' }}
      >
        {body}
      </p>
    </div>
  );
}
