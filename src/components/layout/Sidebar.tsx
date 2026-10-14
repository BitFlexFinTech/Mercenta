import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { useApp } from '@/context/GlobalStateContext';
import { Avatar } from '@/components/shared/Avatar';
import { DOMAIN_COLOURS, sectionDomain } from '@/config/themes';
import brandMark from '@/assets/mercenta-mark-dark-bg.svg';
import { ChevronDown, Pin, PanelLeftClose, PanelLeft, Search } from 'lucide-react';

/**
 * §Phase 6 §UI/UX Wave 2 — grouped navigation model with SATURATED feature
 * identity. Section items keep the exact same view ids/targets as before;
 * sections are pure presentation grouping so navigation behaviour and RBAC are
 * unchanged.
 *
 * Wave 2 adds, all presentation-only:
 *  - solid saturated section identity resolved once from `sectionDomain`
 *    (src/config/themes.ts) instead of a per-label string heuristic;
 *  - optional per-item attention counts (`badge`) supplied by the shell from
 *    data that shell's role is already entitled to see;
 *  - collapsible sections (expanded by default) and pinning, both stored as
 *    user preferences in localStorage;
 *  - an opt-in compact rail (`compact`). Compact mode is an explicit user
 *    preference, never breakpoint-forced, so navigation labels stay available
 *    to assistive technology and to the role-specific navigation contract at
 *    every desktop width.
 */
export interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  tourAttr?: string;
  /** Optional outstanding-work count (numeric pill + accessible label). */
  badge?: number;
  /**
   * §SSOT S5 — the DECLARED set the badge number belongs to ("Needs attention",
   * "Overdue work", …). A badge number is never rendered without it, so a count
   * can never be read as a different set than the one it counts.
   */
  badgeLabel?: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  /** Sections (one implied for ungrouped navs). */
  sections: NavSection[];
  activeView: string;
  setActiveView: (v: string) => void;
  userName: string;
  userEmail?: string;
  themeAccent?: string;
  /** Icon-only rail. Opt-in user preference (never breakpoint-forced). */
  compact?: boolean;
  onToggleCompact?: () => void;
  /** Optional footer slot (kept for shell-level affordances). */
  footer?: ReactNode;
}

/** §UI/UX Wave 2 — solid saturated section colour, resolved from one source. */
function sectionAccentVar(label: string): string {
  return DOMAIN_COLOURS[sectionDomain(label)].solid;
}

const PIN_KEY = 'mercenta.nav.pinned';
const COLLAPSED_KEY = 'mercenta.nav.collapsed';

function readList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    /* storage unavailable (private mode) — fall back to empty preference */
  }
  return [];
}


