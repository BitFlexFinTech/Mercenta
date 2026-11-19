/**
 * §PUBLIC MESSAGING B4 (2026-09-28) — THE COOKIE NOTICE.
 *
 * WHY THIS EXISTS. There was no cookie notice at all on the public site, so a
 * visitor's device was written to (the theme choice) with nothing telling them
 * so, and nothing recording that they had been told.
 *
 * WHAT MAKES IT REAL, not decorative — the four things this project requires of
 * any control before it may be called done:
 *
 *  1. IT DOES SOMETHING. Answering it writes `mercenta.cookie-notice` and the
 *     notice stops appearing on every later visit. It is not a dismiss-to-hide
 *     banner that returns on the next page load.
 *  2. IT IS RE-OPENABLE. The footer's "Cookie settings" control clears the
 *     record and brings the notice back, so a visitor can always see it again —
 *     a choice you cannot revisit is not a choice.
 *  3. IT IS HONEST. It offers no "accept analytics" or "reject advertising"
 *     button, because the public site runs neither. Verified 2026-09-28:
 *     `index.html`, `package.json` and `src/main.tsx` load no analytics,
 *     tag-manager, session-replay or advertising script, and the public surface
 *     writes only `mercenta.theme` plus this notice's own record. A control that
 *     rejected a capability we do not have would be a lie told in a button, so
 *     the notice states the truth and gives the one action that is real.
 *     (Copy lives in `src/config/positioning.ts` §13 — never retyped here.)
 *  4. IT SURVIVES A CLOSED TAB, unlike the tour progress that deliberately lives
 *     in `sessionStorage`: a recorded acknowledgement must last.
 *
 * ACCESSIBILITY. A labelled `region` (not a modal — it must not trap a keyboard
 * user), polite live announcement, real buttons with visible focus, and it takes
 * the shell theme so it is legible in both light and dark.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import {
  PUBLIC_COOKIE_NOTICE,
  PUBLIC_COOKIE_NOTICE_REGION,
  type PublicLinkPage,
} from '@/config/positioning';
import { cn } from '@/utils/cn';

/** Where a visitor's acknowledgement is recorded. */
export const COOKIE_NOTICE_STORAGE_KEY = 'mercenta.cookie-notice';

/** The only recorded value — the notice has exactly one real answer. */
export const COOKIE_NOTICE_ACKNOWLEDGED = 'acknowledged';

/**
 * Raised by any surface (today: the footer's "Cookie settings" control) to bring
 * the notice back. A DOM event rather than shared state keeps the footer and the
 * notice independent — neither has to know the other exists.
 */
export const COOKIE_SETTINGS_EVENT = 'mercenta:cookie-settings';

function readAnswered(): boolean {
  try {
    return window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY) === COOKIE_NOTICE_ACKNOWLEDGED;
  } catch {
    /* storage unavailable (private mode) — show the notice rather than assume. */
    return false;
  }
}

export function CookieNotice({ onNavigate }: { onNavigate: (page: PublicLinkPage) => void }) {
  const { shellMode } = useTheme();
  /**
   * Starts hidden and is revealed by the effect below, so a visitor who has
   * already answered never sees a flash of the banner on load.
   */
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!readAnswered());
  }, []);

  useEffect(() => {
    const reopen = () => {
      try {
        window.localStorage.removeItem(COOKIE_NOTICE_STORAGE_KEY);
      } catch {
        /* non-fatal — the notice is shown regardless. */
      }
      setOpen(true);
    };
    window.addEventListener(COOKIE_SETTINGS_EVENT, reopen);
    return () => window.removeEventListener(COOKIE_SETTINGS_EVENT, reopen);
  }, []);

  const acknowledge = useCallback(() => {
    try {
      window.localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, COOKIE_NOTICE_ACKNOWLEDGED);
    } catch {
      /* non-fatal: the notice closes for this page view either way. */
    }
    setOpen(false);
  }, []);

  if (!open) return null;

  return (
    <div
      data-shell-theme={shellMode}
      role="region"
      aria-label={PUBLIC_COOKIE_NOTICE_REGION}
      aria-live="polite"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-ink-850',
        'md:inset-x-auto md:right-6 md:bottom-6 md:max-w-md md:rounded-ds-lg md:border md:shadow-ds-overlay'
      )}
    >
      <div className="mx-auto max-w-6xl px-6 py-5 md:px-5">
        <h2 className="font-display text-sm font-semibold text-parchment">
          {PUBLIC_COOKIE_NOTICE.heading}
        </h2>
        <p className="mt-2 text-ds-label leading-relaxed text-steel">{PUBLIC_COOKIE_NOTICE.body}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            type="button"
            onClick={acknowledge}
            className="rounded-ds-md bg-palette-indigo px-4 py-2 text-xs font-semibold text-on-palette transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            {PUBLIC_COOKIE_NOTICE.acknowledgeLabel}
          </button>
          <button
            type="button"
            onClick={() => onNavigate('privacy')}
            className="text-xs font-medium text-steel underline underline-offset-4 transition-colors hover:text-brass-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            {PUBLIC_COOKIE_NOTICE.policyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
