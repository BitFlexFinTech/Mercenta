import { useTheme } from '@/context/ThemeContext';
import { PublicNav, type PublicPage } from './PublicNav';
import { PublicFooter } from './PublicFooter';
import {
  PUBLIC_CATEGORY,
  PUBLIC_FAQ,
  PUBLIC_CONTACT_EMAIL,
  PUBLIC_INVITATION_HEADING,
  PUBLIC_INVITATION_BODY,
} from '@/config/positioning';
import { ArrowRight } from 'lucide-react';

/**
 * §PUBLIC MESSAGING B3 (2026-09-28) — REWRITTEN FROM THE OUTCOME UP.
 *
 * WHAT WAS WRONG. Nine of the ten answers published the operating model: the
 * regulated position and its registrations, the authorities involved, the
 * companies we buy carriage from, another company's programme paperwork, the
 * internal shipment stages and the commercial arithmetic. A public FAQ is the
 * most-read page a prospect sees, which made it the worst place for the leak.
 *
 * NOW. Every question and answer is the canonical list in
 * `src/config/positioning.ts` §10, and the answers that CAN be derived are
 * derived from the sections above them — so an answer cannot drift from the
 * page it came from. Nothing here names a mechanism, an authority, an
 * intermediary, a supplier or a commercial term.
 *
 * DESIGN. Theme-aware shell like the homepage at 94c4d86; the eyebrow steps
 * down to the 11px micro floor below `sm` so it holds one line at 375px; the
 * accordion stays native `<details>` so it works with no JavaScript and is
 * reachable by keyboard.
 */
export function FAQ({ onNavigate, onOpenPortal }: { onNavigate: (p: PublicPage) => void; onOpenPortal: () => void }) {
  const { shellMode } = useTheme();

  return (
    <div data-shell-theme={shellMode} className="min-h-screen font-plex" style={{ backgroundColor: 'var(--mr-bg)' }}>
      <PublicNav currentPage="faq" onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
      <main className="pt-24 pb-16">
        <section className="px-6 pb-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono uppercase text-ds-micro tracking-[0.06em] text-brass sm:text-ds-label sm:tracking-[0.25em]">
              {PUBLIC_CATEGORY}
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.12] md:text-4xl">
              Questions brands ask us
            </h1>
            <p className="mt-4 text-sm leading-relaxed md:text-base" style={{ color: 'var(--mr-text-muted)' }}>
              Short answers to the ten things that come up most often.
            </p>
          </div>
        </section>

        <section className="border-t border-white/[0.06] px-6 py-12">
          <div className="mx-auto max-w-3xl space-y-3">
            {PUBLIC_FAQ.map((item) => (
              <details key={item.q} className="overflow-hidden rounded-xl border border-white/[0.06] bg-ink-850">
                <summary className="cursor-pointer px-6 py-4 font-display text-base font-semibold text-parchment transition-colors hover:bg-white/[0.02]">
                  {item.q}
                </summary>
                <div className="px-6 pb-5 text-sm leading-relaxed text-steel">{item.a}</div>
              </details>
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
              onClick={() => onNavigate('explore-uk-market-fit')}
              className="inline-flex items-center gap-2 rounded-lg bg-palette-indigo px-6 py-3 font-semibold text-on-palette transition-colors hover:opacity-90"
            >
              Explore UK Market Fit
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="mt-6 text-sm" style={{ color: 'var(--mr-text-muted)' }}>
              Something not covered here? Write to{' '}
              <a href={`mailto:${PUBLIC_CONTACT_EMAIL}`} className="text-brass underline underline-offset-2">
                {PUBLIC_CONTACT_EMAIL}
              </a>
              .
            </p>
          </div>
        </section>
      </main>
      <PublicFooter onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
    </div>
  );
}
