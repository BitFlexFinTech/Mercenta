import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  Eye,
  Menu,
  Shield,
  SlidersHorizontal,
  UserCheck,
  X,
} from 'lucide-react';
import { useApp } from '@/context/GlobalStateContext';
import { useBrands } from '@/data/queries';
import { navigateProductView, parseProductPath, recordLinkQuery } from '@/lib/runtime/productRoutes';
import { EmptyStateBlock } from '@/next/components/ConsolePrimitives';
import {
  SURFACE_CONFIGS,
  groupNavItems,
  visibleNavItemsForSurface,
  type OperatingSurfaceId,
} from '@/next/navConfig';
import { AdsManagerScreen } from '@/next/screens/ads/AdsManagerScreen';
import { BrandLogisticsScreen } from '@/next/screens/brand/BrandLogisticsScreen';
import { BrandPurchaseOrdersScreen } from '@/next/screens/brand/BrandPurchaseOrdersScreen';
/* §WAVE 2 (2026-11-25) — the twelve brand screens below were BUILT in the AI
   Studio pass but never mounted: nothing imported them, so the navigation
   advertised views the shell could not render and `validate-dead-code` reported
   them as dead files. They are mounted here, behind the same view-id switch. */
import { BrandAnalyticsScreen } from '@/next/screens/brand/BrandAnalyticsScreen';
import { BrandCatalogScreen } from '@/next/screens/brand/BrandCatalogScreen';
import { BrandCommercialReadinessScreen } from '@/next/screens/brand/BrandCommercialReadinessScreen';
import { BrandComplianceScreen } from '@/next/screens/brand/BrandComplianceScreen';
import { BrandContractsScreen } from '@/next/screens/brand/BrandContractsScreen';
import { BrandDocumentsScreen } from '@/next/screens/brand/BrandDocumentsScreen';
import { BrandInventoryScreen } from '@/next/screens/brand/BrandInventoryScreen';
import { BrandLiftOffScreen } from '@/next/screens/brand/BrandLiftOffScreen';
import { BrandOnboardingScreen } from '@/next/screens/brand/BrandOnboardingScreen';
import { BrandOverviewScreen } from '@/next/screens/brand/BrandOverviewScreen';
import { BrandReportsScreen } from '@/next/screens/brand/BrandReportsScreen';
import { BrandReturnsScreen } from '@/next/screens/brand/BrandReturnsScreen';
import { WorkWorkspaceScreen } from '@/next/screens/shared/WorkWorkspaceScreen';
/* §WAVE 3h (2026-11-25) — the deadline calendar, built on the work layer's own
   derivation. */
import { BrandCalendarScreen } from '@/next/screens/brand/BrandCalendarScreen';
import { BrandSettingsScreen } from '@/next/screens/brand/BrandSettingsScreen';
/* §WAVE 3 (2026-11-25) — the ADMIN operational core. Before this the Operations
   Console rendered placeholders for every view except the Ads Manager. */
import { AdminLogisticsScreen } from '@/next/screens/admin/AdminLogisticsScreen';
import { AdminOverviewScreen } from '@/next/screens/admin/AdminOverviewScreen';
import { AdminPurchaseOrdersScreen } from '@/next/screens/admin/AdminPurchaseOrdersScreen';
/* §WAVE 3b (2026-11-25) — returns tracking and compliance approvals. */
import { AdminComplianceScreen } from '@/next/screens/admin/AdminComplianceScreen';
import { AdminReturnsScreen } from '@/next/screens/admin/AdminReturnsScreen';
/* §WAVE 3c (2026-11-25) — billing, Brand CRM and the contract cycle. */
import { AdminBillingScreen } from '@/next/screens/admin/AdminBillingScreen';
import { AdminContractsScreen } from '@/next/screens/admin/AdminContractsScreen';
import { AdminCrmScreen } from '@/next/screens/admin/AdminCrmScreen';
/* §WAVE 3d (2026-11-25) — catalogue, fulfilment track and marketing. */
import { AdminCatalogScreen } from '@/next/screens/admin/AdminCatalogScreen';
import { AdminFulfillmentScreen } from '@/next/screens/admin/AdminFulfillmentScreen';
import { AdminMarketingScreen } from '@/next/screens/admin/AdminMarketingScreen';
/* §WAVE 3e (2026-11-25) — helpdesk and the audit log. */
import { AdminAuditScreen } from '@/next/screens/admin/AdminAuditScreen';
import { AdminHelpdeskScreen } from '@/next/screens/admin/AdminHelpdeskScreen';
/* §WAVE 3f (2026-11-25) — messages and monitoring. */
import { AdminMessagesScreen } from '@/next/screens/admin/AdminMessagesScreen';
/* §WAVE 3i (2026-11-25) — the founder's Control Centre, on its canonical model. */
import { AdminControlCentreScreen } from '@/next/screens/admin/AdminControlCentreScreen';
import { AdminMonitoringScreen } from '@/next/screens/admin/AdminMonitoringScreen';
/* §WAVE 3g (2026-11-25) — ONE vertical-scoped portfolio screen serves all three
   operating models. */
