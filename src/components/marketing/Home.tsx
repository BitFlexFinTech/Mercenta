import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useTheme } from '@/context/ThemeContext';
import { BRAND_NAME, BRAND_LEGAL_NAME } from '@/config/brand';
import { UnlockGrowth } from '@/components/shared/UnlockGrowth';
import {
  DEFAULT_HOMEPAGE_CONTENT,
  type HomepageContent,
  type HomeIconName,
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

import {
  ArrowRight,
  Truck,
  ShieldCheck,
  Package,
  TrendingUp,
  Target,
  Award,
  CheckCircle2,
  Plane,
  Ship,
} from 'lucide-react';

const ICONS: Record<HomeIconName, typeof Truck> = {
  truck: Truck,
  shield: ShieldCheck,
  package: Package,
  trending: TrendingUp,
  target: Target,
  award: Award,
  check: CheckCircle2,
  plane: Plane,
  ship: Ship,
};

function icon(name: HomeIconName | undefined) {
  return name ? ICONS[name] : CheckCircle2;
}

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

      {/* Hero — two columns: pitch left, live tracker right */}
      <section id="home" className="px-6 pt-20 pb-14">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
          <div className={cn(rv, 'is-revealed')}>
            {/*
              §CRAFT FIX (2026-09-28) — at 390px the 0.25em tracking pushed this
              label onto a second, ragged line inside the pill, with the status
              dot left floating beside line one. It now steps down to the 11px
              micro floor with tighter tracking below `sm`, so it holds one line.
            */}
            <span
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.04] px-2.5 py-1 font-mono uppercase text-ds-micro tracking-[0.06em] text-[var(--mr-text-muted)] sm:px-3 sm:text-ds-label sm:tracking-[0.25em]"
            >
              <span className="w-1.5 h-1.5 flex-shrink-0 rounded-full bg-state-success" aria-hidden="true" />
              <span className="min-w-0">{c.hero.eyebrow}</span>
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-semibold leading-[1.06] mt-6">
              {c.hero.headingStart}{' '}
              <span className="text-brass italic">{c.hero.headingHighlight}</span>
            </h1>
            <p className="text-base md:text-lg leading-relaxed mt-6 max-w-xl" style={{ color: 'var(--mr-text-muted)' }}>
              {fillBrand(c.hero.subheading)}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-8">
              {/*
                §Phase 1 — the PRIMARY prospect CTA is Explore UK Market Fit, and
                it opens the assessment. Partner Login is deliberately NOT placed
                beside it: the two actions serve different audiences, so Partner
                Login lives in the header as a separate secondary utility action
                (PublicNav). Its hero duplicate was removed rather than restyled.
              */}
              <button
                onClick={() => navigate('explore-uk-market-fit')}
                data-testid={PRE_AUDIT_TESTIDS.cta}
                className="inline-flex items-center gap-2 rounded-lg bg-palette-indigo px-6 py-3 font-semibold text-on-palette shadow-ds-subtle transition-colors hover:opacity-90"
              >
                {c.hero.primaryCta}
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs tracking-wider" style={{ color: 'var(--mr-text-muted)' }}>
              {c.hero.trustBadges.map((badge) => (
                <span key={badge} className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 text-brass" aria-hidden="true" /> {badge}
                </span>
              ))}
            </div>

            {/*
              §DESIGN (2026-09-28) — UnlockGrowth moved INTO the pitch column.
              As a full-width band below both columns it was orphaned: its brass
              rule ran roughly twice the width of the words it introduced, and it
              left a dead gap before the next section. Inside the column the rule
              and the words are the same width and the hero reads as one thing.
            */}
            <div className="mt-10">
              <UnlockGrowth />
            </div>
          </div>

          {/* Animated shipment-tracker card */}
          <div className={cn('relative', rv, 'is-revealed')}>
            <div className="bg-ink-2 border border-white/[0.07] rounded-2xl p-6 shadow-ds-overlay">
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-ds-label tracking-[0.25em] text-steel uppercase">
                  Shipment Tracker
                </span>
                <span className="flex items-center gap-2 font-mono text-ds-label" style={{ color: 'var(--mr-palette-green)' }}>
                  <span className="relative flex w-2 h-2">
                    <span
                      className="animate-tracker-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: 'var(--mr-palette-green)' }}
                    />
                    <span
                      className="relative inline-flex w-2 h-2 rounded-full"
                      style={{ backgroundColor: 'var(--mr-palette-green)' }}
                    />
                  </span>
                  <span
                    className="font-mono text-ds-label tracking-[0.25em] uppercase"
                    style={{ color: 'var(--mr-text-muted)' }}
                  >
                    EXAMPLE
                  </span>
                </span>
              </div>

              {/* Dotted route-line with moving waypoint dot. §UI/UX Wave 2 — the
                  animation itself is PRESERVED verbatim (`animate-route-dot`, a
                  6s loop); only its colour moved into the new saturated system. */}
              <div className="relative h-10 mb-1" aria-hidden="true">
                <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 border-t-2 border-dotted border-steel/40" />
                {/*
                  §CANONICAL HUE → DOMAIN (src/config/themes.ts §UI/UX Wave 2):
                  a consignment moving through the channel is LOGISTICS, so the
                  route takes orange — the hue logistics owns. The animation
                  itself is untouched (animate-route-dot, the same 6s loop); only
                  the hue moved to the domain the record belongs to.
                */}
                <span className="animate-route-dot absolute top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--mr-palette-orange)',
                      boxShadow: '0 0 12px var(--mr-palette-orange)',
                    }}
                  />
                </span>
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-steel/60 bg-ink" />
                <span className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-steel/60 bg-ink" />
                <span
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 bg-ink"
                  style={{ borderColor: 'var(--mr-palette-orange)' }}
                />
              </div>
              <div className="flex justify-between font-mono text-ds-micro tracking-wider text-steel uppercase mb-6">
                <span>Origin</span>
                <span>In Transit</span>
                <span style={{ color: 'var(--mr-palette-orange)' }}>UK Arrival</span>
              </div>

              <div className="bg-ink rounded-xl border border-white/[0.05] divide-y divide-white/[0.05]">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="font-mono text-xs text-steel">
                    {c.tracker.reference} · {c.tracker.cargoLabel}
                  </span>
                  <span className="rounded-full border border-white/[0.12] bg-white/[0.06] px-2 py-0.5 font-mono text-ds-micro text-zinc-300">
                    {c.tracker.freightMode}
                  </span>
                </div>
                {c.tracker.stages.map((stage) => (
                  <div key={stage.label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="font-mono text-xs text-parchment">{stage.label}</span>
                    {stage.done ? (
                      <CheckCircle2
                        className="w-4 h-4"
                        style={{ color: 'var(--mr-palette-green)' }}
                      />
                    ) : (
                      <span
                        className="rounded-full px-2 py-0.5 font-mono text-ds-micro font-semibold"
                        style={{
                          /*
                            §CANONICAL HUE → DOMAIN + AA (2026-09-28). This stage
                            chip was indigo, which is the ORDERS hue, on a
                            logistics record. It is now orange, the hue logistics
                            owns — and that also fixes a measured contrast
                            failure: in the dark themes the indigo palette token
                            cannot carry AA text at all (white 4.47:1, on-palette
                            4.38:1), while orange measures 7.00:1 dark and
                            5.18:1 light with the same on-palette token. No hex
                            appears here by design — the palette resolves through
                            src/config/themes.ts (§6 COLOUR SSOT).
                          */
                          backgroundColor: 'var(--mr-palette-orange)',
                          color: 'var(--mr-on-palette)',
                        }}
                      >
                        IN PROGRESS
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/*
              §PUBLIC MESSAGING (2026-09-28) — THE TRACKER IS LABELLED HONESTLY.
              The panel above is an ILLUSTRATION built from `homepageContent.tracker`
              (reference MCT-2418), not a real consignment — so the badge says
              EXAMPLE and this caption says so in words. Our own rule is that
              simulated or example content is never presented as live data.
            */}
            <p
              className="mt-3 text-center text-ds-label"
              style={{ color: 'var(--mr-text-muted)' }}
            >
              An example of the live view — your own consignments appear here as they move.
            </p>
          </div>

        </div>
      </section>

      {/* §UI/UX Wave 2 — what the platform is, in three numbered moves */}
      <section id="about" className="px-6 py-16 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <p className="font-mono text-ds-label uppercase tracking-[0.25em] text-zinc-500 mb-3 text-center">
            Who we work with
          </p>
          <h2 className={cn('font-display text-2xl md:text-3xl font-semibold text-center mb-3', rv)}>
            {c.about.heading}
          </h2>
          <p
            className={cn('text-sm text-center mb-10 max-w-2xl mx-auto', rv)}
            style={{ color: 'var(--mr-text-muted)' }}
          >
            {c.about.subheading}
          </p>
          <div
            className={cn(
              'grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06]',
              c.about.points.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
            )}
          >
            {c.about.points.map((point) => {
              const Icon = icon(point.icon);
              /*
                §DESIGN (2026-09-28) — two defects fixed at source here.
                (1) The cards carried "01"/"02" markers, but this content is not
                a sequence; numbering is reserved for the one thing on the page
                that genuinely is one — the five stages of the shipment record.
                (2) Their colours were arbitrary. Both cards describe where a
                brand's order flow starts (creating one, or handing an existing
                one over), so they take indigo, the hue orders own.
              */
              const palette = 'var(--mr-palette-indigo)';
              return (
                <div key={point.title} className={cn('bg-ink-850 p-6', rv)}>
                  <span
                    className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ backgroundColor: palette, color: 'var(--mr-on-palette)' }}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-base font-semibold text-parchment mb-2">
                    {point.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-steel">{point.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* §PUBLIC MESSAGING — the four things that stop being the brand's job */}
      <section id="services" className="px-6 py-16 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <p className="font-mono text-ds-label uppercase tracking-[0.25em] text-zinc-500 mb-3 text-center">
            What changes for you
          </p>
          <h2 className={cn('font-display text-2xl md:text-3xl font-semibold text-center mb-3', rv)}>
            {c.services.heading}
          </h2>
          <p
            className={cn('text-sm text-center mb-10 max-w-3xl mx-auto', rv)}
            style={{ color: 'var(--mr-text-muted)' }}
          >
            {c.services.subheading}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {c.services.cards.map((service, i) => {
              const Icon = icon(service.icon);
              /*
                §CANONICAL HUE → DOMAIN (src/config/themes.ts §UI/UX Wave 2).
                These four cards are, in order, logistics · compliance · finance ·
                visibility, so each takes the hue its own domain owns. The
                previous array handed out six colours by position, which gave a
                logistics card indigo and a payouts card amber — teaching the
                reader a colour language the platform does not use.
              */
              const palette = [
                'var(--mr-palette-orange)', // logistics / fulfilment
                'var(--mr-palette-amber)', // compliance
                'var(--mr-palette-green)', // finance / payouts
                'var(--mr-palette-cyan)', // intelligence / insight
              ][i % 4];
              return (
                <div
                  key={service.title}
                  className={cn(
                    'relative overflow-hidden rounded-xl border border-white/[0.06] bg-ink-850 p-5 transition-colors hover:border-white/[0.16]',
                    rv
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-[3px]"
                    style={{ backgroundColor: palette }}
                  />
                  <div className="mb-4 flex items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: palette, color: 'var(--mr-on-palette)' }}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <h3 className="font-display text-base font-semibold text-parchment">
                      {service.title}
                    </h3>
                  </div>
                  <p className="text-sm leading-relaxed text-steel">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* §PUBLIC MESSAGING — why brands stay */}
      {/*
        §DESIGN (2026-09-28) — the page's ONE tonal band. Setting a single
        section on the tinted surface gives the page a rhythm break between
        "what changes for you" and "inside the workspace" without introducing a
        new device.
      */}
      <section
        id="network"
        className="border-y border-white/[0.06] px-6 py-16"
        style={{ backgroundColor: 'var(--mr-surface-tint)' }}
      >
        <div className="max-w-6xl mx-auto">
          <p className="font-mono text-ds-label uppercase tracking-[0.25em] text-zinc-500 mb-3 text-center">
            Why brands stay
          </p>
          <h2 className={cn('font-display text-2xl md:text-3xl font-semibold text-center mb-3', rv)}>
            {c.route.heading}
          </h2>
          <p
            className={cn('text-sm text-center mb-10 max-w-2xl mx-auto', rv)}
            style={{ color: 'var(--mr-text-muted)' }}
          >
            {c.route.subheading}
          </p>
          {/*
            §CRAFT FIX (2026-09-28) — this grid was two columns at EVERY width, so
            at 390px each card was about 170px wide and the sentences broke into
            four- and five-line slivers. It now starts at one column. The "01–04"
            markers are gone too: these are four reasons a brand stays, not four
            steps, and numbering belongs to the shipment record alone.
          */}
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {c.route.steps.map((step) => {
              const Icon = icon(step.icon);
              return (
                <li
                  key={step.title}
                  className={cn(
                    'relative rounded-lg border border-white/[0.06] bg-ink-850 p-4',
                    rv
                  )}
                >
                  <span className="mb-2 flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 flex-shrink-0 text-brass" aria-hidden="true" />
                  </span>
                  <span className="block font-display text-sm font-semibold text-parchment">
                    {step.title}
                  </span>
                  <span className="mt-1 block text-ds-label leading-relaxed text-steel">
                    {step.description}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* §UI/UX Wave 2 — visibility & control */}
      <section id="visibility" className="px-6 py-16 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
          <div>
            <p className="mb-3 font-mono text-ds-label uppercase tracking-[0.25em] text-zinc-500">
              Inside the workspace
            </p>
            <h2 className={cn('font-display text-2xl md:text-3xl font-semibold mb-3', rv)}>
              {c.visibility.heading}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--mr-text-muted)' }}>
              {c.visibility.subheading}
            </p>
          </div>
          <ul className="space-y-3">
            {c.visibility.points.map((point, i) => {
              const Icon = icon(point.icon);
              /*
                §CANONICAL HUE → DOMAIN — orders, compliance documents, payouts.
                Only the first was wrong: it wore cyan, which belongs to
                intelligence, not to an order queue.
              */
              const palette = [
                'var(--mr-palette-indigo)', // orders / purchase orders
                'var(--mr-palette-amber)', // compliance
                'var(--mr-palette-green)', // finance / payouts
              ][i % 3];
              return (
                <li
                  key={point.title}
                  className={cn(
                    'flex gap-3.5 rounded-xl border border-white/[0.06] bg-ink-850 p-4',
                    rv
                  )}
                >
                  <span
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: palette, color: 'var(--mr-on-palette)' }}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-sm font-semibold text-parchment">
                      {point.title}
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-steel">
                      {point.description}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* §UI/UX Wave 2 — proactive brand success protection */}
      <section id="protection" className="px-6 py-16 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <p className="mb-3 text-center font-mono text-ds-label uppercase tracking-[0.25em] text-zinc-500">
            When things go wrong
          </p>
          <h2 className={cn('font-display text-2xl md:text-3xl font-semibold text-center mb-3', rv)}>
            {c.protection.heading}
          </h2>
          <p
            className={cn('mx-auto mb-10 max-w-3xl text-center text-sm', rv)}
            style={{ color: 'var(--mr-text-muted)' }}
          >
            {c.protection.subheading}
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {c.protection.points.map((point) => {
              const Icon = icon(point.icon);
              /*
                §CANONICAL HUE → DOMAIN — all three of these are RISK/EXCEPTION
                safeguards, so they take red, the hue exceptions own. They wore
                orange (logistics), red and violet (catalogue) before, which said
                three different things about one idea.
              */
              const palette = 'var(--mr-palette-red)';
              return (
                <div
                  key={point.title}
                  className={cn(
                    'rounded-xl border-t-[3px] border border-white/[0.06] bg-ink-850 p-5',
                    rv
                  )}
                  style={{ borderTopColor: palette }}
                >
                  <span
                    className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: palette, color: 'var(--mr-on-palette)' }}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h3 className="mb-2 font-display text-base font-semibold text-parchment">
                    {point.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-steel">{point.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA with onboarding-status stamp badge */}
      <section className="border-t border-white/[0.06] px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          {/*
            §CRAFT FIX (2026-09-28) — the stamp was absolutely positioned over the
            heading, and at 1440px it covered the words "your products?" (it also
            sat on the heading's first line at 390px). It now sits in the flow,
            right-aligned above the heading on wider screens and centred below it,
            so the two boxes cannot overlap at any width.
          */}
          <div aria-hidden="true" className="mb-6 flex justify-center md:justify-end">
            <div
              className="rotate-[8deg] select-none rounded-md border-[3px] px-4 py-2 font-mono text-ds-label uppercase tracking-[0.2em] shadow-[inset_0_0_12px_rgba(181,73,58,0.15)]"
              style={{ borderColor: 'var(--mr-palette-red)', color: 'var(--mr-palette-red)' }}
            >
              {/*
                §CRAFT FIX (2026-09-28) — the stamp's ink was a fixed crimson at
                80% opacity, which measured 3.71:1 against the dark page (and
                less once the parent opacity was composited) — below AA for both
                its 12px and its 16px text. It now takes the palette red in full,
                which measures 5.21:1 on the dark ground and 5.85:1 on the light
                one.
              */}
              <div
                className="rounded-sm border px-3 py-1.5 text-center leading-relaxed"
                style={{ borderColor: 'color-mix(in srgb, var(--mr-palette-red) 70%, transparent)' }}
              >
                {c.finalCta.stampLine1}
                <br />
                <span className="text-base font-semibold">{c.finalCta.stampLine2}</span>
              </div>
            </div>
          </div>
          <h2 className={cn('font-display text-2xl md:text-3xl font-semibold mb-3', rv)}>
            {c.finalCta.heading}
          </h2>
          <p className={cn('text-sm text-steel mb-8 max-w-xl mx-auto', rv)}>
            {fillBrand(c.finalCta.subheading)}
          </p>
          <button
            onClick={() => navigate('explore-uk-market-fit')}
            className="inline-flex items-center gap-2 rounded-lg bg-palette-indigo px-6 py-3 font-semibold text-on-palette transition-colors hover:opacity-90"
          >
            {c.finalCta.buttonLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <PublicFooter onNavigate={navigate} onOpenPortal={openPortal} />
    </div>
  );
}
