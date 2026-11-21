import { useState, useRef, useEffect, useCallback } from 'react';
import { BRAND_NAME } from '@/config/brand';
import { PRE_AUDIT_TESTIDS } from '@/config/ukMarketFit';
import { PUBLIC_NAV, type PublicLinkPage } from '@/config/positioning';
/* §NAVIGATION REPAIR (2026-11-20) — the menu now links to a page's DECLARED
   address. See the function's own note for why the id was the wrong href. */
import { pathForPublicPage } from '@/lib/seo/publicRoutes';
import { cn } from '@/utils/cn';
import { BrandMark } from '@/components/shared/BrandMark';
import { ChevronDown, ChevronLeft, Menu, X } from 'lucide-react';

/**
 * §PUBLIC CONTENT PROGRAMME (2026-11-19) — THE PUBLIC NAVIGATION, REBUILT.
 *
 * TWO DEFECTS THIS CLOSES (both measured, both reported by the owner):
 *
 *  1. THE MENU WAS TOO SMALL. Two groups holding eight links, while the approved
 *     information architecture has seven. The groups and their entries are read
 *     from `src/config/positioning.ts` (which reads the content model), so a menu
 *     entry cannot exist without its page.
 *
 *  2. MOBILE FLATTENED THE GROUPS. The old mobile panel printed every child in one
 *     undifferentiated list — usable at eight links, unusable at forty. It is now
 *     GENUINELY NESTED: the panel lists the groups, entering one shows its children
 *     with an explicit Back control, and Escape/Back both return.
 *
 * ACCESSIBILITY: `aria-expanded`/`aria-haspopup` on every group control,
 * ArrowDown/ArrowUp/Home/End through an open group's items, Escape to close and
 * RETURN FOCUS to the group control, and outside-click to close.
 */
export type PublicPage = PublicLinkPage;

interface PublicNavProps {
  currentPage: PublicPage;
  onNavigate: (page: PublicPage) => void;
  onOpenPortal: () => void;
}

const NAV_LINKS = PUBLIC_NAV;

