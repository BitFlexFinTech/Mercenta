/**
 * B — GRID EDITORIAL. Photography-led, magazine register.
 *
 * COMPOSITION — what makes it distinct:
 *   · The hero is SPLIT: type on the left, a 2x2 PHOTO GRID on the right.
 *   · Multi-column from the first screen; tighter leading than A.
 *   · Services are a PHOTO + TEXT grid, one picture per service.
 *   · A full-width photo band of the retail floor mid-page.
 *   · Every picture carries a caption, like a printed spread.
 */
import type { HomeDesignProps } from './designShared';
import { Closing, HeroActions, Kicker } from './designShared';
import { HeroTracker } from './HeroTracker';
import { HomeImage } from './HomeImage';
import { IMAGERY_B } from '@/config/homepageImagery';

export function DesignB(props: HomeDesignProps) {
  const { content } = props;
  const hero = content.hero;
  const [imgA, imgB, imgC, imgD] = IMAGERY_B;

  return (
    <>
      <section
        className="px-6 pb-16 pt-14 md:pt-20"
        data-testid="home-hero"
        data-design="b-grid-editorial"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-14">
          <div>
            <Kicker>{hero.eyebrow}</Kicker>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[0.96] tracking-[-0.035em] text-[var(--mr-text-strong)] sm:text-5xl xl:text-6xl">
              {hero.headingStart} {hero.headingHighlight}
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-[var(--mr-text-muted)]">
              {hero.subheading}
            </p>
            <HeroActions {...props} className="mt-9" />
          </div>

          {/* A real 2x2 editorial grid, not a single hero image. */}
          <div className="grid grid-cols-2 gap-3">
            <HomeImage role={imgA} ratio="3/4" priority />
            <HomeImage role={imgB} ratio="3/4" priority className="mt-8" />
            <HomeImage role={imgC} ratio="4/3" />
            <HomeImage role={imgD} ratio="4/3" className="mt-8" />
          </div>
        </div>
      </section>

      {/* A wide editorial lede across two columns. */}
      <section className="border-t border-hairline px-6 py-16" aria-label="Introduction">
        <div className="mx-auto max-w-6xl">
          <p className="max-w-4xl font-display text-2xl font-bold leading-snug tracking-tight text-[var(--mr-text-strong)] md:text-3xl">
            {content.about.subheading}
          </p>
          <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-3">
            {content.about.points.map((p) => (
              <div key={p.title} className="border-t border-hairline pt-5">
                <h3 className="text-base font-bold text-[var(--mr-text-strong)]">{p.title}</h3>
                <p className="mt-2.5 text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-hairline px-6 py-16" aria-label={content.services.heading}>
        <div className="mx-auto max-w-6xl">
          <Kicker>{content.services.heading}</Kicker>
          <h2 className="mt-4 max-w-2xl font-display text-3xl font-extrabold tracking-tight text-[var(--mr-text-strong)]">
            {content.services.subheading}
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2">
            {content.services.cards.map((card, i) => (
              <article key={card.title}>
                <HomeImage
                  role={IMAGERY_B[i % IMAGERY_B.length]}
                  ratio="3/2"
                  className="w-full"
                />
                <div className="mt-5 flex items-baseline gap-3">
                  <span className="font-mono text-ds-label text-[var(--mr-accent)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-xl font-bold tracking-tight text-[var(--mr-text-strong)]">
                    {card.title}
                  </h3>
                </div>
                <p className="mt-3 text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
                  {card.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* The tracker, set between two rules like a printed pull-out. */}
      <section className="border-y border-hairline bg-[var(--mr-surface)] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <Kicker>An example consignment</Kicker>
          <div className="mt-8">
            <HeroTracker content={content} size="lg" bare />
          </div>
        </div>
      </section>

      <section className="border-b border-hairline px-6 py-16" aria-label={content.route.heading}>
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <div>
            <Kicker>{content.route.heading}</Kicker>
            <p className="mt-4 text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
              {content.route.subheading}
            </p>
          </div>
          <ol className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
            {content.route.steps.map((step, i) => (
              <li key={step.title} className="border-t border-hairline pt-4">
                <span className="font-mono text-ds-label text-[var(--mr-accent)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 text-base font-bold text-[var(--mr-text-strong)]">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="px-6 py-16" aria-label="Visibility and protection">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 md:grid-cols-2">
          {[content.visibility, content.protection].map((block) => (
            <div key={block.heading}>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-[var(--mr-text-strong)]">
                {block.heading}
              </h2>
              <p className="mt-3 text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
                {block.subheading}
              </p>
              <ul className="mt-7 space-y-4">
                {block.points.map((p) => (
                  <li key={p.title} className="border-t border-hairline pt-4">
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

      <Closing {...props} inverted />
    </>
  );
}