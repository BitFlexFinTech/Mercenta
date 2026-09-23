/**
 * AdminShell — admin portal environment. Lazy-loaded from App.tsx.
 * Only loaded when environment === 'admin'.
 */
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { AppShell } from '@/components/layout/AppShell';
import { WorkspaceFrame, WorkspaceHeader } from '@/components/shared/workspace';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { IntegrationsProvider } from '@/integrations/IntegrationsContext';
import { currentPathname, pushProductPath, resolveProductView } from '@/lib/runtime/productRoutes';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { LogisticsControl } from '@/components/admin/LogisticsControl';
import { CarrierIntegrationMonitor } from '@/components/admin/CarrierMonitor';
import { BrandCRM } from '@/components/admin/BrandCRM';
import { CatalogManagerAdmin } from '@/components/admin/CatalogManagerAdmin';
import { ComplianceApprovals } from '@/components/admin/ComplianceApprovals';
import { MarketingHub } from '@/components/admin/MarketingHub';
import { IntegrationsPanel } from '@/components/admin/integrations/IntegrationsPanel';
import { UsertourAdminPanel } from '@/components/admin/UsertourAdminPanel';
import { PostizAdminPanel } from '@/components/admin/PostizAdminPanel';
import { WhatsAppAdminPanel } from '@/components/admin/WhatsAppAdminPanel';
import { FulfillmentTrackPanel } from '@/components/admin/FulfillmentTrack';
import { RetailPipelinePanel } from '@/components/admin/RetailPipeline';
import { BillingPanel } from '@/components/admin/BillingPanel';
import { ContractsAdminPanel } from '@/components/admin/ContractsAdminPanel';
import { MessagesHub } from '@/components/admin/MessagesHub';
import { HelpdeskDashboard } from '@/components/admin/HelpdeskDashboard';
import { ReturnsTrackingDashboard } from '@/components/admin/ReturnsTrackingDashboard';
import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';
import { AdminPurchaseOrderList } from '@/components/admin/AdminPurchaseOrderList';
import { SuperAdminPanel } from '@/components/admin/SuperAdminPanel';
import { AdminAuditLog } from '@/components/admin/AdminAuditLog';
import { BrandIntelligencePanel } from '@/components/admin/BrandIntelligencePanel';
import { BrandIntelligenceStrategyPanel } from '@/components/admin/BrandIntelligenceStrategyPanel';
import { OpportunityDiscoveryPanel } from '@/components/admin/OpportunityDiscoveryPanel';
import { ProductDiscoveryPanel } from '@/components/admin/ProductDiscoveryPanel';
import { RegionalPriorityPanel } from '@/components/admin/RegionalPriorityPanel';
import { AmazonAdsDashboard } from '@/components/admin/AmazonAdsDashboard';
import { FounderControlCentre } from '@/components/admin/FounderControlCentre';
import { MercentaBrain } from '@/components/admin/MercentaBrain';
import { FounderInvestorCentre } from '@/components/admin/FounderInvestorCentre';
import { PartnershipsCentre } from '@/components/admin/PartnershipsCentre';
import { OnboardingPipeline } from '@/components/admin/OnboardingPipeline';
import { AdminWorkCalendar, AdminWorkManagement } from '@/components/admin/WorkManagement';
import { useAdminNavBadges } from '@/lib/nav/navBadges';
import { usePurchaseOrders } from '@/data/queries';
import type { CommandGroup } from '@/components/shared/CommandPalette';
import type { AdminDepartment } from '@/types';
import {
  LayoutDashboard, Users, Gauge, Boxes, Package, Truck, Plug,
  ShieldCheck, CreditCard, FileText, Inbox, LifeBuoy, RotateCcw,
  Activity, Target, Crown, ScrollText, PlugZap, MessageSquare,
  Phone, ClipboardList, Handshake, Megaphone, ListChecks, CalendarDays,
  Brain,
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
      /* §MERCENTA BRAIN — the third question of the IA: how is everything
         connected, what do we know, and why. Super-Admin only: hidden here for
         every other tier AND guarded again at render. */
      { id: 'brain', label: 'Mercenta Brain', icon: <Brain className="w-4 h-4" /> },
    ],
  },
  {
    /**
     * §Dashboard-cleanup P1 — OPERATIONS IS THE ACTION CENTRE.
     * Every queue an operator acts on sits here: the work layer, purchase-order
     * processing, consignments and their documents, returns, carrier/provider
     * state and the operational calendar. Observe-only surfaces live in Overview;
     * commercial pipelines live in Commerce.
     */
    label: 'Operations',
    items: [
      { id: 'work', label: 'Work Management', icon: <ListChecks className="w-4 h-4" /> },
      { id: 'purchase_orders_admin', label: 'Purchase Orders', icon: <Package className="w-4 h-4" /> },
      { id: 'logistics', label: 'Logistics Hub', icon: <Truck className="w-4 h-4" /> },
      { id: 'returns_tracking', label: 'Returns Tracking', icon: <RotateCcw className="w-4 h-4" /> },
      { id: 'carriers', label: 'Carrier Monitor', icon: <Plug className="w-4 h-4" /> },
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
      { id: 'postiz', label: 'Social Media', icon: <Target className="w-4 h-4" /> },
      { id: 'whatsapp', label: 'WhatsApp', icon: <Phone className="w-4 h-4" /> },
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
   * (`/admin/brain`, `/admin/logistics`, …). Initialised from the URL, written
   * back on every navigation, and re-read on Back/Forward. No second store.
   * An address naming a view this shell cannot render resolves to the declared
   * default view instead of rendering an empty workspace.
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
    // §MERCENTA BRAIN — internal relationship/intelligence surface: it exposes
    // prospects, Mercenta-wide decisions, automations and provider machinery, so
    // it must never be reachable from a non-Super-Admin session.
    'brain',
  ]);
  const navSections = (isSuper
    ? ADMIN_SECTIONS
    : ADMIN_SECTIONS
        .map((s) => ({ ...s, items: s.items.filter((i) => !HIDDEN_FOR_NON_SUPER.has(i.id)) }))
        .filter((s) => s.items.length > 0)
  ).map((s) => ({
    ...s,
    // §UI/UX Wave 2 — presentation-only badge from the canonical count map.
    items: s.items.map((i) => (navBadges[i.id] ? { ...i, badge: navBadges[i.id] } : i)),
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

  const deptMap: Record<string, AdminDepartment> = { overview: 'business_dev', crm: 'business_dev', logistics: 'logistics', carriers: 'logistics', compliance: 'compliance' };
  const breadcrumb: Record<string, string> = {
    overview: 'Admin Overview', crm: 'Brand CRM', fulfillment_track: 'Fulfillment Track', retail_pipeline: 'Retail Pipeline', purchase_orders_admin: 'Purchase Orders',
    billing: 'Billing', messages: 'Messages', helpdesk: 'Helpdesk', returns_tracking: 'Returns Tracking', monitoring: 'Monitoring',
    contracts_admin: 'Contract Cycle', catalog: 'Global Catalog', logistics: 'Logistics Hub', carriers: 'Carrier Monitor',
    compliance: 'Compliance Approvals', marketing: 'Marketing', brand_intelligence: 'Brand Intelligence', super_admin: 'Super Admin', audit_log: 'Audit Log',
    amazon_ads: 'Ad Spend',
    integrations: 'Integration Settings', usertour: 'Onboarding Tours', postiz: 'Social Media',
    whatsapp: 'WhatsApp Escalation', founder_centre: 'Founder Investor Centre',
    partnerships: 'Partnerships & Fundraising',
    work: 'Work Management', calendar: 'Operations Calendar',
    control_centre: 'Control Centre',
    brain: 'Mercenta Brain',
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
          {adminView === 'overview' && <AdminDashboard department={deptMap[adminView]} onNavigate={setAdminView} />}
          {/* §Founder OS — the founder/Super-Admin operating centre. Guarded a
              second time at render (defense in depth), like the other private
              founder surfaces. */}
          {adminView === 'control_centre' && (isSuper ? <FounderControlCentre onNavigate={setAdminView} /> : <AccessDenied />)}
          {/* §MERCENTA BRAIN — the relationship/intelligence destination. Guarded
              a second time at render (defense in depth), like the other
              Super-Admin-only surfaces. */}
          {adminView === 'brain' && (isSuper ? <MercentaBrain onNavigate={setAdminView} /> : <AccessDenied />)}
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
          {adminView === 'logistics' && <LogisticsControl />}
          {adminView === 'carriers' && <CarrierIntegrationMonitor />}
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
          {adminView === 'postiz' && <PostizAdminPanel />}
          {adminView === 'whatsapp' && <WhatsAppAdminPanel />}
        </IntegrationsProvider>
      </ErrorBoundary>
    </AppShell>
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