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

    if (surface === 'talent_commerce' && activeViewId === 'campaigns') {
      return (
        <AdsManagerScreen
          vertical="talent_commerce"
          scope="admin"
          allowedBrandIds={filteredBrandIds}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="border-b border-zinc-200 pb-4">
          <div className="text-[11px] font-mono uppercase tracking-[0.06em] text-zinc-500">
            {surfaceCfg.label} · {activeViewId}
          </div>
          <h1 className="mt-1 text-[20px] font-semibold text-zinc-950">
            {activeNavItem?.label ?? activeViewId}
          </h1>
          <p className="mt-1 text-[14px] text-zinc-600">
            Scheduled for Phases 4–6. Navigation structure and RBAC allowlists are active in Phase 1.
          </p>
        </div>

        <EmptyStateBlock
          title={`${activeNavItem?.label ?? activeViewId} is scheduled for Phases 4–6`}
          description={
            surface === 'core_brand'
              ? 'Phases 1–2 implement Purchase Orders, Logistics Hub, and Advertising on this surface.'
              : 'Phases 1–2 implement the unified Ads Manager across Operations Console, BWS Campaign Studio, and Talent Commerce Campaigns.'
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
          <div className="text-[14px] font-semibold tracking-tight text-zinc-950">
            Mercenta Partners
          </div>
          <div className="text-[12px] text-zinc-500">{surfaceCfg.label}</div>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded text-zinc-500 hover:text-zinc-900"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Workspace navigation">
        {groupedItems.map((group) => (
          <div key={group.group} className="space-y-1">
            <div className="px-2 text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
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
                      className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-[14px] text-left transition-colors focus-visible:outline-2 focus-visible:outline-[#C2410C] ${
                        isActive
                          ? 'bg-zinc-950 text-white font-medium'
                          : item.implemented
                            ? 'text-zinc-900 hover:bg-zinc-100 font-medium'
                            : 'text-zinc-500 hover:bg-zinc-100/70'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.implemented && (
                        <span
                          className={`text-[11px] font-mono shrink-0 ${
                            isActive ? 'text-zinc-300' : 'text-[#C2410C]'
                          }`}
                        >
                          Live
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-zinc-200 space-y-2 text-[12px]">
        <div className="px-2 py-1.5 rounded bg-zinc-50 border border-zinc-200">
          <div className="text-[11px] uppercase tracking-[0.06em] text-zinc-500">Session</div>
          <div className="font-medium text-zinc-950 truncate">
            {session ? `${session.role}${session.tenantId ? ` (${session.tenantId})` : ''}` : 'No active session'}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenLegacy}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded border border-zinc-300 bg-white text-[12px] font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Legacy UI
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
          {session && (
            <button
              type="button"
              onClick={signOut}
              className="px-2.5 py-1.5 rounded border border-zinc-200 bg-white text-[12px] text-zinc-600 hover:text-zinc-950"
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
                className="lg:hidden p-2 -ml-2 rounded border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div
                role="tablist"
                aria-label="Operating model surface"
                className="inline-flex flex-wrap items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-0.5"
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
                      className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors whitespace-nowrap ${
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
            <div className="flex flex-wrap items-center gap-2 text-[12px]">
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
                  className="px-2 py-1 rounded border border-zinc-300 bg-white text-zinc-950"
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
                    className="px-2 py-1 rounded border border-zinc-300 bg-white text-zinc-950"
                  >
                    {staff.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.permissionTier === 'full' ? 'Full' : 'View-only'})
                      </option>
                    ))}
                  </select>
                  {!canCurrentUserMutate && (
                    <span className="text-[11px] font-mono text-amber-800">Read-only</span>
                  )}
                </label>
              )}
            </div>

            {/* Zone 3: Preview + Legacy triggers */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenPreview}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-300 bg-white text-[12px] font-medium text-zinc-800 hover:bg-zinc-50"
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
            <div className="flex flex-wrap items-center gap-3 text-[12px]">
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
                  className="px-2 py-1 rounded border border-zinc-300 bg-white text-zinc-950"
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
                  className="px-2 py-1 rounded border border-zinc-300 bg-white text-zinc-950"
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
                  className="px-2 py-1 rounded border border-zinc-300 bg-white text-zinc-950"
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
                  className="px-2 py-1 rounded border border-zinc-300 bg-white text-zinc-950"
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
                className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50/80 px-3 py-2 text-[12px] text-amber-950"
              >
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
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
