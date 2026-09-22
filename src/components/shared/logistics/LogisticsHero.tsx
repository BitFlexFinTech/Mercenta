/**
 * §WAVE 3 — LOGISTICS HERO (the hero SECTION of the Logistics Hub page).
 *
 * There is ONE Logistics Hub page. This is its hero section; the operational
 * controls live below it on the same route (see `src/components/brand/
 * LogisticsHub.tsx`). It is not a second page and not a competing surface.
 *
 * CONTRACT
 *   · FIXED CAMERA + NON-INTERACTIVE. No orbit, no pan, no zoom, no hover, no
 *     click. The canvas is `pointerEvents: 'none'` so page scrolling is never
 *     intercepted, and there is no interactive overlay competing for the
 *     pointer. (Verified by `e2e/logistics-hero.spec.ts`.)
 *   · TRUTHFUL. Brand lanes carry the canonical leg's LIVE VERIFIED / SIMULATED
 *     / AMBIENT classification; declared network traffic is always labelled
 *     AMBIENT and is never implied to be a Mercenta shipment.
 *   · ACCESSIBLE. The whole visualisation has a plain-language text alternative
 *     (counts, origins, regions, what ambient means), a visible legend and a
 *     reduced-motion static composition. No information exists only in motion.
 *   · ATTRIBUTED. The Natural Earth + OpenStreetMap attribution required by the
 *     underlying datasets is rendered on the surface.
 *   · DEFENSIVE. If WebGL is unavailable the same summary, legend and
 *     attribution still render — the hero degrades to a text panel, never to a
 *     broken box.
 */
