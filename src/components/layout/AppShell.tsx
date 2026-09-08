import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { useApp } from '@/context/GlobalStateContext';
import { Sidebar, type NavSection } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { EnvironmentRouter } from '@/components/layout/EnvironmentRouter';

interface AppShellProps {
  children: ReactNode;
  /** Grouped navigation sections (item ids are existing activeView targets). */
  navSections: NavSection[];
  activeView: string;
  setActiveView: (v: string) => void;
  breadcrumb: string;
  userName: string;
  themeAccent?: string;
  onNavSettings?: () => void;
  onNavBilling?: () => void;
  onNavApiKeys?: () => void;
  onNavNotification?: (view: string) => void;
}

export function AppShell({
  children,
  navSections,
  activeView,
  setActiveView,
  breadcrumb,
  userName,
  themeAccent,
  onNavSettings,
  onNavBilling,
  onNavApiKeys,
  onNavNotification,
}: AppShellProps) {
  useApp();
  const [navOpen, setNavOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Escape closes the mobile drawer and returns focus to the toggle.
  useEffect(() => {
    if (!navOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setNavOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  /** The active nav item's section heading for the breadcrumb trail. */
  const activeSection = (() => {
    for (const section of navSections) {
      if (section.items.some((it) => it.id === activeView)) return section.label;
    }
    return null;
  })();

  // Canonical breadcrumb trail: "Section › Current-label". When one crumb is a
  // case-insensitive superset of the other ("Admin Overview" ⊇ "Overview"),
  // keep the more specific one so trails never read redundantly.
  const trail = [activeSection, breadcrumb].reduce(
    (acc: { label: string }[], label) => {
      if (!label) return acc;
      if (acc.length === 0) return acc.concat([{ label }]);
      const prev = acc[acc.length - 1].label;
      const a = label.toLowerCase();
      const b = prev.toLowerCase();
      if (a === b) return acc;
      if (a.includes(b)) return acc.slice(0, acc.length - 1).concat([{ label }]);
      if (b.includes(a)) return acc;
      return acc.concat([{ label }]);
    },
    []
  );

  /** Close the drawer after a navigation selection (never moves focus). */
  const handleNavChange = (view: string) => {
    setActiveView(view);
    if (navOpen) setNavOpen(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      {/* Accessible skip link — first element in tab order. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 bg-brass-500 px-3 py-2 rounded text-white shadow-ds-overlay"
      >
        Skip to content
      </a>

      {/* Mobile drawer backdrop (below lg only, while open). */}
      {navOpen && (
        <div
          aria-hidden="true"
          onClick={() => setNavOpen(false)}
          data-testid="app-drawer-backdrop"
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
        />
      )}

      {/* Drawer below lg; static aligned layout at lg+. Single nav DOM tree. */}
      <div
        className={cn(
          'fixed top-0 z-50 flex h-full w-72 flex-col bg-ink-900 transition-ds border-r border-white/[0.06]',
          navOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:static lg:w-60 lg:translate-x-0'
        )}
      >
        <Sidebar
          sections={navSections}
          activeView={activeView}
          setActiveView={handleNavChange}
          userName={userName}
          themeAccent={themeAccent}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          breadcrumbs={trail}
          onToggleNav={() => setNavOpen((o) => !o)}
          navOpen={navOpen}
          toggleRef={toggleRef}
          onNavSettings={onNavSettings}
          onNavBilling={onNavBilling}
          onNavApiKeys={onNavApiKeys}
          onNavNotification={onNavNotification}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto pb-16 bg-black"
        >
          {children}
        </main>
      </div>

      <EnvironmentRouter />
    </div>
  );
}