export function Sidebar({
  sections,
  activeView,
  setActiveView,
  userName,
  userEmail,
  compact = false,
  onToggleCompact,
  footer,
}: SidebarProps) {
  const { environment, session, brandProfile, actingStaff } = useApp();
  /** §UI/UX Wave 2 — user preferences (presentation only). */
  const [pinned, setPinned] = useState<string[]>(() => readList(PIN_KEY));
  const [collapsed, setCollapsed] = useState<string[]>(() => readList(COLLAPSED_KEY));
  /**
   * §UI/UX Wave 3 — NAVIGATION FILTER.
   *
   * The Super Admin rail is 30+ destinations across 8 sections and the only way
   * to reach one was to scroll the whole rail. This filters what is RENDERED —
   * it is presentation-only and derives from the sections the SHELL already
   * scoped, so no destination can be revealed by searching for it. RBAC is
   * unchanged (§18: the UI is never the authority).
   */
  const [query, setQuery] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(PIN_KEY, JSON.stringify(pinned));
    } catch {
      /* non-fatal */
    }
  }, [pinned]);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed));
    } catch {
      /* non-fatal */
    }
  }, [collapsed]);

  const togglePin = (id: string) =>
    setPinned((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.concat([id])));

  const toggleSection = (label: string) =>
    setCollapsed((c) => (c.includes(label) ? c.filter((x) => x !== label) : c.concat([label])));

  /**
   * §UI/UX Wave 3 — derived filter over the shell's already-RBAC-scoped sections.
   * While a filter is active every matching section is shown expanded, because a
   * collapsed section would hide the very result the user just searched for.
   */
  const navQuery = query.trim().toLowerCase();
  const navFilterActive = navQuery.length > 0;
  const visibleSections = navFilterActive
    ? sections
        .map((s) => ({
          ...s,
          items: s.items.filter((i) => i.label.toLowerCase().includes(navQuery)),
        }))
        .filter((s) => s.items.length > 0)
    : sections;
  const navFilterEmpty = navFilterActive && visibleSections.length === 0;

  /**
   * §P9 (programme decision 4) — REPOINTED. The old chain ended in a
   * `'Carrier View'` fallback, but the carrier environment is gone and
   * `Environment` is now exactly home | login | brand | admin, so the only
   * non-brand value a SHELL can render is admin.
   */
  const envLabel =
    environment === 'brand' ? 'Brand Portal' : 'Admin Hub';

  /** Avatar identity derived exactly like Header's session identity. */
  const avatarEmail =
    environment === 'brand'
      ? brandProfile.email || undefined
      : environment === 'admin'
        ? actingStaff?.email || userEmail
        : userEmail;

  return (
    <aside
      id="app-sidebar"
      aria-label="Primary"
      data-nav-compact={compact ? 'true' : 'false'}
      className="flex h-full w-full flex-col border-r border-white/[0.06] bg-ink-900"
    >
      {/* Brand block + rail controls */}
      <div className="border-b border-white/[0.06] px-3 py-3">
        <div className="flex items-center gap-2.5">
          <img
            src={brandMark}
            alt="Mercenta Partners hexagon mark"
            className="h-8 w-8 flex-shrink-0"
          />
          {!compact && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold tracking-tight text-white">Mercenta</div>
              <div className="truncate text-ds-micro uppercase tracking-wider text-zinc-500">
                {envLabel}
              </div>
            </div>
          )}
          {onToggleCompact && (
            <button
              type="button"
              onClick={onToggleCompact}
              aria-label={compact ? 'Expand navigation' : 'Collapse navigation'}
              aria-pressed={compact}
              data-testid="nav-compact-toggle"
              className="flex-shrink-0 rounded-ds-sm p-1 text-zinc-500 transition-ds duration-ds-fast hover:bg-white/[0.04] hover:text-zinc-200"
            >
              {compact ? (
                <PanelLeft className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* §UI/UX Wave 3 — find a destination without scrolling the whole rail. */}
      {!compact && (
        <div className="border-b border-white/[0.06] px-3 py-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter navigation…"
              aria-label="Filter navigation"
              data-testid="nav-filter"
              className="w-full rounded-ds-sm border border-white/[0.06] bg-white/[0.02] py-1.5 pl-7 pr-2 text-ds-label text-zinc-300 transition-ds duration-ds-fast placeholder:text-zinc-600 focus:border-white/[0.16] focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Primary navigation */}
      <nav aria-label="Primary" className="flex-1 overflow-y-auto px-2 py-2">
        {visibleSections.map((section) => {
          const accent = sectionAccentVar(section.label);
          /**
           * While a filter is active, a collapsed section would hide the result
           * the user just searched for — so every match is shown expanded.
           */
          const isCollapsed = navFilterActive
            ? false
            : section.label
              ? collapsed.includes(section.label)
              : false;
          /**
           * §UI/UX Wave 2 — pinned destinations sort FIRST inside their own
           * section, so a destination is never duplicated (no second
           * aria-current, no ambiguous nav target).
           */
          const ordered = [...section.items].sort((a, b) => {
            const pa = pinned.includes(a.id) ? 0 : 1;
            const pb = pinned.includes(b.id) ? 0 : 1;
            return pa - pb;
          });
          const sectionBadge = section.items.reduce((a, i) => a + (i.badge ?? 0), 0);
          return (
            <div key={section.label} className="mb-0.5 mt-2 first:mt-0">
              {section.label && (
                <div className="flex items-center gap-1">
                  <p className="mb-1 min-w-0 flex-1 truncate px-2 text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-600">
                    {section.label}
                  </p>
                  {!compact && sectionBadge > 0 && (
                    <span
                      aria-hidden="true"
                      className="mb-0.5 font-mono text-ds-micro text-zinc-500"
                    >
                      {sectionBadge}
                    </span>
                  )}
                  {!compact && (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.label)}
                      aria-expanded={!isCollapsed}
                      aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${section.label}`}
                      data-testid={`nav-collapse-${section.label}`}
                      className="mb-0.5 rounded-ds-sm p-0.5 text-zinc-600 transition-ds duration-ds-fast hover:text-zinc-300"
                    >
                      <ChevronDown
                        className={cn(
                          'h-3 w-3 transition-transform duration-ds-fast',
                          isCollapsed && '-rotate-90'
                        )}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>
              )}
              {!isCollapsed && (
              <ul className="flex flex-col gap-0.5">
                {ordered.map((item) => {
                  const active = activeView === item.id;
                  const itemPinned = pinned.includes(item.id);
                  return (
                    <li key={item.id} className="group/navitem relative">
                      <button
                        type="button"
                        onClick={() => setActiveView(item.id)}
                        data-tour={item.tourAttr}
                        data-state={active ? 'active' : 'idle'}
                        data-compact={compact ? 'true' : 'false'}
                        aria-current={active ? 'page' : undefined}
                        title={compact ? item.label : undefined}
                        className={cn(
                          'flex w-full items-center gap-2.5 rounded-ds-md text-sm transition-ds duration-ds-fast',
                          compact ? 'justify-center px-0 py-2' : 'px-2.5 py-1.5',
                          active
                            ? 'text-white'
                            : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200'
                        )}
                        style={
                          active
                            ? {
                                backgroundColor: `color-mix(in srgb, ${accent} 18%, transparent)`,
                              }
                            : undefined
                        }
                      >
                        <span
                          className="h-4 w-4 flex-shrink-0"
                          style={{ color: active ? accent : undefined }}
                        >
                          {item.icon}
                        </span>
                        {!compact && (
                          <span className="min-w-0 flex-1 truncate text-left font-medium">
                            {item.label}
                          </span>
                        )}
                        {!compact && typeof item.badge === 'number' && item.badge > 0 && (
                          <span
                            data-testid={`nav-badge-${item.id}`}
                            /* §SSOT S5 — the number travels with its DECLARED set. */
                            data-badge-label={item.badgeLabel}
                            title={item.badgeLabel ? `${item.badge} ${item.badgeLabel}` : undefined}
                            aria-label={item.badgeLabel ? `${item.badge} ${item.badgeLabel}` : undefined}
                            className="flex-shrink-0 rounded-full px-1.5 py-0.5 font-mono text-ds-micro font-semibold leading-none"
                            style={{ backgroundColor: accent, color: 'var(--mr-on-palette)' }}
                          >
                            {item.badge}
                          </span>
                        )}
                        {active && (
                          <span
                            aria-hidden="true"
                            className="h-3.5 w-[3px] flex-shrink-0 rounded-full"
                            style={{ backgroundColor: accent }}
                          />
                        )}
                      </button>
                      {!compact && (
                        <button
                          type="button"
                          onClick={() => togglePin(item.id)}
                          aria-label={
                            itemPinned ? `Unpin ${item.label}` : `Pin ${item.label} to the top`
                          }
                          data-testid={`nav-pin-${item.id}`}
                          className={cn(
                            'absolute right-1 top-1/2 -translate-y-1/2 rounded-ds-sm p-0.5 transition-ds duration-ds-fast',
                            itemPinned
                              ? 'text-zinc-300 hover:text-white'
                              : 'text-transparent hover:text-zinc-200 group-hover/navitem:text-zinc-500'
                          )}
                        >
                          <Pin className="h-3 w-3" aria-hidden="true" />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              )}
            </div>
          );
        })}
        {navFilterEmpty && (
          <p className="px-2 py-3 text-ds-label text-zinc-600" data-testid="nav-filter-empty">
            No destinations match “{query.trim()}”.
          </p>
        )}
      </nav>

      {footer}

      {/* Session footer — Avatar + identity */}
      <div className="border-t border-white/[0.06] px-3 py-3">
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-ds-md px-2 py-1.5 hover:bg-white/[0.03]',
            compact && 'justify-center px-0'
          )}
        >
          <Avatar name={userName} email={avatarEmail} size="sm" />
          {!compact && (
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-white">{userName}</div>
              <div className="truncate text-ds-micro text-zinc-500">
                {session?.tier === 'brand'
                  ? envLabel
                  : `${envLabel} · ${actingStaff?.role ?? ''}`.trim()}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
