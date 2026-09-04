import { useEffect, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { BRAND_NAME, BRAND_LEGAL_NAME } from '@/config/brand';
import {
  DEFAULT_HOMEPAGE_CONTENT,
  type HomepageContent,
  type HomeIconName,
} from '@/config/homepageContent';
import { cn } from '@/utils/cn';
import logoMark from '@/assets/mercenta-mark-dark-bg.svg';
import logoLockup from '@/assets/mercenta-logo-lockup.svg';
import { TamSamAggregate } from '@/components/shared/TamSamDisplay';
import { PrivacyPolicy } from '@/components/marketing/PrivacyPolicy';
import { TermsOfService } from '@/components/marketing/TermsOfService';
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

const NAV_ITEMS = [
  { label: 'About Us', sectionId: 'about' },
  { label: 'Services', sectionId: 'services' },
  { label: 'UK Network', sectionId: 'network' },
];

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

export function Home({ content: c = DEFAULT_HOMEPAGE_CONTENT }: { content?: HomepageContent } = {}) {
  const { setEnvironment } = useApp();
  const [legalPage, setLegalPage] = useState<'privacy' | 'terms' | null>(null);

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useScrollReveal(!reducedMotion);

  const scrollTo = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el)
      el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const openPortal = () => setEnvironment('login');
  const rv = !reducedMotion ? 'reveal' : '';

  // Show legal pages when toggled from footer
  if (legalPage === 'privacy') return <PrivacyPolicy onBack={() => setLegalPage(null)} />;
  if (legalPage === 'terms') return <TermsOfService onBack={() => setLegalPage(null)} />;

  return (
    <div className="min-h-screen bg-ink text-parchment font-plex">
      {/* Navigation */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-ink/80 backdrop-blur-xl border-b border-brass/10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => window.scrollTo({ top: 0 })}
            className="flex items-center gap-2.5"
            aria-label={`${BRAND_NAME} home`}
          >
            <img src={logoMark} alt="" className="w-8 h-8" />
            <span className="font-display text-lg font-semibold text-parchment tracking-wide">
              Mercenta
              <span className="text-brass ml-1.5 font-mono text-xs tracking-[0.25em] uppercase">
                Partners
              </span>
            </span>
          </button>
          <div className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.sectionId}
                onClick={() => scrollTo(item.sectionId)}
                className="text-sm text-steel hover:text-parchment transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            onClick={openPortal}
            className="text-sm font-medium border border-brass/40 text-brass hover:bg-brass/10 px-4 py-1.5 rounded-lg transition-colors"
          >
            {c.hero.secondaryCta}
          </button>
        </div>
      </nav>

      {/* Hero — two columns: pitch left, live tracker right */}
      <section id="home" className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className={cn(rv, 'is-revealed')}>
            <p className="font-mono text-xs tracking-[0.3em] uppercase text-brass mb-5">
              {c.hero.eyebrow}
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-semibold leading-[1.1] mb-6">
              {c.hero.headingStart}{' '}
              <span className="text-brass italic">{c.hero.headingHighlight}</span>
            </h1>
            <p className="text-base md:text-lg text-steel leading-relaxed mb-8 max-w-xl">
              {fillBrand(c.hero.subheading)}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={openPortal}
                className="inline-flex items-center gap-2 bg-brass hover:bg-brass-600 text-ink font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                {c.hero.primaryCta}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={openPortal}
                className="inline-flex items-center gap-2 border border-white/15 hover:border-brass/50 text-parchment px-6 py-3 rounded-lg transition-colors"
              >
                {c.hero.secondaryCta}
              </button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 font-mono text-xs tracking-wider text-steel">
              {c.hero.trustBadges.map((badge) => (
                <span key={badge} className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-brass" /> {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Animated shipment-tracker card */}
          <div className={cn('relative', rv, 'is-revealed')}>
            <div className="bg-ink-2 border border-white/[0.07] rounded-2xl p-6 shadow-2xl shadow-black/50">
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-[11px] tracking-[0.25em] text-steel uppercase">
                  Shipment Tracker
                </span>
                <span className="flex items-center gap-2 font-mono text-[11px] text-emerald-400">
                  <span className="relative flex w-2 h-2">
                    <span className="animate-tracker-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                  </span>
                  LIVE
                </span>
              </div>

              {/* Dotted route-line with moving waypoint dot */}
              <div className="relative h-10 mb-1" aria-hidden="true">
                <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 border-t-2 border-dotted border-steel/40" />
                <span className="animate-route-dot absolute top-1/2 -translate-y-1/2 flex items-center justify-center">
                  <span className="w-3.5 h-3.5 rounded-full bg-brass shadow-[0_0_12px_rgba(201,161,90,0.9)]" />
                </span>
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-steel/60 bg-ink" />
                <span className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-steel/60 bg-ink" />
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 border-brass bg-ink" />
              </div>
              <div className="flex justify-between font-mono text-[10px] tracking-wider text-steel uppercase mb-6">
                <span>Origin</span>
                <span>In Transit</span>
                <span className="text-brass">UK Arrival</span>
              </div>

              <div className="bg-ink rounded-xl border border-white/[0.05] divide-y divide-white/[0.05]">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="font-mono text-xs text-steel">
                    {c.tracker.reference} · {c.tracker.cargoLabel}
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-brass/15 text-brass border border-brass/30">
                    {c.tracker.freightMode}
                  </span>
                </div>
                {c.tracker.stages.map((stage) => (
                  <div key={stage.label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="font-mono text-xs text-parchment">{stage.label}</span>
                    {stage.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-brass/15 text-brass border border-brass/30">
                        IN PROGRESS
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us */}
      <section id="about" className="py-16 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <h2 className={cn('font-display text-2xl md:text-3xl font-semibold text-center mb-2', rv)}>
            {c.about.heading}
          </h2>
          <p className={cn('text-sm text-steel text-center mb-10 max-w-2xl mx-auto', rv)}>
            {c.about.subheading}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {c.about.points.map((point) => {
              const Icon = icon(point.icon);
              return (
                <div
                  key={point.title}
                  className={cn('bg-ink-2 border border-white/[0.06] rounded-xl p-6', rv)}
                >
                  <div className="w-10 h-10 rounded-lg bg-brass/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-brass" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-parchment mb-2">
                    {point.title}
                  </h3>
                  <p className="text-sm text-steel leading-relaxed">{point.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-16 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <h2 className={cn('font-display text-2xl md:text-3xl font-semibold text-center mb-2', rv)}>
            {c.services.heading}
          </h2>
          <p className={cn('text-sm text-steel text-center mb-10 max-w-2xl mx-auto', rv)}>
            {c.services.subheading}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {c.services.cards.map((service) => {
              const Icon = icon(service.icon);
              return (
                <div
                  key={service.title}
                  className={cn('bg-ink-2 border border-white/[0.06] rounded-xl p-6', rv)}
                >
                  <div className="w-10 h-10 rounded-lg bg-brass/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-brass" />
                  </div>
                  <h3 className="font-display text-base font-semibold text-parchment mb-2">
                    {service.title}
                  </h3>
                  <p className="text-sm text-steel leading-relaxed">{service.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Sourcing origins — UK-only destination */}
      <section id="network" className="py-16 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <h2 className={cn('font-display text-2xl md:text-3xl font-semibold text-center mb-2', rv)}>
            {c.route.heading}
          </h2>
          <p className={cn('text-sm text-steel text-center mb-10 max-w-2xl mx-auto', rv)}>
            {c.route.subheading}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {c.route.steps.map((origin) => {
              const Icon = icon(origin.icon);
              return (
                <div
                  key={origin.region}
                  className={cn(
                    'bg-ink-2 border border-brass/20 hover:border-brass/50 transition-colors rounded-xl p-6',
                    rv
                  )}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-2xl">{origin.flag}</span>
                    <Icon className="w-5 h-5 text-brass" />
                    <h3 className="font-display text-base font-semibold text-parchment">
                      {origin.region}
                    </h3>
                  </div>
                  <p className="font-mono text-xs text-brass mb-2">{origin.route}</p>
                  <p className="text-xs text-steel leading-relaxed">{origin.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* §Batch-17 — UK Import Market TAM/SAM credibility section */}
      <section className="py-16 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-center mb-2">
            The Size of the Opportunity
          </h2>
          <p className="text-sm text-steel text-center mb-8 max-w-2xl mx-auto">
            We aren't a needle in a haystack — we are the haystack. Here is the size of it.
          </p>
          <div className="max-w-lg mx-auto">
            <TamSamAggregate />
          </div>
        </div>
      </section>

      {/* Final CTA with customs-stamp badge */}
      <section className="py-24 px-6 border-t border-white/[0.06] relative overflow-hidden">
        <div className="max-w-2xl mx-auto text-center relative">
          <div
            aria-hidden="true"
            className="absolute -top-8 right-0 md:right-6 rotate-[8deg] select-none pointer-events-none"
          >
            <div className="border-[3px] border-stamp text-stamp rounded-md px-4 py-2 font-mono text-[11px] tracking-[0.2em] uppercase opacity-80 shadow-[inset_0_0_12px_rgba(181,73,58,0.15)]">
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
            onClick={openPortal}
            className="inline-flex items-center gap-2 bg-brass hover:bg-brass-600 text-ink font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            {c.finalCta.buttonLabel}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={logoLockup} alt={BRAND_LEGAL_NAME} className="h-10 rounded-md" />
          <div className="flex items-center gap-4">
            <button onClick={() => setLegalPage('privacy')} className="font-mono text-[11px] text-zinc-600 hover:text-brass-400 transition-colors">
              Privacy Policy
            </button>
            <button onClick={() => setLegalPage('terms')} className="font-mono text-[11px] text-zinc-600 hover:text-brass-400 transition-colors">
              Terms of Service
            </button>
          </div>
          <div className="font-mono text-xs text-steel tracking-wide">
            {BRAND_LEGAL_NAME} · UK Importer of Record — EORI Registered
          </div>
        </div>
      </footer>
    </div>
  );
}
