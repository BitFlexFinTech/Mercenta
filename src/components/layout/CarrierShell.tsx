/**
 * CarrierShell — carrier portal environment. Lazy-loaded from App.tsx.
 * Only loaded when environment === 'carrier'.
 */
import { useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { AppShell } from '@/components/layout/AppShell';
import { CarrierDashboard } from '@/components/carrier/CarrierDashboard';
import { BakLogistics } from '@/components/carrier/BakLogistics';
import { Terminal, Ship, BarChart3 } from 'lucide-react';

const NAV = [
  { id: 'manifest', label: 'Manifest Management', icon: <Terminal className="w-4 h-4" /> },
  { id: 'bak', label: 'BAK Logistics Hub', icon: <Ship className="w-4 h-4" /> },
  { id: 'auditor', label: 'API Request Auditor', icon: <BarChart3 className="w-4 h-4" /> },
];

export default function CarrierShell() {
  const { role } = useApp();
  const [carrierView, setCarrierView] = useState('manifest');
  const bc = carrierView === 'manifest' ? 'Manifest Management' : carrierView === 'bak' ? 'BAK Logistics Hub' : 'API Auditor';

  return (
    <AppShell navItems={NAV} activeView={carrierView} setActiveView={setCarrierView} breadcrumb={bc} userName={role ?? '3PL Carrier'}>
      {carrierView === 'bak' ? <BakLogistics /> : <CarrierDashboard />}
    </AppShell>
  );
}