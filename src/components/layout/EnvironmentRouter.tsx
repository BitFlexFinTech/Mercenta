import type { ReactNode } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import type { Environment } from '@/types';
import { cn } from '@/utils/cn';
import { Boxes, ShieldCheck } from 'lucide-react';

/**
 * §UI/UX Wave 3 — ENVIRONMENT SWITCHER (demo mechanism, NOT product chrome).
 *
 * WAS: a `fixed bottom-0` floating pill, centred over the viewport. Two real
 * defects, both visible in test-screenshots/dashboard/admin-1440x900.png:
 *   1. it sat ON TOP of the last rows of every workspace (the app compensated
 *      with a blanket `pb-16` on <main>, which just reserved empty space under
 *      content that the pill then covered anyway);
 *   2. it read as an unfinished developer affordance floating in a
 *      customer-facing shell — exactly the "AI-built admin dashboard" signal
 *      this redesign exists to remove.
 *
 * NOW: an INLINE control that lives in the navigation footer. Same three
 * environments, same `setEnvironment` behaviour, same one-click switch that the
 * demo and the browser suite rely on — but it can no longer overlap content,
 * and it is explicitly labelled **Demo** so it can never be mistaken for
 * production product UI (§Mock-first policy: demo affordances must be
 * unmistakable).
 *
 * Retained deliberately rather than deleted (§22 — "do not blindly delete
 * them"): switching environment is how a reviewer moves between the four role
 * shells without re-authenticating.
 */
/**
 * §P9 (programme decision 4) — the `3PL Carrier View` entry is REMOVED, and the
 * grid below is now TWO environments instead of three. REPOINTED from the old
 * contract, which declared `{ id: 'carrier', label: '3PL Carrier View', … }`.
 * A carrier never logs into Mercenta (DHL + Palletline are operated by API), so
 * there is nothing for this demo switcher to switch to.
 */
const ENVIRONMENTS: {
  id: Environment;
  label: string;
  short: string;
  icon: ReactNode;
}[] = [
  { id: 'brand', label: 'Brand Portal', short: 'Brand', icon: <Boxes className="h-3.5 w-3.5" /> },
  { id: 'admin', label: 'Mercenta Admin Hub', short: 'Admin', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
];

export function EnvironmentRouter({ compact = false }: { compact?: boolean }) {
  const { environment, setEnvironment } = useApp();

  /* Compact rail: icon-only column, labels preserved for assistive technology. */
  if (compact) {
    return (
      <div
        role="group"
        aria-label="Demo environment"
        data-testid="environment-switcher"
        data-env-compact="true"
        className="flex flex-col items-center gap-0.5 border-t border-hairline px-1 py-1.5"
      >
        {ENVIRONMENTS.map((env) => {
          const active = environment === env.id;
          return (
            <button
              key={env.id}
              type="button"
              onClick={() => setEnvironment(env.id)}
              aria-pressed={active}
              aria-label={env.label}
              title={env.label}
              data-testid={`env-switch-${env.id}`}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-ds-md transition-ds duration-ds-fast',
                active
                  ? 'bg-surface-hover text-strong'
                  : 'text-faint hover:bg-tint hover:text-strong'
              )}
            >
              {env.icon}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label="Demo environment"
      data-testid="environment-switcher"
      className="border-t border-hairline px-3 py-2.5"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-ds-micro font-semibold uppercase tracking-[0.14em] text-faint">
          Environment
        </span>
        <span className="rounded-full border border-hairline px-1.5 py-px text-ds-micro font-medium uppercase tracking-wide text-muted">
          Demo
        </span>
      </div>
      {/*
       * §OPENSHIP BATCH 5 — a REAL defect fixed at source: this grid declared THREE
       * columns while `ENVIRONMENTS` holds TWO entries, so each button took a third
       * of the row and a third of the card sat empty. It was a leftover of §P9,
       * which removed the `3PL Carrier View` entry and left the grid behind.
       * `validate-shared-surfaces.mjs` now DERIVES the column count from the
       * entries and fails on a mismatch, so the two cannot drift apart again.
       *
       * The row fills move onto theme roles rather than hardcoded whites: the
       * hover is the canonical floating-surface tint (`bg-tint` — a legacy
       * `white/[0.04]` remaps to a near-white fill on the light shells, where it
       * was INVISIBLE on this card), and the active fill is the theme's own
       * surface-hover step, so it reads as selected on all five themes.
       */}
      <div className="grid grid-cols-2 gap-1">
        {ENVIRONMENTS.map((env) => {
          const active = environment === env.id;
          return (
            <button
              key={env.id}
              type="button"
              onClick={() => setEnvironment(env.id)}
              aria-pressed={active}
              aria-label={env.label}
              title={env.label}
              data-testid={`env-switch-${env.id}`}
              className={cn(
                'flex min-h-[36px] flex-col items-center justify-center gap-0.5 rounded-ds-md border px-1 py-1 text-ds-micro font-medium transition-ds duration-ds-fast',
                active
                  ? 'border-hairline-strong bg-surface-hover text-strong'
                  : 'border-transparent text-muted hover:bg-tint hover:text-strong'
              )}
            >
              <span aria-hidden="true">{env.icon}</span>
              <span className="truncate">{env.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

