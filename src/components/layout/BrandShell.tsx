/**
 * BrandShell — brand portal environment. Lazy-loaded from App.tsx.
 *
 * §ADMIN-SHELL-CHUNK (2026-10-05) — the brand portal's view panels are LAZY, not
 * eagerly imported. The shell is itself lazy-loaded from App.tsx, but importing
 * every panel statically still put them all in ONE ~637 kB `BrandShell-*.js`
 * chunk, so a brand downloaded every panel to open any one of them. Each panel is
 * now a `React.lazy(() => import(…))` dynamic import rendered inside a
 * `<Suspense>`, so the shell ships small and a panel's chunk loads only when its
 * view is opened. `node_modules` still lands in the ONE `vendor` chunk (§P3).
 */
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/ui';
import { IntegrationsProvider } from '@/integrations/IntegrationsContext';
import { currentPathname, pushProductPath, resolveProductView } from '@/lib/runtime/productRoutes';
import { LiveChatWidget } from '@/components/shared/LiveChatWidget';
import { TourLoader } from '@/components/shared/TourLoader';
import { UsertourBrandBridge } from '@/components/shared/UsertourBrandBridge';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
/*
  §ADMIN-SHELL-CHUNK (2026-10-05) — the brand portal's view panels, LAZY.
  (See the file header for why.) `OnboardingWizard` is needed IMMEDIATELY by an
  un-onboarded brand, so the early return below wraps it in its own `<Suspense>`.
*/
const BrandDashboard = lazy(() => import('@/components/brand/BrandDashboard').then((m) => ({ default: m.BrandDashboard })));
const OnboardingWizard = lazy(() => import('@/components/brand/OnboardingWizard').then((m) => ({ default: m.OnboardingWizard })));
const OnboardingSummary = lazy(() => import('@/components/brand/OnboardingSummary').then((m) => ({ default: m.OnboardingSummary })));
const ProductCatalog = lazy(() => import('@/components/brand/ProductCatalog').then((m) => ({ default: m.ProductCatalog })));
const BrandInventory = lazy(() => import('@/components/brand/BrandInventory').then((m) => ({ default: m.BrandInventory })));
const LogisticsHub = lazy(() => import('@/components/brand/LogisticsHub').then((m) => ({ default: m.LogisticsHub })));
const ComplianceHub = lazy(() => import('@/components/brand/ComplianceHub').then((m) => ({ default: m.ComplianceHub })));
const BrandContractView = lazy(() => import('@/components/brand/BrandContractView').then((m) => ({ default: m.BrandContractView })));
const BrandPurchaseOrders = lazy(() => import('@/components/brand/BrandPurchaseOrders').then((m) => ({ default: m.BrandPurchaseOrders })));
const BrandReturns = lazy(() => import('@/components/brand/BrandReturns').then((m) => ({ default: m.BrandReturns })));
const BrandReports = lazy(() => import('@/components/brand/BrandReports').then((m) => ({ default: m.BrandReports })));
const BrandSelfService = lazy(() => import('@/components/brand/BrandSelfService').then((m) => ({ default: m.BrandSelfService })));
const BrandSettings = lazy(() => import('@/components/brand/BrandSettings').then((m) => ({ default: m.BrandSettings })));
const BrandTeamMessages = lazy(() => import('@/components/brand/BrandTeamMessages').then((m) => ({ default: m.BrandTeamMessages })));
const BrandIntelligence = lazy(() => import('@/components/brand/BrandIntelligence').then((m) => ({ default: m.BrandIntelligence })));
const CommercialReadiness = lazy(() => import('@/components/brand/CommercialReadiness').then((m) => ({ default: m.CommercialReadiness })));
const BrandAdvertising = lazy(() => import('@/components/brand/BrandAdvertising').then((m) => ({ default: m.BrandAdvertising })));
const AdsManagement = lazy(() => import('@/components/ads/AdsManagement').then((m) => ({ default: m.AdsManagement })));
const ListingAnalyzer = lazy(() => import('@/components/brand/ListingAnalyzer').then((m) => ({ default: m.ListingAnalyzer })));
const SalesEstimatorCard = lazy(() => import('@/components/brand/SalesEstimatorCard').then((m) => ({ default: m.SalesEstimatorCard })));
const LiftOffProgramme = lazy(() => import('@/components/brand/LiftOffProgramme').then((m) => ({ default: m.LiftOffProgramme })));
const SalesAnalytics = lazy(() => import('@/components/brand/SalesAnalytics').then((m) => ({ default: m.SalesAnalytics })));
const BrandWorkManagement = lazy(() => import('@/components/brand/WorkManagement').then((m) => ({ default: m.BrandWorkManagement })));
const BrandWorkCalendar = lazy(() => import('@/components/brand/WorkManagement').then((m) => ({ default: m.BrandWorkCalendar })));
const BrandSupport = lazy(() => import('@/components/brand/BrandSupport').then((m) => ({ default: m.BrandSupport })));
import { NAV_BADGE_LABELS, useBrandNavBadges } from '@/lib/nav/navBadges';
import {
  LayoutDashboard, FileCheck2, FileText, Package, Truck,
  ShieldCheck, BarChart3, RotateCcw, Settings,
  MessageSquare, ScrollText, ListChecks, CalendarDays, ClipboardCheck,
  Boxes, Zap, Palette,
} from 'lucide-react';

