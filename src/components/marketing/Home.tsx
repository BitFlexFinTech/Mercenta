import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useTheme } from '@/context/ThemeContext';

import {
  DEFAULT_HOMEPAGE_CONTENT,
  type HomepageContent,
  type HomeIconName,
} from '@/config/homepageContent';
import { cn } from '@/utils/cn';
import { LoadingState } from '@/components/ui';
import { PRE_AUDIT_TESTIDS } from '@/config/ukMarketFit';

/**
 * §Wave 3 Part 5 — ONE owner for the public routes' Suspense loading state.
 * Five inline copies used to spell the same placeholder five times ("Loading..."
 * as a bare word, with no loading indicator and no announcement to assistive
 * technology); they now render the canonical `LoadingState`.
 */
const SUSPENSE_FALLBACK = (
  <div className="flex min-h-screen items-center justify-center bg-surface p-6">
    <LoadingState className="w-full max-w-md" rows={2} label="Loading this page…" />
  </div>
);

import { resolveRoute } from '@/lib/seo/publicRoutes';
import { applyRouteMetadata, metadataForPublicPage } from '@/lib/seo/routeMetadata';
import { PrivacyPolicy } from '@/components/marketing/PrivacyPolicy';
import { TermsOfService } from '@/components/marketing/TermsOfService';
import { PublicNav, type PublicPage } from '@/components/marketing/PublicNav';
import { PublicFooter } from '@/components/marketing/PublicFooter';
import { CookieNotice } from '@/components/marketing/CookieNotice';
// §Phase 15 — the custom 404 view (website-integrity launch gate).
import { NotFound } from '@/components/marketing/NotFound';
/* §BRAND REDESIGN (2026-11-19) — the four homepage designs and their registry.
   The composition is selected by `content.design` (owner: homepageDesign.ts). */
/* §LINT FIX (2026-11-19) — the registry lives in its own module so HomeDesigns.tsx
   exports only components (react-refresh/only-export-components). */
import { HOMEPAGE_DESIGN_COMPONENTS } from '@/components/marketing/home/designRegistry';
/* §PUBLIC CONTENT PROGRAMME (2026-11-19) — the ONE renderer for the 16 approved
   content pages, and their lookup by page id. */
import { PublicContentPage } from '@/components/marketing/PublicContentPage';
import { PUBLIC_CONTENT_PAGE_BY_ID } from '@/config/publicPages';

// §Lazy-load — code-split these pages so they don't block the homepage bundle
const HowItWorks = lazy(() => import('@/components/marketing/HowItWorks').then(m => ({ default: m.HowItWorks })));
const UKMarketAccess = lazy(() => import('@/components/marketing/UKMarketAccess').then(m => ({ default: m.UKMarketAccess })));
const ForBrands = lazy(() => import('@/components/marketing/ForBrands').then(m => ({ default: m.ForBrands })));
const FAQ = lazy(() => import('@/components/marketing/FAQ').then(m => ({ default: m.FAQ })));
// §Phase 1 — the public pre-audit surface, code-split like the other public pages.
const ExploreUkMarketFit = lazy(() =>
  import('@/components/marketing/ExploreUkMarketFit').then(m => ({ default: m.ExploreUkMarketFit }))
);
// §LIFT OFF — the public offer page, code-split like the other public pages.
const LiftOff = lazy(() => import('@/components/marketing/LiftOff').then(m => ({ default: m.LiftOff })));

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

/**
 * §PUBLIC MESSAGING B4 (2026-09-29) — EVERY public page carries the cookie
 * notice, not just the homepage.
 *
 * The notice is appended by the router rather than by each page, so a new public
 * page cannot be added and silently omit it. It sits OUTSIDE the page component's
 * own `data-shell-theme` root, which is why `CookieNotice` sets that attribute on
 * itself.
 */
function renderPublicPage(
  page: PublicPage,
  onNavigate: (p: PublicPage | null) => void,
  openPortal: () => void,
) {
  const body = renderPublicPageBody(page, onNavigate, openPortal);
  if (!body) return null;
  return (
    <>
      {body}
      <CookieNotice onNavigate={onNavigate} />
    </>
  );
}

