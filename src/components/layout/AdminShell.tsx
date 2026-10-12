/**
 * AdminShell — admin portal environment. Lazy-loaded from App.tsx.
 * Only loaded when environment === 'admin'.
 */
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { AppShell } from '@/components/layout/AppShell';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { LoadingState } from '@/components/ui';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { IntegrationsProvider } from '@/integrations/IntegrationsContext';
import { currentPathname, pushProductPath, resolveProductView } from '@/lib/runtime/productRoutes';
/*
  §ADMIN-SHELL-CHUNK (2026-10-05) — the admin portal's view panels are LAZY.

  WHY. `discovered-adminshell-chunk-size` measured the single `AdminShell-*.js`
  chunk at 909 kB (230 kB gzip): the shell imported all ~34 panels EAGERLY, so
  every operator downloaded every panel to open any one of them, and `vite build`
  warned that a chunk exceeded 500 kB. Each panel is now reached by a dynamic
  import (`React.lazy`) and rendered inside the `<Suspense>` in the view switch
  below, so the shell ships small and a panel's chunk loads only when its view is
  opened. This is APP-code splitting only — `node_modules` still lands in the ONE
  `vendor` chunk required by the §P3 initialisation-cycle fix (asserted by
  `scripts/validate-admin-shell-bundle.mjs` and `validate-production-boot.mjs`).

  §P9 (programme decision 4) — `import { CarrierIntegrationMonitor } from
  '@/components/admin/CarrierMonitor'` is REMOVED: the admin "Carrier Monitor"
  destination (matrix D04-18 / D10-13) is gone. Provider/connection health is
  owned by the canonical Integrations surface (`IntegrationsPanel`), which reads
  the provider-mode registry rather than a second, hand-written health feed.
*/
const AdminDashboard = lazy(() => import('@/components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const LogisticsControl = lazy(() => import('@/components/admin/LogisticsControl').then((m) => ({ default: m.LogisticsControl })));
const BrandCRM = lazy(() => import('@/components/admin/BrandCRM').then((m) => ({ default: m.BrandCRM })));
const CatalogManagerAdmin = lazy(() => import('@/components/admin/CatalogManagerAdmin').then((m) => ({ default: m.CatalogManagerAdmin })));
const ComplianceApprovals = lazy(() => import('@/components/admin/ComplianceApprovals').then((m) => ({ default: m.ComplianceApprovals })));
const MarketingHub = lazy(() => import('@/components/admin/MarketingHub').then((m) => ({ default: m.MarketingHub })));
const IntegrationsPanel = lazy(() => import('@/components/admin/integrations/IntegrationsPanel').then((m) => ({ default: m.IntegrationsPanel })));
const UsertourAdminPanel = lazy(() => import('@/components/admin/UsertourAdminPanel').then((m) => ({ default: m.UsertourAdminPanel })));
const FulfillmentTrackPanel = lazy(() => import('@/components/admin/FulfillmentTrack').then((m) => ({ default: m.FulfillmentTrackPanel })));
const RetailPipelinePanel = lazy(() => import('@/components/admin/RetailPipeline').then((m) => ({ default: m.RetailPipelinePanel })));
const BillingPanel = lazy(() => import('@/components/admin/BillingPanel').then((m) => ({ default: m.BillingPanel })));
const ContractsAdminPanel = lazy(() => import('@/components/admin/ContractsAdminPanel').then((m) => ({ default: m.ContractsAdminPanel })));
const MessagesHub = lazy(() => import('@/components/admin/MessagesHub').then((m) => ({ default: m.MessagesHub })));
const HelpdeskDashboard = lazy(() => import('@/components/admin/HelpdeskDashboard').then((m) => ({ default: m.HelpdeskDashboard })));
const ReturnsTrackingDashboard = lazy(() => import('@/components/admin/ReturnsTrackingDashboard').then((m) => ({ default: m.ReturnsTrackingDashboard })));
const MonitoringDashboard = lazy(() => import('@/components/admin/MonitoringDashboard').then((m) => ({ default: m.MonitoringDashboard })));
const AdminPurchaseOrderList = lazy(() => import('@/components/admin/AdminPurchaseOrderList').then((m) => ({ default: m.AdminPurchaseOrderList })));
const SuperAdminPanel = lazy(() => import('@/components/admin/SuperAdminPanel').then((m) => ({ default: m.SuperAdminPanel })));
const AdminAuditLog = lazy(() => import('@/components/admin/AdminAuditLog').then((m) => ({ default: m.AdminAuditLog })));
const BrandIntelligencePanel = lazy(() => import('@/components/admin/BrandIntelligencePanel').then((m) => ({ default: m.BrandIntelligencePanel })));
const BrandIntelligenceStrategyPanel = lazy(() => import('@/components/admin/BrandIntelligenceStrategyPanel').then((m) => ({ default: m.BrandIntelligenceStrategyPanel })));
const OpportunityDiscoveryPanel = lazy(() => import('@/components/admin/OpportunityDiscoveryPanel').then((m) => ({ default: m.OpportunityDiscoveryPanel })));
const ProductDiscoveryPanel = lazy(() => import('@/components/admin/ProductDiscoveryPanel').then((m) => ({ default: m.ProductDiscoveryPanel })));
const RegionalPriorityPanel = lazy(() => import('@/components/admin/RegionalPriorityPanel').then((m) => ({ default: m.RegionalPriorityPanel })));
const AmazonAdsDashboard = lazy(() => import('@/components/admin/AmazonAdsDashboard').then((m) => ({ default: m.AmazonAdsDashboard })));
const FounderControlCentre = lazy(() => import('@/components/admin/FounderControlCentre').then((m) => ({ default: m.FounderControlCentre })));
const FounderInvestorCentre = lazy(() => import('@/components/admin/FounderInvestorCentre').then((m) => ({ default: m.FounderInvestorCentre })));
const PartnershipsCentre = lazy(() => import('@/components/admin/PartnershipsCentre').then((m) => ({ default: m.PartnershipsCentre })));
const OnboardingPipeline = lazy(() => import('@/components/admin/OnboardingPipeline').then((m) => ({ default: m.OnboardingPipeline })));
const AdminWorkManagement = lazy(() => import('@/components/admin/WorkManagement').then((m) => ({ default: m.AdminWorkManagement })));
const AdminWorkCalendar = lazy(() => import('@/components/admin/WorkManagement').then((m) => ({ default: m.AdminWorkCalendar })));
import { NAV_BADGE_LABELS, useAdminNavBadges } from '@/lib/nav/navBadges';
import { usePurchaseOrders } from '@/data/queries';
import type { CommandGroup } from '@/components/shared/CommandPalette';
import type { AdminDepartment } from '@/types';
import {
  LayoutDashboard, Users, Gauge, Boxes, Package, Truck,
  ShieldCheck, CreditCard, FileText, Inbox, LifeBuoy, RotateCcw,
  Activity, Target, Crown, ScrollText, PlugZap, MessageSquare,
  ClipboardList, Handshake, Megaphone, ListChecks, CalendarDays,
} from 'lucide-react';

const ADMIN_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
      /*
        §Founder OS — the Founder/Super Admin operating centre. Super-Admin only:
        hidden from the nav for every other tier here AND guarded again at render.
      */
      { id: 'control_centre', label: 'Control Centre', icon: <Gauge className="w-4 h-4" /> },
      /* §BATCH 4 (2026-10-10) — REMOVED: the 'brain' nav item ('Mercenta Brain').
         The owner instructed the Mercenta Brain's complete removal (it serves no
         purpose). Its absence is guarded by `scripts/validate-mercenta-brain.mjs`
         (rewritten into an ABSENCE guard, rule 08). */
    ],
  },
  {
    /**
     * §Dashboard-cleanup P1 — OPERATIONS IS THE ACTION CENTRE.
     * Every queue an operator acts on sits here: the work layer, purchase-order
     * processing, consignments and their documents, returns and the operational
     * calendar. Observe-only surfaces live in Overview; commercial pipelines live
     * in Commerce.
     * §P9 repoint: the old contract also declared "carrier/provider state" here
     * as the `Carrier Monitor` destination — removed with the carrier surface.
     */
    label: 'Operations',
    items: [
      { id: 'work', label: 'Work Management', icon: <ListChecks className="w-4 h-4" /> },
      { id: 'purchase_orders_admin', label: 'Purchase Orders', icon: <Package className="w-4 h-4" /> },
      { id: 'logistics', label: 'Logistics Hub', icon: <Truck className="w-4 h-4" /> },
      { id: 'returns_tracking', label: 'Returns Tracking', icon: <RotateCcw className="w-4 h-4" /> },
      { id: 'calendar', label: 'Calendar', icon: <CalendarDays className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Brands',
    items: [
      { id: 'crm', label: 'Brand CRM', icon: <Users className="w-4 h-4" /> },
      { id: 'onboarding_pipeline', label: 'Onboarding', icon: <ClipboardList className="w-4 h-4" /> },
      { id: 'marketing', label: 'Marketing', icon: <Target className="w-4 h-4" /> },
      { id: 'amazon_ads', label: 'Ad Spend', icon: <Megaphone className="w-4 h-4" /> },
      { id: 'brand_intelligence', label: 'Brand Intelligence', icon: <Target className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Catalogue',
    items: [{ id: 'catalog', label: 'Global Catalog', icon: <Boxes className="w-4 h-4" /> }],
  },
  {
    label: 'Commerce',
    items: [
      { id: 'fulfillment_track', label: 'Fulfillment Track', icon: <Gauge className="w-4 h-4" /> },
      { id: 'retail_pipeline', label: 'Retail Pipeline', icon: <Boxes className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
      { id: 'contracts_admin', label: 'Contract Cycle', icon: <FileText className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Compliance',
    items: [{ id: 'compliance', label: 'Compliance Approvals', icon: <ShieldCheck className="w-4 h-4" /> }],
  },
  {
    label: 'Communications',
    items: [{ id: 'messages', label: 'Messages', icon: <Inbox className="w-4 h-4" /> }],
  },
  {
    label: 'Support',
    items: [{ id: 'helpdesk', label: 'Helpdesk', icon: <LifeBuoy className="w-4 h-4" /> }],
  },
  {
    label: 'Monitoring',
    items: [{ id: 'monitoring', label: 'Monitoring', icon: <Activity className="w-4 h-4" /> }],
  },
  {
    label: 'Administration',
    items: [
      { id: 'super_admin', label: 'Super Admin', icon: <Crown className="w-4 h-4" /> },
      { id: 'audit_log', label: 'Audit Log', icon: <ScrollText className="w-4 h-4" /> },
      { id: 'usertour', label: 'Onboarding Tours', icon: <MessageSquare className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { id: 'integrations', label: 'Integration Settings', icon: <PlugZap className="w-4 h-4" /> },
    ],
  },
  {
    // §21/M12 — PRIVATE founder-only surfaces. Hidden from every non-Super-Admin
    // tier here AND guarded again at render time (defense in depth).
    label: 'Founder (private)',
    items: [
      { id: 'founder_centre', label: 'Founder Investor Centre', icon: <Crown className="w-4 h-4" /> },
      { id: 'partnerships', label: 'Partnerships & Fundraising', icon: <Handshake className="w-4 h-4" /> },
    ],
  },
];

/**
 * §RUNTIME PARITY — every view the admin shell can actually render, derived from
 * the SAME nav declarations the rail renders. A URL segment outside this set
 * resolves to the declared default view instead of rendering an empty workspace.
 */
const ADMIN_VIEW_IDS: readonly string[] = ADMIN_SECTIONS.flatMap((s) =>
  s.items.map((i) => i.id)
);

export default function AdminShell() {
  const { role, actingStaff } = useApp();
  /**
   * §RUNTIME PARITY (R1) — the active admin view IS the address
   * (`/admin/overview`, `/admin/logistics`, …). Initialised from the URL, written
   * back on every navigation, and re-read on Back/Forward. No second store.
   * An address naming a view this shell cannot render resolves to the declared
   * default view instead of rendering an empty workspace.
   * §BATCH 4 (2026-10-10) — `brain` was such a view until the Mercenta Brain was
   * removed; its address now resolves to the default view here.
   */
  const [adminView, setAdminViewState] = useState(() =>
    resolveProductView('admin', currentPathname(), ADMIN_VIEW_IDS)
  );
  const setAdminView = useCallback((v: string) => {
    setAdminViewState(v);
    pushProductPath('admin', v);
  }, []);

  useEffect(() => {
    function onPopState() {
      setAdminViewState(resolveProductView('admin', currentPathname(), ADMIN_VIEW_IDS));
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  /**
   * §UI/UX Wave 2 — navigation attention counts + real records for the command
   * palette, both derived from canonical admin-scoped stores (see
   * src/lib/nav/navBadges.ts for the tenant-isolation note: AdminShell only ever
   * renders in the admin environment, where full-portfolio access is by design).
   */
  const isSuper = role === 'Super Admin';
  /**
   * §P3 — the Work Management badge counts the SAME item set the list renders, so
   * a Super Admin's badge includes the founder-console items and every other
   * session's does not (the work store fails closed on `superAdminOnly`).
   */
  const navBadges = useAdminNavBadges({ superAdmin: isSuper });
  const posQuery = usePurchaseOrders();
  const posAll = posQuery.data?.data ?? [];
  // §Phase 6 — navigation visibility only. Views super-only in the render
  // guard remain guarded there for defense in depth.
  const HIDDEN_FOR_NON_SUPER = new Set([
    'super_admin',
    'audit_log',
    'integrations',
    // §Workstream B (Decision 2, 2026-09-17) — Brand Intelligence is proprietary
    // Mercenta IP: the discovery/opportunity/strategy/notes machinery is SUPER
    // ADMIN ONLY. Hidden here AND guarded again at render (defense in depth).
    'brand_intelligence',
    // §21/M12 — the founder's private surfaces.
    'founder_centre',
    'partnerships',
    // §Founder OS — the Control Centre is the founder/Super-Admin operating
    // centre: internal acquisition pipeline, automation administration and AI
    // governance must never be reachable from a non-Super-Admin session.
    'control_centre',
    // §BATCH 4 (2026-10-10) — REMOVED: 'brain' left this Super-Admin allowlist with
    // the Mercenta Brain surface it guarded.
  ]);
  const navSections = (isSuper
    ? ADMIN_SECTIONS
    : ADMIN_SECTIONS
        .map((s) => ({ ...s, items: s.items.filter((i) => !HIDDEN_FOR_NON_SUPER.has(i.id)) }))
        .filter((s) => s.items.length > 0)
  ).map((s) => ({
    ...s,
    // §UI/UX Wave 2 — presentation-only badge from the canonical count map.
    // §SSOT S5 — each badge carries the DECLARED set its number belongs to, so a
    // badge can never be read as a different set than the one it counts.
    items: s.items.map((i) =>
      navBadges[i.id]
        ? { ...i, badge: navBadges[i.id], badgeLabel: NAV_BADGE_LABELS[i.id] }
        : i
    ),
  }));

  /** §UI/UX Wave 2 — command palette: real purchase orders, newest first. */
  const commandGroups: CommandGroup[] = [
    {
      label: 'Purchase orders',
      items: [...posAll]
        .sort((a, b) => b.poNumber.localeCompare(a.poNumber))
        .slice(0, 40)
        .map((p) => ({
          id: `po-${p.id}`,
          label: p.poNumber,
          meta: `${p.status.replace(/_/g, ' ')} · £${p.poValue.toLocaleString()}`,
          onSelect: () => setAdminView('purchase_orders_admin'),
        })),
    },
  ];

  /* §P9 repoint — the `carriers: 'logistics'` department mapping and the
     `carriers: 'Carrier Monitor'` breadcrumb are REMOVED with the destination. */
  const deptMap: Record<string, AdminDepartment> = { overview: 'business_dev', crm: 'business_dev', logistics: 'logistics', compliance: 'compliance' };
  const breadcrumb: Record<string, string> = {
    overview: 'Admin Overview', crm: 'Brand CRM', fulfillment_track: 'Fulfillment Track', retail_pipeline: 'Retail Pipeline', purchase_orders_admin: 'Purchase Orders',
    billing: 'Billing', messages: 'Messages', helpdesk: 'Helpdesk', returns_tracking: 'Returns Tracking', monitoring: 'Monitoring',
    contracts_admin: 'Contract Cycle', catalog: 'Global Catalog', logistics: 'Logistics Hub',
    compliance: 'Compliance Approvals', marketing: 'Marketing', brand_intelligence: 'Brand Intelligence', super_admin: 'Super Admin', audit_log: 'Audit Log',
    amazon_ads: 'Ad Spend',
    integrations: 'Integration Settings', usertour: 'Onboarding Tours',
    founder_centre: 'Founder Investor Centre',
    partnerships: 'Partnerships & Fundraising',
    work: 'Work Management', calendar: 'Operations Calendar',
    control_centre: 'Control Centre',
    /* §BATCH 4 (2026-10-10) — REMOVED: `brain: 'Mercenta Brain'` left with the surface. */
  };

  return (
    <AppShell navSections={navSections} activeView={adminView} setActiveView={setAdminView}
      breadcrumb={breadcrumb[adminView] || 'Admin'}
      userName={actingStaff?.name ?? role ?? 'Admin'}
      onNavSettings={() => setAdminView('super_admin')}
      onNavBilling={() => setAdminView('billing')}
      onNavApiKeys={() => setAdminView('integrations')}
      onNavNotification={(v) => setAdminView(v)}
      commandGroups={commandGroups}
      commandPlaceholder="Search purchase orders, destinations…"
    >
      <ErrorBoundary sectionLabel="Admin portal">
        <IntegrationsProvider>
          {/* §ADMIN-SHELL-CHUNK — the lazily-loaded view panels resolve inside this
              boundary; the shell chrome (nav + header) stays mounted, so a view
              switch never blanks the workspace. */}
          <Suspense fallback={<AdminViewFallback />}>
            {adminView === 'overview' && <AdminDashboard department={deptMap[adminView]} onNavigate={setAdminView} />}
            {/* §Founder OS — the founder/Super-Admin operating centre. Guarded a
                second time at render (defense in depth), like the other private
                founder surfaces. */}
            {adminView === 'control_centre' && (isSuper ? <FounderControlCentre onNavigate={setAdminView} /> : <AccessDenied />)}
            {/* §BATCH 4 (2026-10-10) — REMOVED: the Mercenta Brain render branch.
                A `/admin/brain` address resolves to the default view via
                `resolveProductView` (the view is no longer in ADMIN_VIEW_IDS), so it
                can never render a blank workspace. */}
            {/* §Sprint — canonical work layer: tasks/deadlines + derived calendar. */}
            {adminView === 'work' && <AdminWorkManagement onNavigate={setAdminView} />}
            {adminView === 'calendar' && <AdminWorkCalendar onNavigate={setAdminView} />}
            {adminView === 'crm' && <BrandCRM />}
            {adminView === 'onboarding_pipeline' && <OnboardingPipeline />}
            {adminView === 'fulfillment_track' && <FulfillmentTrackPanel />}
            {adminView === 'retail_pipeline' && <RetailPipelinePanel />}
            {adminView === 'purchase_orders_admin' && <AdminPurchaseOrderList />}
            {adminView === 'billing' && <BillingPanel />}
            {adminView === 'contracts_admin' && <ContractsAdminPanel />}
            {adminView === 'messages' && <MessagesHub />}
            {adminView === 'helpdesk' && <HelpdeskDashboard />}
            {adminView === 'returns_tracking' && <ReturnsTrackingDashboard />}
            {adminView === 'monitoring' && <MonitoringDashboard />}
            {adminView === 'catalog' && <CatalogManagerAdmin />}
            {adminView === 'logistics' && (
              /* §P10 — the Logistics Hub states each carrier account's configuration and
                 hands off to the ONE surface that owns credentials. The hand-off is offered
                 ONLY where the canonical RBAC permits the destination (Integration Settings
                 is super-admin-only), so no session receives a control that lands on
                 AccessDenied; a non-super operator still reads the full configuration. */
              <LogisticsControl
                onOpenIntegrations={isSuper ? () => setAdminView('integrations') : undefined}
              />
            )}
            {/* §P9 (programme decision 4) — `{adminView === 'carriers' && <CarrierIntegrationMonitor />}`
                is REMOVED. The retired destination rendered a hand-written per-carrier
                health feed (including FedEx/BAK, which are not Mercenta accounts).
                Provider connection health lives on the Integrations surface. */}
            {adminView === 'compliance' && <ComplianceApprovals />}
            {adminView === 'marketing' && <MarketingHub />}
            {adminView === 'amazon_ads' && <AmazonAdsDashboard />}
            {adminView === 'brand_intelligence' && (isSuper ? (
              <div className="space-y-4">
                <BrandIntelligenceStrategyPanel />
                {/*
                  §Workstream B (Step B) — internal product discovery + regional
                  priority derivation panels, SUPER ADMIN ONLY, derived purely from
                  canonical prospect/ASIN/opportunity evidence (no new engines).
                */}
                <ProductDiscoveryPanel />
                <RegionalPriorityPanel />
                <OpportunityDiscoveryPanel />
                <BrandIntelligencePanel />
              </div>
            ) : <AccessDenied />)}
            {adminView === 'super_admin' && (isSuper ? <SuperAdminPanel /> : <AccessDenied />)}
            {/* §21/M12 — founder-only views, guarded a second time at render. */}
            {adminView === 'founder_centre' && (isSuper ? <FounderInvestorCentre /> : <AccessDenied />)}
            {adminView === 'partnerships' && (isSuper ? <PartnershipsCentre /> : <AccessDenied />)}
            {adminView === 'audit_log' && (isSuper ? <AdminAuditLog /> : <AccessDenied />)}
            {adminView === 'integrations' && (isSuper ? <IntegrationsPanel /> : <AccessDenied />)}
            {adminView === 'usertour' && <UsertourAdminPanel />}
          </Suspense>
        </IntegrationsProvider>
      </ErrorBoundary>
    </AppShell>
  );
}

/**
 * §ADMIN-SHELL-CHUNK — the in-shell fallback shown while a lazily-loaded admin
 * panel's chunk is fetched. It renders INSIDE the shell chrome (the nav rail and
 * header stay mounted), so switching views never blanks the workspace; the
 * panel's own chunk then swaps in. It announces itself to assistive tech.
 */
function AdminViewFallback() {
  return (
    <WorkspaceFrame className="space-y-4">
      {/* §Wave 3 Part 5 — ONE owner for the loading region (`LoadingState`),
          which announces itself to assistive technology. This fallback used to
          be a bare "Loading…" word. */}
      <div className="rounded-ds-lg border border-white/5 bg-ink-850" data-testid="admin-view-loading">
        <LoadingState rows={3} label="Loading view…" />
      </div>
    </WorkspaceFrame>
  );
}

function AccessDenied() {
  const { setEnvironment } = useApp();
  return (
    <WorkspaceFrame className="space-y-4">
      <WorkspaceHeader
        eyebrow="ADMIN HUB · ACCESS"
        title="Super Admin Access Required"
        description="This view is restricted to authenticated Super Admin sessions."
      />
      <div className="mx-auto max-w-md rounded-ds-lg border border-red-500/20 bg-ink-850 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/15">
          <ShieldCheck className="h-6 w-6 text-red-400" />
        </div>
        <p className="mb-6 text-sm text-zinc-400">
          This view is restricted to authenticated Super Admin sessions.
        </p>
        <button
          onClick={() => setEnvironment('login')}
          className="inline-flex items-center gap-2 rounded-ds-md bg-brass-500 px-4 py-2 font-medium text-white transition-ds duration-ds-fast hover:bg-brass-400"
        >
          Return to Login
        </button>
      </div>
    </WorkspaceFrame>
  );
}