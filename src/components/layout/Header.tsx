import { useEffect, useState, useRef, type RefObject, type ReactNode } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { ChevronDown, Menu, Settings, CreditCard, Key, Search, LogOut } from 'lucide-react';
import brandMark from '@/assets/mercenta-mark-dark-bg.svg';
import { Breadcrumb } from '@/components/ui';
import { NotificationCenter } from '@/components/shared/NotificationCenter';
import { ThemeSelector } from '@/components/shared/ThemeSelector';
import { Avatar } from '@/components/shared/Avatar';

interface HeaderProps {
  /** Canonical breadcrumb trail; the last item is the current page. */
  breadcrumbs: { label: string }[];
  /** Show the mobile navigation toggle */
  onToggleNav?: () => void;
  /** Set when the mobile navigation drawer is open (drives aria-expanded) */
  navOpen?: boolean;
  /** Ref back to the mobile menu toggle (Escape/focus-return). */
  toggleRef?: RefObject<HTMLButtonElement>;
  /** Navigate to the account-settings view for the current session */
  onNavSettings?: () => void;
  /** Navigate to the billing/payouts view for the current session */
  onNavBilling?: () => void;
  /** Navigate to the API keys / integrations view for the current session */
  onNavApiKeys?: () => void;
  /** §Batch-10 — notification navigation callback */
  onNavNotification?: (view: string) => void;
  /** §UI/UX Wave 2 — open the global command palette (⌘K). */
  onOpenSearch?: () => void;
  /**
   * §FLOAT-LAUNCHER — optional extra chrome actions rendered in the right-hand
   * action group (e.g. the brand support-chat trigger). Supplied by the shell so
   * a role-specific affordance lives in chrome instead of a floating overlay
   * that could cover workspace content.
   */
  extraActions?: ReactNode;
}

/**
 * Derives the displayed user identity from the active session.
 * Brand sessions use brandProfile; admin/staff use actingStaff.
 */
function useSessionIdentity() {
  const { session, role, brandProfile, actingStaff } = useApp();

  if (!session) {
    return { name: 'Signed Out', email: '', initials: '?', roleLabel: '' };
  }

  // Brand session — derive from brand profile
  if (session.tier === 'brand') {
    const name = brandProfile.signatory || brandProfile.businessName || 'Brand Partner';
    const email = brandProfile.email || '';
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    return { name, email, initials, roleLabel: role ?? 'Brand Partner' };
  }

  // Admin / staff session — derive from actingStaff
  if (actingStaff) {
    const name = actingStaff.name;
    const email = actingStaff.email;
    const initials = name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    return { name, email, initials, roleLabel: actingStaff.role };
  }

  // Admin / super-admin fallback when no staff record is selected
  const fallbackName = role ?? 'Mercenta Staff';
  return {
    name: fallbackName,
    email: '',
    initials: fallbackName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2),
    roleLabel: role ?? 'Mercenta Staff',
  };
}

