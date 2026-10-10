import { lazy, Suspense } from 'react';
import { AppProvider, useApp } from '@/context/GlobalStateContext';
import { useCanonicalQuerySync } from '@/data/queries';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { LoadingState } from '@/components/ui';
import { RouteMetadata } from '@/components/shared/RouteMetadata';

const HomeShell = lazy(() => import('@/components/layout/HomeShell'));
const BrandShell = lazy(() => import('@/components/layout/BrandShell'));
const AdminShell = lazy(() => import('@/components/layout/AdminShell'));
/* §P9 (programme decision 4) — `const CarrierShell = lazy(() => import('@/components/layout/CarrierShell'))`
   is REMOVED with the carrier environment: there is no carrier login and no
   carrier shell. The two remaining product branches below are exhaustive. */

const FALLBACK = (
  <div className="flex items-center justify-center min-h-screen bg-ink-900">
    {/* §Wave 3 Part 5 — the app root's loading state is the canonical owner too. */}
    <LoadingState className="w-full max-w-md" rows={3} label="Loading Mercenta…" />
  </div>
);

function AppContent() {
  const { environment } = useApp();
  /**
   * §CANONICAL CHANGE PROPAGATION — the ONE subscriber that keeps every React
   * Query read of canonical state in step with the domain, so projections built
   * on it (the logistics list and inspector, dashboards, queues, ledgers)
   * reflect a domain change without a reload. Mounted here because the
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
        /* §P9 (programme decision 4) — this branch used to render CarrierShell.
           `Environment` is now exactly home | login | brand | admin, and the
           HomeShell branch above already covers home + login, so admin is the
           only remaining case. No unreachable fourth branch is kept. */
        <Suspense fallback={FALLBACK}><AdminShell /></Suspense>
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