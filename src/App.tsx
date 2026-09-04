import { useState, useEffect } from 'react';
import { AppProvider, useApp } from '@/context/GlobalStateContext';
import { AppShell } from '@/components/layout/AppShell';
import { Home } from '@/components/marketing/Home';
import { Login } from '@/components/auth/Login';
import { OnboardingWizard } from '@/components/brand/OnboardingWizard';
import { BrandDashboard } from '@/components/brand/BrandDashboard';
import { ProductCatalog } from '@/components/brand/ProductCatalog';
import { LogisticsHub } from '@/components/brand/LogisticsHub';
import { ComplianceHub } from '@/components/brand/ComplianceHub';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { LogisticsControl } from '@/components/admin/LogisticsControl';
import { CarrierIntegrationMonitor } from '@/components/admin/CarrierMonitor';
import { BrandCRM } from '@/components/admin/BrandCRM';
import { CatalogManagerAdmin } from '@/components/admin/CatalogManagerAdmin';
import { ComplianceApprovals } from '@/components/admin/ComplianceApprovals';
import { MarketingHub } from '@/components/admin/MarketingHub';
import { IntegrationsPanel } from '@/components/admin/integrations/IntegrationsPanel';
import { UsertourAdminPanel } from '@/components/admin/UsertourAdminPanel';
import { RocketChatAdminPanel } from '@/components/admin/RocketChatAdminPanel';
import { PostizAdminPanel } from '@/components/admin/PostizAdminPanel';
import { WhatsAppAdminPanel } from '@/components/admin/WhatsAppAdminPanel';
import { IntegrationsProvider } from '@/integrations/IntegrationsContext';
import { FulfillmentTrackPanel } from '@/components/admin/FulfillmentTrack';
import { RetailPipelinePanel } from '@/components/admin/RetailPipeline';
import { BillingPanel } from '@/components/admin/BillingPanel';
import { ContractsAdminPanel } from '@/components/admin/ContractsAdminPanel';
import { MessagesHub } from '@/components/admin/MessagesHub';
import { HelpdeskDashboard } from '@/components/admin/HelpdeskDashboard';
import { ReturnsTrackingDashboard } from '@/components/admin/ReturnsTrackingDashboard';
import { MonitoringDashboard } from '@/components/admin/MonitoringDashboard';
import { AdminPurchaseOrderList } from '@/components/admin/AdminPurchaseOrderList';
import { BrandContractView } from '@/components/brand/BrandContractView';
import { BrandPurchaseOrders } from '@/components/brand/BrandPurchaseOrders';
import { SuperAdminPanel } from '@/components/admin/SuperAdminPanel';
import { AdminAuditLog } from '@/components/admin/AdminAuditLog';
import { SalesAnalytics } from '@/components/brand/SalesAnalytics';
import { BrandSelfService } from '@/components/brand/BrandSelfService';
import { BrandSettings } from '@/components/brand/BrandSettings';
import { BrandReturns } from '@/components/brand/BrandReturns';
import { BrandReports } from '@/components/brand/BrandReports';
import { BrandTeamMessages } from '@/components/brand/BrandTeamMessages';
import { BrandSocialConnect } from '@/components/brand/BrandSocialConnect';
import { LiveChatWidget } from '@/components/shared/LiveChatWidget';
import { TourEngine } from '@/components/shared/TourEngine';
import { TourLoader } from '@/components/shared/TourLoader';
import { UsertourBrandBridge } from '@/components/shared/UsertourBrandBridge';
import { CarrierDashboard } from '@/components/carrier/CarrierDashboard';
import { BakLogistics } from '@/components/carrier/BakLogistics';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import type { AdminDepartment } from '@/types';
import {
  LayoutDashboard,
  FileCheck2,
  FileText,
  Package,
  Truck,
  ShieldCheck,
  BarChart3,
  Users,
  Boxes,
  Gauge,
  Inbox,
  CreditCard,
  Plug,
  Phone,
  PlugZap,
  Target,
  Terminal,
  Crown,
  Ship,
  ScrollText,
  RotateCcw,
  Settings,
  Activity,
  LifeBuoy,
  MessageSquare,
} from 'lucide-react';

