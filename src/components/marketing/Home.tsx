import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useTheme } from '@/context/ThemeContext';
import { BRAND_NAME, BRAND_LEGAL_NAME } from '@/config/brand';
import { UnlockGrowth } from '@/components/shared/UnlockGrowth';
import {
  DEFAULT_HOMEPAGE_CONTENT,
  type HomepageContent,
} from '@/config/homepageContent';
import { cn } from '@/utils/cn';
import { PRE_AUDIT_TESTIDS } from '@/config/ukMarketFit';
import { resolveRoute } from '@/lib/seo/publicRoutes';
import { applyRouteMetadata, metadataForPublicPage } from '@/lib/seo/routeMetadata';
import { PrivacyPolicy } from '@/components/marketing/PrivacyPolicy';
import { TermsOfService } from '@/components/marketing/TermsOfService';
import { PublicNav, type PublicPage } from '@/components/marketing/PublicNav';
import { PublicFooter } from '@/components/marketing/PublicFooter';

// §Lazy-load — code-split these pages so they don't block the homepage bundle
const HowItWorks = lazy(() => import('@/components/marketing/HowItWorks').then(m => ({ default: m.HowItWorks })));
const UKMarketAccess = lazy(() => import('@/components/marketing/UKMarketAccess').then(m => ({ default: m.UKMarketAccess })));
const ForBrands = lazy(() => import('@/components/marketing/ForBrands').then(m => ({ default: m.ForBrands })));
const FAQ = lazy(() => import('@/components/marketing/FAQ').then(m => ({ default: m.FAQ })));
// §Phase 1 — the public pre-audit surface, code-split like the other public pages.
const ExploreUkMarketFit = lazy(() =>
  import('@/components/marketing/ExploreUkMarketFit').then(m => ({ default: m.ExploreUkMarketFit }))
);

import { ArrowRight } from 'lucide-react';

/**
 * §DESIGN OVERHAUL (2026-09-28) — THE DOCUMENT INDEX.
 *
 * The page is long, so the hero hands the reader its contents: numbered,
 * mono-coded, clickable. This is the only numbered list on the page outside the
 * shipment rail, because a contents list genuinely IS a sequence — numbering
 * sections that are not a sequence is decoration, and decoration is what this
 * overhaul removed.
 */
const PAGE_INDEX: readonly { id: string; code: string; label: string }[] = [
  { id: 'about', code: '01', label: 'Who we work with' },
  { id: 'services', code: '02', label: 'What changes for you' },
  { id: 'network', code: '03', label: 'Why brands stay' },
  { id: 'visibility', code: '04', label: 'Inside the workspace' },
  { id: 'protection', code: '05', label: 'When things go wrong' },
];

const fillBrand = (s: string) => s.split('{{brand}}').join(BRAND_NAME);

/** Scroll-reveal via IntersectionObserver; no-ops for reduced-motion users. */
function useScrollReveal(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [active]);
}

function renderPublicPage(
  page: PublicPage,
  onNavigate: (p: PublicPage | null) => void,
  openPortal: () => void,
) {
  if (page === 'privacy') return <PrivacyPolicy onBack={() => onNavigate(null)} />;
  if (page === 'terms') return <TermsOfService onBack={() => onNavigate(null)} />;
  if (page === 'how-it-works') return (
    <Suspense fallback={<div className="min-h-screen bg-ink flex items-center justify-center"><p className="text-xs text-zinc-500">Loading...</p></div>}>
      <HowItWorks onNavigate={onNavigate as any} onOpenPortal={openPortal} />
    </Suspense>
  );
  if (page === 'uk-market-access') return (
    <Suspense fallback={<div className="min-h-screen bg-ink flex items-center justify-center"><p className="text-xs text-zinc-500">Loading...</p></div>}>
      <UKMarketAccess onNavigate={onNavigate as any} onOpenPortal={openPortal} />
    </Suspense>
  );
  if (page === 'for-brands') return (
    <Suspense fallback={<div className="min-h-screen bg-ink flex items-center justify-center"><p className="text-xs text-zinc-500">Loading...</p></div>}>
      <ForBrands onNavigate={onNavigate as any} onOpenPortal={openPortal} />
    </Suspense>
  );
  if (page === 'faq') return (
    <Suspense fallback={<div className="min-h-screen bg-ink flex items-center justify-center"><p className="text-xs text-zinc-500">Loading...</p></div>}>
      <FAQ onNavigate={onNavigate as any} onOpenPortal={openPortal} />
    </Suspense>
  );
  // §Phase 1 — Explore UK Market Fit (the public pre-audit surface).
  if (page === 'explore-uk-market-fit') return (
    <Suspense fallback={<div className="min-h-screen bg-ink flex items-center justify-center"><p className="text-xs text-zinc-500">Loading...</p></div>}>
      <ExploreUkMarketFit onNavigate={onNavigate as any} onOpenPortal={openPortal} />
    </Suspense>
  );
  return null;
}

