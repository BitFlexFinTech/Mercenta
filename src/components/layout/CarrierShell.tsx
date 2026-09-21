/**
 * CarrierShell — carrier portal environment. Lazy-loaded from App.tsx.
 * Only loaded when environment === 'carrier'.
 */
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { IntegrationsProvider } from '@/integrations/IntegrationsContext';
import { currentPathname, pushProductPath, resolveProductView } from '@/lib/runtime/productRoutes';
import { CarrierDashboard } from '@/components/carrier/CarrierDashboard';
import { BakLogistics } from '@/components/carrier/BakLogistics';
import { Terminal, Ship, BarChart3 } from 'lucide-react';

const NAV_SECTIONS = [
  {
    // §Phase 6 — single implied section: no heading so the three-item
    // carrier navigation stays visually unchanged.
    label: '',
    items: [
      { id: 'manifest', label: 'Manifest Management', icon: <Terminal className="w-4 h-4" /> },
      { id: 'bak', label: 'BAK Logistics Hub', icon: <Ship className="w-4 h-4" /> },
      { id: 'auditor', label: 'API Request Auditor', icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
];

/**
 * §RUNTIME PARITY — every view the carrier terminal can render, derived from the
 * SAME nav declarations the rail renders. A URL segment outside this set resolves
 * to the declared default view instead of rendering an empty workspace.
 */
const CARRIER_VIEW_IDS: readonly string[] = NAV_SECTIONS.flatMap((s) =>
  s.items.map((i) => i.id)
);

export default function CarrierShell() {
  const { role } = useApp();
  /** §RUNTIME PARITY (R1) — the carrier view is the address (`/carrier/bak`). */
  const [carrierView, setCarrierViewState] = useState(() =>
    resolveProductView('carrier', currentPathname(), CARRIER_VIEW_IDS)
  );
  const setCarrierView = useCallback((v: string) => {
    setCarrierViewState(v);
    pushProductPath('carrier', v);
  }, []);

  useEffect(() => {
    function onPopState() {
      setCarrierViewState(resolveProductView('carrier', currentPathname(), CARRIER_VIEW_IDS));
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const bc = carrierView === 'manifest' ? 'Manifest Management' : carrierView === 'bak' ? 'BAK Logistics Hub' : 'API Auditor';

  return (
    <AppShell navSections={NAV_SECTIONS} activeView={carrierView} setActiveView={setCarrierView} breadcrumb={bc} userName={role ?? '3PL Carrier'}>
      <ErrorBoundary sectionLabel="Carrier portal">
        <IntegrationsProvider>
          {carrierView === 'bak' ? <BakLogistics /> : carrierView === 'auditor' ? <CarrierDashboard focusSection="auditor" /> : <CarrierDashboard />}
        </IntegrationsProvider>
      </ErrorBoundary>
    </AppShell>
  );
}