import { VerticalPortfolioScreen } from '@/next/screens/vertical/VerticalPortfolioScreen';
import '../next.css';

export interface NextShellProps {
  onOpenLegacy: () => void;
  onOpenPreview: () => void;
}

type VerticalFilterValue = 'all' | 'core' | 'bws' | 'talent_commerce';

export function NextShell({ onOpenLegacy, onOpenPreview }: NextShellProps) {
  const {
    session,
    role,
    signIn,
    activateDemoBrand,
    signOut,
    staff,
    actingStaffId,
    setActingStaffId,
    canCurrentUserMutate,
  } = useApp();
  const brandsQ = useBrands();
  const brands = brandsQ.data?.data ?? [];

  const [surface, setSurface] = useState<OperatingSurfaceId>(() => {
    if (typeof window !== 'undefined') {
      const parsed = parseProductPath(window.location.pathname);
      if (parsed?.environment === 'admin') return 'core_admin';
      if (parsed?.environment === 'brand') return 'core_brand';
    }
    if (session?.tier === 'admin_staff' || session?.tier === 'super_admin') {
      return 'core_admin';
    }
    return 'core_brand';
  });

  const [viewBySurface, setViewBySurface] = useState<Record<OperatingSurfaceId, string>>(() => {
    const initial: Record<OperatingSurfaceId, string> = {
      core_brand: SURFACE_CONFIGS.core_brand.defaultViewId,
      core_admin: SURFACE_CONFIGS.core_admin.defaultViewId,
      bws: SURFACE_CONFIGS.bws.defaultViewId,
      talent_commerce: SURFACE_CONFIGS.talent_commerce.defaultViewId,
    };
    if (typeof window !== 'undefined') {
      const parsed = parseProductPath(window.location.pathname);
      if (parsed?.view) {
        if (parsed.environment === 'brand') initial.core_brand = parsed.view;
        if (parsed.environment === 'admin') initial.core_admin = parsed.view;
      }
    }
    return initial;
  });

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  /* §WAVE 2 (2026-11-25) — ONE navigation helper for the brand surface, so a
     screen that sends the user elsewhere keeps shell state and the canonical
     URL in step (the pattern `purchase_orders -> logistics` already used). */
  const goToBrandView = (viewId: string, query: Record<string, string> = {}) => {
    setViewBySurface((prev) => ({ ...prev, core_brand: viewId }));
    navigateProductView('brand', viewId, query);
  };

  /* §WAVE 3 (2026-11-25) — the same helper for the admin surface, plus the brand
     the admin drilled into, so "open this brand's orders" is a real jump. */
  const [adminPoBrandId, setAdminPoBrandId] = useState<string | null>(null);
  const goToAdminView = (viewId: string, query: Record<string, string> = {}) => {
    setViewBySurface((prev) => ({ ...prev, core_admin: viewId }));
    navigateProductView('admin', viewId, query);
  };

  // Super-Admin portfolio filters (applied cleanly against fields present on DemoBrandRow)
  const [verticalFilter, setVerticalFilter] = useState<VerticalFilterValue>('all');
  const [nationFilter, setNationFilter] = useState('all');
  const [trackFilter, setTrackFilter] = useState('all');
  const [contractFilter, setContractFilter] = useState('all');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => {
      const parsed = parseProductPath(window.location.pathname);
      if (!parsed) return;
      if (parsed.environment === 'brand') {
        setSurface('core_brand');
        if (parsed.view) setViewBySurface((prev) => ({ ...prev, core_brand: parsed.view! }));
      } else if (parsed.environment === 'admin') {
        setSurface((prev) => (prev === 'core_brand' ? 'core_admin' : prev));
        if (parsed.view) setViewBySurface((prev) => ({ ...prev, core_admin: parsed.view! }));
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const visibleItems = useMemo(
    () => visibleNavItemsForSurface(surface, session?.tier ?? null),
    [surface, session?.tier]
  );

  const groupedItems = useMemo(() => groupNavItems(visibleItems), [visibleItems]);

  const activeViewId = useMemo(() => {
    const candidate = viewBySurface[surface];
    if (visibleItems.some((item) => item.id === candidate)) return candidate;
    return visibleItems[0]?.id ?? SURFACE_CONFIGS[surface].defaultViewId;
  }, [surface, viewBySurface, visibleItems]);

  const activeNavItem = useMemo(
    () => visibleItems.find((i) => i.id === activeViewId) ?? null,
    [visibleItems, activeViewId]
  );

  const nations = useMemo(
    () =>
      Array.from(new Set(brands.map((b) => b.nation).filter((n): n is string => Boolean(n)))).sort(),
    [brands]
  );

  const contractStatuses = useMemo(
    () =>
      Array.from(
        new Set(brands.map((b) => b.contractStatus).filter((s): s is string => Boolean(s)))
      ).sort(),
    [brands]
  );

  /**
   * Honest Super-Admin brand filtering:
   * - Filters on `nation`, `track`, and `contractStatus` present on DemoBrandRow.
   * - When `verticalFilter !== 'all'`, never guesses `vertical` from `category` because `Brand.vertical`
   *   does not exist on `src/types.ts` / `DemoBrandRow` yet. Returns an empty set so the UI states the gap.
   */
  const filteredBrandIds = useMemo<Set<string> | null>(() => {
    if (
      verticalFilter === 'all' &&
      nationFilter === 'all' &&
      trackFilter === 'all' &&
      contractFilter === 'all'
    ) {
      return null;
    }
    if (verticalFilter !== 'all') {
      return new Set<string>();
    }
    const matching = brands.filter((b) => {
      if (nationFilter !== 'all' && b.nation !== nationFilter) return false;
      if (trackFilter !== 'all' && b.track !== trackFilter) return false;
      if (contractFilter !== 'all' && b.contractStatus !== contractFilter) return false;
      return true;
    });
    return new Set(matching.map((b) => b.id));
  }, [brands, verticalFilter, nationFilter, trackFilter, contractFilter]);

  function selectSurface(nextSurface: OperatingSurfaceId) {
    setSurface(nextSurface);
    setMobileNavOpen(false);
    const nextCfg = SURFACE_CONFIGS[nextSurface];
    const targetView = viewBySurface[nextSurface] || nextCfg.defaultViewId;
    if (nextSurface === 'core_brand') {
      if (session?.tier !== 'brand' && session?.tier !== 'super_admin') {
        activateDemoBrand(brands[0]?.id ?? 'astonish');
      }
      navigateProductView('brand', targetView);
    } else {
      if (!session || session.tier === 'brand') {
        signIn('admin', 'Super Admin');
      }
      if (nextSurface === 'core_admin') {
        navigateProductView('admin', targetView);
      }
    }
  }

  function selectNavItem(viewId: string) {
    setViewBySurface((prev) => ({ ...prev, [surface]: viewId }));
    setMobileNavOpen(false);
    if (surface === 'core_brand') {
      navigateProductView('brand', viewId);
    } else if (surface === 'core_admin') {
      navigateProductView('admin', viewId);
    }
  }

  const surfaceCfg = SURFACE_CONFIGS[surface];
  const showSuperAdminFilterBar =
    surface !== 'core_brand' && (session?.tier === 'super_admin' || session?.tier === 'admin_staff' || !session);

  function renderMainContent() {
    if (surface === 'core_brand') {
      if (activeViewId === 'purchase_orders') {
        return (
          <BrandPurchaseOrdersScreen
            onOpenLogistics={(poNumber) => {
              setViewBySurface((prev) => ({ ...prev, core_brand: 'logistics' }));
              navigateProductView('brand', 'logistics', recordLinkQuery('po', poNumber));
            }}
          />
        );
      }
      if (activeViewId === 'logistics') {
        return <BrandLogisticsScreen />;
      }
      if (activeViewId === 'ads_management') {
        return <AdsManagerScreen vertical="core" scope="brand" />;
      }
      /* §WAVE 2 (2026-11-25) — the remaining brand views are MOUNTED. */
      if (activeViewId === 'overview') {
        return (
          <BrandOverviewScreen
            onNavigate={(viewId, poNumber) =>
              goToBrandView(viewId, poNumber ? recordLinkQuery('po', poNumber) : {})
            }
          />
        );
      }
      if (activeViewId === 'returns') {
        return (
          <BrandReturnsScreen
            onOpenPo={(poNumber) => goToBrandView('purchase_orders', recordLinkQuery('po', poNumber))}
            onOpenDeductions={() => goToBrandView('analytics')}
          />
        );
      }
      if (activeViewId === 'work') {
        return <WorkWorkspaceScreen scope="brand" onNavigate={(viewId) => goToBrandView(viewId)} />;
      }
      if (activeViewId === 'catalog') {
        return <BrandCatalogScreen />;
      }
      if (activeViewId === 'inventory') {
        return <BrandInventoryScreen />;
      }
      if (activeViewId === 'commercial_readiness') {
        return <BrandCommercialReadinessScreen />;
      }
      if (activeViewId === 'lift_off') {
        return <BrandLiftOffScreen onOpenCases={() => goToBrandView('cases')} />;
      }
      if (activeViewId === 'onboarding') {
        return <BrandOnboardingScreen onNavigateSettings={() => goToBrandView('settings')} />;
      }
      if (activeViewId === 'compliance') {
        return <BrandComplianceScreen />;
      }
      if (activeViewId === 'contracts') {
        return <BrandContractsScreen />;
      }
      if (activeViewId === 'analytics') {
        return <BrandAnalyticsScreen />;
      }
      if (activeViewId === 'reports') {
        return <BrandReportsScreen />;
      }
      if (activeViewId === 'documents') {
        return <BrandDocumentsScreen />;
      }
      /* §WAVE 3h — the deadline calendar the work layer derives. */
      if (activeViewId === 'calendar') {
        return <BrandCalendarScreen />;
      }
      /* §WAVE 3h — settings: the brand's own record, and the change requests it owns. */
      if (activeViewId === 'settings') {
        return <BrandSettingsScreen />;
      }
    }

    if (surface === 'core_admin') {
      if (activeViewId === 'overview') {
        return (
          <AdminOverviewScreen
            onOpenPurchaseOrders={(brandId) => {
              setAdminPoBrandId(brandId ?? null);
              goToAdminView('purchase_orders_admin');
            }}
            onOpenLogistics={() => goToAdminView('logistics')}
          />
        );
      }
      if (activeViewId === 'purchase_orders_admin') {
        return (
          <AdminPurchaseOrdersScreen
            key={adminPoBrandId ?? 'all-brands'}
            initialBrandId={adminPoBrandId}
          />
        );
      }
      if (activeViewId === 'logistics') {
        return <AdminLogisticsScreen />;
      }
      if (activeViewId === 'returns_tracking') {
        return <AdminReturnsScreen />;
      }
      if (activeViewId === 'compliance') {
        return <AdminComplianceScreen />;
      }
      /* §WAVE 3c — the finance, relationship and legal views. */
      if (activeViewId === 'billing') {
        return <AdminBillingScreen />;
      }
      if (activeViewId === 'crm') {
        return <AdminCrmScreen />;
      }
      if (activeViewId === 'contracts_admin') {
        return <AdminContractsScreen />;
      }
      /* §WAVE 3d — catalogue, fulfilment and marketing. */
      if (activeViewId === 'catalog') {
        return <AdminCatalogScreen />;
      }
      if (activeViewId === 'fulfillment_track') {
        return <AdminFulfillmentScreen />;
      }
      if (activeViewId === 'marketing') {
        return <AdminMarketingScreen />;
      }
      /* §WAVE 3e — helpdesk triage and the audit trail. `audit_log` is a
         SUPER-ADMIN view by design; `visibleNavItemsForSurface` keeps it out of an
         admin_staff menu, so this branch is reached only by a super_admin session. */
      if (activeViewId === 'helpdesk') {
        return <AdminHelpdeskScreen />;
      }
      if (activeViewId === 'audit_log') {
        return <AdminAuditScreen />;
      }
      /* §WAVE 3f — the message log and the honest readiness view. */
      if (activeViewId === 'messages') {
        return <AdminMessagesScreen />;
      }
      if (activeViewId === 'monitoring') {
        return <AdminMonitoringScreen />;
      }
      /* §WAVE 3i — the Control Centre: the ten capability areas the founder's own
         model already derives, each metric drilling into its existing destination. */
      if (activeViewId === 'control_centre') {
        return <AdminControlCentreScreen onNavigate={(viewId) => goToAdminView(viewId)} />;
      }
      /* §WAVE 3b — the shared work workspace already exists for brands; the admin
         surface mounts the SAME component with `scope="admin"`, so admin tasks and
         brand tasks are one work layer, not two. */
      if (activeViewId === 'work') {
        return (
          <WorkWorkspaceScreen scope="admin" onNavigate={(viewId) => goToAdminView(viewId)} />
        );
      }
    }

    if (
      surface === 'core_admin' &&
      (activeViewId === 'ads_management' || activeViewId === 'amazon_ads')
    ) {
      return (
        <AdsManagerScreen
          vertical="core"
          scope="admin"
          allowedBrandIds={filteredBrandIds}
        />
      );
    }

    if (surface === 'bws' && activeViewId === 'campaign-studio') {
      return (
        <AdsManagerScreen
          vertical="bws"
          scope="admin"
          allowedBrandIds={filteredBrandIds}
        />
      );
    }

    /* §WAVE 3g — BWS declares 22 views and holds ONE real screen. The two that the
       canonical domain can actually support today are scoped to the BWS vertical
       (`src/config/verticals.ts`), so they show BWS's own brands — none are onboarded
       yet, and the screen says exactly that rather than showing core brands under a
       BWS heading. */
    if (surface === 'bws') {
      if (activeViewId === 'overview' || activeViewId === 'brand-portfolio') {
        return <VerticalPortfolioScreen vertical="bws" />;
      }
    }

    if (surface === 'talent_commerce' && activeViewId === 'campaigns') {
      return (
        <AdsManagerScreen
          vertical="talent_commerce"
          scope="admin"
          allowedBrandIds={filteredBrandIds}
        />
      );
    }

    /* §WAVE 3g — the same for Talent Commerce: the vertical-scoped portfolio, with
       its own honest empty state. */
    if (surface === 'talent_commerce') {
      if (activeViewId === 'overview' || activeViewId === 'brands') {
        return <VerticalPortfolioScreen vertical="talent_commerce" />;
      }
    }

    return (
      <div className="space-y-6">
        <div className="border-b border-zinc-200 pb-4">
          <div className="text-ds-micro font-mono uppercase tracking-[0.06em] text-zinc-500">
            {surfaceCfg.label} · {activeViewId}
          </div>
          <h1 className="mt-1 text-ds-page font-semibold text-zinc-950">
            {activeNavItem?.label ?? activeViewId}
          </h1>
          <p className="mt-1 text-ds-body text-zinc-600">
            Scheduled for Phases 4–6. Navigation structure and RBAC allowlists are active in Phase 1.
          </p>
        </div>

        <EmptyStateBlock
          title={`${activeNavItem?.label ?? activeViewId} is not available yet`}
          description={
            surface === 'core_brand'
              ? 'This view is not part of the current release. Everything else in the Partner Portal is available from the menu.'
              : 'This view is not part of the current release. The Ads Manager is available from the menu.'
          }
          actionLabel={
            surface === 'core_brand'
              ? 'Open Purchase Orders'
              : `Open ${SURFACE_CONFIGS[surface].defaultViewId === 'ads_management' ? 'Ads Manager' : 'Campaigns'}`
          }
          onAction={() => selectNavItem(SURFACE_CONFIGS[surface].defaultViewId)}
        />
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-zinc-200 flex items-center justify-between">
        <div>
          <div className="text-ds-body font-semibold tracking-tight text-zinc-950">
            Mercenta Partners
          </div>
          <div className="text-ds-label text-zinc-500">{surfaceCfg.label}</div>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-ds-sm text-zinc-500 hover:text-zinc-900"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Workspace navigation">
        {groupedItems.map((group) => (
          <div key={group.group} className="space-y-1">
            <div className="px-2 text-ds-micro font-medium uppercase tracking-[0.06em] text-zinc-500">
              {group.group}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.id === activeViewId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => selectNavItem(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-ds-sm text-ds-body text-left transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                        isActive
                          ? 'bg-zinc-950 text-white font-medium'
                          : item.implemented
                            ? 'text-zinc-900 hover:bg-zinc-100 font-medium'
                            : 'text-zinc-500 hover:bg-zinc-100/70'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      {/* §WAVE 2 FIX (2026-11-25) — this badge rendered "Live"
                          from `item.implemented`, which only means "the screen
                          exists". It falsely claimed live data on sixteen nav
                          items, against the platform rule that simulated data is
                          never presented as live. Availability is conveyed by the
                          item's contrast and by an honest empty state instead. */}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-zinc-200 space-y-2 text-ds-label">
        <div className="px-2 py-1.5 rounded-ds-sm bg-zinc-50 border border-zinc-200">
          <div className="text-ds-micro uppercase tracking-[0.06em] text-zinc-500">Session</div>
          <div className="font-medium text-zinc-950 truncate">
            {session ? `${session.role}${session.tenantId ? ` (${session.tenantId})` : ''}` : 'No active session'}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenLegacy}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-ds-sm border border-zinc-300 bg-white text-ds-label font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Legacy UI
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          {session && (
            <button
              type="button"
              onClick={signOut}
              className="px-2.5 py-1.5 rounded-ds-sm border border-zinc-200 bg-white text-ds-label text-zinc-600 hover:text-zinc-950"
            >
              Sign out
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mercenta-next min-h-screen flex bg-[#FAFAFA] text-[#09090B]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0 border-r border-zinc-200 bg-white">
        {sidebarContent}
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-zinc-950/30"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] h-full bg-white border-r border-zinc-200 flex flex-col">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Unified Top Bar (3 concise zones) */}
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white px-4 sm:px-6 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Zone 1: Mobile trigger + Surface Switcher */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden p-2 -ml-2 rounded-ds-sm border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div
                role="tablist"
                aria-label="Operating model surface"
                className="inline-flex flex-wrap items-center gap-1 rounded-ds-md border border-zinc-200 bg-zinc-50 p-0.5"
              >
                {(
                  ['core_brand', 'core_admin', 'bws', 'talent_commerce'] as OperatingSurfaceId[]
                ).map((sId) => {
                  const cfg = SURFACE_CONFIGS[sId];
                  const active = surface === sId;
                  return (
                    <button
                      key={sId}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => selectSurface(sId)}
                      className={`px-2.5 py-1 rounded-ds-sm text-ds-label font-medium transition-colors whitespace-nowrap ${
                        active
                          ? 'bg-white text-zinc-950 shadow-xs border border-zinc-200'
                          : 'text-zinc-600 hover:text-zinc-950'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Zone 2: Demo Actor / Brand Switcher */}
            <div className="flex flex-wrap items-center gap-2 text-ds-label">
              <label className="inline-flex items-center gap-1.5 text-zinc-600">
                <UserCheck className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
                <span className="hidden sm:inline">Demo actor</span>
                <select
                  aria-label="Switch demo role or brand"
                  value={
                    session?.tier === 'brand'
                      ? `brand:${session.tenantId ?? 'astonish'}`
                      : role === 'Super Admin'
                        ? 'admin:Super Admin'
                        : role === 'Mercenta Admin'
                          ? 'admin:Mercenta Admin'
                          : 'none'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith('brand:')) {
                      const bId = val.slice(6);
                      activateDemoBrand(bId);
                      setSurface('core_brand');
                    } else if (val === 'admin:Super Admin') {
                      signIn('admin', 'Super Admin');
                      if (surface === 'core_brand') setSurface('core_admin');
                    } else if (val === 'admin:Mercenta Admin') {
                      signIn('admin', 'Mercenta Admin');
                      if (surface === 'core_brand') setSurface('core_admin');
                    }
                  }}
                  className="px-2 py-1 rounded-ds-sm border border-zinc-300 bg-white text-zinc-950"
                >
                  {!session && <option value="none">Select session…</option>}
                  <optgroup label="Partner Brand Accounts">
                    {brands.slice(0, 6).map((b) => (
                      <option key={b.id} value={`brand:${b.id}`}>
                        Brand: {b.profile.businessName}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Mercenta Staff">
                    <option value="admin:Mercenta Admin">Mercenta Admin</option>
                    <option value="admin:Super Admin">Super Admin</option>
                  </optgroup>
                </select>
              </label>

              {surface !== 'core_brand' && staff.length > 0 && (
                <label className="inline-flex items-center gap-1.5 text-zinc-600">
                  <Shield className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
                  <select
                    aria-label="Acting staff member"
                    value={actingStaffId}
                    onChange={(e) => setActingStaffId(e.target.value)}
                    className="px-2 py-1 rounded-ds-sm border border-zinc-300 bg-white text-zinc-950"
                  >
                    {staff.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.permissionTier === 'full' ? 'Full' : 'View-only'})
                      </option>
                    ))}
                  </select>
                  {!canCurrentUserMutate && (
                    <span className="text-ds-micro font-mono text-state-warning">Read-only</span>
                  )}
                </label>
              )}
            </div>

            {/* Zone 3: Preview + Legacy triggers */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenPreview}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-ds-sm border border-zinc-300 bg-white text-ds-label font-medium text-zinc-800 hover:bg-zinc-50"
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                Preview Harness
              </button>
            </div>
          </div>
        </header>

        {/* Super-Admin Portfolio Filter Strip */}
        {showSuperAdminFilterBar && (
          <div className="border-b border-zinc-200 bg-zinc-50/70 px-4 sm:px-6 py-2.5 space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-ds-label">
              <span className="inline-flex items-center gap-1.5 font-medium text-zinc-700">
                <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
                Portfolio scope
              </span>

              <label className="inline-flex items-center gap-1.5 text-zinc-600">
                Vertical
                <select
                  aria-label="Filter portfolio by vertical"
                  value={verticalFilter}
                  onChange={(e) => setVerticalFilter(e.target.value as VerticalFilterValue)}
                  className="px-2 py-1 rounded-ds-sm border border-zinc-300 bg-white text-zinc-950"
                >
                  <option value="all">All verticals</option>
                  <option value="core">Core</option>
                  <option value="bws">BWS (Alcohol)</option>
                  <option value="talent_commerce">Talent Commerce</option>
                </select>
              </label>

              <label className="inline-flex items-center gap-1.5 text-zinc-600">
                Region
                <select
                  aria-label="Filter portfolio by nation"
                  value={nationFilter}
                  onChange={(e) => setNationFilter(e.target.value)}
                  className="px-2 py-1 rounded-ds-sm border border-zinc-300 bg-white text-zinc-950"
                >
                  <option value="all">All nations</option>
                  {nations.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              <label className="inline-flex items-center gap-1.5 text-zinc-600">
                Track
                <select
                  aria-label="Filter portfolio by fulfillment track"
                  value={trackFilter}
                  onChange={(e) => setTrackFilter(e.target.value)}
                  className="px-2 py-1 rounded-ds-sm border border-zinc-300 bg-white text-zinc-950"
                >
                  <option value="all">All tracks</option>
                  <option value="financed">Financed</option>
                  <option value="direct">Direct</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </label>

              <label className="inline-flex items-center gap-1.5 text-zinc-600">
                Contract
                <select
                  aria-label="Filter portfolio by contract status"
                  value={contractFilter}
                  onChange={(e) => setContractFilter(e.target.value)}
                  className="px-2 py-1 rounded-ds-sm border border-zinc-300 bg-white text-zinc-950"
                >
                  <option value="all">All statuses</option>
                  {contractStatuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <span className="ml-auto inline-flex items-center gap-1 text-zinc-600 font-mono">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                {filteredBrandIds ? filteredBrandIds.size : brands.length} / {brands.length} brands
              </span>
            </div>

            {verticalFilter !== 'all' && (
              <div
                role="status"
                className="flex items-start gap-2 rounded-ds-sm border border-state-warning/20 bg-state-warning/10 px-3 py-2 text-ds-label text-state-warning"
              >
                <AlertCircle className="w-4 h-4 text-state-warning shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Vertical filter unavailable (`Brand.vertical` missing):</strong>{' '}
                  <code>src/types.ts</code> / <code>DemoBrandRow</code> does not define a{' '}
                  <code>vertical</code> field yet, so filtering to &ldquo;{verticalFilter}&rdquo; returns 0
                  records rather than inferring vertical from product category. Select &ldquo;All
                  verticals&rdquo; to inspect records.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Main Workspace Container */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-[1440px] w-full mx-auto">
          {renderMainContent()}
        </main>
      </div>
    </div>
  );
}
