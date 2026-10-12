/**
 * §LIFT OFF — THE PUBLIC OFFER PAGE.
 *
 * OUTCOME ONLY (per `src/config/positioning.ts` §1): the page says what changes for a
 * brand, never how the programme is operated, who Mercenta holds accounts with, or
 * what the commercial terms are. Every string is read from the ONE owner
 * (`src/config/liftOff.ts`), so the page cannot invent a promise of its own. The call
 * to action feeds the EXISTING public funnel (Explore UK Market Fit).
 */
import { useTheme } from '@/context/ThemeContext';
import { PublicNav, type PublicPage } from './PublicNav';
import { PublicFooter } from './PublicFooter';
import { PUBLIC_INVITATION_HEADING, PUBLIC_INVITATION_BODY } from '@/config/positioning';
import {
  LIFT_OFF_WORDMARK,
  LIFT_OFF_PUBLIC_HEADLINE,
  LIFT_OFF_PUBLIC_SUMMARY,
  LIFT_OFF_PUBLIC_POINTS,
  LIFT_OFF_TESTIDS,
} from '@/config/liftOff';
import { EXPLORE_UK_MARKET_FIT_CTA } from '@/config/ukMarketFit';
import { ArrowRight } from 'lucide-react';

export function LiftOff({
  onNavigate,
  onOpenPortal,
}: {
  onNavigate: (p: PublicPage) => void;
  onOpenPortal: () => void;
}) {
  const { shellMode } = useTheme();

  return (
    <div
      data-shell-theme={shellMode}
      className="min-h-screen font-plex"
      style={{ backgroundColor: 'var(--mr-bg)' }}
      data-testid={LIFT_OFF_TESTIDS.publicPage}
    >
      <PublicNav currentPage="lift-off" onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
      <main className="pt-24 pb-16">
        <section className="px-6 pb-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono uppercase text-ds-micro tracking-[0.06em] text-brass sm:text-ds-label sm:tracking-[0.25em]">
              {LIFT_OFF_WORDMARK}
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.12] md:text-4xl">
              {LIFT_OFF_PUBLIC_HEADLINE}
            </h1>
            <p className="mt-4 text-sm leading-relaxed md:text-base" style={{ color: 'var(--mr-text-muted)' }}>
              {LIFT_OFF_PUBLIC_SUMMARY}
            </p>
          </div>
        </section>

        <section className="border-t border-white/[0.06] px-6 py-16">
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
            {LIFT_OFF_PUBLIC_POINTS.map((p) => (
              <div key={p.title} className="rounded-xl border border-white/[0.06] bg-ink-850 p-5">
                <p className="font-display text-base font-semibold text-parchment">{p.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-steel">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-white/[0.06] px-6 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-3 font-display text-2xl font-semibold md:text-3xl">{PUBLIC_INVITATION_HEADING}</h2>
            <p className="mx-auto mb-8 max-w-xl text-sm" style={{ color: 'var(--mr-text-muted)' }}>
              {PUBLIC_INVITATION_BODY}
            </p>
            <button
              type="button"
              data-testid={LIFT_OFF_TESTIDS.publicCta}
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

export default LiftOff;
