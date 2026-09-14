/**
 * AdminShell — admin portal environment. Lazy-loaded from App.tsx.
 * Only loaded when environment === 'admin'.
 */
import { useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { IntegrationsProvider } from '@/integrations/IntegrationsContext';
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
import { FounderInvestorCentre } from '@/components/admin/FounderInvestorCentre';
import { PartnershipsCentre } from '@/components/admin/PartnershipsCentre';
import { OnboardingPipeline } from '@/components/admin/OnboardingPipeline';
import type { AdminDepartment } from '@/types';
import {
  LayoutDashboard, Users, Gauge, Boxes, Package, Truck, Plug,
  ShieldCheck, CreditCard, FileText, Inbox, LifeBuoy, RotateCcw,
  Activity, Target, Crown, ScrollText, PlugZap, MessageSquare,
  Phone, ClipboardList, Handshake,
} from 'lucide-react';

const ADMIN_SECTIONS = [
  {
    label: 'Overview',
    items: [{ id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> }],
  },
  {
    label: 'Brands',
    items: [
      { id: 'crm', label: 'Brand CRM', icon: <Users className="w-4 h-4" /> },
      { id: 'onboarding_pipeline', label: 'Onboarding', icon: <ClipboardList className="w-4 h-4" /> },
      { id: 'marketing', label: 'Marketing', icon: <Target className="w-4 h-4" /> },
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
      { id: 'purchase_orders_admin', label: 'Purchase Orders', icon: <Package className="w-4 h-4" /> },
      { id: 'returns_tracking', label: 'Returns Tracking', icon: <RotateCcw className="w-4 h-4" /> },
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
    label: 'Logistics',
    items: [
      { id: 'logistics', label: 'Logistics Control', icon: <Truck className="w-4 h-4" /> },
      { id: 'carriers', label: 'Carrier Monitor', icon: <Plug className="w-4 h-4" /> },
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
export default function AdminShell() {
  const { role, actingStaff } = useApp();
  const [adminView, setAdminView] = useState('overview');
  const isSuper = role === 'Super Admin';
  // §Phase 6 — navigation visibility only. Views super-only in the render
  // guard remain guarded there for defense in depth.
  const HIDDEN_FOR_NON_SUPER = new Set([
    'super_admin',
    'audit_log',
    'integrations',
    // §21/M12 — the founder's private surfaces.
    'founder_centre',
    'partnerships',
  ]);
  const navSections = isSuper
    ? ADMIN_SECTIONS
    : ADMIN_SECTIONS
        .map((s) => ({ ...s, items: s.items.filter((i) => !HIDDEN_FOR_NON_SUPER.has(i.id)) }))
        .filter((s) => s.items.length > 0);

  const deptMap: Record<string, AdminDepartment> = { overview: 'business_dev', crm: 'business_dev', logistics: 'logistics', carriers: 'logistics', compliance: 'compliance' };
  const breadcrumb: Record<string, string> = {
    overview: 'Admin Overview', crm: 'Brand CRM', fulfillment_track: 'Fulfillment Track', retail_pipeline: 'Retail Pipeline', purchase_orders_admin: 'Purchase Orders',
    billing: 'Billing', messages: 'Messages', helpdesk: 'Helpdesk', returns_tracking: 'Returns Tracking', monitoring: 'Monitoring',
    contracts_admin: 'Contract Cycle', catalog: 'Global Catalog', logistics: 'Logistics Control', carriers: 'Carrier Monitor',
    compliance: 'Compliance Approvals', marketing: 'Marketing', brand_intelligence: 'Brand Intelligence', super_admin: 'Super Admin', audit_log: 'Audit Log',
    integrations: 'Integration Settings', usertour: 'Onboarding Tours', postiz: 'Social Media',
    whatsapp: 'WhatsApp Escalation', founder_centre: 'Founder Investor Centre',
    partnerships: 'Partnerships & Fundraising',
  };

  return (
    <AppShell navSections={navSections} activeView={adminView} setActiveView={setAdminView}
      breadcrumb={breadcrumb[adminView] || 'Admin'}
      userName={actingStaff?.name ?? role ?? 'Admin'}
      onNavSettings={() => setAdminView('super_admin')}
      onNavBilling={() => setAdminView('billing')}
      onNavApiKeys={() => setAdminView('integrations')}
      onNavNotification={(v) => setAdminView(v)}
    >
      <ErrorBoundary sectionLabel="Admin portal">
        <IntegrationsProvider>
          {adminView === 'overview' && <AdminDashboard department={deptMap[adminView]} onNavigate={setAdminView} />}
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
          {adminView === 'brand_intelligence' && (
            <div className="space-y-4">
              <BrandIntelligenceStrategyPanel />
              <OpportunityDiscoveryPanel />
              <BrandIntelligencePanel />
            </div>
          )}
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
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="max-w-md mx-auto bg-ink-850 border border-red-500/20 rounded-xl p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">Super Admin Access Required</h2>
        <p className="text-sm text-zinc-400 mb-6">This view is restricted to authenticated Super Admin sessions.</p>
        <button onClick={() => setEnvironment('login')} className="inline-flex items-center gap-2 bg-brass-500 hover:bg-brass-400 text-white font-medium px-4 py-2 rounded-lg transition-colors">
          Return to Login
        </button>
      </div>
    </div>
  );
}