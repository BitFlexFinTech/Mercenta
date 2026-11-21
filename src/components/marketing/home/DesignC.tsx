/**
 * C — SIGNAL. The data design: dense, technical, console-like.
 *
 * COMPOSITION — what makes it distinct:
 *   · CENTRED hero, and the tracker is the visual anchor rather than a column.
 *   · A mono statistic strip directly under the hero.
 *   · Services are a DENSE two-column list with tight rules, not big cards.
 *   · The route is a horizontal signal line with numbered nodes.
 *   · Visibility and protection render inside a framed PANEL with mono headers,
 *     which is the whole argument: you can see it.
 *   · Imagery is the WORK surface (screens), small and inset — never decorative.
 */
import type { HomeDesignProps } from './designShared';
import { Closing, HeroActions, Kicker } from './designShared';
import { HeroTracker } from './HeroTracker';
import { HomeImage } from './HomeImage';
import { IMAGERY_C } from '@/config/homepageImagery';

export function DesignC(props: HomeDesignProps) {
  const { content } = props;
  const hero = content.hero;

  return (
    <>
      <section
        className="px-6 pb-14 pt-16 text-center md:pt-24"
        data-testid="home-hero"
        data-design="c-signal"
      >
        <div className="mx-auto max-w-4xl">
          <Kicker>{hero.eyebrow}</Kicker>
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[0.96] tracking-[-0.04em] text-[var(--mr-text-strong)] sm:text-5xl lg:text-6xl">
            {hero.headingStart} {hero.headingHighlight}
          </h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-[var(--mr-text-muted)] md:text-lg">
            {hero.subheading}
          </p>
          <HeroActions {...props} className="mt-10 justify-center" />
        </div>

        {/* The tracker leads the page, framed like an instrument panel. */}
        <div className="mx-auto mt-16 max-w-4xl border border-hairline bg-[var(--mr-surface)] p-6 text-left md:p-10">
          <div className="flex items-center justify-between">
            <Kicker>Consignment signal</Kicker>
            <span className="font-mono text-ds-label text-[var(--mr-text-faint)]">
              {content.tracker.reference}
            </span>
          </div>
          <div className="mt-8">
            <HeroTracker content={content} size="lg" bare />
          </div>
        </div>
      </section>

      {/* The statistic strip. */}
      <section aria-label="At a glance" className="px-6 pb-16">
        <dl className="mx-auto grid max-w-4xl grid-cols-1 border-y border-hairline sm:grid-cols-3">
          {hero.trustBadges.map((badge, i) => (
            <div
              key={badge}
              className={`px-0 py-6 text-center sm:px-6 ${
                i > 0 ? 'sm:border-l sm:border-hairline' : ''
              }`}
            >
              <dd className="font-mono text-xl font-bold text-[var(--mr-text-strong)]">
                {badge}
              </dd>
              <dt className="mt-1.5 font-mono text-ds-label uppercase tracking-[0.18em] text-[var(--mr-text-faint)]">
                {['Route', 'Categories', 'Compliance'][i] ?? 'Fact'}
              </dt>
            </div>
          ))}
        </dl>
      </section>

      <section className="px-6 pb-16" aria-label={content.services.heading}>
        <div className="mx-auto max-w-4xl">
          <Kicker>{content.services.heading}</Kicker>
          <p className="mt-4 text-base leading-relaxed text-[var(--mr-text-muted)]">
            {content.services.subheading}
          </p>
          <ul className="mt-10 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
            {content.services.cards.map((card, i) => (
              <li key={card.title} className="border-t border-hairline py-5">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-ds-label text-[var(--mr-accent)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-base font-bold text-[var(--mr-text-strong)]">
                    {card.title}
                  </h3>
                </div>
                <p className="mt-2 text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
                  {card.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* The route as a signal line. */}
      <section className="border-y border-hairline bg-[var(--mr-surface)] px-6 py-16" aria-label={content.route.heading}>
        <div className="mx-auto max-w-4xl">
          <Kicker>{content.route.heading}</Kicker>
          <p className="mt-4 max-w-2xl text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
            {content.route.subheading}
          </p>
          <ol className="mt-10 space-y-0">
            {content.route.steps.map((step, i) => (
              <li key={step.title} className="grid grid-cols-[2rem_1fr] gap-x-5">
                <div className="flex flex-col items-center">
                  <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[var(--mr-accent)]" aria-hidden="true" />
                  {i < content.route.steps.length - 1 && (
                    <span className="h-full w-px flex-1 bg-hairline" aria-hidden="true" />
                  )}
                </div>
                <div className="pb-7">
                  <h3 className="text-base font-bold text-[var(--mr-text-strong)]">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The work surface — the only imagery, inset and captioned as a screen. */}
      <section className="px-6 py-16" aria-label="The workspace">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 sm:grid-cols-2">
          {IMAGERY_C.map((role) => (
            <figure key={role} className="border border-hairline p-3">
              <HomeImage role={role} ratio="3/2" className="w-full" />
              <figcaption className="mt-3 font-mono text-ds-label uppercase tracking-[0.16em] text-[var(--mr-text-faint)]">
                The brand workspace
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Visibility and protection, framed as one console. */}
      <section className="px-6 pb-20" aria-label="Visibility and protection">
        <div className="mx-auto max-w-4xl border border-hairline">
          {[content.visibility, content.protection].map((block, i) => (
            <div
              key={block.heading}
              className={`p-6 md:p-9 ${i > 0 ? 'border-t border-hairline' : ''}`}
            >
              <h2 className="font-mono text-ds-label uppercase tracking-[0.18em] text-[var(--mr-accent)]">
                {block.heading}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--mr-text-muted)]">
                {block.subheading}
              </p>
              <ul className="mt-6 grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
                {block.points.map((p) => (
                  <li key={p.title}>
                    <p className="text-base font-semibold text-[var(--mr-text-strong)]">
                      {p.title}
                    </p>
                    <p className="mt-1 text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
                      {p.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <Closing {...props} />
    </>
  );
}