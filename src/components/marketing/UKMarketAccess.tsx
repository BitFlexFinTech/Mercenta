import { useTheme } from '@/context/ThemeContext';
import { PublicNav, type PublicPage } from './PublicNav';
import { PublicFooter } from './PublicFooter';
import {
  PUBLIC_CATEGORY,
  PUBLIC_PROMISE,
  PUBLIC_BARRIERS,
  PUBLIC_AUDIENCES,
  PUBLIC_MARKETS,
  PUBLIC_MARKETS_SENTENCE,
  PUBLIC_INVITATION_HEADING,
  PUBLIC_INVITATION_BODY,
} from '@/config/positioning';
import { EXPLORE_UK_MARKET_FIT_CTA } from '@/config/ukMarketFit';
import { ArrowRight } from 'lucide-react';

/**
 * §PUBLIC MESSAGING B3 (2026-09-28) — REWRITTEN FROM THE OUTCOME UP.
 *
 * WHAT WAS WRONG. This page published the operating model in a heading: it
 * named the regulated position it holds, the authority it deals with, the
 * registrations it carries and the companies it buys carriage from — and it
 * invented three "sourcing corridors" the business does not actually run.
 * A competitor could have read the model straight off it.
 *
 * NOW. The barriers a brand is actually measuring itself against (§9), the
 * markets its brands really come from (§6), the two audiences (§2) and the
 * closing invitation (§1). No regulated position, no authority, no
 * intermediary, no supplier, no invented route.
 *
 * DESIGN. The four cards take the CANONICAL HUE -> DOMAIN colours
 * (`src/config/themes.ts`): the two paperwork barriers are compliance (amber),
 * keeping stock moving is logistics (orange) and getting onto the shelf is the
 * order flow (orders, indigo) — the colour says which kind of work the barrier
 * creates, rather than decorating the card.
 */
const BARRIER_DOMAIN: readonly string[] = [
  'var(--mr-palette-amber)',
  'var(--mr-palette-amber)',
  'var(--mr-palette-orange)',
  'var(--mr-palette-indigo)',
];

export function UKMarketAccess({ onNavigate, onOpenPortal }: { onNavigate: (p: PublicPage) => void; onOpenPortal: () => void }) {
  const { shellMode } = useTheme();

  return (
    <div data-shell-theme={shellMode} className="min-h-screen font-plex" style={{ backgroundColor: 'var(--mr-bg)' }}>
      <PublicNav currentPage="uk-market-access" onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
      <main className="pt-24 pb-16">
        <section className="px-6 pb-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono uppercase text-ds-micro tracking-[0.06em] text-brass sm:text-ds-label sm:tracking-[0.25em]">
              {PUBLIC_CATEGORY}
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.12] md:text-4xl">UK market access</h1>
            <p className="mt-4 text-sm leading-relaxed md:text-base" style={{ color: 'var(--mr-text-muted)' }}>
              {PUBLIC_PROMISE}
            </p>
          </div>
        </section>

          <section className="border-t border-white/[0.06] px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-3 text-center font-display text-2xl font-semibold md:text-3xl">
              What stands between you and a UK shelf
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-center text-sm" style={{ color: 'var(--mr-text-muted)' }}>
              Four things — and none of them are about your product. They are the reason a good product from
              outside the UK often never gets here.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {PUBLIC_BARRIERS.map((barrier, i) => (
                <div
                  key={barrier.title}
                  className="rounded-xl border border-t-[3px] border-white/[0.06] bg-ink-850 p-5"
                  style={{ borderTopColor: BARRIER_DOMAIN[i % BARRIER_DOMAIN.length] }}
                >
                  <h3 className="mb-2 font-display text-base font-semibold text-parchment">{barrier.title}</h3>
                  <p className="text-sm leading-relaxed text-steel">{barrier.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

          <section className="border-t border-white/[0.06] px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-3 text-center font-display text-2xl font-semibold md:text-3xl">
              Where our brands come from
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-center text-sm" style={{ color: 'var(--mr-text-muted)' }}>
              {PUBLIC_MARKETS_SENTENCE} If your product travels well, the distance is not the problem.
            </p>
            <ul className="flex flex-wrap justify-center gap-2">
              {PUBLIC_MARKETS.map((market) => (
                <li
                  key={market}
                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 font-mono text-ds-label"
                  style={{ color: 'var(--mr-text-muted)' }}
                >
                  {market}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-white/[0.06] px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-10 text-center font-display text-2xl font-semibold md:text-3xl">
              Which of these is you?
            </h2>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] md:grid-cols-2">
              {PUBLIC_AUDIENCES.map((audience) => (
                <div key={audience.id} className="bg-ink-850 p-6">
                  <h3 className="mb-2 font-display text-base font-semibold text-parchment">{audience.heading}</h3>
                  <p className="text-sm leading-relaxed text-steel">{audience.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.06] px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-3 font-display text-2xl font-semibold md:text-3xl">{PUBLIC_INVITATION_HEADING}</h2>
            <p className="mx-auto mb-8 max-w-xl text-sm" style={{ color: 'var(--mr-text-muted)' }}>
              {PUBLIC_INVITATION_BODY}
            </p>
            <button
              onClick={() => onNavigate('explore-uk-market-fit')}
              className="inline-flex items-center gap-2 rounded-lg bg-palette-indigo px-6 py-3 font-semibold text-on-palette transition-colors hover:opacity-90"
            >
              {EXPLORE_UK_MARKET_FIT_CTA}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      </main>
      <PublicFooter onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
    </div>
  );
}
