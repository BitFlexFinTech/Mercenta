/**
 * §BRAND REDESIGN (2026-11-19) — THE HOMEPAGE SECTION PRIMITIVES.
 *
 * ONE set of sections, shared by all four homepage designs. A design changes the
 * COMPOSITION (where the sections sit, how they are framed, what surrounds
 * them) — never the content and never the tracker animation. That is what makes
 * "all four designs use consistent approved business content" true by
 * construction rather than by discipline.
 */
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { HomepageContent } from '@/config/homepageContent';

/**
 * §THE TRACKER ANIMATION IS PRESERVED, NOT REBUILT.
 *
 * The two keyframes it depends on live in `src/index.css` and are UNCHANGED:
 *
 *   `@keyframes route-dot`      → the waypoint dot travelling along the route
 *                                 line, 6s linear loop  (`.animate-route-dot`)
 *   `@keyframes tracker-ping`   → the soft 2s ping on the "live" indicator
 *                                 (`.animate-tracker-ping`)
 *
 * Both are still applied here by the SAME class names, so the movement,
 * sequence, timing and transitions are exactly what they were. What changed is
 * only its PRESENTATION: the brand palette (`--mr-accent`, the brand orange),
 * its scale, and the removal of the enclosing dashboard-card chrome so it reads
 * as part of the hero rather than a widget pasted beside it.
 *
 * `prefers-reduced-motion` still disables both animations (the same
 * `@media` block in `index.css`), so accessibility behaviour is preserved too.
 */
export interface HeroTrackerProps {
  content: HomepageContent;
  /** `md` for tablet, `lg` for the standard hero, `xl` for the boldest design. */
  size?: 'md' | 'lg' | 'xl';
  /** Extra classes from the design that places it. */
  className?: string;
  /** A design may draw its own separators around it. */
  bare?: boolean;
}

const TRACKER_SCALE = {
  md: { node: 'h-11', pt: 'h-6 w-6', dot: 'h-3.5 w-3.5', title: 'text-ds-body' },
  lg: { node: 'h-14', pt: 'h-7 w-7', dot: 'h-4 w-4', title: 'text-base' },
  xl: { node: 'h-16', pt: 'h-8 w-8', dot: 'h-5 w-5', title: 'text-lg' },
} as const;

export function HeroTracker({ content, size = 'lg', className, bare = false }: HeroTrackerProps) {
  const t = content.tracker;
  const s = TRACKER_SCALE[size];

  return (
    <div
      data-testid="hero-tracker"
      className={cn(
        /* §DE-CARDED: no enclosing panel border or fill — only hairline
           separators, so the tracker sits ON the hero surface. */
        bare ? '' : 'border-y border-hairline py-7',
        className
      )}
    >
      {/* Head — reference + the preserved live ping */}
      <div className="mb-6 flex items-center justify-between">
        <span className="font-mono text-ds-label tracking-[0.18em] text-[var(--mr-text-muted)]">
          REF · {t.reference}
        </span>
        <span className="flex items-center gap-2 font-mono text-ds-label uppercase tracking-[0.16em] text-[var(--mr-accent)]">
          <span className="relative flex h-2 w-2">
            <span
              className="animate-tracker-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: 'var(--mr-accent)' }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ backgroundColor: 'var(--mr-accent)' }}
            />
          </span>
          Live example
        </span>
      </div>

      {/* ── THE PRESERVED ROUTE ANIMATION ──────────────────────────────────────
          The travelling waypoint dot (`animate-route-dot`, the same 6s loop and
          the same class name as before) on the dotted route line. Only its hue
          moved, onto the brand accent. */}
      <div className="relative mb-1 h-12" aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dotted border-[var(--mr-tracker-route)]" />
        <span className="animate-route-dot absolute top-1/2 flex -translate-y-1/2 items-center justify-center">
          <span
            className={cn('rounded-full', s.dot)}
            style={{ backgroundColor: 'var(--mr-accent)', boxShadow: '0 0 16px var(--mr-accent)' }}
          />
        </span>
        <span className="absolute left-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[var(--mr-tracker-route)] bg-[var(--mr-surface)]" />
        <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--mr-tracker-route)] bg-[var(--mr-surface)]" />
        <span
          className="absolute right-0 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 bg-[var(--mr-surface)]"
          style={{ borderColor: 'var(--mr-accent)' }}
        />
      </div>
      <div className="mb-7 flex justify-between font-mono text-ds-micro uppercase tracking-wider text-[var(--mr-text-muted)]">
        <span>Origin</span>
        <span>In transit</span>
        <span style={{ color: 'var(--mr-accent)' }}>UK arrival</span>
      </div>

      {/* The supplied design's vertical node path (content, not the animation) */}
      <ol>
        {t.stages.map((stage) => (
          <li key={stage.label} className={cn('flex items-center gap-4', s.node)}>
            <span
              className={cn('flex flex-shrink-0 items-center justify-center rounded-full border-2', s.pt)}
              style={
                stage.done
                  ? { backgroundColor: 'var(--mr-accent)', borderColor: 'var(--mr-accent)' }
                  : { borderColor: 'var(--mr-hairline-strong)' }
              }
              aria-hidden="true"
            >
              {stage.done && <CheckCircle2 className="h-3.5 w-3.5 text-[var(--mr-on-accent)]" />}
            </span>
            <span
              className={cn(
                'font-medium',
                s.title,
                stage.done ? 'text-[var(--mr-text-strong)]' : 'text-[var(--mr-text-muted)]'
              )}
            >
              {stage.label}
            </span>
          </li>
        ))}
      </ol>

      {/* Footer cells */}
      <div className="mt-7 grid grid-cols-2 gap-4 border-t border-hairline pt-5">
        <div>
          <div className="mb-1.5 font-mono text-ds-micro uppercase tracking-[0.16em] text-[var(--mr-text-muted)]">
            Category
          </div>
          <div className="text-ds-body font-semibold text-[var(--mr-text-strong)]">{t.cargoLabel}</div>
        </div>
        <div>
          <div className="mb-1.5 font-mono text-ds-micro uppercase tracking-[0.16em] text-[var(--mr-text-muted)]">
            Movement
          </div>
          <div className="text-ds-body font-semibold text-[var(--mr-text-strong)]">
            {t.freightMode}
          </div>
        </div>
      </div>

      {/* §HONESTY — never present the illustration as live operational data. */}
      <p className="mt-4 text-ds-label text-[var(--mr-text-muted)]">
        An example of the live view — your own consignments appear here as they move.
      </p>
    </div>
  );
}