export function Home({ content: c = DEFAULT_HOMEPAGE_CONTENT }: { content?: HomepageContent } = {}) {
  const { setEnvironment } = useApp();
  const { shellMode } = useTheme();
  const [publicView, setPublicView] = useState<PublicPage | null>(null);

  // §Crawlability — resolve direct URL access from the SEO SSOT (was an inline
  // path chain that had to be kept in sync with robots.txt/sitemap by hand).
  useEffect(() => {
    const resolved = resolveRoute(window.location.pathname);
    if (resolved.kind === 'public' && resolved.route.page !== 'home') {
      setPublicView(resolved.route.page as PublicPage);
    }
  }, []);

  /**
   * §SEO FOUNDATION — the ONE in-app navigation function.
   *
   * Every public navigation (nav links, footer links, "back" actions, the CTA)
   * goes through here, so the ADDRESS, the document metadata and the rendered
   * view can never disagree: the URL is pushed, and the metadata for the target
   * page is applied immediately (the `RouteMetadata` component handles
   * back/forward via `popstate`).
   */
  const navigate = useCallback(
    (page: PublicPage | null) => {
      const target: PublicPage = page ?? 'home';
      setPublicView(target === 'home' ? null : target);
      const meta = metadataForPublicPage(target);
      if (typeof window !== 'undefined' && window.location.pathname !== meta.path) {
        window.history.pushState({ page: target }, '', meta.path);
      }
      applyRouteMetadata(meta);
    },
    []
  );

  const openPortal = () => setEnvironment('login');

  // ALL hooks must run before any conditional logic (Rules of Hooks).
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useScrollReveal(!reducedMotion);

  // Conditional pages rendered as early return AFTER all hooks.
  if (publicView && publicView !== 'home') {
    return renderPublicPage(publicView, navigate, openPortal);
  }

  const scrollTo = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el)
      el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const rv = !reducedMotion ? 'reveal' : '';


  return (
    <div
      data-shell-theme={shellMode}
      className="min-h-screen font-plex"
      style={{ backgroundColor: 'var(--mr-bg)' }}
    >
      <PublicNav currentPage="home" onNavigate={navigate} onOpenPortal={openPortal} />

      {/*
        §DESIGN OVERHAUL (2026-09-28) — HERO.
        The old hero was a two-column "pitch left, rounded card right" layout, and
        every section below it repeated the same shape: an uppercase mono eyebrow,
        a centred heading, and a grid of rounded cards. That is the templated
        default. The subject here is freight documentation, so the page is now
        built from that vernacular — hairline rules, mono references, stage stamps
        and a document index — with one bold moment, the manifest band below.
        Left-aligned editorial; the display face carries the personality.
      */}
      <section id="home" className="px-6 pt-14 md:pt-20">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,1fr)_14rem]">
            <div className={cn(rv, 'is-revealed')}>
              <span className="inline-flex items-center gap-2 font-mono text-ds-micro uppercase tracking-[0.12em] text-[var(--mr-accent-700)] sm:rounded-full sm:border sm:border-white/[0.14] sm:px-3 sm:py-1 sm:text-ds-label sm:tracking-[0.2em]">
                <span className="h-1.5 w-1.5 rounded-full bg-state-success" aria-hidden="true" />
                {c.hero.eyebrow}
              </span>
              <h1 className="mt-7 font-display text-[clamp(2.5rem,5.4vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.02em] text-parchment">
                {c.hero.headingStart}
                <span className="mt-2 block text-[clamp(1.4rem,2.4vw,2.1rem)] font-normal italic leading-[1.2] text-[var(--mr-accent-700)]">
                  {c.hero.headingHighlight}
                </span>
              </h1>
              <p
                className="mt-8 max-w-[64ch] text-base leading-relaxed md:text-lg"
                style={{ color: 'var(--mr-text-muted)' }}
              >
                {fillBrand(c.hero.subheading)}
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-5">
                {/*
                  §Phase 1 — the PRIMARY prospect CTA is Explore UK Market Fit, and
                  it opens the assessment. Partner Login is deliberately NOT placed
                  beside it: the two actions serve different audiences, so Partner
                  Login lives in the header as a separate secondary utility action
                  (PublicNav).
                */}
                <button
                  onClick={() => navigate('explore-uk-market-fit')}
                  data-testid={PRE_AUDIT_TESTIDS.cta}
                  className="inline-flex items-center gap-2 rounded-lg bg-palette-indigo px-6 py-3 font-semibold text-on-palette shadow-ds-subtle transition-colors hover:opacity-90"
                >
                  {c.hero.primaryCta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <ul className="flex flex-wrap gap-x-7 gap-y-3">
                  {c.hero.trustBadges.map((badge) => (
                    <li
                      key={badge}
                      className="flex items-center gap-2.5 font-mono text-ds-label"
                      style={{ color: 'var(--mr-text-muted)' }}
                    >
                      <span
                        aria-hidden="true"
                        className="h-px w-5"
                        style={{ backgroundColor: 'var(--mr-accent)' }}
                      />
                      {badge}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/*
              The document index: a real structural device, not decoration. The
              page is long, so it hands the reader its contents as a numbered
              record. It is the ONLY numbered device outside the shipment rail,
              because a contents list genuinely IS a sequence.
            */}
            <nav aria-label="On this page" className="hidden lg:block">
              <p
                className="font-mono text-ds-micro uppercase tracking-[0.2em]"
                style={{ color: 'var(--mr-text-muted)' }}
              >
                On this page
              </p>
              <ol className="mt-4 border-t border-white/[0.06]">
                {PAGE_INDEX.map((item) => (
                  <li key={item.id}>
                    <button
                      onClick={() => scrollTo(item.id)}
                      className="flex w-full items-baseline justify-between gap-4 border-b border-white/[0.06] py-2.5 text-left transition-colors hover:text-[var(--mr-accent-700)]"
                      style={{ color: 'var(--mr-text-muted)' }}
                    >
                      <span className="font-mono text-ds-micro">{item.code}</span>
                      <span className="text-ds-label">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>
      </section>

      {/*
        §DESIGN OVERHAUL — THE MANIFEST BAND: the page's one bold moment.
        The tracker was a small rounded card in the hero's right column. It is now
        the full-width anchor of the page: a shipment record with a mono data row,
        a five-stage numbered rail, and the animated route line running through
        the rail itself. The animation is PRESERVED exactly (`animate-route-dot`,
        the same 6s loop, same cyan waypoint); only its container changed, so the
        moving dot now travels the record it describes instead of floating above a
        separate dotted line.
      */}
      <section
        aria-label="Shipment record"
        className="mt-16 border-y border-white/[0.06] bg-ink-850"
      >
        <div className="mx-auto max-w-6xl px-6 py-9">
          <div className="flex flex-col items-start gap-2 font-mono text-ds-label uppercase tracking-[0.2em] sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-8 sm:gap-y-3">
            <span style={{ color: 'var(--mr-text-muted)' }}>Shipment record</span>
            <span style={{ color: 'var(--mr-text-muted)' }}>
              {c.tracker.reference} · {c.tracker.cargoLabel} · {c.tracker.freightMode}
            </span>
            <span
              className="flex items-center gap-2 whitespace-nowrap"
              style={{ color: 'var(--mr-palette-green)' }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="animate-tracker-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: 'var(--mr-palette-green)' }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: 'var(--mr-palette-green)' }}
                />
              </span>
              {/*
                §HONEST LABELLING — the record is an illustration built from
                `homepageContent.tracker` (reference MCT-2418), so the status chip
                says EXAMPLE. The pre-overhaul panel said "LIVE" over an invented
                consignment, which the platform's truthfulness rule forbids. The
                label belongs here, in the record's own header, where a status
                belongs — not in a caption sentence under the animation.
              */}
              EXAMPLE
            </span>
          </div>

          <div className="relative mt-9">
            <div aria-hidden="true" className="absolute inset-x-0 top-[5px] hidden lg:block">
              {/*
                The rail line must be visible on BOTH shells. `border-steel/40`
                was invisible on the light theme (40% of an already-light steel
                token), so the `border-white/[0.16]` hairline class is used
                instead — the light-theme remap layer maps it to the strong
                hairline token, and it stays a visible 16% white on the dark one.
              */}
              <div className="border-t-2 border-dotted border-white/[0.16]" />
            </div>
            <span
              aria-hidden="true"
              className="animate-route-dot absolute top-[1px] hidden items-center justify-center lg:flex"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: 'var(--mr-palette-cyan)',
                  boxShadow: '0 0 12px var(--mr-palette-cyan)',
                }}
              />
            </span>
            <ol className="relative grid grid-cols-1 gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-5">
              {c.tracker.stages.map((stage, i) => (
                <li key={stage.label}>
                  <span
                    aria-hidden="true"
                    className="block h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: stage.done
                        ? 'var(--mr-palette-green)'
                        : 'var(--mr-surface-overlay)',
                      boxShadow: stage.done
                        ? '0 0 0 4px var(--mr-surface-raised)'
                        : '0 0 0 1px var(--mr-hairline-strong)',
                    }}
                  />
                  <span
                    className="mt-3 block font-mono text-ds-micro tracking-[0.2em]"
                    style={{ color: 'var(--mr-text-muted)' }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="mt-1 block font-display text-base text-parchment">
                    {stage.label}
                  </span>
                  <span className="font-mono text-ds-micro" style={{ color: 'var(--mr-text-muted)' }}>
                    {stage.done ? 'cleared' : 'in progress'}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/*
        §DESIGN OVERHAUL — WHO WE WORK WITH.
        Was: a centred heading over a grid of rounded cards, each with a coloured
        icon square and an "01/02" marker (the content is a comparison, not a
        sequence, so the numbering was decoration). Now: a left-aligned heading
        over a two-part split divided by a hairline — the comparison reads as a
        comparison. The mono marker ties the section to the hero's index.
      */}
      <section id="about" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p
            className="font-mono text-ds-micro uppercase tracking-[0.2em]"
            style={{ color: 'var(--mr-text-muted)' }}
          >
            01 — Who we work with
          </p>
          <h2
            className={cn(
              'mt-4 max-w-[24ch] font-display text-[clamp(1.8rem,3.2vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.01em] text-parchment',
              rv
            )}
          >
            {c.about.heading}
          </h2>
          <p
            className={cn('mt-5 max-w-[58ch] text-base leading-relaxed md:text-lg', rv)}
            style={{ color: 'var(--mr-text-muted)' }}
          >
            {c.about.subheading}
          </p>
          <div className={cn('mt-14 grid grid-cols-1 border-t border-white/[0.06] md:grid-cols-2', rv)}>
            {c.about.points.map((point, i) => (
              <div
                key={point.title}
                className={cn(
                  'py-9',
                  i === 0
                    ? 'md:pr-14'
                    : 'border-t border-white/[0.06] md:border-l md:border-t-0 md:pl-14'
                )}
              >
                <h3 className="font-display text-2xl font-semibold leading-snug text-parchment md:text-[1.75rem]">
                  {point.title}
                </h3>
                <p
                  className="mt-4 max-w-[46ch] text-base leading-relaxed"
                  style={{ color: 'var(--mr-text-muted)' }}
                >
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*
        §DESIGN OVERHAUL — WHAT CHANGES FOR YOU.
        Was: four equal rounded cards in a 3-column grid that wrapped awkwardly into
        3 + 1. Now: four editorial rows separated by hairlines — title left, the
        consequence right — which reads as a register of what stops, and holds its
        shape at every width because it is a row, not a tile.
      */}
      <section id="services" className="px-6 pb-20">
        <div className="mx-auto max-w-6xl">
          <p
            className="font-mono text-ds-micro uppercase tracking-[0.2em]"
            style={{ color: 'var(--mr-text-muted)' }}
          >
            02 — What changes for you
          </p>
          <h2
            className={cn(
              'mt-4 max-w-[22ch] font-display text-[clamp(1.8rem,3.2vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.01em] text-parchment',
              rv
            )}
          >
            {c.services.heading}
          </h2>
          <p
            className={cn('mt-5 max-w-[52ch] text-base leading-relaxed md:text-lg', rv)}
            style={{ color: 'var(--mr-text-muted)' }}
          >
            {c.services.subheading}
          </p>
          <div className={cn('mt-14 border-t border-white/[0.06]', rv)}>
            {c.services.cards.map((card) => (
              <div
                key={card.title}
                className="grid grid-cols-1 gap-x-16 gap-y-3 border-b border-white/[0.06] py-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-baseline"
              >
                <h3 className="font-display text-xl font-semibold leading-snug text-parchment md:text-2xl">
                  {card.title}
                </h3>
                <p
                  className="max-w-[52ch] text-base leading-relaxed"
                  style={{ color: 'var(--mr-text-muted)' }}
                >
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*
        §DESIGN OVERHAUL — WHY BRANDS STAY.
        Was: six small neutral tiles with tiny text and numbered markers. Now the
        page's tonal break: a tinted band carrying a pull-quote at display scale —
        type used as the visual element — with the four reasons beneath it as a
        hairline register in two columns.

        The tint is the design system's OWN soft-background token
        (`--mr-surface-tint` — the token `src/index.css` already maps the light
        shell's `bg-white/…` fills to). `bg-ink-800` (`--mr-surface-overlay`) was
        MEASURED at 1.04:1 against the light page, so the band did not read as a
        band on the default theme; the token named explicitly measures 1.06:1 on
        the light shell and 1.40:1 on the dark one. The tone is expressed per
        theme rather than as a fixed ink shade.
      */}
      <section
        id="network"
        className="border-y border-white/[0.12] px-6 py-20"
        style={{ backgroundColor: 'var(--mr-surface-tint)' }}
      >
        <div className="mx-auto max-w-6xl">
          <p
            className="font-mono text-ds-micro uppercase tracking-[0.2em]"
            style={{ color: 'var(--mr-text-muted)' }}
          >
            03 — Why brands stay
          </p>
          <h2
            className={cn(
              'mt-5 max-w-[30ch] font-display text-[clamp(2rem,4.2vw,3.5rem)] font-semibold leading-[1.04] tracking-[-0.02em] text-parchment',
              rv
            )}
          >
            {c.route.heading}
          </h2>
          <p
            className={cn('mt-6 max-w-[52ch] text-base leading-relaxed md:text-lg', rv)}
            style={{ color: 'var(--mr-text-muted)' }}
          >
            {c.route.subheading}
          </p>
          <div className={cn('mt-14 grid grid-cols-1 border-t border-white/[0.06] md:grid-cols-2', rv)}>
            {c.route.steps.map((step, i) => (
              <div
                key={step.title}
                className={cn(
                  'border-b border-white/[0.06] py-7',
                  i % 2 === 1 ? 'md:pl-16' : 'md:pr-16'
                )}
              >
                <h3 className="font-display text-lg font-semibold text-parchment md:text-xl">
                  {step.title}
                </h3>
                <p
                  className="mt-2.5 max-w-[46ch] text-sm leading-relaxed md:text-base"
                  style={{ color: 'var(--mr-text-muted)' }}
                >
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*
        §DESIGN OVERHAUL — INSIDE THE WORKSPACE.
        Was: a heading column beside three rounded icon cards, with the platform
        panel (<UnlockGrowth>) orphaned as a grey box directly under the hero,
        where it belonged to nothing. Now the panel is part of the story it
        illustrates — it sits in this section's left column — and the three records
        are a single bordered ledger read top to bottom, each with a brass rule.
      */}
      <section id="visibility" className="px-6 py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div>
            <p
              className="font-mono text-ds-micro uppercase tracking-[0.2em]"
              style={{ color: 'var(--mr-text-muted)' }}
            >
              04 — Inside the workspace
            </p>
            <h2
              className={cn(
                'mt-4 font-display text-[clamp(1.8rem,3vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.01em] text-parchment',
                rv
              )}
            >
              {c.visibility.heading}
            </h2>
            <p
              className={cn('mt-5 max-w-[46ch] text-base leading-relaxed', rv)}
              style={{ color: 'var(--mr-text-muted)' }}
            >
              {c.visibility.subheading}
            </p>
            <div className="mt-10 max-w-md">
              <UnlockGrowth />
            </div>
          </div>
          <ul className={cn('border-t border-white/[0.06]', rv)}>
            {c.visibility.points.map((point) => (
              <li key={point.title} className="border-b border-white/[0.06] py-6">
                <span
                  aria-hidden="true"
                  className="mb-4 block h-px w-8"
                  style={{ backgroundColor: 'var(--mr-accent)' }}
                />
                <h3 className="font-display text-lg font-semibold text-parchment md:text-xl">
                  {point.title}
                </h3>
                <p
                  className="mt-2 max-w-[52ch] text-sm leading-relaxed md:text-base"
                  style={{ color: 'var(--mr-text-muted)' }}
                >
                  {point.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/*
        §DESIGN OVERHAUL — WHEN THINGS GO WRONG.
        Was: three rounded cards with coloured icon squares and coloured top
        borders — three different accent colours carrying no meaning. Now: three
        statements divided by hairlines under one brass rule, on the page's main
        rhythm. Colour is reserved for data that means something (the rail).
      */}
      <section id="protection" className="px-6 pb-20">
        <div className="mx-auto max-w-6xl">
          <p
            className="font-mono text-ds-micro uppercase tracking-[0.2em]"
            style={{ color: 'var(--mr-text-muted)' }}
          >
            05 — When things go wrong
          </p>
          <h2
            className={cn(
              'mt-4 max-w-[26ch] font-display text-[clamp(1.8rem,3.2vw,2.75rem)] font-semibold leading-[1.08] tracking-[-0.01em] text-parchment',
              rv
            )}
          >
            {c.protection.heading}
          </h2>
          <p
            className={cn('mt-5 max-w-[56ch] text-base leading-relaxed md:text-lg', rv)}
            style={{ color: 'var(--mr-text-muted)' }}
          >
            {c.protection.subheading}
          </p>
          <div className={cn('mt-14 grid grid-cols-1 border-t border-white/[0.06] md:grid-cols-3', rv)}>
            {c.protection.points.map((point, i) => (
              <div
                key={point.title}
                className={cn(
                  'border-b border-white/[0.06] py-8',
                  i > 0 ? 'md:border-l md:border-t-0 md:pl-10' : 'md:pr-10',
                  i > 0 && 'border-t md:border-t-0'
                )}
              >
                <h3 className="font-display text-lg font-semibold leading-snug text-parchment md:text-xl">
                  {point.title}
                </h3>
                <p
                  className="mt-2.5 max-w-[40ch] text-sm leading-relaxed md:text-base"
                  style={{ color: 'var(--mr-text-muted)' }}
                >
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/*
        §DESIGN OVERHAUL — THE LAST MOVEMENT.
        Was: narrow centred text with a rotated stamp colliding with the heading.
        Now: a full-width band, left-aligned at display scale, with the stamp
        promoted to a corner mark in the band's own margin where it cannot collide
        at any width — the document metaphor closing the document.

        Same `--mr-surface-tint` band token as the section above, so the page's two
        tonal bands are one system rather than two ad-hoc greys.
      */}
      <section
        className="relative border-t border-white/[0.12] px-6 py-24"
        style={{ backgroundColor: 'var(--mr-surface-tint)' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-6 top-10 hidden select-none md:block md:right-12"
        >
          <div className="rotate-[7deg] rounded-md border-[3px] border-stamp px-4 py-2 font-mono text-ds-label uppercase tracking-[0.2em] text-stamp opacity-80">
            <div className="rounded-sm border border-stamp/70 px-3 py-1.5 text-center leading-relaxed">
              {c.finalCta.stampLine1}
              <br />
              <span className="text-base font-semibold">{c.finalCta.stampLine2}</span>
            </div>
          </div>
        </div>
        <div className="relative mx-auto max-w-6xl">
          <h2
            className={cn(
              'max-w-[26ch] font-display text-[clamp(2rem,4.4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-parchment',
              rv
            )}
          >
            {c.finalCta.heading}
          </h2>
          <p
            className={cn('mt-6 max-w-[52ch] text-base leading-relaxed md:text-lg', rv)}
            style={{ color: 'var(--mr-text-muted)' }}
          >
            {fillBrand(c.finalCta.subheading)}
          </p>
          <button
            onClick={() => navigate('explore-uk-market-fit')}
            className={cn(
              'mt-10 inline-flex items-center gap-2 rounded-lg bg-palette-indigo px-6 py-3 font-semibold text-on-palette transition-colors hover:opacity-90',
              rv
            )}
          >
            {c.finalCta.buttonLabel}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>

      <PublicFooter onNavigate={navigate} onOpenPortal={openPortal} />
    </div>
  );
}

