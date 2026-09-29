import { useTheme } from '@/context/ThemeContext';
import { PublicNav, type PublicPage } from './PublicNav';
import { PublicFooter } from './PublicFooter';
import {
  PUBLIC_CATEGORY,
  PUBLIC_PROMISE,
  PUBLIC_HOW_IT_WORKS,
  PUBLIC_BRAND_SPLIT,
  PUBLIC_INVITATION_HEADING,
  PUBLIC_INVITATION_BODY,
} from '@/config/positioning';
import { EXPLORE_UK_MARKET_FIT_CTA } from '@/config/ukMarketFit';
import { ArrowRight } from 'lucide-react';

/**
 * §PUBLIC MESSAGING B3 (2026-09-28) — REWRITTEN FROM THE OUTCOME UP.
 *
 * WHAT WAS WRONG. This page described the platform's INTERNAL specification to
 * the public: it named the regulated position it holds, the authorities it
 * deals with, the companies it buys carriage from, another company's programme
 * paperwork, and the internal shipment stages. That is the positioning failure
 * and the commercial leak in one page — it told a brand nothing about what
 * stops being their job, and told a competitor how the operation is built.
 *
 * NOW. Every string comes from `src/config/positioning.ts` (§8 the journey, §10
 * the split, §1 the promise and the closing invitation). Nothing here names a
 * mechanism, an authority, an intermediary or a supplier.
 *
 * DESIGN, matched to the homepage at commit 94c4d86: the page takes the SHELL
 * THEME (`data-shell-theme` + `var(--mr-bg)`) instead of hardcoding the dark
 * palette, which is why the four inner pages used to ignore the light theme
 * entirely; the journey is the only thing carrying numbers, because a step
 * order is information — decorative badge numbers are gone.
 */

export function HowItWorks({ onNavigate, onOpenPortal }: { onNavigate: (p: PublicPage) => void; onOpenPortal: () => void }) {
  const { shellMode } = useTheme();

  return (
    <div data-shell-theme={shellMode} className="min-h-screen font-plex" style={{ backgroundColor: 'var(--mr-bg)' }}>
      <PublicNav currentPage="how-it-works" onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
      <main className="pt-24 pb-16">
        <section className="px-6 pb-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-mono uppercase text-ds-micro tracking-[0.06em] text-brass sm:text-ds-label sm:tracking-[0.25em]">
              {PUBLIC_CATEGORY}
            </p>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.12] md:text-4xl">
              How Mercenta works
            </h1>
            <p className="mt-4 text-sm leading-relaxed md:text-base" style={{ color: 'var(--mr-text-muted)' }}>
              {PUBLIC_PROMISE}
            </p>
          </div>
        </section>

        {/*
          The journey — five genuinely ordered steps. This is the ONE place on
          the public pages where numbering carries meaning, so it stays.
        */}
        <section className="border-t border-white/[0.06] px-6 py-12">
          <div className="mx-auto max-w-4xl">
            <ol className="space-y-4">
              {PUBLIC_HOW_IT_WORKS.map((step, i) => (
                <li key={step.title} className="flex gap-4 rounded-xl border border-white/[0.06] bg-ink-850 p-5">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg font-mono text-ds-label"
                    style={{ backgroundColor: 'var(--mr-palette-indigo)', color: 'var(--mr-on-palette)' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <h2 className="mb-1.5 font-display text-base font-semibold text-parchment">{step.title}</h2>
                    <p className="text-sm leading-relaxed text-steel">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/*
          "Who does what", told as the split rather than as three columns of
          parties — the old version named the companies we buy carriage from.
        */}
        <section className="border-t border-white/[0.06] px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-3 text-center font-display text-2xl font-semibold md:text-3xl">Who does what</h2>
            <p className="mx-auto mb-10 max-w-2xl text-center text-sm" style={{ color: 'var(--mr-text-muted)' }}>
              One half of each row below is yours. The other half is the job you are handing over.
            </p>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] md:grid-cols-2">
              {PUBLIC_BRAND_SPLIT.map((row) => (
                <div key={row.keep} className="bg-ink-850 p-5">
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