const BRAND_NAV = [
  { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, tourAttr: 'brand-dashboard' },
  { id: 'onboarding', label: 'Onboarding & Legal', icon: <FileCheck2 className="w-4 h-4" /> },
  { id: 'contracts', label: 'Contracts', icon: <FileText className="w-4 h-4" /> },
  { id: 'purchase_orders', label: 'Purchase Orders', icon: <Truck className="w-4 h-4" />, tourAttr: 'nav-purchase_orders' },
  { id: 'catalog', label: 'Product Catalog', icon: <Package className="w-4 h-4" />, tourAttr: 'nav-catalog' },
  { id: 'logistics', label: 'Inbound Shipments', icon: <Truck className="w-4 h-4" />, tourAttr: 'nav-logistics' },
  { id: 'compliance', label: 'UK Compliance', icon: <ShieldCheck className="w-4 h-4" />, tourAttr: 'nav-compliance' },
  { id: 'returns', label: 'Returns', icon: <RotateCcw className="w-4 h-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'documents', label: 'Documents & Account', icon: <ScrollText className="w-4 h-4" /> },
{ id: 'team', label: 'Support & Team', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'social', label: 'Social Accounts', icon: <Target className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, tourAttr: 'nav-settings' },
];

const ADMIN_NAV = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'crm', label: 'Brand CRM', icon: <Users className="w-4 h-4" /> },
  { id: 'fulfillment_track', label: 'Fulfillment Track', icon: <Gauge className="w-4 h-4" /> },
  { id: 'retail_pipeline', label: 'Retail Pipeline', icon: <Boxes className="w-4 h-4" /> },
  { id: 'purchase_orders_admin', label: 'Purchase Orders', icon: <Package className="w-4 h-4" /> },
  { id: 'logistics', label: 'Logistics Control', icon: <Truck className="w-4 h-4" /> },
  { id: 'carriers', label: 'Carrier Integration Monitor', icon: <Plug className="w-4 h-4" /> },
  { id: 'catalog', label: 'Global Catalog Manager', icon: <Boxes className="w-4 h-4" /> },
  { id: 'compliance', label: 'Compliance Approvals', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
  { id: 'contracts_admin', label: 'Contract Cycle', icon: <FileText className="w-4 h-4" /> },
  { id: 'messages', label: 'Communications', icon: <Inbox className="w-4 h-4" /> },
  { id: 'helpdesk', label: 'Helpdesk', icon: <LifeBuoy className="w-4 h-4" /> },
  { id: 'returns_tracking', label: 'Returns Tracking', icon: <RotateCcw className="w-4 h-4" /> },
  { id: 'monitoring', label: 'Monitoring', icon: <Activity className="w-4 h-4" /> },
  { id: 'marketing', label: 'Marketing', icon: <Target className="w-4 h-4" /> },
  { id: 'super_admin', label: 'Super Admin Panel', icon: <Crown className="w-4 h-4" /> },
  { id: 'audit_log', label: 'Audit Log', icon: <ScrollText className="w-4 h-4" /> },
  { id: 'integrations', label: 'Integration Settings', icon: <PlugZap className="w-4 h-4" /> },
  { id: 'usertour', label: 'Onboarding Tours', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'rocketchat', label: 'Rocket.Chat', icon: <MessageSquare className="w-4 h-4" /> },
  { id: 'postiz', label: 'Social Media Manager', icon: <Target className="w-4 h-4" /> },
  { id: 'whatsapp', label: 'WhatsApp Escalation', icon: <Phone className="w-4 h-4" /> },
];

const CARRIER_NAV = [
  { id: 'manifest', label: 'Manifest Management', icon: <Terminal className="w-4 h-4" /> },
  { id: 'bak', label: 'BAK Logistics Hub', icon: <Ship className="w-4 h-4" /> },
  { id: 'auditor', label: 'API Request Auditor', icon: <BarChart3 className="w-4 h-4" /> },
];

