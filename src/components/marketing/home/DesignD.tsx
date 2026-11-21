/**
 * D — MARK. Architectural: oversized brand, structural geometry, most negative space.
 *
 * COMPOSITION — what makes it distinct:
 *   · The hero is the WORDMARK at enormous scale, with small type beneath it.
 *     The brand is the composition, not a decoration beside it.
 *   · Two full-width image BANDS carry the page, with the mark laid across them.
 *   · Services are ASYMMETRIC, with oversized numerals.
 *   · The most negative space of the four; orange used sparingly.
 */
import { BRAND_NAME } from '@/config/brand';
import { BrandMark } from '@/components/shared/BrandMark';
import type { HomeDesignProps } from './designShared';
import { Closing, HeroActions, Kicker } from './designShared';
import { HeroTracker } from './HeroTracker';
import { HomeImage } from './HomeImage';
import { IMAGERY_D } from '@/config/homepageImagery';

export function DesignD(props: HomeDesignProps) {
  const { content } = props;
  const hero = content.hero;
  const [bandOne, bandTwo, bandThree] = IMAGERY_D;

  return (
    <>
      <section
        className="px-6 pb-16 pt-20 md:pt-32"
        data-testid="home-hero"
        data-design="d-mark"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <BrandMark className="h-6 w-6" />
            <Kicker>{hero.eyebrow}</Kicker>
          </div>

          {/* The wordmark, enormous. This IS the hero. */}
          <p className="mt-8 font-display text-[15vw] font-extrabold leading-[0.82] tracking-[-0.055em] text-[var(--mr-text-strong)] sm:text-[12vw] lg:text-[8.5rem]">
            {BRAND_NAME}
          </p>
          <div className="mt-10 h-px w-full bg-hairline" aria-hidden="true" />

          <div className="mt-10 grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <h1 className="font-display text-2xl font-bold leading-snug tracking-tight text-[var(--mr-text-strong)] sm:text-3xl">
              {hero.headingStart} {hero.headingHighlight}
            </h1>
            <p className="text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
              {hero.subheading}
            </p>
          </div>
          <HeroActions {...props} className="mt-10" />
        </div>
      </section>

      {/* BAND ONE — a structural photograph with its caption BESIDE it.
          The caption was originally laid ON the picture behind a dark scrim.
          That needed literal white and black, which this project's
          legacy-styling ratchet forbids because those colours cannot follow the
          theme. Setting the caption under the band removes the literals entirely
          and reads better: a photograph is never dimmed to carry text. */}
      <section className="px-6 py-16" aria-label="International movement">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-end gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <HomeImage role={bandOne} ratio="16/9" className="w-full" priority />
          <div className="lg:pb-2">
            <Kicker>{content.route.heading}</Kicker>
            <p className="mt-4 font-display text-2xl font-extrabold leading-tight tracking-tight text-[var(--mr-text-strong)] sm:text-3xl">
              {content.route.subheading}
            </p>
          </div>
        </div>
      </section>

      {/* The tracker, on the page surface, unadorned. */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <HeroTracker content={content} size="lg" bare />
        </div>
      </section>

      {/* Services — asymmetric, oversized numerals, alternating alignment. */}
      <section className="px-6 pb-20" aria-label={content.services.heading}>
        <div className="mx-auto max-w-6xl">
          <Kicker>{content.services.heading}</Kicker>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--mr-text-muted)]">
            {content.services.subheading}
          </p>
          <div className="mt-14 space-y-14">
            {content.services.cards.map((card, i) => (
              <article
                key={card.title}
                className={`grid grid-cols-1 items-start gap-6 border-t border-hairline pt-8 md:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1.1fr)] md:gap-10 ${
                  i % 2 === 1 ? 'md:pl-16' : ''
                }`}
              >
                <span className="font-display text-5xl font-extrabold leading-none tracking-tighter text-[var(--mr-accent)] md:text-6xl">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-display text-xl font-extrabold tracking-tight text-[var(--mr-text-strong)] md:text-2xl">
                  {card.title}
                </h3>
                <p className="text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
                  {card.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* BAND TWO — a second structural photograph, no overlay, wide. */}
      <section aria-label="Distribution">
        <HomeImage role={bandTwo} ratio="21/9" className="w-full" />
      </section>

      {/* The statement, at scale, beside a smaller picture. */}
      <section className="px-6 py-20" aria-label={content.about.heading}>
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-12 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <Kicker>{content.about.heading}</Kicker>
            <h2 className="mt-6 font-display text-3xl font-extrabold leading-[1.05] tracking-tight text-[var(--mr-text-strong)] md:text-5xl">
              {content.about.subheading}
            </h2>
            <dl className="mt-12 space-y-8">
              {content.about.points.map((p) => (
                <div key={p.title} className="border-t border-hairline pt-5">
                  <dt className="font-display text-lg font-bold text-[var(--mr-text-strong)]">
                    {p.title}
                  </dt>
                  <dd className="mt-2 max-w-xl text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
                    {p.description}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
          <HomeImage role={bandThree} ratio="3/4" className="w-full" />
        </div>
      </section>

      {/* Visibility and protection — short, structural, no ornament. */}
      <section className="border-t border-hairline px-6 py-20" aria-label="Visibility and protection">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-16 md:grid-cols-2">
          {[content.visibility, content.protection].map((block) => (
            <div key={block.heading}>
              <h2 className="font-display text-2xl font-extrabold tracking-tight text-[var(--mr-text-strong)]">
                {block.heading}
              </h2>
              <p className="mt-4 text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
                {block.subheading}
              </p>
              <ul className="mt-8 space-y-6">
                {block.points.map((p) => (
                  <li key={p.title}>
                    <p className="font-display text-base font-bold text-[var(--mr-text-strong)]">
                      {p.title}
                    </p>
                    <p className="mt-1.5 text-ds-body leading-relaxed text-[var(--mr-text-muted)]">
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