/**
 * §UI/UX Wave 1 — "Unlock growth with data" element.
 *
 * A distinctive lower-left banner treatment for the homepage hero. The copy
 * only claims what the product genuinely does (catalogue, orders, market
 * intelligence in one view) — it never implies functionality that does not
 * exist. The visual is a small CSS bar motif (illustrative, aria-hidden,
 * decorative), with the real words carried as text.
 */
export function UnlockGrowth({
  eyebrow = 'Unlock growth with data',
  body = 'Your catalogue, orders and market intelligence — in one clear view. Every number on Mercenta is derived from real, tenant-scoped records.',
}: { eyebrow?: string; body?: string } = {}) {
  return (
    <div
      data-testid="unlock-growth"
      className="flex flex-col gap-3 rounded-ds-lg border border-white/[0.12] bg-white/[0.03] p-5 sm:flex-row sm:items-center"
    >
      <div
        aria-hidden="true"
        className="flex h-10 w-14 shrink-0 items-end justify-center gap-1 rounded-ds-sm bg-white/[0.05]"
      >
        {[38, 62, 46, 78, 58, 90, 72].map((h, i) => (
          <span
            key={i}
            className="w-1 rounded-sm"
            style={{
              height: `${h}%`,
              backgroundColor: i === 5 ? 'var(--mr-accent)' : 'var(--mr-feature-intel)',
              opacity: 0.85,
            }}
          />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white tracking-tight">{eyebrow}</p>
        <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{body}</p>
      </div>
      <span
        aria-hidden="true"
        className="hidden sm:inline-flex h-6 w-[1px] shrink-0"
        style={{ backgroundColor: 'var(--mr-hairline-strong)' }}
      />
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-ds-micro font-medium border bg-state-success/10 border-state-success/20 text-state-success">
        Live platform data
      </span>
    </div>
  );
}