import { Component, useMemo, type ErrorInfo, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { useWebglPalette } from '@/lib/hooks/useWebglPalette';
import { HERO_TRUTH_NOTICE, GLOBAL_LOGISTICS_GATEWAYS } from '@/config/logisticsHero';
import { HERO_GEO_PROVENANCE } from '@/data/logisticsHeroGeo';
import { OPERATIONAL_TRUTH, type OperationalTruth } from '@/config/logisticsGeo';
import {
  buildHeroNetwork,
  heroSummary,
  type HeroBrandLegInput,
} from '@/lib/logistics/heroNetwork';
import LogisticsHeroScene from './LogisticsHeroScene';

export interface LogisticsHeroProps {
  /** Canonical shipment legs (already tenant-scoped by the caller). */
  legs?: HeroBrandLegInput[];
  className?: string;
}

/* ── WebGL failure boundary ──────────────────────────────────────────────── */

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Reported, never swallowed: a missing WebGL context is a real condition.
    console.warn(
      '[logistics-hero] the 3D scene could not start; the text panel is shown instead.',
      error.message,
      info.componentStack
    );
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * §WAVE 3 — LOGISTICS HERO: the panel's own colour contract.
 *
 * The hero is a CINEMATIC MEDIA SURFACE, not a themed content card: the WebGL
 * scene paints its own dark palette, so the overlay must stay dark-on-dark in
 * ALL five themes (two of which are light). Theme tokens such as `ink-950`
 * resolve to near-white in Minimal Light, and `text-zinc-400` is remapped by
 * `[data-shell-theme='light']` — using them here produced unreadable
 * light-on-light copy. The explicit values below are therefore deliberate, and
 * every domain accent still comes from the live theme palette (`useWebglPalette`)
 * so switching Trade → Bold still recolours the traffic.
 */
const HERO_SURFACE = 'bg-[#05070C]';
const HERO_BORDER = 'border-white/[0.08]';
const HERO_TITLE = 'text-[#F2F5F9]';
const HERO_BODY = 'text-[#A9B4C2]';
const HERO_MUTED = 'text-[#7E8896]';
const HERO_FAINT = 'text-[#616B78]';

/* ── Legend ──────────────────────────────────────────────────────────────── */

const TRUTH_ORDER: OperationalTruth[] = ['live_verified', 'simulated', 'ambient'];

function TruthLegend({ counts }: { counts: Record<OperationalTruth, number> }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5" data-testid="logistics-hero-legend">
      {TRUTH_ORDER.map((truth) => {
        const meta = OPERATIONAL_TRUTH[truth];
        return (
          <li key={truth} className="flex items-center gap-1.5" data-testid={`logistics-hero-legend-${truth}`}>
            <span
              aria-hidden="true"
              className={cn(
                'h-2 w-2 rounded-full',
                meta.tone === 'success'
                  ? 'bg-[#2FBF71]'
                  : meta.tone === 'info'
                    ? 'bg-[#22C7F0]'
                    : 'bg-[#7E8896]'
              )}
            />
            <span className={cn('text-ds-micro', HERO_BODY)}>
              {meta.label}
              <span className={HERO_MUTED}> · {counts[truth]}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
/* ── The Hero ────────────────────────────────────────────────────────────── */

export function LogisticsHero({ legs, className }: LogisticsHeroProps) {
  const reducedMotion = usePrefersReducedMotion();
  const palette = useWebglPalette();
  const network = useMemo(() => buildHeroNetwork({ brandLegs: legs }), [legs]);
  const summary = useMemo(() => heroSummary(network), [network]);

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-ds-lg border',
        HERO_SURFACE,
        HERO_BORDER,
        className
      )}
      data-testid="logistics-hero"
      aria-label="Global inbound logistics network visualisation"
      aria-describedby="logistics-hero-summary"
      data-aircraft={network.counts.aircraft}
      data-ships={network.counts.ships}
      data-road-vehicles={network.counts.roadVehicles}
      data-brand-legs={network.counts.brandLegs}
      data-ambient-lanes={network.counts.ambientLanes}
      data-origins={network.counts.origins}
      data-regions={network.regions.length}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
    >
      {/* The visualisation. The canvas never receives the pointer. */}
      <div className="pointer-events-none absolute inset-0" data-testid="logistics-hero-scene">
        <SceneBoundary fallback={null}>
          <LogisticsHeroScene network={network} palette={palette} reducedMotion={reducedMotion} />
        </SceneBoundary>
      </div>

      {/* Text panel. It is the accessible alternative AND the whole surface if
          WebGL cannot start — a broken hero is never rendered.
          The scrim is HORIZONTAL (heavy left → transparent right) so the copy
          stays readable without covering the UK tile, whose fulfilment-centre
          destinations sit right of centre. */}
      <div
        className="relative flex min-h-[320px] flex-col justify-end sm:min-h-[460px]"
        data-testid="logistics-hero-panel"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 bg-gradient-to-r from-[#05070C] via-[#05070C]/78 to-transparent px-5 pb-4 pt-16 sm:px-7 sm:pt-24">
          <div className="max-w-xl">
            <p className={cn('text-ds-micro uppercase tracking-[0.14em]', HERO_FAINT)}>
              Fixed camera · non-interactive
            </p>
            <h2 className={cn('mt-1 text-ds-title font-medium', HERO_TITLE)}>
              Global inbound logistics network
            </h2>
            <p id="logistics-hero-summary" className={cn('mt-2 text-ds-body leading-relaxed', HERO_BODY)}>
              {summary}
            </p>
          </div>
          <TruthLegend counts={network.counts.truth} />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/[0.08] bg-[#05070C] px-5 py-2.5 sm:px-7">
          {reducedMotion && (
            <p className={cn('text-ds-micro', HERO_MUTED)} data-testid="logistics-hero-reduced-motion">
              Reduced motion is on — every lane, origin and count below is still shown, held still.
            </p>
          )}
          <ul className="flex flex-wrap gap-x-3 gap-y-1" data-testid="logistics-hero-regions">
            {network.regions.map((region) => (
              <li key={region} className={cn('text-ds-micro', HERO_MUTED)}>
                {region}
              </li>
            ))}
          </ul>
          <p className={cn('text-ds-micro', HERO_FAINT)} data-testid="logistics-hero-attribution">
            {HERO_GEO_PROVENANCE.attribution}
          </p>
        </div>
      </div>

      {/* Honest labelling, always visible — never hover-only. */}
      <details
        className={cn('relative border-t px-5 py-3 sm:px-7', HERO_BORDER)}
        data-testid="logistics-hero-notice"
      >
        <summary className={cn('cursor-pointer text-ds-micro', HERO_MUTED)}>
          What this view does and does not claim
        </summary>
        <div className="mt-2 space-y-2 pb-1">
          <p className={cn('text-ds-micro leading-relaxed', HERO_BODY)}>{HERO_TRUTH_NOTICE}</p>
          <p className={cn('text-ds-micro leading-relaxed', HERO_MUTED)}>
            {GLOBAL_LOGISTICS_GATEWAYS.length} declared international gateways are plotted from published coordinates.
            No live provider call is made: the animation is deterministic simulation over canonical data and declared
            geography.
          </p>
          {reducedMotion && (
            <p className={cn('text-ds-micro', HERO_MUTED)}>
              The animation is held still because this device requests reduced motion; the lane set above is unchanged.
            </p>
          )}
        </div>
      </details>
    </section>
  );
}