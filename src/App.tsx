import { lazy, Suspense } from 'react';
import { AppProvider, useApp } from '@/context/GlobalStateContext';
import { useCanonicalQuerySync } from '@/data/queries';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { RouteMetadata } from '@/components/shared/RouteMetadata';

const HomeShell = lazy(() => import('@/components/layout/HomeShell'));
const BrandShell = lazy(() => import('@/components/layout/BrandShell'));
const AdminShell = lazy(() => import('@/components/layout/AdminShell'));
const CarrierShell = lazy(() => import('@/components/layout/CarrierShell'));

const FALLBACK = (
  <div className="flex items-center justify-center min-h-screen bg-ink-900">
    <div className="text-zinc-500 text-sm">Loading...</div>
  </div>
);

function AppContent() {
  const { environment } = useApp();
  /**
   * §CANONICAL CHANGE PROPAGATION — the ONE subscriber that keeps every React
   * Query read of canonical state in step with the domain, so projections built
   * on it (the Logistics operational map and list, dashboards, queues, ledgers,
   * Brain) reflect a domain change without a reload. Mounted here because the
   * QueryClientProvider wraps the whole application (`main.tsx`).
   */
  useCanonicalQuerySync();
  return (
    <>
      {/* §SEO FOUNDATION — the ONE writer of the document's route metadata. */}
      <RouteMetadata />
      {environment === 'home' || environment === 'login' ? (
        <Suspense fallback={FALLBACK}><HomeShell /></Suspense>
      ) : environment === 'brand' ? (
        <Suspense fallback={FALLBACK}><BrandShell /></Suspense>
      ) : environment === 'admin' ? (
        <Suspense fallback={FALLBACK}><AdminShell /></Suspense>
      ) : (
        <Suspense fallback={FALLBACK}><CarrierShell /></Suspense>
      )}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary sectionLabel="App root">
      <AppProvider><AppContent /></AppProvider>
    </ErrorBoundary>
  );
}

export default App;