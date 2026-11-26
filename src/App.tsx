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

/**
 * Reads the console mode from the URL, so a specific console can be linked.
 *
 * §OWNER DECISION 2026-11-27 — THE NEW CONSOLE IS THE DEFAULT.
 * "i should be able to run npm run dev and see the new UI from the homepage."
 *
 * `?console=legacy` keeps the old application reachable; `?preview=1` keeps the
 * offline harness reachable. Everything else opens the new console.
 *
 * The PUBLIC pages are the one exception, handled in `AppContent` below: an
 * anonymous visitor must still see the marketing homepage (now Design E), not a
 * staff workspace — a visitor has no session, so the console would show them
 * `core_brand` with nothing in it.
 */
function readConsoleMode(): ConsoleMode {
  if (typeof window === 'undefined') return 'next';
  const query = new URLSearchParams(window.location.search);
  if (query.get('preview') === '1') return 'preview';
  if (query.get('console') === 'legacy') return 'legacy';
  return 'next';
}

/** True when the address asked for the console EXPLICITLY (`?console=next`). */
function consoleWasRequested(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('console') === 'next';
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
  /**
   * §OWNER DECISION 2026-11-27 — a session sees the new console by DEFAULT, but a
   * visitor without a session still gets the marketing homepage. `consoleRequested`
   * is how the "Open new console" button (and an explicit `?console=next`) gets a
   * PUBLIC page past that guard, so the button is never a dead control.
   */
  const [consoleRequested, setConsoleRequested] = useState(consoleWasRequested);
  const openConsole = () => {
    setConsoleRequested(true);
    setConsoleMode('next');
  };
  const isPublicEntry = environment === 'home' || environment === 'login';
  const showConsole = consoleMode === 'next' && (!isPublicEntry || consoleRequested);

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

  if (showConsole) {
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
      {/* §OWNER DECISION 2026-11-27 — this entry point is no longer "temporary":
          the console is the default for a signed-in session, and this button is
          what lets a PUBLIC visitor reach it from the marketing homepage. */}
      <button
        type="button"
        onClick={openConsole}
        className="fixed bottom-4 right-4 z-50 px-3 py-2 text-ds-label font-medium rounded-ds-md border border-hairline bg-surface text-strong shadow-ds-subtle hover:bg-surface-hover"
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