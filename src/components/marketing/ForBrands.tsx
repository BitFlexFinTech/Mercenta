import { useTheme } from '@/context/ThemeContext';
import { PublicNav, type PublicPage } from './PublicNav';
import { PublicFooter } from './PublicFooter';
import {
  PUBLIC_CATEGORY,
  PUBLIC_PROMISE,
  PUBLIC_BRAND_SPLIT,
  PUBLIC_SOFTWARE_EXPERIENCE,
  PUBLIC_INVITATION_HEADING,
  PUBLIC_INVITATION_BODY,
} from '@/config/positioning';
import { EXPLORE_UK_MARKET_FIT_CTA } from '@/config/ukMarketFit';
import { ArrowRight } from 'lucide-react';

/**
 * §PUBLIC MESSAGING B3 (2026-09-28) — REWRITTEN FROM THE OUTCOME UP.
 *
 * WHAT WAS WRONG. This page was a twelve-item inventory of the platform's own
 * screens — "Team Messaging", "Social Accounts", "Reports", "Contracts" — which
 * describes how the product is built, not what a brand gets. It told a visitor
 * which modules exist and nothing about what stops being their job.
 *
 * NOW. The split (§10) is the page: one row per thing a brand KEEPS, paired
 * with the work we carry instead. Then what working with us feels like (§4).
 *
 * DESIGN. Each row takes the CANONICAL HUE -> DOMAIN colour of the work it
 * carries — movement is logistics (orange), paperwork is compliance (amber),
 * orders and buyers are orders (indigo), money is finance (green) — so the page
 * teaches the same colour language the platform uses everywhere else.
 */
const CARRIED_DOMAIN: readonly string[] = [
  'var(--mr-palette-orange)',
  'var(--mr-palette-amber)',
  'var(--mr-palette-indigo)',
  'var(--mr-palette-green)',
];

export function ForBrands({ onNavigate, onOpenPortal }: { onNavigate: (p: PublicPage) => void; onOpenPortal: () => void }) {
  const { shellMode } = useTheme();

  return (
    <div data-shell-theme={shellMode} className="min-h-screen font-plex" style={{ backgroundColor: 'var(--mr-bg)' }}>
      <PublicNav currentPage="for-brands" onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
      <main className="pt-24 pb-16">
        <section className="px-6 pb-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono uppercase text-ds-micro tracking-[0.06em] text-brass sm:text-ds-label sm:tracking-[0.25em]">
              {PUBLIC_CATEGORY}
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.12] md:text-4xl">
              For brands
            </h1>
            <p className="mt-4 text-sm leading-relaxed md:text-base" style={{ color: 'var(--mr-text-muted)' }}>
              {PUBLIC_PROMISE}
            </p>
          </div>
        </section>

        <section className="border-t border-white/[0.06] px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-3 text-center font-display text-2xl font-semibold md:text-3xl">
              What you keep, and what we carry
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-center text-sm" style={{ color: 'var(--mr-text-muted)' }}>
              Nothing on the left changes hands. The right-hand column is the job that stops being yours.
            </p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {PUBLIC_BRAND_SPLIT.map((row, i) => (
                <div
                  key={row.keep}
                  className="rounded-xl border border-t-[3px] border-white/[0.06] bg-ink-850 p-5"
                  style={{ borderTopColor: CARRIED_DOMAIN[i % CARRIED_DOMAIN.length] }}
                >
                  <p className="font-mono uppercase text-ds-micro tracking-[0.14em] text-brass">You keep</p>
                  <p className="mb-3 mt-1 font-display text-base font-semibold text-parchment">{row.keep}</p>
                  <p className="font-mono uppercase text-ds-micro tracking-[0.14em] text-brass">We carry</p>
                  <p className="mt-1 text-sm leading-relaxed text-steel">{row.carried}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-white/[0.06] px-6 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="mb-4 font-display text-2xl font-semibold md:text-3xl">What it feels like</h2>
            <p className="text-base leading-relaxed md:text-lg" style={{ color: 'var(--mr-text-muted)' }}>
              {PUBLIC_SOFTWARE_EXPERIENCE}
            </p>
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
