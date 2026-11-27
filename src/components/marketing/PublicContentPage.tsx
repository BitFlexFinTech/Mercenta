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
import { PublicImage } from './PublicImage';
import { APPROVED_CATEGORIES } from '@/types';
import { CATEGORY_GUIDES } from '@/config/categoryGuides';
import { cn } from '@/utils/cn';
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
          <div className={cn('mx-auto', page.hero ? 'max-w-6xl' : 'max-w-4xl')}>
            <div
              className={cn(
                page.hero && 'grid items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)]'
              )}
            >
              <div>
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
              {/*
                §PUBLIC SURFACES BATCH 5 (2026-11-27) — the optional opening picture. It sits BESIDE
                the words, never behind them, so nothing is written over a photograph and no literal
                white text has to be baked in.
              */}
              {page.hero && (
                <PublicImage role={page.hero} ratio="4/3" priority className="w-full" />
              )}
            </div>
          </div>
        </section>

        {/* ── The ten approved categories, explained ───────────────────────────
            §PUBLIC SURFACES BATCH 5 (2026-11-27) — WAS TEN IDENTICAL PILLS.
            A pill confirms a category exists; it says nothing about whether a product belongs there.
            Each category now answers the three questions a brand arrives with — what belongs, what
            works, what goes wrong — with a representative photograph, from ONE owner
            (`src/config/categoryGuides.ts`) that is keyed to `APPROVED_CATEGORIES` by its type.
            The count is still read from the approved list, so the page can never claim more
            categories than the business actually operates in. */}
        {page.id === 'categories' && (
          <section className="px-6 pb-14">
            <div className="mx-auto max-w-6xl">
              <p className="font-mono text-ds-micro uppercase tracking-[0.16em] text-[var(--mr-text-muted)]">
                {APPROVED_CATEGORIES.length} approved categories
              </p>
              <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {CATEGORY_GUIDES.map((guide) => (
                  <article
                    key={guide.category}
                    data-testid={`category-guide-${guide.category
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')}`}
                    className="flex flex-col border border-hairline bg-[var(--mr-surface)]"
                  >
                    <PublicImage role={guide.image} ratio="3/2" className="w-full" />
                    <div className="flex flex-1 flex-col gap-4 p-6">
                      <h2 className="font-display text-lg font-bold tracking-tight text-[var(--mr-text-strong)]">
                        {guide.category}
                      </h2>
                      {[
                        { label: 'What belongs here', text: guide.belongs },
                        { label: 'What works', text: guide.strong },
                        { label: 'What to watch', text: guide.watchOut },
                      ].map((row) => (
                        <div key={row.label}>
                          <p className="font-mono text-ds-micro uppercase tracking-[0.14em] text-[var(--mr-accent)]">
                            {row.label}
                          </p>
                          <p className="mt-1.5 text-ds-label leading-relaxed text-[var(--mr-text-muted)]">
                            {row.text}
                          </p>
                        </div>
                      ))}
                      <p className="mt-auto text-ds-micro italic leading-relaxed text-[var(--mr-text-muted)]">
                        {guide.caption}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Content blocks ───────────────────────────────────────────────── */}
        <section className="border-t border-hairline px-6 py-14">
          <div className="mx-auto max-w-4xl space-y-12">
            {page.blocks.map((block, index) => (
              <div
                key={block.heading}
                className={cn(
                  block.media && 'grid gap-8 md:grid-cols-2 md:items-start'
                )}
              >
                <div className={cn(block.media && index % 2 === 1 && 'md:order-2')}>
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
                {/*
                  §PUBLIC SURFACES BATCH 5 — an optional picture for THIS block, alternating sides so
                  a long page has rhythm rather than a column of photographs down one edge.
                */}
                {block.media && (
                  <PublicImage
                    role={block.media}
                    ratio="4/3"
                    className={cn('w-full', index % 2 === 1 && 'md:order-1')}
                  />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── The labelled worked illustration ────────────────────────────────
            §PUBLIC SURFACES BATCH 5 PART 2 (2026-11-27) — THE PIECE THE BLOCKS COULD NOT EXPRESS.

            A labelled, numbered run of stages: how the service actually runs, in order, in a shape a
            reader can follow. Deliberately drawn in TYPE rather than as a picture — a process diagram
            rendered as text cannot go stale, cannot disagree with the page beside it, and needs no
            new asset for every page. `scripts/validate-public-page-standard.mjs` requires the stages
            and forbids a figure in them (an illustration of a SEQUENCE, never of an amount). */}
        {page.illustration && (
          <section className="border-t border-hairline px-6 py-14">
            <div className="mx-auto max-w-6xl">
              <p className="font-mono text-ds-label uppercase tracking-[0.18em] text-[var(--mr-accent)]">
                {page.illustration.label}
              </p>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--mr-text-muted)]">
                {page.illustration.intro}
              </p>
              <ol
                data-testid="public-page-illustration"
                className="mt-8 grid gap-px border border-hairline bg-[var(--mr-hairline)] sm:grid-cols-2 lg:grid-cols-4"
              >
                {page.illustration.stages.map((stage, index) => (
                  <li key={stage.label} className="flex flex-col gap-2 bg-[var(--mr-surface)] p-5">
                    <span
                      aria-hidden="true"
                      className="font-mono text-ds-micro uppercase tracking-[0.14em] text-[var(--mr-accent)]"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="font-display text-base font-bold tracking-tight text-[var(--mr-text-strong)]">
                      {stage.label}
                    </span>
                    <span className="text-ds-label leading-relaxed text-[var(--mr-text-muted)]">
                      {stage.detail}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* ── What this does not do ───────────────────────────────────────────
            §PUBLIC SURFACES BATCH 5 PART 2 (2026-11-27) — THE HONEST SECTION.

            Every one of these pages claims something, and a page that only claims is not worth
            reading. This states the limits in short statements, in the same panel language the
            `availability` block already uses, so a reader can tell what they are NOT getting before
            they talk to us. `scripts/validate-public-page-standard.mjs` requires it on every page in
            the batch's scope. */}
        {page.limits && (
          <section className="px-6 pb-14">
            <div className="mx-auto max-w-4xl border-l-2 border-[var(--mr-accent)] bg-[var(--mr-surface-tint)] px-6 py-5">
              <h2 className="font-display text-lg font-bold tracking-tight text-[var(--mr-text-strong)]">
                What this does not do
              </h2>
              <ul data-testid="public-page-limits" className="mt-4 space-y-3">
                {page.limits.map((line) => (
                  <li key={line} className="flex gap-3 text-ds-body leading-relaxed">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--mr-accent)]"
                    />
                    <span className="text-[var(--mr-text-muted)]">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

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