function renderPublicPageBody(
  page: PublicPage,
  onNavigate: (p: PublicPage | null) => void,
  openPortal: () => void,
) {
  /*
    §B5 — the two legal documents now take the public shell (navigation, footer
    and the shell theme) like every other public page, so they are handed the
    same callbacks as their siblings instead of a lone "back" action.
  */
  if (page === 'privacy') return <PrivacyPolicy onNavigate={onNavigate} onOpenPortal={openPortal} />;
  if (page === 'terms') return <TermsOfService onNavigate={onNavigate} onOpenPortal={openPortal} />;
  if (page === 'how-it-works') return (
    <Suspense fallback={SUSPENSE_FALLBACK}>
      <HowItWorks onNavigate={onNavigate as any} onOpenPortal={openPortal} />
    </Suspense>
  );
  if (page === 'uk-market-access') return (
    <Suspense fallback={SUSPENSE_FALLBACK}>
      <UKMarketAccess onNavigate={onNavigate as any} onOpenPortal={openPortal} />
    </Suspense>
  );
  if (page === 'for-brands') return (
    <Suspense fallback={SUSPENSE_FALLBACK}>
      <ForBrands onNavigate={onNavigate as any} onOpenPortal={openPortal} />
    </Suspense>
  );
  if (page === 'faq') return (
    <Suspense fallback={SUSPENSE_FALLBACK}>
      <FAQ onNavigate={onNavigate as any} onOpenPortal={openPortal} />
    </Suspense>
  );
  // §Phase 1 — Explore UK Market Fit (the public pre-audit surface).
  if (page === 'explore-uk-market-fit') return (
    <Suspense fallback={SUSPENSE_FALLBACK}>
      <ExploreUkMarketFit onNavigate={onNavigate as any} onOpenPortal={openPortal} />
    </Suspense>
  );
  // §LIFT OFF — the launch programme's public offer page (outcome only).
  if (page === 'lift-off') return (
    <Suspense fallback={SUSPENSE_FALLBACK}>
      <LiftOff onNavigate={onNavigate as any} onOpenPortal={openPortal} />
    </Suspense>
  );
  /**
   * §PUBLIC CONTENT PROGRAMME (2026-11-19) — THE 16 APPROVED CONTENT PAGES.
   *
   * They are rendered by ONE component from their content model, so they cannot
   * drift apart in voice or layout. The lookup is by page id, and a page id
   * reaches here only if `publicRoutes.ts` declared a route for it — which is
   * itself derived from the same content model. A route therefore cannot exist
   * without content, and content cannot exist without a route.
   */
  const contentPage = PUBLIC_CONTENT_PAGE_BY_ID[page as string];
  if (contentPage) {
    return (
      <PublicContentPage
        page={contentPage}
        onNavigate={onNavigate as any}
        onOpenPortal={openPortal}
      />
    );
  }
  return null;
}

export function Home({ content: c = DEFAULT_HOMEPAGE_CONTENT }: { content?: HomepageContent } = {}) {
  const { setEnvironment } = useApp();
  const { shellMode } = useTheme();
  const [publicView, setPublicView] = useState<PublicPage | null>(null);
  // §Phase 15 — an address that names nothing renders the 404 view, not the homepage.
  const [notFound, setNotFound] = useState(false);

  // §Crawlability — resolve direct URL access from the SEO SSOT (was an inline
  // path chain that had to be kept in sync with robots.txt/sitemap by hand).
  useEffect(() => {
    const resolved = resolveRoute(window.location.pathname);
    if (resolved.kind === 'public' && resolved.route.page !== 'home') {
      setPublicView(resolved.route.page as PublicPage);
    } else if (resolved.kind === 'unknown') {
      // §Phase 15 — the SSOT says this address means nothing; show the 404.
      setNotFound(true);
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
  // §Phase 15 — an unknown address shows the 404 view (never the homepage).
  if (notFound) {
    return <NotFound onNavigate={() => navigate('home')} onOpenPortal={openPortal} />;
  }
  if (publicView && publicView !== 'home') {
    /* §NAVIGATION REPAIR (2026-11-20) — A PAGE WITH NO CONTENT MUST NEVER BE BLANK.
     *
     * This used to `return renderPublicPage(...)` directly. When a navigation id
     * had no entry in PUBLIC_CONTENT_PAGE_BY_ID, `renderPublicPageBody` returned
     * `null`, so the component returned `null` and React painted NOTHING: no
     * header, no footer, no message — a completely empty screen. Seventeen menu
     * links did exactly that on the live site.
     *
     * The content defect is fixed at source (the pages now exist, and the
     * duplicate group is deleted). This fallback makes the CLASS of defect
     * impossible to repeat silently: any future page id without content renders
     * the honest 404 view instead of an empty page.
     */
    const rendered = renderPublicPage(publicView, navigate, openPortal);
    if (rendered) return rendered;
    return <NotFound onNavigate={() => navigate('home')} onOpenPortal={openPortal} />;
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
        §BRAND REDESIGN (2026-11-19) — THE HOMEPAGE IS NOW ONE OF FOUR DESIGNS.

        The composition is selected by `content.design`, which is owned by
        `src/config/homepageDesign.ts` and PUBLISHED from Super Admin through the
        existing `homepage_content` draft/publish flow. Design A (Monolith) is
        the owner's fixed default.

        Every design renders the SAME approved content and the SAME preserved
        tracker animation, and every design wires the SAME three actions:
          · Explore UK Market Fit  → `navigate('explore-uk-market-fit')`
          · Partner Login          → `openPortal()` → the login environment
          · Request Partner Access → `openPortal()` → the login environment
        Their destinations are unchanged from the previous homepage.
      */}
      <main id="home">
        {(() => {
          const Design = HOMEPAGE_DESIGN_COMPONENTS[c.design];
          return (
            <Design
              content={c}
              onPrimary={() => navigate('explore-uk-market-fit')}
              primaryLabel={c.hero.primaryCta}
              primaryTestId={PRE_AUDIT_TESTIDS.cta}
              onOpenPortal={openPortal}
            />
          );
        })()}
      </main>

      <PublicFooter onNavigate={navigate} onOpenPortal={openPortal} />
      {/* §B4 — the cookie notice, on the homepage as on every other public page. */}
      <CookieNotice onNavigate={navigate} />
    </div>
  );
}