export function PublicNav({ currentPage, onNavigate, onOpenPortal }: PublicNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileGroup, setMobileGroup] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const groupButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const closeAll = useCallback(() => {
    setOpenGroup(null);
    setMobileOpen(false);
    setMobileGroup(null);
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenGroup(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (openGroup) {
        const btn = groupButtonRefs.current[openGroup];
        setOpenGroup(null);
        btn?.focus();
      } else if (mobileGroup) setMobileGroup(null);
      else if (mobileOpen) setMobileOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [openGroup, mobileGroup, mobileOpen]);

  const handleNav = (page: PublicPage) => {
    onNavigate(page);
    closeAll();
  };

  const onItemKeyDown = (e: React.KeyboardEvent, index: number, count: number) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const next =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? count - 1
          : e.key === 'ArrowDown'
            ? (index + 1) % count
            : (index - 1 + count) % count;
    itemRefs.current[next]?.focus();
  };

  const activeMobile = NAV_LINKS.find((g) => g.label === mobileGroup);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-[var(--mr-bg)]/90 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleNav('home');
          }}
          className="flex flex-shrink-0 items-center gap-2.5"
        >
          <BrandMark className="h-7 w-7" />
          <span className="hidden text-sm font-semibold text-[var(--mr-text-strong)] sm:inline">
            {BRAND_NAME}
          </span>
        </a>

        {/* ── Desktop: seven groups, each a real menu ─────────────────────── */}
        <div className="hidden items-center gap-1 lg:flex" ref={dropdownRef}>
          {NAV_LINKS.map((item) => {
            const isOpen = openGroup === item.label;
            return (
              <div key={item.label} className="relative">
                <button
                  type="button"
                  ref={(el) => {
                    groupButtonRefs.current[item.label] = el;
                  }}
                  onClick={() => setOpenGroup(isOpen ? null : item.label)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setOpenGroup(item.label);
                      requestAnimationFrame(() => itemRefs.current[0]?.focus());
                    }
                  }}
                  aria-expanded={isOpen}
                  aria-haspopup="true"
                  data-testid={`public-nav-group-${item.label.toLowerCase()}`}
                  /* §NAVIGATION REPAIR (2026-11-20) — NINE GROUPS MUST FIT AT 1440px.
                     Measured before this change: the ten group buttons totalled
                     1065px against ~1005px available, so "1P Infrastructure" and
                     "Platform Tools" grew from 36px to 57px tall and collided
                     with the logo. The duplicate group is deleted (nine groups
                     now), and `whitespace-nowrap` plus a tighter `px-2.5` leave
                     about 75px spare at 1440px so no label can wrap again. */
                  className="flex items-center gap-1 whitespace-nowrap rounded-ds-sm px-2.5 py-2 font-mono text-ds-label uppercase tracking-[0.16em] text-[var(--mr-text-muted)] transition-colors hover:text-[var(--mr-text-strong)]"
                >
                  {item.label}
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')}
                    aria-hidden="true"
                  />
                </button>

                {isOpen && (
                  <div
                    role="menu"
                    aria-label={item.label}
                    /* §BATCH 2 (2026-11-21) — the panel keeps the reference's
                       TRANSLUCENT, blurred treatment (a theme surface at partial
                       opacity over the page behind it), but now reads that
                       surface from the theme token instead of the legacy
                       `ink` alias. `validate-shared-surfaces` requires both
                       properties, so the token form keeps the contract intact. */
                    className="absolute left-0 top-full mt-2 w-64 border border-[var(--mr-hairline)] bg-[var(--mr-surface-overlay)]/95 backdrop-blur-xl py-2 shadow-ds-overlay"
                  >
                    {item.children.map((child, i) => (
                      <a
                        key={child.page}
                        href={pathForPublicPage(child.page) ?? `/${child.page}`}
                        role="menuitem"
                        ref={(el) => {
                          itemRefs.current[i] = el;
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          handleNav(child.page);
                        }}
                        onKeyDown={(e) => onItemKeyDown(e, i, item.children.length)}
                        className={cn(
                          'block px-4 py-2 font-mono text-ds-label uppercase tracking-[0.14em] transition-colors hover:bg-[var(--mr-hover-tint)]',
                          currentPage === child.page
                            ? 'text-[var(--mr-accent)]'
                            : 'text-[var(--mr-text-muted)] hover:text-[var(--mr-text-strong)]'
                        )}
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* §HOMEPAGE CONCEPT 3 (2026-11-21) — THE TWO HEADER UTILITY ACTIONS.
              Both open the same portal environment. Partner Login stays the
              solid accent action (it is the primary conversion for a returning
              partner); Request Partner Access is the quieter secondary action so
              the header keeps one clear hierarchy. Both are rendered as buttons
              so the keyboard path and the `onOpenPortal` contract are unchanged. */}
          <button
            onClick={onOpenPortal}
            data-testid={PRE_AUDIT_TESTIDS.headerUtility}
            className="ml-3 whitespace-nowrap bg-[var(--mr-accent)] px-4 py-2 font-mono text-ds-label font-semibold uppercase tracking-[0.14em] text-[var(--mr-on-accent)] transition-opacity hover:opacity-90"
          >
            Partner Login
          </button>
          <button
            onClick={onOpenPortal}
            data-testid="public-nav-request-access"
            className="ml-1 whitespace-nowrap px-2 py-2 font-mono text-ds-label uppercase tracking-[0.14em] text-[var(--mr-text-faint)] transition-colors hover:text-[var(--mr-accent)]"
          >
            Request Partner Access
          </button>
        </div>

        <button
          onClick={() => {
            setMobileOpen((o) => !o);
            setMobileGroup(null);
          }}
          className="text-[var(--mr-text-muted)] transition-colors hover:text-[var(--mr-text-strong)] lg:hidden"
          aria-expanded={mobileOpen}
          aria-controls="public-mobile-nav"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          data-testid="public-nav-mobile-toggle"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* ── Mobile: GENUINELY NESTED ──────────────────────────────────────── */}
      {mobileOpen && (
        <div
          id="public-mobile-nav"
          className="max-h-[70vh] overflow-y-auto border-t border-hairline bg-[var(--mr-surface)] px-6 py-4 lg:hidden"
        >
          {!activeMobile ? (
            <>
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('home');
                }}
                className={cn(
                  'block py-3 font-mono text-ds-label uppercase tracking-[0.16em]',
                  currentPage === 'home' ? 'text-[var(--mr-accent)]' : 'text-[var(--mr-text-muted)]'
                )}
              >
                Home
              </a>
              {NAV_LINKS.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setMobileGroup(item.label)}
                  data-testid={`public-nav-mobile-group-${item.label.toLowerCase()}`}
                  className="flex w-full items-center justify-between border-t border-hairline py-3 text-left font-mono text-ds-label uppercase tracking-[0.16em] text-[var(--mr-text-muted)]"
                >
                  {item.label}
                  <ChevronDown className="h-4 w-4 -rotate-90" aria-hidden="true" />
                </button>
              ))}
              <button
                onClick={() => {
                  closeAll();
                  onOpenPortal();
                }}
                className="mt-4 w-full bg-[var(--mr-accent)] px-4 py-3 font-mono text-ds-label font-semibold uppercase tracking-[0.14em] text-[var(--mr-on-accent)]"
              >
                Partner Login
              </button>
              <button
                onClick={() => {
                  closeAll();
                  onOpenPortal();
                }}
                data-testid="public-nav-mobile-request-access"
                className="mt-2 w-full border border-[var(--mr-hairline)] px-4 py-3 font-mono text-ds-label font-semibold uppercase tracking-[0.14em] text-[var(--mr-text-strong)]"
              >
                Request Partner Access
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setMobileGroup(null)}
                data-testid="public-nav-mobile-back"
                className="mb-2 flex items-center gap-1.5 py-2 text-ds-label uppercase tracking-wider text-[var(--mr-accent)]"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Back
              </button>
              <p className="mb-1 font-mono text-ds-label uppercase tracking-[0.16em] text-[var(--mr-text-faint)]">
                {activeMobile.label}
              </p>
              {activeMobile.children.map((child) => (
                <a
                  key={child.page}
                  href={pathForPublicPage(child.page) ?? `/${child.page}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNav(child.page);
                  }}
                  className={cn(
                    'block border-t border-[var(--mr-hairline)] py-3 font-mono text-ds-label uppercase tracking-[0.14em]',
                    currentPage === child.page
                      ? 'text-[var(--mr-accent)]'
                      : 'text-[var(--mr-text-muted)]'
                  )}
                >
                  {child.label}
                </a>
              ))}
            </>
          )}
        </div>
      )}
    </nav>
  );
}
