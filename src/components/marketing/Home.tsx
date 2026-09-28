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
      <section id="home" className="pt-24 pb-24 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className={cn(rv, 'is-revealed')}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.04] px-3 py-1 text-ds-label font-mono uppercase tracking-[0.25em] text-[var(--mr-accent-700)]">
              <span className="w-1.5 h-1.5 rounded-full bg-state-success" aria-hidden="true" />
              {c.hero.eyebrow}
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
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs tracking-wider" style={{ color: 'var(--mr-text-muted)' }}>
              {c.hero.trustBadges.map((badge) => (
                <span key={badge} className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-brass" aria-hidden="true" /> {badge}
                </span>
              ))}
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
                <span className="animate-route-dot absolute top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--mr-palette-cyan)',
                      boxShadow: '0 0 12px var(--mr-palette-cyan)',
                    }}
                  />
                </span>
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-steel/60 bg-ink" />
                <span className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-steel/60 bg-ink" />
                <span
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 bg-ink"
                  style={{ borderColor: 'var(--mr-palette-cyan)' }}
                />
              </div>
              <div className="flex justify-between font-mono text-ds-micro tracking-wider text-steel uppercase mb-6">
                <span>Origin</span>
                <span>In Transit</span>
                <span style={{ color: 'var(--mr-palette-cyan)' }}>UK Arrival</span>
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
                          backgroundColor: 'var(--mr-palette-indigo)',
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

          {/* §UI/UX Wave 1 — "Unlock growth with data" (truthful platform copy) */}
          <div className="mt-10 max-w-2xl mx-auto lg:mx-0">
            <UnlockGrowth />
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
            {c.about.points.map((point, i) => {
              const Icon = icon(point.icon);
              const palette = ['var(--mr-palette-indigo)', 'var(--mr-palette-cyan)', 'var(--mr-palette-green)'][i % 3];
              return (
                <div key={point.title} className={cn('bg-ink-850 p-6', rv)}>
                  <div className="mb-4 flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: palette, color: 'var(--mr-on-palette)' }}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-ds-label tracking-[0.2em] text-zinc-500">
                      0{i + 1}
                    </span>
                  </div>
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
              const palette = [
                'var(--mr-palette-indigo)',
                'var(--mr-palette-cyan)',
                'var(--mr-palette-green)',
                'var(--mr-palette-amber)',
                'var(--mr-palette-pink)',
                'var(--mr-palette-violet)',
              ][i % 6];
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
      <section id="network" className="px-6 py-16 border-t border-white/[0.06]">
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
          <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {c.route.steps.map((step, i) => {
              const Icon = icon(step.icon);
              return (
                <li
                  key={step.title}
                  className={cn(
                    'relative rounded-lg border border-white/[0.06] bg-ink-850 p-3.5',
                    rv
                  )}
                >
                  <span className="mb-2 flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="font-mono text-ds-micro tracking-widest text-zinc-500"
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <Icon className="h-3.5 w-3.5 text-brass" aria-hidden="true" />
                  </span>
                  <span className="block font-display text-sm font-semibold text-parchment">
                    {step.title}
                  </span>
                  <span className="mt-1 block text-ds-label leading-snug text-steel">
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
              const palette = [
                'var(--mr-palette-cyan)',
                'var(--mr-palette-green)',
                'var(--mr-palette-amber)',
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
            {c.protection.points.map((point, i) => {
              const Icon = icon(point.icon);
              const palette = [
                'var(--mr-palette-orange)',
                'var(--mr-palette-red)',
                'var(--mr-palette-violet)',
              ][i % 3];
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
      <section className="py-24 px-6 border-t border-white/[0.06] relative overflow-hidden">
        <div className="max-w-2xl mx-auto text-center relative">
          <div
            aria-hidden="true"
            className="absolute -top-16 right-0 md:-top-14 md:right-4 rotate-[8deg] select-none pointer-events-none"
          >
            <div className="border-[3px] border-stamp text-stamp rounded-md px-4 py-2 font-mono text-ds-label tracking-[0.2em] uppercase opacity-80 shadow-[inset_0_0_12px_rgba(181,73,58,0.15)]">
              <div className="border border-stamp/70 rounded-sm px-3 py-1.5 text-center leading-relaxed">
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
