import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { useApp } from '@/context/GlobalStateContext';
import { Avatar } from '@/components/shared/Avatar';
import { DOMAIN_COLOURS, sectionDomain } from '@/config/themes';
import { BrandMark } from '@/components/shared/BrandMark';
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
    /*
     * §OPENSHIP BATCH 5 — ACCESSIBILITY FIX FOUND BY THE BATCH'S OWN REVIEW (better-accessibility,
     * "one landmark, one name"): this `<aside>` and the `<nav>` inside it BOTH carried
     * `aria-label="Primary"`, so a screen reader's landmark list offered "Primary" twice —
     * two navigation landmarks with the SAME accessible name, which is ambiguous to navigate
     * by. The label belongs to the navigation landmark, not to the complementary wrapper
     * around it, so it is removed here and kept on the `<nav>`. `#app-sidebar` (the tour
     * engine's hook) and the complementary role are unchanged. Pinned by
     * `scripts/validate-shared-surfaces.mjs`, which now requires exactly ONE "Primary" label
     * in this file.
     */
    <aside
      id="app-sidebar"
      data-nav-compact={compact ? 'true' : 'false'}
      /*
       * §OPENSHIP BATCH 5 — THE RAIL IS A FLOATING CARD (spec §3.2/§3.3, the
       * reference's `my-3 ms-3 rounded-2xl border-border/50 bg-card`, and its
       * biggest single visual change). It is no longer a full-height rail with an
       * edge border: it floats with a 12px inset on the top and start sides, has a
       * 16px radius (`rounded-ds-lg`, the container step) and is clipped so the
       * navigation scrolls INSIDE the rounded corners.
       *
       * `.ds-rail` is the edge (it derives the theme's own hairline — see
       * `src/index.css`); the fill stays `bg-ink-900` (the theme's surface role),
       * which is exactly what this element draws today in `bold` and equals the
       * card role in the other four themes, so no theme's rail changes colour.
       */
      className="ds-rail my-3 ms-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-ds-lg border bg-ink-900"
    >
      {/* Brand block + rail controls — §BATCH 5 geometry: `px-5 py-6`, a 26px mark
          and the reference's 16px tracking-tight wordmark (spec §3.3). Collapsed,
          the header stacks (a 72px card cannot hold a 26px mark and a 32px control
          side by side). */}
      <div className="border-b border-hairline">
        <div className={cn('flex items-center gap-3 px-5 pt-6', compact ? 'flex-col pb-3' : 'pb-6')}>
          <BrandMark alt="Mercenta Partners mark" className="h-[26px] w-[26px] flex-shrink-0" />
          {!compact && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-ds-title font-semibold tracking-tight text-strong">Mercenta</div>
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
              className="flex size-8 flex-shrink-0 items-center justify-center rounded-ds-md text-zinc-500 transition-ds duration-ds-fast hover:bg-tint hover:text-zinc-200"
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
        <div className="border-b border-hairline px-3 py-2.5">
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
              className="w-full rounded-ds-md border border-hairline bg-tint py-1.5 pl-7 pr-2 text-ds-label text-zinc-300 transition-ds duration-ds-fast placeholder:text-zinc-600 focus:border-hairline-strong focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Primary navigation — §BATCH 5: the scroll region is wrapped so the
          reference's scroll fade can sit over it (a fade INSIDE a scroller would
          scroll away with the content). */}
      <div className="relative min-h-0 flex-1">
        <nav aria-label="Primary" className="h-full overflow-y-auto px-3 pb-12 pt-3">
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
              <div key={section.label} className="mt-5 first:mt-0">
                {section.label && (
                  <div className="flex items-center gap-1">
                    <p className="mb-2 min-w-0 flex-1 truncate px-2 text-ds-micro font-semibold uppercase tracking-[0.14em] text-zinc-600">
                      {section.label}
                    </p>
                    {!compact && sectionBadge > 0 && (
                      <span
                        aria-hidden="true"
                        className="mb-2 font-mono text-ds-micro text-zinc-500"
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
                        className="mb-2 rounded-ds-sm p-0.5 text-zinc-600 transition-ds duration-ds-fast hover:text-zinc-300"
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
                <ul className="flex flex-col gap-1">
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
                            'flex w-full items-center gap-3 rounded-ds-md text-ds-body font-medium transition-ds duration-ds-fast',
                            compact ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
                            active
                              ? 'text-strong'
                              : 'text-zinc-500 hover:bg-tint hover:text-zinc-200'
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
                            className="h-5 w-5 flex-shrink-0"
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
                                ? 'text-zinc-300 hover:text-strong'
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

      {/* §BATCH 5 — the reference's 56px scroll fade (spec §3.3), so a partly
          scrolled rail reads as scrollable instead of cut off. It never
          intercepts a click, and it fades into the CARD's own fill. */}
      <div
        aria-hidden="true"
        data-testid="nav-scroll-fade"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-ink-900 to-transparent"
      />
      </div>

      {footer}

      {/* Session footer — Avatar + identity. §BATCH 5: the reference's ACCOUNT AREA
          geometry (`px-3 pb-4 pt-1`, a 12px gap, a 14px name over a 12px second
          line). The avatar keeps the design system's own step and its circular
          form rather than the reference's 36px square — the avatar is a shared
          primitive, so its shape belongs to the system, not to this rail. */}
      <div className="border-t border-hairline px-3 pb-4 pt-2">
        <div
          className={cn(
            'flex items-center gap-3 rounded-ds-md px-2 py-2 hover:bg-tint',
            compact && 'justify-center px-0'
          )}
        >
          <Avatar name={userName} email={avatarEmail} size="md" />
          {!compact && (
            <div className="min-w-0">
              <div className="truncate text-ds-body font-semibold leading-tight text-strong">{userName}</div>
              <div className="truncate text-ds-label leading-tight text-zinc-500">
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