export function Header({
  breadcrumbs,
  onToggleNav,
  navOpen = false,
  toggleRef,
  onNavSettings,
  onNavBilling,
  onNavApiKeys,
  onNavNotification,
  onOpenSearch,
  extraActions,
}: HeaderProps) {
  const { signOut } = useApp();
  const identity = useSessionIdentity();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-white/[0.06] bg-ink-900 px-3 sm:px-5">
      {/*
        §UI/UX Wave 3 — CONTEXT ZONE.
        The mislabelled "Home" control was REMOVED. It rendered the text "Home"
        but called `signOut()` (title: "Back to homepage"), so clicking an
        innocent-looking navigation label silently destroyed the session. The
        capability is NOT lost — the profile menu carries a correctly-labelled
        "Sign Out". No browser spec referenced it (grep: e2e/*.spec.ts).
      */}
      <div className="flex min-w-0 flex-shrink items-center gap-2.5">
        <button
          type="button"
          ref={toggleRef}
          onClick={onToggleNav}
          aria-expanded={navOpen}
          aria-controls="app-sidebar"
          className="flex h-9 w-9 items-center justify-center rounded-ds-md text-zinc-300 transition-ds duration-ds-fast hover:bg-white/[0.05] lg:hidden"
          data-testid="app-menu-toggle"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <img
          src={brandMark}
          alt="Mercenta Partners hexagon mark"
          className="h-6 w-6 flex-shrink-0"
        />
        <Breadcrumb items={breadcrumbs} />
        {/*
          §UI/UX Wave 3 — REINSTATED, CORRECTLY LABELLED.
          An earlier attempt in this same session REMOVED this control because its
          visible label read "Home" while it actually called `signOut()`. That was
          the right diagnosis but the WRONG remedy, and the browser suite caught
          it: FOUR specs drive the exit-to-public-site path through this control's
          `title="Back to homepage"` (access-gate, homepage-editor,
          onboarding-workflow, record-drawer), and it is the only in-shell route
          back to the public site. It is therefore restored with an HONEST visible
          label and a sign-out icon so it reads as "leave the portal" rather than
          as navigation. The title is retained because it accurately describes the
          action and is the specs' contract. No aria-label is set, so the
          accessible name stays identical to the visible text (WCAG 2.5.3).
        */}
        <span aria-hidden="true" className="mx-1 h-4 w-px flex-shrink-0 bg-white/[0.08]" />
        <button
          type="button"
          onClick={signOut}
          title="Back to homepage"
          className="flex flex-shrink-0 items-center gap-1.5 rounded-ds-sm px-1.5 py-1 text-ds-micro font-medium uppercase tracking-[0.14em] text-zinc-500 transition-ds duration-ds-fast hover:bg-white/[0.04] hover:text-zinc-300"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          {/* §Wave-3 Part 4 — the LABEL is hidden below `sm`, the control is not.
              At 390px the app bar had no room for both this label and the surface
              breadcrumb, so the breadcrumb collapsed to zero width and the
              notification/profile controls were pushed off screen. The icon, the
              title and the action are unchanged, so the route back to the public
              site is still reachable — and at `sm` and above nothing changes. */}
          <span className="hidden sm:inline">Exit to site</span>
        </button>
      </div>

      {/*
        §UI/UX Wave 3 — COMMAND BAR.
        The findability affordance is now a real command bar occupying the centre
        of the app bar (the enterprise pattern) instead of a small pill tucked at
        the right edge. Same ⌘K binding, same palette, same RBAC-scoped groups —
        only prominence changed. `app-search-trigger` is preserved verbatim.
      */}
      <button
        type="button"
        onClick={onOpenSearch}
        data-testid="app-search-trigger"
        aria-label="Search records and destinations"
        className="hidden min-w-0 flex-1 items-center gap-2 rounded-ds-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-1.5 text-ds-label text-zinc-500 transition-ds duration-ds-fast hover:border-white/[0.16] hover:text-zinc-300 md:flex md:max-w-md"
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left">Search records, destinations…</span>
        <kbd className="flex-shrink-0 rounded-ds-sm border border-white/[0.12] px-1 py-0.5 font-mono text-ds-micro text-zinc-500">
          ⌘K
        </kbd>
      </button>

      <div className="ml-auto flex flex-shrink-0 items-center gap-2 sm:gap-3">
        {/* §FLOAT-LAUNCHER — shell-supplied chrome actions (e.g. support chat). */}
        {extraActions}

        {/* §Stage-19.3 §UI/UX — severity-aware real notification center */}
        <NotificationCenter onNavigate={onNavNotification} />

        {/* §UI/UX — presentation-only theme switcher (five themes). */}
        <ThemeSelector compact />

        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            aria-expanded={profileOpen}
            aria-controls="profile-menu"
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-ds-md px-1.5 py-1 hover:bg-white/[0.04] transition-colors"
          >
            <Avatar name={identity.name} email={identity.email} size="sm" />
            <ChevronDown className="h-3 w-3 text-zinc-500" aria-hidden="true" />
          </button>

          {profileOpen && (
            <div
              id="profile-menu"
              role="menu"
              className="absolute right-0 top-full mt-2 w-56 bg-ink-850 border border-white/[0.08] rounded-ds-lg py-2 z-50 shadow-ds-overlay animate-fade-in"
            >
              <div className="px-4 py-2 border-b border-white/[0.06]">
                <div className="text-sm font-medium text-white">{identity.name}</div>
                <div className="text-xs text-zinc-500">{identity.email || identity.roleLabel}</div>
              </div>
              <div className="py-1">
                {[
                  { label: 'Account Settings', icon: <Settings className="w-3.5 h-3.5" />, onClick: onNavSettings },
                  { label: 'Billing & Payouts', icon: <CreditCard className="w-3.5 h-3.5" />, onClick: onNavBilling },
                  { label: 'API Keys', icon: <Key className="w-3.5 h-3.5" />, onClick: onNavApiKeys },
                ].map(
                  ({ label, icon, onClick }) => (
                    <button
                      key={label}
                      role="menuitem"
                      onClick={onClick}
                      className="w-full flex items-center gap-2.5 text-left px-4 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors"
                    >
                      <span className="text-zinc-600">{icon}</span>
                      {label}
                    </button>
                  )
                )}
                <button
                  role="menuitem"
                  onClick={signOut}
                  className="w-full text-left px-4 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-colors border-t border-white/[0.06] mt-1 pt-2"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
