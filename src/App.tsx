import { useState } from 'react';
import { AppProvider, useApp } from '@/store';
import { AppShell } from '@/components/layout/AppShell';
import { Home } from '@/components/marketing/Home';
import { Login } from '@/components/auth/Login';
import { OnboardingWizard } from '@/components/brand/OnboardingWizard';
import { BrandDashboard } from '@/components/brand/BrandDashboard';
import { ProductCatalog } from '@/components/brand/ProductCatalog';
import { LogisticsHub } from '@/components/brand/LogisticsHub';
import { ComplianceHub } from '@/components/brand/ComplianceHub';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { ExpleeFinder } from '@/components/admin/ExpleeFinder';
import { SuperAdminPanel } from '@/components/admin/SuperAdminPanel';
import { CarrierDashboard } from '@/components/carrier/CarrierDashboard';
import type { AdminDepartment } from '@/types';
import {
  LayoutDashboard,
  FileCheck2,
  Package,
  Truck,
  ShieldCheck,
  BarChart3,
  Users,
  Boxes,
  Plug,
  Sparkles,
  Terminal,
  Crown,
} from 'lucide-react';

const BRAND_NAV = [
  { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'onboarding', label: 'Onboarding & Legal', icon: <FileCheck2 className="w-4 h-4" /> },
  { id: 'catalog', label: 'Product Catalog', icon: <Package className="w-4 h-4" /> },
  { id: 'logistics', label: 'Inbound Shipments', icon: <Truck className="w-4 h-4" /> },
  { id: 'compliance', label: 'UK & EU Compliance', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
];

const ADMIN_NAV = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
  { id: 'crm', label: 'Brand CRM', icon: <Users className="w-4 h-4" /> },
  { id: 'catalog', label: 'Global Catalog Manager', icon: <Boxes className="w-4 h-4" /> },
  { id: 'logistics', label: 'Logistics Control Room', icon: <Truck className="w-4 h-4" /> },
  { id: 'carriers', label: 'Carrier Integration Monitor', icon: <Plug className="w-4 h-4" /> },
  { id: 'compliance', label: 'Compliance Approvals', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'explee', label: 'Explee AI Client Finder', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'super_admin', label: 'Super Admin Panel', icon: <Crown className="w-4 h-4" /> },
];

const CARRIER_NAV = [
  { id: 'manifest', label: 'Manifest Management', icon: <Terminal className="w-4 h-4" /> },
  { id: 'auditor', label: 'API Request Auditor', icon: <BarChart3 className="w-4 h-4" /> },
];

function AppContent() {
  const { environment, brandProfile } = useApp();
  const [brandView, setBrandView] = useState('overview');
  const [adminView, setAdminView] = useState('overview');
  const [carrierView, setCarrierView] = useState('manifest');

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
        ? 'UK & EU Compliance'
        : 'Analytics';

    return (
      <AppShell
        navItems={BRAND_NAV}
        activeView={brandView}
        setActiveView={setBrandView}
        breadcrumb={breadcrumb}
        userName="Dave Anderson"
      >
        {brandView === 'overview' && <BrandDashboard />}
        {brandView === 'onboarding' && <OnboardingWizard />}
        {brandView === 'catalog' && <ProductCatalog />}
        {brandView === 'logistics' && <LogisticsHub />}
        {brandView === 'compliance' && <ComplianceHub />}
        {brandView === 'analytics' && <BrandDashboard />}
      </AppShell>
    );
  }

  if (environment === 'admin') {
    const breadcrumbMap: Record<string, string> = {
      overview: 'Admin Overview',
      crm: 'Brand CRM',
      catalog: 'Global Catalog Manager',
      logistics: 'Logistics Control Room',
      carriers: 'Carrier Integration Monitor',
      compliance: 'Compliance Approvals',
      explee: 'Explee AI Client Finder',
      super_admin: 'Super Admin Panel',
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
        navItems={ADMIN_NAV}
        activeView={adminView}
        setActiveView={setAdminView}
        breadcrumb={breadcrumbMap[adminView] || 'Admin Overview'}
        userName="Dave Anderson"
      >
        {adminView === 'overview' && <AdminDashboard department={deptMap[adminView]} />}
        {adminView === 'crm' && <AdminDashboard department="business_dev" />}
        {adminView === 'catalog' && <ProductCatalog />}
        {adminView === 'logistics' && <AdminDashboard department="logistics" />}
        {adminView === 'carriers' && <AdminDashboard department="logistics" />}
        {adminView === 'compliance' && <AdminDashboard department="compliance" />}
        {adminView === 'explee' && <ExpleeFinder />}
        {adminView === 'super_admin' && <SuperAdminPanel />}
      </AppShell>
    );
  }

  // Carrier environment
  return (
    <AppShell
      navItems={CARRIER_NAV}
      activeView={carrierView}
      setActiveView={setCarrierView}
      breadcrumb={carrierView === 'manifest' ? 'Manifest Management' : 'API Auditor'}
      userName="Dave Anderson"
    >
      <CarrierDashboard />
    </AppShell>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
