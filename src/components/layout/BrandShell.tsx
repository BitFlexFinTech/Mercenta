/**
 * BrandShell — brand portal environment. Lazy-loaded from App.tsx.
 * All brand components are statically imported here — this file
 * is only loaded when environment === 'brand'.
 */
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { AppShell } from '@/components/layout/AppShell';
import { IntegrationsProvider } from '@/integrations/IntegrationsContext';
import { currentPathname, pushProductPath, resolveProductView } from '@/lib/runtime/productRoutes';
import { LiveChatWidget } from '@/components/shared/LiveChatWidget';
import { TourLoader } from '@/components/shared/TourLoader';
import { UsertourBrandBridge } from '@/components/shared/UsertourBrandBridge';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { BrandDashboard } from '@/components/brand/BrandDashboard';
import { OnboardingWizard } from '@/components/brand/OnboardingWizard';
import { OnboardingSummary } from '@/components/brand/OnboardingSummary';
import { ProductCatalog } from '@/components/brand/ProductCatalog';
import { LogisticsHub } from '@/components/brand/LogisticsHub';
import { ComplianceHub } from '@/components/brand/ComplianceHub';
import { BrandContractView } from '@/components/brand/BrandContractView';
import { BrandPurchaseOrders } from '@/components/brand/BrandPurchaseOrders';
import { BrandReturns } from '@/components/brand/BrandReturns';
import { BrandReports } from '@/components/brand/BrandReports';
import { BrandSelfService } from '@/components/brand/BrandSelfService';
import { BrandSettings } from '@/components/brand/BrandSettings';
import { BrandTeamMessages } from '@/components/brand/BrandTeamMessages';
import { BrandSocialConnect } from '@/components/brand/BrandSocialConnect';
import { BrandIntelligence } from '@/components/brand/BrandIntelligence';
import { CommercialReadiness } from '@/components/brand/CommercialReadiness';
import { BrandAdvertising } from '@/components/brand/BrandAdvertising';
import { ListingAnalyzer } from '@/components/brand/ListingAnalyzer';
import { SalesEstimatorCard } from '@/components/brand/SalesEstimatorCard';
import { SalesAnalytics } from '@/components/brand/SalesAnalytics';
import { BrandWorkCalendar, BrandWorkManagement } from '@/components/brand/WorkManagement';
import { BrandSupport } from '@/components/brand/BrandSupport';
import { MERCENTA_SOCIAL } from '@/config/mercentaSocial';
import { useBrandNavBadges } from '@/lib/nav/navBadges';
import {
  LayoutDashboard, FileCheck2, FileText, Package, Truck,
  ShieldCheck, BarChart3, RotateCcw, Target, Settings,
  MessageSquare, ScrollText, ListChecks, CalendarDays, ClipboardCheck,
} from 'lucide-react';

const BRAND_SECTIONS = [
  {
    label: 'Overview',
    items: [{ id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, tourAttr: 'brand-dashboard' }],
  },
  {
    label: 'Catalogue',
    items: [
      { id: 'catalog', label: 'Product Catalog', icon: <Package className="w-4 h-4" />, tourAttr: 'nav-catalog' },
      // §Phase 2 — what Mercenta needs to assess a product commercially, and why.
      { id: 'commercial_readiness', label: 'Commercial Readiness', icon: <ClipboardCheck className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Commerce',
    items: [
      { id: 'purchase_orders', label: 'Purchase Orders', icon: <Truck className="w-4 h-4" />, tourAttr: 'nav-purchase_orders' },
      { id: 'returns', label: 'Returns', icon: <RotateCcw className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Logistics',
    items: [{ id: 'logistics', label: 'Inbound Shipments', icon: <Truck className="w-4 h-4" />, tourAttr: 'nav-logistics' }],
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
    label: 'Operations',
    items: [
      { id: 'work', label: 'Tasks & Deadlines', icon: <ListChecks className="w-4 h-4" /> },
      { id: 'calendar', label: 'Calendar', icon: <CalendarDays className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Insights',
    items: [
      { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
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
      { id: 'social', label: MERCENTA_SOCIAL.navLabel, icon: <Target className="w-4 h-4" /> },
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
    items: s.items.map((i) => (navBadges[i.id] ? { ...i, badge: navBadges[i.id] } : i)),
  }));

  if (!brandProfile.onboarded) return <OnboardingWizard />;

  const bc = brandView === 'overview' ? 'Dashboard'
    : brandView === 'onboarding' ? 'Onboarding & Legal'
    : brandView === 'catalog' ? 'Product Catalog'
    : brandView === 'commercial_readiness' ? 'Commercial Readiness'
    : brandView === 'logistics' ? 'Inbound Shipments'
    : brandView === 'compliance' ? 'UK Compliance'
    : brandView === 'purchase_orders' ? 'Purchase Orders'
    : brandView === 'contracts' ? 'Contracts'
    : brandView === 'returns' ? 'Returns'
    : brandView === 'reports' ? 'Reports'
    : brandView === 'team' ? 'Support & Team'
    : brandView === 'cases' ? 'Support & Cases'
    : brandView === 'social' ? MERCENTA_SOCIAL.navLabel
    : brandView === 'market' ? 'Market Intelligence'
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
    >
      <ErrorBoundary sectionLabel="Brand portal">
        <IntegrationsProvider>
          {brandView === 'overview' && <BrandDashboard onNavigate={setBrandView} />}
          {brandView === 'onboarding' && (brandProfile.onboarded ? <OnboardingSummary onNavigate={setBrandView} /> : <OnboardingWizard />)}
          {brandView === 'catalog' && <ProductCatalog />}
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
          {brandView === 'social' && <BrandSocialConnect />}
          {brandView === 'market' && (
            <div className="space-y-4">
              <BrandIntelligence />
              <BrandAdvertising />
              <ListingAnalyzer />
              <SalesEstimatorCard />
            </div>
          )}
          <LiveChatWidget />
          <TourLoader currentView={brandView} isBrandPortal={true} />
          <UsertourBrandBridge />
        </IntegrationsProvider>
      </ErrorBoundary>
    </AppShell>
  );
}