/**
 * A — MONOLITH. The default. Institutional restraint.
 *
 * COMPOSITION — what makes it distinct:
 *   · ONE column of type. No side panel, no photo beside the headline.
 *   · The hero is TYPE ONLY; a single photograph appears much lower, as a band.
 *   · The tracker is a full-width bordered panel, not a column filler.
 *   · Services are a NUMBERED LIST with hairlines, not a grid of cards.
 *   · Wide margins. The quietest of the four.
 */
import type { HomeDesignProps } from './designShared';
import { Closing, HeroActions, Kicker } from './designShared';
import { HeroTracker } from './HeroTracker';
import { HomeImage } from './HomeImage';
import { HOME_IMAGES, IMAGERY_A } from '@/config/homepageImagery';

export function DesignA(props: HomeDesignProps) {
  const { content } = props;
  const hero = content.hero;
  const image = IMAGERY_A[0];

  return (
    <>
      <section
        className="px-6 pb-20 pt-20 md:pt-28"
        data-testid="home-hero"
        data-design="a-monolith"
      >
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-4">
            <span className="h-px w-14 bg-[var(--mr-accent)]" aria-hidden="true" />
            <Kicker>{hero.eyebrow}</Kicker>
          </div>
          <h1 className="mt-9 font-display text-4xl font-extrabold leading-[0.95] tracking-[-0.04em] text-[var(--mr-text-strong)] sm:text-6xl lg:text-7xl">
            {hero.headingStart}
            <br />
            {hero.headingHighlight}
          </h1>
          <p className="mt-9 max-w-2xl text-base leading-relaxed text-[var(--mr-text-muted)] md:text-lg">
            {hero.subheading}
          </p>
          <HeroActions {...props} className="mt-11" />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6" aria-label="At a glance">
        <dl className="grid grid-cols-1 border-y border-hairline sm:grid-cols-3">
          {hero.trustBadges.map((badge, i) => (
            <div
              key={badge}
              className={`px-0 py-7 sm:px-8 ${i > 0 ? 'sm:border-l sm:border-hairline' : ''}`}
            >
              <dt className="font-mono text-ds-label uppercase tracking-[0.18em] text-[var(--mr-text-faint)]">
                {['Route', 'Categories', 'Compliance'][i] ?? 'Fact'}
              </dt>
              <dd className="mt-2.5 text-lg font-semibold text-[var(--mr-text-strong)]">
                {badge}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="px-6 py-20" aria-label="Live consignment example">
        <div className="mx-auto max-w-5xl border border-hairline bg-[var(--mr-surface)] p-8 md:p-12">
          <Kicker>Live example</Kicker>
          <div className="mt-8">
            <HeroTracker content={content} size="xl" bare />
          </div>
        </div>
      </section>

      <section className="px-6 pb-20" aria-label="Distribution">
        <div className="mx-auto max-w-5xl">
          <HomeImage role={image} ratio="16/9" className="w-full" />
          <p className="mt-4 max-w-lg text-ds-body text-[var(--mr-text-faint)]">
            {HOME_IMAGES[image].alt}. A placeholder picture — replace it in{' '}
            <code className="font-mono">public/imagery/</code>.
          </p>
        </div>
      </section>

      <section className="px-6 pb-20" aria-label={content.services.heading}>
        <div className="mx-auto max-w-5xl">
          <Kicker>{content.services.heading}</Kicker>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--mr-text-muted)]">
            {content.services.subheading}
          </p>
          <ol className="mt-12 border-t border-hairline">
            {content.services.cards.map((card, i) => (
              <li
                key={card.title}
                className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-b border-hairline py-7 md:grid-cols-[4rem_1fr_1.2fr] md:gap-x-10"
              >
                <span className="font-mono text-ds-label text-[var(--mr-text-faint)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-lg font-semibold tracking-tight text-[var(--mr-text-strong)]">
                  {card.title}
                </h3>
                <p className="col-start-2 text-ds-body leading-relaxed text-[var(--mr-text-muted)] md:col-start-3">
                  {card.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-6 pb-20" aria-label={content.about.heading}>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div>
            <Kicker>{content.about.heading}</Kicker>
            <h2 className="mt-5 font-display text-3xl font-extrabold leading-tight tracking-tight text-[var(--mr-text-strong)]">
              {content.about.subheading}
            </h2>
          </div>
          <dl className="border-t border-hairline">
            {content.about.points.map((p) => (
              <div key={p.title} className="border-b border-hairline py-6">
                <dt className="text-lg font-semibold text-[var(--mr-text-strong)]">
                  {p.title}
                </dt>
                <dd className="mt-2 text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
                  {p.description}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="px-6 pb-20" aria-label={content.route.heading}>
        <div className="mx-auto max-w-5xl">
          <Kicker>{content.route.heading}</Kicker>
          <div className="mt-10 flex flex-wrap items-baseline gap-x-3 gap-y-3">
            {content.route.steps.map((step, i) => (
              <span key={step.title} className="flex items-baseline gap-3">
                <span className="text-base font-semibold text-[var(--mr-text-strong)]">
                  {step.title}
                </span>
                {i < content.route.steps.length - 1 && (
                  <span aria-hidden="true" className="text-[var(--mr-accent)]">
                    →
                  </span>
                )}
              </span>
            ))}
          </div>
          <p className="mt-6 max-w-2xl text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
            {content.route.subheading}
          </p>
        </div>
      </section>

      <section className="px-6 pb-24" aria-label="Visibility and protection">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-14 border-t border-hairline pt-14 md:grid-cols-2">
          {[content.visibility, content.protection].map((block) => (
            <div key={block.heading}>
              <h2 className="text-xl font-bold tracking-tight text-[var(--mr-text-strong)]">
                {block.heading}
              </h2>
              <p className="mt-3 text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
                {block.subheading}
              </p>
              <ul className="mt-7 space-y-5">
                {block.points.map((p) => (
                  <li key={p.title} className="border-l border-[var(--mr-accent)] pl-5">
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