import { lazy, Suspense, useState } from 'react';
import { AppProvider, useApp } from '@/context/GlobalStateContext';
import { useCanonicalQuerySync } from '@/data/queries';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { LoadingState } from '@/components/ui';
import { RouteMetadata } from '@/components/shared/RouteMetadata';
import { IntegrationsProvider } from '@/integrations/IntegrationsContext';

const HomeShell = lazy(() => import('@/components/layout/HomeShell'));
const BrandShell = lazy(() => import('@/components/layout/BrandShell'));
const AdminShell = lazy(() => import('@/components/layout/AdminShell'));
/* §NEW CONSOLE (AI Studio Phases 1–3, ported 2026-11-25) — the redesigned console
   lives in `src/next/` and is mounted BEHIND AN EXPLICIT SWITCH, never as the
   default. Only the brand screens, the shared work workspace and the Ads Manager
   exist there so far; making it the default would replace working screens with
   Phase 4–6 placeholders, which is not an acceptable trade. Reachable at
   `?console=next`, with `?preview=1` for the offline pure-View harness.
   The default flips to `next` only when every surface in `src/next/navConfig.ts`
   is marked `implemented: true`. */
const NextShell = lazy(() =>
  import('@/next/shell/NextShell').then((m) => ({ default: m.NextShell })),
);
const PreviewHarness = lazy(() =>
  import('@/next/__preview__/PreviewHarness').then((m) => ({ default: m.PreviewHarness })),
);
/* §P9 (programme decision 4) — `const CarrierShell = lazy(() => import('@/components/layout/CarrierShell'))`
   is REMOVED with the carrier environment: there is no carrier login and no
   carrier shell. The two remaining product branches below are exhaustive. */

const FALLBACK = (
  <div className="flex items-center justify-center min-h-screen bg-surface">
    {/* §Wave 3 Part 5 — the app root's loading state is the canonical owner too. */}
    <LoadingState className="w-full max-w-md" rows={3} label="Loading Mercenta…" />
  </div>
);

type ConsoleMode = 'legacy' | 'next' | 'preview';

/** Reads the console mode from the URL, so a specific console can be linked. */
function readConsoleMode(): ConsoleMode {
  if (typeof window === 'undefined') return 'legacy';
  const query = new URLSearchParams(window.location.search);
  if (query.get('preview') === '1') return 'preview';
  if (query.get('console') === 'next') return 'next';
  return 'legacy';
}

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
  const [consoleMode, setConsoleMode] = useState<ConsoleMode>(readConsoleMode);

  if (consoleMode === 'preview') {
    return (
      <>
        <RouteMetadata />
        <Suspense fallback={FALLBACK}>
          <PreviewHarness onExit={() => setConsoleMode('legacy')} />
        </Suspense>
      </>
    );
  }

  if (consoleMode === 'next') {
    return (
      <>
        <RouteMetadata />
        {/* The legacy shells each mount their own IntegrationsProvider; the new
            shell does not, so it is mounted here exactly once. */}
        <IntegrationsProvider>
          <Suspense fallback={FALLBACK}>
            <NextShell
              onOpenLegacy={() => setConsoleMode('legacy')}
              onOpenPreview={() => setConsoleMode('preview')}
            />
          </Suspense>
        </IntegrationsProvider>
      </>
    );
  }

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
      {/* §NEW CONSOLE SWITCH (temporary) — the entry point to `src/next/` while it
          is still incomplete. Removed when the new console becomes the default. */}
      <button
        type="button"
        onClick={() => setConsoleMode('next')}
        className="fixed bottom-4 right-4 z-50 px-3 py-2 text-[12px] font-medium rounded-md border border-zinc-300 bg-white text-zinc-900 shadow-sm hover:bg-zinc-50"
      >
        Open new console
      </button>
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