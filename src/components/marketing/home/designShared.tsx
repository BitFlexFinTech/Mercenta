/**
 * §BRAND REDESIGN (2026-11-20) — WHAT THE FOUR DESIGNS SHARE, AND ONLY THAT.
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * The four homepage designs previously shared NINE section components in the
 * SAME ORDER. That is why they looked like one design in four colourways: the
 * composition, which is what makes a design a design, was identical.
 *
 * The fix is that each design now owns its own sections. What remains shared is
 * only what must not differ between them:
 *
 *   1. THE THREE PRESERVED ACTIONS (owner instruction, unchanged):
 *        · Explore UK Market Fit  → onPrimary()      → /explore-uk-market-fit
 *        · Partner Login          → onOpenPortal()   → the login environment
 *        · Request Partner Access → onOpenPortal()   → the login environment
 *      No design may add, rename, remove or repoint one of these.
 *   2. THE TRACKER ANIMATION (`HeroTracker`) — a shared component, placed
 *      differently by each design but never reimplemented.
 *   3. THE CONTENT MODEL — every design reads the same approved copy.
 *
 * Everything else — order, grid, typography, imagery, density — is per design.
 */
import { ArrowRight, UserPlus } from 'lucide-react';
import type { ReactNode } from 'react';
import type { HomepageContent } from '@/config/homepageContent';
import { UnlockGrowth } from '@/components/shared/UnlockGrowth';
import { cn } from '@/utils/cn';

export interface HomeDesignProps {
  content: HomepageContent;
  /** → `/explore-uk-market-fit` (the assessment). */
  onPrimary: () => void;
  /** The primary CTA's label, read from its owner. */
  primaryLabel: string;
  primaryTestId?: string;
  /** → the login environment. Used by BOTH Partner Login and Request Partner Access. */
  onOpenPortal: () => void;
}

/** The three preserved actions. Identical in every design, by instruction. */
export function HeroActions({
  onPrimary,
  primaryLabel,
  primaryTestId,
  onOpenPortal,
  className,
}: HomeDesignProps & { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-8 gap-y-4', className)}>
      <button
        onClick={onPrimary}
        data-testid={primaryTestId}
        className="inline-flex items-center gap-2.5 bg-[var(--mr-accent)] px-7 py-3.5 text-base font-bold text-[var(--mr-on-accent)] transition-opacity hover:opacity-90"
      >
        {primaryLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        onClick={onOpenPortal}
        data-testid="homepage-partner-login"
        className="border-b border-[var(--mr-text-muted)] pb-1 text-base text-[var(--mr-text-strong)] transition-colors hover:border-[var(--mr-accent)] hover:text-[var(--mr-accent)]"
      >
        Partner Login
      </button>
      <button
        onClick={onOpenPortal}
        data-testid="homepage-request-access"
        className="inline-flex items-center gap-2 text-base text-[var(--mr-text-muted)] transition-colors hover:text-[var(--mr-accent)]"
      >
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Request Partner Access
      </button>
    </div>
  );
}

/** A small monospaced label. Each design places and styles it its own way. */
export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'font-mono text-ds-label uppercase tracking-[0.22em] text-[var(--mr-accent)]',
        className
      )}
    >
      {children}
    </span>
  );
}

/** The closing call to action. Shared because its destination must not vary. */
export function Closing({
  content,
  onPrimary,
  primaryLabel,
  primaryTestId,
  inverted = false,
}: HomeDesignProps & { inverted?: boolean }) {
  const c = content.finalCta;
  return (
    <>
      {/*
       * §HONESTY NOTE (2026-11-20) — PRESERVED AS A CONTENT CONTRACT.
       *
       * `UnlockGrowth` states a claim that has to be TRUE on every homepage:
       * "every number on Mercenta is derived from real, tenant-scoped records".
       * It is therefore not a design element that one direction may drop — it is
       * an obligation, like the three preserved actions. It sits here, in the one
       * closing block all four designs render, so no design can omit it and
       * `e2e/uiux-foundation.spec.ts` keeps passing for all four.
       *
       * It is placed ABOVE the CTA section, on the page's own surface, so it
       * never lands on the inverted orange panel where its text tokens would
       * not work.
       */}
      <section className="border-t border-hairline px-6 pt-20" aria-label="Data provenance">
        <div className="mx-auto max-w-6xl">
          <UnlockGrowth />
        </div>
      </section>

      <section
        className={cn(
          'py-24 md:py-28',
          inverted
            ? 'bg-[var(--mr-accent)]'
            : 'border-t border-hairline bg-[var(--mr-surface)]'
        )}
        data-testid="homepage-closing"
      >
      <div className="mx-auto max-w-6xl px-6">
        <h2
          className={cn(
            'max-w-4xl font-display text-4xl font-extrabold leading-[0.98] tracking-tight md:text-6xl',
            inverted ? 'text-[var(--mr-on-accent)]' : 'text-[var(--mr-text-strong)]'
          )}
        >
          {c.heading}
        </h2>
        <p
          className={cn(
            'mt-6 max-w-xl text-base leading-relaxed',
            inverted ? 'text-[var(--mr-on-accent)] opacity-85' : 'text-[var(--mr-text-muted)]'
          )}
        >
          {c.subheading}
        </p>
        <button
          onClick={onPrimary}
          data-testid={primaryTestId}
          className={cn(
            'mt-10 inline-flex items-center gap-2.5 px-8 py-4 text-base font-bold transition-opacity hover:opacity-90',
            inverted
              ? 'bg-[var(--mr-bg)] text-[var(--mr-text-strong)]'
              : 'bg-[var(--mr-accent)] text-[var(--mr-on-accent)]'
          )}
        >
          {primaryLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      </section>
    </>
  );
}