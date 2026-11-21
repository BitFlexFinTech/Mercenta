/**
 * E — CONCEPT 3. The approved Concept 3 direction, translated to this app.
 *
 * WHAT MAKES IT DISTINCT
 *   · A 12-column hero split: the copy and its actions sit in columns 1–7, the
 *     shipment tracker in columns 8–12. The tracker is a real column, not a
 *     panel pasted below the type.
 *   · A construction grid (`grid-lines`) behind the hero, drawn from the theme.
 *   · A four-cell manifest strip sitting directly under the hero, on hairlines.
 *   · "Four ways to work with Mercenta" as four modular tiles (MOD-01…MOD-04).
 *   · "Five steps. One tracked route." as a sticky left visual beside five
 *     numbered stage panels joined by animated dashed connectors.
 *
 * WHY THE UTILITY CLASSES ARE TRANSLATED, NOT COPIED
 * --------------------------------------------------
 * The approved blueprint is a standalone Tailwind v4 page that writes literal
 * colours (`bg-ink`, `text-paper`, `bg-white/5`) and Tailwind v4-only syntax.
 * This application is Tailwind v3 with a theme-token ladder (`--mr-*`), and its
 * legacy-styling gate FAILS on reintroduced literal colour families. So every
 * class here is the token equivalent of the blueprint's intent: the same
 * composition, the same rhythm, the same hairlines — rendered through the theme
 * so it reads correctly in BOTH approved appearances and cannot drift from the
 * design system.
 *
 * CONTENT IS NEVER HARDCODED. Every string comes from the approved owner:
 * `content` (homepageContent.ts), `HOMEPAGE_MANIFEST` / `HOMEPAGE_JOURNEY`
 * (homepageDesign.ts), and the picture roles in homepageImagery.ts.
 */
import { Layers, Package, ShieldCheck, Truck } from 'lucide-react';
import {
  HOMEPAGE_JOURNEY,
  HOMEPAGE_JOURNEY_EYEBROW,
  HOMEPAGE_JOURNEY_HEADING,
  HOMEPAGE_MANIFEST,
} from '@/config/homepageDesign';
import { IMAGERY_E } from '@/config/homepageImagery';
import type { HomeDesignProps } from './designShared';
import { Closing, HeroActions, Kicker } from './designShared';
import { HeroTracker } from './HeroTracker';
import { HomeImage } from './HomeImage';

/** One icon per modular tile. Order follows the approved four offerings. */
const MODULE_ICONS = [Truck, ShieldCheck, Package, Layers] as const;

