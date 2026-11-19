/**
 * §PHASE 15 — THE CUSTOM 404 (website-integrity launch gate).
 *
 * WHY THIS EXISTS. The site is a single-page application whose server serves
 * `index.html` for EVERY path (see `public/.htaccess`). Before this component an
 * unknown address — `/this-page-does-not-exist` — silently rendered the HOMEPAGE:
 * a 200-status page of real content at an address that names nothing, which is
 * both a dead-end for the visitor and a crawl-quality problem. The SEO route SSOT
 * already declares such a path `unknown` (`noindex, nofollow`, no canonical — see
 * `src/lib/seo/routeMetadata.ts`); this component is the VIEW that verdict
 * implies, so the two no longer disagree.
 *
 * WHERE IT IS WIRED. `Home.tsx` renders this when the SSOT resolves the current
 * address to `kind: 'unknown'`. Only genuinely-unknown addresses reach it: a real
 * public route resolves to its page, and a private route (`/login`, `/admin`) is
 * handled by its own environment before this point — so a real link never falls
 * through to here.
 *
 * HONESTY. It states the page is not found and offers the two real exits (the
 * homepage and the Partner Login). It invents no search, no "popular pages" and no
 * redirect that would quietly pretend the address was correct.
 */
import { useTheme } from '@/context/ThemeContext';
import { BRAND_NAME } from '@/config/brand';
import { cn } from '@/utils/cn';
import { ArrowLeft, LogIn } from 'lucide-react';

export function NotFound({
  onNavigate,
  onOpenPortal,
}: {
  onNavigate: () => void;
  onOpenPortal: () => void;
}) {
  const { shellMode } = useTheme();

  return (
    <div
      data-shell-theme={shellMode}
      className="flex min-h-screen flex-col items-center justify-center px-6 py-24 font-plex"
      style={{ backgroundColor: 'var(--mr-bg)' }}
    >
      <div className="mx-auto max-w-lg text-center">
        <p className="font-mono text-ds-micro uppercase tracking-[0.25em] text-brass">
          Error 404
        </p>
        <h1
          className="mt-4 font-display text-3xl font-semibold leading-[1.12] md:text-4xl"
          style={{ color: 'var(--mr-text)' }}
        >
          We couldn&rsquo;t find that page
        </h1>
        <p className="mt-4 text-sm leading-relaxed md:text-base" style={{ color: 'var(--mr-text-muted)' }}>
          The address may be mistyped, or the page may have moved. You can return to
          the {BRAND_NAME} homepage, or sign in to your portal.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onNavigate}
            className={cn(
              'inline-flex items-center gap-2 rounded-ds-md bg-palette-indigo px-5 py-2.5 text-sm font-semibold text-on-palette',
              'transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass'
            )}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to homepage
          </button>
          <button
            type="button"
            onClick={onOpenPortal}
            className={cn(
              'inline-flex items-center gap-2 rounded-ds-md border px-5 py-2.5 text-sm font-semibold',
              'border-hairline-strong text-parchment transition-colors hover:bg-tint',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass'
            )}
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Partner Login
          </button>
        </div>
      </div>
    </div>
  );
}