const BRAND_SECTIONS = [
  {
    label: 'Overview',
    items: [{ id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, tourAttr: 'brand-dashboard' }],
  },
  {
    /**
     * §Dashboard-cleanup P1 — OPERATIONS IS THE ACTION CENTRE (brand side).
     * The brand's own work sits here, in the order they do it: process the
     * purchase orders, print the shipping documents, handle returns, work the
     * task list and the calendar. The Dashboard stays observe-only.
     */
    label: 'Operations',
    items: [
      { id: 'purchase_orders', label: 'Purchase Orders', icon: <Truck className="w-4 h-4" />, tourAttr: 'nav-purchase_orders' },
      { id: 'logistics', label: 'Logistics Hub', icon: <Truck className="w-4 h-4" />, tourAttr: 'nav-logistics' },
      { id: 'returns', label: 'Returns', icon: <RotateCcw className="w-4 h-4" /> },
      { id: 'work', label: 'Tasks & Deadlines', icon: <ListChecks className="w-4 h-4" /> },
      { id: 'calendar', label: 'Calendar', icon: <CalendarDays className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { id: 'catalog', label: 'Product Catalog', icon: <Package className="w-4 h-4" />, tourAttr: 'nav-catalog' },
      {
        /**
         * §P8 — inventory is LINKED TO THE CATALOGUE (programme decision 5), so
         * it sits in the Catalogue section rather than in Operations: it
         * describes the catalogue's products, it does not process a PO.
         */
        id: 'inventory',
        label: 'Inventory',
        icon: <Boxes className="w-4 h-4" />,
        tourAttr: 'nav-inventory',
      },
      // §Phase 2 — what Mercenta needs to assess a product commercially, and why.
      { id: 'commercial_readiness', label: 'Commercial Readiness', icon: <ClipboardCheck className="w-4 h-4" /> },
    ],
  },
  {
    /**
     * §LIFT OFF — the launch programme gets its OWN section. It is a different
     * customer to Operations: a brand NEW to the retail channel, launching a
     * product through Mercenta's named programme (see `src/config/liftOff.ts`).
     */
    label: 'Programme',
    items: [
      { id: 'lift_off', label: 'Lift Off', icon: <Zap className="w-4 h-4" />, tourAttr: 'nav-lift-off' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { id: 'onboarding', label: 'Onboarding & Legal', icon: <FileCheck2 className="w-4 h-4" /> },
      { id: 'compliance', label: 'UK Compliance', icon: <ShieldCheck className="w-4 h-4" />, tourAttr: 'nav-compliance' },
      { id: 'contracts', label: 'Contracts', icon: <FileText className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'ads_management', label: 'Ads Management', icon: <Palette className="w-4 h-4" /> },
      { id: 'market', label: 'Market Intel', icon: <BarChart3 className="w-4 h-4" /> },
      { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Account',
    items: [
      { id: 'documents', label: 'Documents & Account', icon: <ScrollText className="w-4 h-4" /> },
      { id: 'cases', label: 'Support & Cases', icon: <MessageSquare className="w-4 h-4" /> },
      { id: 'team', label: 'Support & Team', icon: <MessageSquare className="w-4 h-4" /> },
      { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, tourAttr: 'nav-settings' },
    ],
  },
];

/**
 * §RUNTIME PARITY — every view the brand shell can actually render, derived from
 * the SAME nav declarations the rail renders. A URL segment outside this set
 * resolves to the declared default view instead of rendering an empty workspace.
 */
const BRAND_VIEW_IDS: readonly string[] = BRAND_SECTIONS.flatMap((s) =>
  s.items.map((i) => i.id)
);

/**
 * §ADMIN-SHELL-CHUNK — the in-shell fallback shown while a lazily-loaded brand
 * panel's chunk is fetched. It renders INSIDE the shell chrome (nav + header stay
 * mounted), so switching views never blanks the workspace.
 */
function BrandViewFallback() {
  return (
    <div className="rounded-ds-lg border border-hairline-strong bg-surface-raised" data-testid="brand-view-loading">
      {/* §Wave 3 Part 5 — ONE owner for the loading region (`LoadingState`). */}
      <LoadingState rows={3} label="Loading view…" />
    </div>
  );
}

export default function BrandShell() {
  const { brandProfile } = useApp();
  /**
   * §RUNTIME PARITY (R1) — the active brand view IS the address
   * (`/brand/logistics`, `/brand/purchase-orders`, …). Initialised from the
   * URL, written back on every navigation, re-read on Back/Forward.
   */
  const [brandView, setBrandViewState] = useState(() =>
    resolveProductView('brand', currentPathname(), BRAND_VIEW_IDS)
  );
  const setBrandView = useCallback((v: string) => {
    setBrandViewState(v);
    pushProductPath('brand', v);
  }, []);

  useEffect(() => {
    function onPopState() {
      setBrandViewState(resolveProductView('brand', currentPathname(), BRAND_VIEW_IDS));
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  /**
   * §UI/UX Wave 2 — brand-scoped attention counts. Called BEFORE the
   * onboarding early-return (Rules of Hooks); `enabled` stops the fetch for a
   * brand that has not finished onboarding. Tenant isolation is enforced inside
   * the hook via assertBrandScope + the session's own tenantId.
   */
  const navBadges = useBrandNavBadges(brandProfile.onboarded);
  const navSections = BRAND_SECTIONS.map((s) => ({
    ...s,
    // §SSOT S5 — the badge number travels with its DECLARED set label.
    items: s.items.map((i) =>
      navBadges[i.id]
        ? { ...i, badge: navBadges[i.id], badgeLabel: NAV_BADGE_LABELS[i.id] }
        : i
    ),
  }));

  /* §ADMIN-SHELL-CHUNK — `OnboardingWizard` is lazy, and this early return sits
     OUTSIDE the main view `<Suspense>` below, so it carries its own boundary. */
  if (!brandProfile.onboarded) {
    return (
      <Suspense fallback={<BrandViewFallback />}>
        <OnboardingWizard />
      </Suspense>
    );
  }

  const bc = brandView === 'overview' ? 'Dashboard'
    : brandView === 'onboarding' ? 'Onboarding & Legal'
    : brandView === 'catalog' ? 'Product Catalog'
    : brandView === 'inventory' ? 'Inventory'
    : brandView === 'commercial_readiness' ? 'Commercial Readiness'
    : brandView === 'logistics' ? 'Logistics Hub'
    : brandView === 'compliance' ? 'UK Compliance'
    : brandView === 'purchase_orders' ? 'Purchase Orders'
    : brandView === 'contracts' ? 'Contracts'
    : brandView === 'returns' ? 'Returns'
    : brandView === 'reports' ? 'Reports'
    : brandView === 'team' ? 'Support & Team'
    : brandView === 'cases' ? 'Support & Cases'
    : brandView === 'market' ? 'Market Intelligence'
    : brandView === 'ads_management' ? 'Ads Management'
    : brandView === 'settings' ? 'Settings'
    : brandView === 'work' ? 'Tasks & Deadlines'
    : brandView === 'calendar' ? 'Your Calendar'
    : 'Analytics';

  return (
    <AppShell navSections={navSections} activeView={brandView} setActiveView={setBrandView}
      breadcrumb={bc}
      userName={brandProfile.signatory || brandProfile.businessName || 'Brand Partner'}
      onNavSettings={() => setBrandView('settings')}
      onNavBilling={() => setBrandView('settings')}
      onNavApiKeys={() => setBrandView('settings')}
      onNavNotification={(v) => setBrandView(v)}
      headerActions={<LiveChatWidget />}
    >
      <ErrorBoundary sectionLabel="Brand portal">
        <IntegrationsProvider>
          {/* §ADMIN-SHELL-CHUNK — the lazily-loaded view panels resolve inside this
              boundary; the shell chrome (nav + header) stays mounted. */}
          <Suspense fallback={<BrandViewFallback />}>
            {brandView === 'overview' && <BrandDashboard onNavigate={setBrandView} />}
            {brandView === 'onboarding' && (brandProfile.onboarded ? <OnboardingSummary onNavigate={setBrandView} /> : <OnboardingWizard />)}
            {brandView === 'catalog' && <ProductCatalog />}
            {/* §P8 — inventory linked to the catalogue (programme decision 5). */}
            {brandView === 'inventory' && <BrandInventory />}
            {brandView === 'commercial_readiness' && <CommercialReadiness />}
            {brandView === 'contracts' && <BrandContractView />}
            {brandView === 'purchase_orders' && <BrandPurchaseOrders />}
            {brandView === 'logistics' && <LogisticsHub />}
            {brandView === 'compliance' && <ComplianceHub />}
            {brandView === 'analytics' && <SalesAnalytics />}
            {brandView === 'documents' && <BrandSelfService />}
            {brandView === 'returns' && <BrandReturns />}
            {brandView === 'reports' && <BrandReports onNavigate={setBrandView} />}
            {brandView === 'settings' && <BrandSettings />}
            {/* §Sprint — canonical work layer: the brand's own tasks/deadlines + calendar. */}
            {brandView === 'work' && <BrandWorkManagement onNavigate={setBrandView} />}
            {brandView === 'calendar' && <BrandWorkCalendar onNavigate={setBrandView} />}
            {brandView === 'team' && <BrandTeamMessages />}
            {/* §Brief §6 — the brand's own case surface (Mercenta-mediated). */}
            {brandView === 'cases' && <BrandSupport />}
            {brandView === 'lift_off' && <LiftOffProgramme />}
            {brandView === 'ads_management' && <AdsManagement />}
            {brandView === 'market' && (
              <div className="space-y-4">
                <BrandIntelligence />
                <BrandAdvertising />
                <ListingAnalyzer />
                <SalesEstimatorCard />
              </div>
            )}
            <TourLoader currentView={brandView} isBrandPortal={true} />
            <UsertourBrandBridge />
          </Suspense>
        </IntegrationsProvider>
      </ErrorBoundary>
    </AppShell>
  );
}