export function DesignE(props: HomeDesignProps) {
  const { content } = props;
  const hero = content.hero;
  const journeyImage = IMAGERY_E[0];

  return (
    <>
      {/* ── HERO — 12 columns; copy 1–7, tracker 8–12 ───────────────────── */}
      <section
        className="relative overflow-hidden border-b border-hairline grid-lines"
        data-testid="home-hero"
        data-design="e-concept"
      >
        <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-14 md:pt-20 lg:grid lg:grid-cols-12 lg:items-center lg:gap-12 lg:pb-20">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[var(--mr-accent)]"
                aria-hidden="true"
              />
              <span className="font-mono text-ds-label uppercase tracking-[0.22em] text-[var(--mr-text-muted)]">
                {hero.eyebrow}
              </span>
            </div>

            <h1 className="mt-7 font-display text-4xl font-extrabold leading-[0.98] tracking-[-0.035em] text-[var(--mr-text-strong)] sm:text-5xl lg:text-6xl">
              {hero.headingStart}{' '}
              <span className="text-[var(--mr-accent)]">{hero.headingHighlight}</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-[var(--mr-text-muted)] md:text-lg">
              {hero.subheading}
            </p>

            <div className="mt-9">
              <HeroActions {...props} />
            </div>
          </div>

          {/*
           * §ZERO LAYOUT SHIFT. The tracker column reserves its height BEFORE the
           * tracker paints, so nothing on the page moves as the shipment widget
           * mounts. On a phone the column drops naturally below the copy.
           */}
          <div className="mt-12 lg:col-span-5 lg:mt-0">
            <div className="min-h-[430px] border border-hairline bg-[var(--mr-surface)] p-5 md:p-6">
              <HeroTracker content={content} size="md" bare />
            </div>
          </div>
        </div>

        {/* ── MANIFEST STRIP — four approved infrastructure cells ────────── */}
        <div className="relative border-t border-hairline bg-[var(--mr-surface)]">
          <dl className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
            {HOMEPAGE_MANIFEST.map((cell, i) => (
              <div
                key={cell.label}
                className={
                  'border-hairline px-5 py-5 md:px-6 ' +
                  /* hairlines between cells, never doubling at the edges */
                  (i % 2 === 1 ? 'border-l ' : '') +
                  (i > 1 ? 'border-t lg:border-t-0 ' : '') +
                  (i > 0 ? 'lg:border-l ' : '')
                }
              >
                <dt className="font-mono text-ds-micro uppercase tracking-[0.18em] text-[var(--mr-text-faint)]">
                  {cell.label}
                </dt>
                <dd className="mt-2 text-ds-title font-semibold text-[var(--mr-text-strong)]">
                  {cell.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── FOUR WAYS TO WORK WITH MERCENTA — modular tiles ────────────── */}
      <section
        className="border-b border-hairline"
        aria-label={content.services.heading}
        data-testid="home-services"
      >
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
          <Kicker>{content.services.heading}</Kicker>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--mr-text-muted)]">
            {content.services.subheading}
          </p>

          <div className="mt-10 grid gap-px overflow-hidden border border-hairline bg-[var(--mr-hairline)] sm:grid-cols-2 lg:grid-cols-4">
            {content.services.cards.map((card, i) => {
              const Icon = MODULE_ICONS[i % MODULE_ICONS.length];
              return (
                <article key={card.title} className="bg-[var(--mr-surface)] p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center border border-hairline">
                      <Icon className="h-5 w-5 text-[var(--mr-accent)]" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-ds-micro uppercase tracking-[0.18em] text-[var(--mr-text-faint)]">
                      MOD-{String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="mt-7 text-ds-title font-semibold leading-snug tracking-tight text-[var(--mr-text-strong)]">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
                    {card.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FIVE STEPS. ONE TRACKED ROUTE. ─────────────────────────────── */}
      <section
        className="border-b border-hairline"
        aria-label={HOMEPAGE_JOURNEY_HEADING}
        data-testid="home-journey"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:py-24 lg:grid-cols-12 lg:gap-14">
          {/* Sticky left visual */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <Kicker>{HOMEPAGE_JOURNEY_EYEBROW}</Kicker>
              <h2 className="mt-5 font-display text-3xl font-extrabold leading-tight tracking-tight text-[var(--mr-text-strong)] sm:text-4xl">
                {HOMEPAGE_JOURNEY_HEADING}
              </h2>
              <div className="mt-8 border border-hairline">
                <HomeImage role={journeyImage} ratio="4/3" />
              </div>
            </div>
          </div>

          {/* Numbered stage panels joined by animated dashed connectors */}
          <ol className="lg:col-span-7">
            {HOMEPAGE_JOURNEY.map((step, i) => {
              const last = i === HOMEPAGE_JOURNEY.length - 1;
              return (
                <li key={step.title} className="relative pb-8 last:pb-0">
                  {!last && (
                    <svg
                      className="absolute left-[19px] top-12 h-[calc(100%-3rem)] w-px text-[var(--mr-accent)]"
                      viewBox="0 0 1 100"
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      <line
                        x1="0.5"
                        y1="0"
                        x2="0.5"
                        y2="100"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                        className="animate-dash"
                      />
                    </svg>
                  )}

                  <div className="flex items-start gap-5">
                    <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center border border-hairline bg-[var(--mr-surface)] font-mono text-ds-label font-semibold text-[var(--mr-accent)]">
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    <div className="flex-1 border border-hairline bg-[var(--mr-surface)] p-5 md:p-6">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-ds-title font-semibold tracking-tight text-[var(--mr-text-strong)]">
                          {step.title}
                        </h3>
                        <span className="font-mono text-ds-micro uppercase tracking-[0.18em] text-[var(--mr-text-faint)]">
                          Stage {i + 1} of {HOMEPAGE_JOURNEY.length}
                        </span>
                      </div>
                      <p className="mt-3 text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <Closing {...props} />
    </>
  );
}
