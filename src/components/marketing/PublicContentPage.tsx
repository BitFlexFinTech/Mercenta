/**
 * §PUBLIC CONTENT PROGRAMME (2026-11-19) — THE ONE RENDERER FOR THE 16 NEW PAGES.
 *
 * WHY THIS EXISTS
 * ---------------
 * Sixteen public destinations were approved. Rather than sixteen components
 * (which is how a site acquires sixteen different voices and sixteen different
 * layouts), the CONTENT is data in `src/config/publicPages.ts` and this ONE
 * component renders any of it. One voice, one layout language, one place to
 * correct a claim — and a page cannot exist without content, because the type
 * requires it.
 *
 * It uses the ESTABLISHED public shell (the same `PublicNav`, `PublicFooter` and
 * shell theme as every other public page), so these pages are indistinguishable
 * from the originals in behaviour and appearance.
 */
import { ArrowRight } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { PublicNav } from './PublicNav';
import { PublicFooter } from './PublicFooter';
import { APPROVED_CATEGORIES } from '@/types';
import type { PublicLinkPage } from '@/config/positioning';
import type { PublicContentPage as PublicContentPageModel } from '@/config/publicPages';
import { EXPLORE_UK_MARKET_FIT_CTA } from '@/config/ukMarketFit';

interface PublicContentPageProps {
  page: PublicContentPageModel;
  onNavigate: (page: PublicLinkPage) => void;
  onOpenPortal: () => void;
}

export function PublicContentPage({ page, onNavigate, onOpenPortal }: PublicContentPageProps) {
  const { shellMode } = useTheme();

  /* The CTA resolves to a REAL destination that already exists — never a route
     invented for the sake of a button. */
  const ctaTarget: PublicLinkPage =
    page.cta?.to === 'contact' ? 'contact' : 'explore-uk-market-fit';
  const ctaLabel = page.cta?.to === 'contact' ? page.cta.label : EXPLORE_UK_MARKET_FIT_CTA;

  return (
    <div
      data-shell-theme={shellMode}
      className="min-h-screen font-plex"
      style={{ backgroundColor: 'var(--mr-bg)' }}
    >
      <PublicNav
        currentPage={page.id as unknown as PublicLinkPage}
        onNavigate={onNavigate}
        onOpenPortal={onOpenPortal}
      />

      <main className="pb-20 pt-24">
        {/* ── Masthead ─────────────────────────────────────────────────────── */}
        <section className="px-6 pb-14">
          <div className="mx-auto max-w-4xl">
            <p className="font-mono text-ds-label uppercase tracking-[0.22em] text-[var(--mr-accent)]">
              {page.eyebrow}
            </p>
            <h1 className="mt-6 font-display text-3xl font-extrabold leading-[1.05] tracking-[-0.03em] text-[var(--mr-text-strong)] md:text-5xl">
              {page.heading}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--mr-text-muted)] md:text-lg">
              {page.lede}
            </p>
          </div>
        </section>

        {/* ── The ten approved categories, read from their owner ───────────── */}
        {page.id === 'categories' && (
          <section className="px-6 pb-14">
            <div className="mx-auto max-w-4xl">
              <ul className="flex flex-wrap gap-3">
                {APPROVED_CATEGORIES.map((cat) => (
                  <li
                    key={cat}
                    className="border border-hairline px-5 py-3 text-ds-body font-semibold text-[var(--mr-text-strong)]"
                  >
                    {cat}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ── Content blocks ───────────────────────────────────────────────── */}
        <section className="border-t border-hairline px-6 py-14">
          <div className="mx-auto max-w-4xl space-y-12">
            {page.blocks.map((block) => (
              <div key={block.heading}>
                <h2 className="font-display text-xl font-bold tracking-tight text-[var(--mr-text-strong)] md:text-2xl">
                  {block.heading}
                </h2>
                {block.body?.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-4 text-base leading-relaxed text-[var(--mr-text-muted)]"
                  >
                    {paragraph}
                  </p>
                ))}
                {block.bullets && (
                  <ul className="mt-5 space-y-3">
                    {block.bullets.map((item) => (
                      <li key={item} className="flex gap-3 text-base leading-relaxed">
                        <span
                          aria-hidden="true"
                          className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--mr-accent)]"
                        />
                        <span className="text-[var(--mr-text-muted)]">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── Availability — what is live and what is not ──────────────────── */}
        {page.availability && (
          <section className="px-6 pb-14">
            <div className="mx-auto max-w-4xl border-l-2 border-[var(--mr-accent)] bg-[var(--mr-surface-tint)] px-6 py-5">
              <p className="font-mono text-ds-label uppercase tracking-[0.16em] text-[var(--mr-accent)]">
                {page.availability.label}
              </p>
              <p className="mt-2 text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
                {page.availability.detail}
              </p>
            </div>
          </section>
        )}

        {/* ── Closing call to action ───────────────────────────────────────── */}
        {page.cta && (
          <section className="border-t border-hairline px-6 pt-14">
            <div className="mx-auto max-w-4xl">
              <button
                onClick={() => onNavigate(ctaTarget)}
                data-testid="public-content-cta"
                className="inline-flex items-center gap-2.5 bg-[var(--mr-accent)] px-7 py-3.5 text-base font-bold text-[var(--mr-on-accent)] transition-opacity hover:opacity-90"
              >
                {ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        )}
      </main>

      <PublicFooter onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
    </div>
  );
}
