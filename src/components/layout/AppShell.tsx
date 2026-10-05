import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { useApp } from '@/context/GlobalStateContext';
import { useTheme } from '@/context/ThemeContext';
import { Sidebar, type NavSection } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { EnvironmentRouter } from '@/components/layout/EnvironmentRouter';
import { CommandPalette, type CommandGroup } from '@/components/shared/CommandPalette';

const COMPACT_KEY = 'mercenta.nav.compact';

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
  /**
   * §UI/UX Wave 2 — EXTRA command-palette groups for the active shell (real,
   * already tenant-scoped records). The shell always contributes its own
   * "Navigate" group from the SAME navSections it renders, so the palette can
   * never offer a destination the session's role does not have.
   */
  commandGroups?: CommandGroup[];
  /** Placeholder wording for the palette (shell-specific). */
  commandPlaceholder?: string;
  /**
   * §FLOAT-LAUNCHER — optional shell-supplied header chrome actions. The brand
   * shell passes the support-chat trigger here so it lives in the header chrome
   * instead of a fixed bottom-right overlay that covers table row actions.
   */
  headerActions?: ReactNode;
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
  commandGroups,
  commandPlaceholder,
  headerActions,
}: AppShellProps) {
  useApp();
  const { shellMode } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  /** §UI/UX Wave 2 — user preference: icon-only rail (never breakpoint-forced). */
  const [navCompact, setNavCompact] = useState(() => {
    try {
      return window.localStorage.getItem(COMPACT_KEY) === 'true';
    } catch {
      return false;
    }
  });
  /** §UI/UX Wave 2 — command palette (⌘K / Ctrl-K). */
  const [paletteOpen, setPaletteOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(COMPACT_KEY, String(navCompact));
    } catch {
      /* non-fatal */
    }
  }, [navCompact]);

  /** Global ⌘K / Ctrl-K affordance — the canonical findability entry point. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

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

  /**
   * §UI/UX Wave 2 — palette "Navigate" group built from the SAME navSections
   * the rail renders, so RBAC filtering is inherited rather than re-implemented.
   */
  const paletteGroups: CommandGroup[] = [
    ...(commandGroups ?? []),
    {
      label: 'Navigate',
      items: navSections.flatMap((s) =>
        s.items.map((it) => ({
          id: `nav-${it.id}`,
          label: it.label,
          meta: s.label,
          onSelect: () => handleNavChange(it.id),
        }))
      ),
    },
  ];

  return (
    <div
      data-shell-theme={shellMode}
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--mr-bg)' }}
    >
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
          'fixed top-0 z-50 flex h-full flex-col border-r border-white/[0.06] bg-ink-900 shadow-ds-raised transition-ds duration-ds',
          navCompact ? 'w-72 lg:w-16' : 'w-72 lg:w-60',
          navOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:static lg:translate-x-0'
        )}
      >
        <Sidebar
          sections={navSections}
          activeView={activeView}
          setActiveView={handleNavChange}
          userName={userName}
          themeAccent={themeAccent}
          compact={navCompact}
          onToggleCompact={() => setNavCompact((c) => !c)}
          /**
           * §UI/UX Wave 3 — the demo environment switcher is an INLINE footer
           * control, not a floating overlay. It previously sat on top of the
           * last rows of every workspace.
           */
          footer={<EnvironmentRouter compact={navCompact} />}
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
          onOpenSearch={() => setPaletteOpen(true)}
          extraActions={headerActions}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto"
          style={{ backgroundColor: 'var(--mr-bg)' }}
        >
          {/* §UI/UX Wave 2 — surfaces compose their own WorkspaceFrame so each
              page owns its density; migrated surfaces use src/components/shared/
              workspace.tsx. (No blanket wrapper: un-migrated pages keep their
              existing composition until Phase D migrates them.) */}
          {children}
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        groups={paletteGroups}
        placeholder={commandPlaceholder}
      />
    </div>
  );
}