function AppContent() {
  const { environment, brandProfile, role, actingStaff } = useApp();
  const [brandView, setBrandView] = useState('overview');
  const [adminView, setAdminView] = useState('overview');
  const [carrierView, setCarrierView] = useState('manifest');

  const isSuperAdmin = role === 'Super Admin';
  const adminNav = isSuperAdmin
    ? ADMIN_NAV
    : ADMIN_NAV.filter((item) => item.id !== 'super_admin' && item.id !== 'integrations');

  useEffect(() => {
    if (environment === 'admin' && isSuperAdmin) {
      setAdminView('super_admin');
    }
  }, [environment, isSuperAdmin]);

  // Homepage
  if (environment === 'home') {
    return <Home />;
  }

  // Auth Gateway
  if (environment === 'login') {
    return <Login />;
  }

  // Brand Portal: show onboarding wizard if not onboarded
  if (environment === 'brand' && !brandProfile.onboarded) {
    return <OnboardingWizard />;
  }

  if (environment === 'brand') {
    const breadcrumb =
      brandView === 'overview'
        ? 'Dashboard'
        : brandView === 'onboarding'
        ? 'Onboarding & Legal'
        : brandView === 'catalog'
        ? 'Product Catalog'
        : brandView === 'logistics'
        ? 'Inbound Shipments'
        : brandView === 'compliance'
        ? 'UK Compliance'
        : brandView === 'purchase_orders'
        ? 'Purchase Orders'
        : brandView === 'contracts'
        ? 'Contracts'
        : brandView === 'returns'
        ? 'Returns'
        : brandView === 'reports'
        ? 'Reports'
        : brandView === 'team'
        ? 'Support & Team'
        : brandView === 'social'
        ? 'Social Accounts'
        : brandView === 'settings'
        ? 'Settings'
        : 'Analytics';

    return (
      <AppShell
        navItems={BRAND_NAV}
        activeView={brandView}
        setActiveView={setBrandView}
        breadcrumb={breadcrumb}
        userName={brandProfile.signatory || brandProfile.businessName || 'Brand Partner'}
        onNavSettings={() => setBrandView('settings')}
        onNavBilling={() => setBrandView('settings')}
        onNavApiKeys={() => setBrandView('settings')}
        onNavNotification={(view) => setBrandView(view)}
      >
        <ErrorBoundary sectionLabel="Brand portal">
          {brandView === 'overview' && <BrandDashboard onNavigate={setBrandView} />}
          {brandView === 'onboarding' && <OnboardingWizard />}
          {brandView === 'catalog' && <ProductCatalog />}
          {brandView === 'contracts' && <BrandContractView />}
          {brandView === 'purchase_orders' && <BrandPurchaseOrders />}
          {brandView === 'logistics' && <LogisticsHub />}
          {brandView === 'compliance' && <ComplianceHub />}
          {brandView === 'analytics' && <SalesAnalytics />}
          {brandView === 'documents' && <BrandSelfService />}
          {brandView === 'returns' && <BrandReturns />}
          {brandView === 'reports' && <BrandReports onNavigate={setBrandView} />}
          {brandView === 'settings' && <BrandSettings />}
          {brandView === 'team' && <BrandTeamMessages />}
          {brandView === 'social' && <BrandSocialConnect />}
          <LiveChatWidget />
          <TourLoader currentView={brandView} isBrandPortal={true} />
          <UsertourBrandBridge />
        </ErrorBoundary>
      </AppShell>
    );
  }

  if (environment === 'admin') {
    const breadcrumbMap: Record<string, string> = {
      overview: 'Admin Overview',
      crm: 'Brand CRM',
      fulfillment_track: 'Fulfillment Track',
      retail_pipeline: 'Retail Pipeline',
      billing: 'Billing',
      messages: 'Messages',
      helpdesk: 'Helpdesk',
      returns_tracking: 'Returns Tracking',
      monitoring: 'Monitoring',
      contracts_admin: 'Contract Cycle',
      catalog: 'Global Catalog Manager',
      logistics: 'Logistics Control Room',
      carriers: 'Carrier Integration Monitor',
      compliance: 'Compliance Approvals',
      marketing: 'Marketing',
      super_admin: 'Super Admin Panel',
      audit_log: 'Audit Log',
      integrations: 'Integration Settings',
      usertour: 'Onboarding Tours',
      rocketchat: 'Rocket.Chat Support',
      postiz: 'Social Media Manager',
      whatsapp: 'WhatsApp Escalation',
    };

    const deptMap: Record<string, AdminDepartment> = {
      overview: 'business_dev',
      crm: 'business_dev',
      logistics: 'logistics',
      carriers: 'logistics',
      compliance: 'compliance',
    };

    return (
      <AppShell
        navItems={adminNav}
        activeView={adminView}
        setActiveView={setAdminView}
        breadcrumb={breadcrumbMap[adminView] || 'Admin Overview'}
        userName={actingStaff?.name ?? role ?? 'Mercenta Admin'}
        onNavSettings={() => setAdminView('super_admin')}
        onNavBilling={() => setAdminView('billing')}
        onNavApiKeys={() => setAdminView('integrations')}
        onNavNotification={(view) => setAdminView(view)}
      >
        <ErrorBoundary sectionLabel="Admin portal">
          {adminView === 'overview' && <AdminDashboard department={deptMap[adminView]} onNavigate={setAdminView} />}
          {adminView === 'crm' && <BrandCRM />}
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
          {adminView === 'super_admin' &&
            (isSuperAdmin ? <SuperAdminPanel /> : <AccessDenied />)}
          {adminView === 'audit_log' &&
            (isSuperAdmin ? <AdminAuditLog /> : <AccessDenied />)}
          {adminView === 'integrations' &&
            (isSuperAdmin ? <IntegrationsPanel /> : <AccessDenied />)}
          {adminView === 'usertour' && <UsertourAdminPanel />}
          {adminView === 'rocketchat' && <RocketChatAdminPanel />}
          {adminView === 'postiz' && <PostizAdminPanel />}
          {adminView === 'whatsapp' && <WhatsAppAdminPanel />}
        </ErrorBoundary>
      </AppShell>
    );
  }

  // Carrier environment
  const carrierBreadcrumb =
    carrierView === 'manifest'
      ? 'Manifest Management'
      : carrierView === 'bak'
      ? 'BAK Logistics Hub'
      : 'API Request Auditor';

  return (
    <AppShell
      navItems={CARRIER_NAV}
      activeView={carrierView}
      setActiveView={setCarrierView}
      breadcrumb={carrierBreadcrumb}
      userName={role ?? '3PL Carrier'}
    >
      {carrierView === 'bak' ? <BakLogistics /> : <CarrierDashboard />}
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
        <h2 className="text-lg font-semibold text-white mb-2">
          Super Admin Access Required
        </h2>
        <p className="text-sm text-zinc-400 mb-6">
          This master control view is restricted to authenticated Super Admin sessions.
          Sign in with a Super Admin profile to manage staff, roles, and channel assignments.
        </p>
        <button
          onClick={() => setEnvironment('login')}
          className="inline-flex items-center gap-2 bg-brass-500 hover:bg-brass-400 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <IntegrationsProvider>
        <AppContent />
      </IntegrationsProvider>
    </AppProvider>
  );
}

export default App;
