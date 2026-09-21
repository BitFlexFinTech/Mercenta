/**
 * §LOGISTICS HUB — INTERACTIVE OPERATIONAL MAP CANVAS.
 *
 * A real operations control surface, not a decorative world picture. It draws
 * the geometry derived by `src/lib/logistics/operationsMap.ts`:
 *
 *   graticule      a real lat/lon grid so the reader can locate what they see
 *   nodes          declared origin / gateway / Mercenta hub / Amazon FC CITY
 *   legs           an indicative arc per shipment, from → to
 *   markers        one per shipment at its true stage progress, drifting ONLY
 *                  when the shipment is genuinely in transit
 *
 * TRUTH IS VISIBLE, NOT IMPLIED (§Integration modes — fail closed)
 *   LIVE VERIFIED  solid stroke, provider-live AND the record carries the
 *                  provider's own identifier
 *   SIMULATED      solid thinner stroke, plus the word SIMULATION in the legend
 *                  and in the inspector
 *   AMBIENT        dashed stroke — context only, claiming nothing
 *
 * Colour is never the only signal: stroke pattern, amplitude, the legend count
 * and the inspector's stated reason all carry the same information.
 *
 * ACCESSIBILITY MODEL (same deliberate shape as the Brain canvas):
 *  - The SVG is ONE `role="img"` with a text alternative giving the counts,
 *    because dozens of focusable SVG groups would be a tab trap.
 *  - Every leg is ALSO a real <button> in the companion shipment list the caller
 *    renders; selection state is shared, so map and list are one control.
 *  - Pan/zoom controls are real buttons with accessible names.
 *
 * MOTION: the ambient drift is CSS-driven and disabled under
 * `prefers-reduced-motion`; the marker still renders at its true position.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { MAP_FRAME } from '@/config/logisticsGeo';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { isLegInMotion, type OperationalMapModel } from '@/lib/logistics/operationsMap';
import { Maximize2, Minus, Plus } from 'lucide-react';

const MIN_K = 0.6;
const MAX_K = 5;

const TRUTH_STROKE: Record<string, string> = {
  live_verified: 'var(--mr-state-success)',
  simulated: 'var(--mr-state-info)',
  ambient: 'var(--mr-text-faint)',
};

const TRUTH_WIDTH: Record<string, number> = {
  live_verified: 2.4,
  simulated: 1.6,
  ambient: 1.1,
};

export interface LogisticsMapCanvasProps {
  model: OperationalMapModel;
  /** Leg ids currently passing the caller's filters. */
  visibleIds: Set<string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
  testId?: string;
}

interface View {
  x: number;
  y: number;
  k: number;
}

export function LogisticsMapCanvas({
  model,
  visibleIds,
  selectedId,
  onSelect,
  className,
  testId = 'logistics-map',
}: LogisticsMapCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const dragRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const drawn = useMemo(
    () => model.mapped.filter((leg) => visibleIds.has(leg.id)),
    [model.mapped, visibleIds]
  );
  const drawnNodes = useMemo(() => {
    const ids = new Set<string>();
    for (const leg of drawn) {
      if (leg.origin.place) ids.add(leg.origin.place.id);
      if (leg.destination.place) ids.add(leg.destination.place.id);
    }
    return model.nodes.filter((node) => ids.has(node.id));
  }, [drawn, model.nodes]);

  /* Wheel zoom registered manually so `preventDefault` is permitted (React's
     synthetic wheel handler is passive and cannot stop the page scrolling). */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const scale = event.deltaY < 0 ? 1.12 : 1 / 1.12;
      setView((prev) => {
        const k = Math.min(MAX_K, Math.max(MIN_K, prev.k * scale));
        const factor = k / prev.k;
        const px = ((event.clientX - rect.left) / rect.width) * MAP_FRAME.viewBoxWidth;
        const py = ((event.clientY - rect.top) / rect.height) * MAP_FRAME.viewBoxHeight;
        return { k, x: px - (px - prev.x) * factor, y: py - (py - prev.y) * factor };
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const zoomBy = (scale: number) =>
    setView((prev) => ({ ...prev, k: Math.min(MAX_K, Math.max(MIN_K, prev.k * scale)) }));

  /**
   * Fit the view to the consignments actually drawn.
   *
   * §Visual-verification fix: the frame is world-scale (every origin the
   * platform can produce must fit), so a UK-only consignment set occupied a
   * postage stamp of the canvas. Fitting to the drawn extents is what makes the
   * map usable, and it is an explicit control rather than a hidden auto-zoom.
   */
  const fitToContent = useCallback(() => {
    const points: { x: number; y: number }[] = [];
    for (const leg of drawn) {
      if (!leg.geometry) continue;
      points.push(leg.geometry.from, leg.geometry.to, leg.geometry.marker);
    }
    if (points.length === 0) {
      setView({ x: 0, y: 0, k: 1 });
      return;
    }
    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));
    const pad = 90;
    const w = Math.max(60, maxX - minX + pad * 2);
    const h = Math.max(60, maxY - minY + pad * 2);
    const k = Math.min(MAX_K, Math.max(MIN_K, Math.min(MAP_FRAME.viewBoxWidth / w, MAP_FRAME.viewBoxHeight / h)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setView({
      k,
      x: MAP_FRAME.viewBoxWidth / 2 - cx * k,
      y: MAP_FRAME.viewBoxHeight / 2 - cy * k,
    });
  }, [drawn]);

  /* Fit once, as soon as the first consignments arrive. After that the operator
     owns the view — the map never moves under a working hand. */
  const fittedRef = useRef(false);
  useEffect(() => {
    if (fittedRef.current || drawn.length === 0) return;
    fittedRef.current = true;
    fitToContent();
  }, [drawn.length, fitToContent]);

  const { lonTicks, latTicks } = useMemo(() => {
    const lons: number[] = [];
    for (
      let lon = Math.ceil(MAP_FRAME.lonMin / MAP_FRAME.graticuleStep) * MAP_FRAME.graticuleStep;
      lon <= MAP_FRAME.lonMax;
      lon += MAP_FRAME.graticuleStep
    ) {
      lons.push(lon);
    }
    const lats: number[] = [];
    for (
      let lat = Math.ceil(MAP_FRAME.latMin / MAP_FRAME.graticuleStep) * MAP_FRAME.graticuleStep;
      lat <= MAP_FRAME.latMax;
      lat += MAP_FRAME.graticuleStep
    ) {
      lats.push(lat);
    }
    return { lonTicks: lons, latTicks: lats };
  }, []);

  const toX = (lon: number) =>
    ((lon - MAP_FRAME.lonMin) / (MAP_FRAME.lonMax - MAP_FRAME.lonMin)) * MAP_FRAME.viewBoxWidth;
  const toY = (lat: number) =>
    ((MAP_FRAME.latMax - lat) / (MAP_FRAME.latMax - MAP_FRAME.latMin)) * MAP_FRAME.viewBoxHeight;

  const liveCount = drawn.filter((l) => l.truth === 'live_verified').length;
  const simCount = drawn.filter((l) => l.truth === 'simulated').length;
  const ambientCount = drawn.filter((l) => l.truth === 'ambient').length;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-ds-lg border border-white/[0.06] bg-ink-950',
        className
      )}
      data-testid={`${testId}-surface`}
    >
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-ds-md border border-white/[0.08] bg-ink-850/90 p-0.5 backdrop-blur">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.25)}
          className="rounded-ds-sm p-1.5 text-zinc-400 transition-ds duration-ds-fast hover:bg-white/[0.06] hover:text-white"
          aria-label="Zoom out"
          data-testid="logistics-map-zoom-out"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span
          className="min-w-[42px] text-center font-mono text-ds-micro text-zinc-500"
          data-testid="logistics-map-zoom-level"
        >
          {Math.round(view.k * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomBy(1.25)}
          className="rounded-ds-sm p-1.5 text-zinc-400 transition-ds duration-ds-fast hover:bg-white/[0.06] hover:text-white"
          aria-label="Zoom in"
          data-testid="logistics-map-zoom-in"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setView({ x: 0, y: 0, k: 1 })}
          className="rounded-ds-sm p-1.5 text-zinc-400 transition-ds duration-ds-fast hover:bg-white/[0.06] hover:text-white"
          aria-label="Reset map view"
          data-testid="logistics-map-zoom-reset"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={fitToContent}
          className="rounded-ds-sm px-2 py-1.5 text-ds-micro font-medium text-zinc-400 transition-ds duration-ds-fast hover:bg-white/[0.06] hover:text-white"
          aria-label="Fit map to the consignments in scope"
          data-testid="logistics-map-fit"
        >
          Fit
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_FRAME.viewBoxWidth} ${MAP_FRAME.viewBoxHeight}`}
        role="img"
        aria-label={`Logistics operational map: ${drawn.length} consignments drawn — ${liveCount} live verified, ${simCount} simulated, ${ambientCount} ambient`}
        className="block h-full w-full cursor-grab touch-none select-none"
        data-testid={testId}
        data-visible-count={drawn.length}
        onPointerDown={(event) => {
          dragRef.current = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          const svg = svgRef.current;
          if (!drag || !svg) return;
          const rect = svg.getBoundingClientRect();
          const dx = ((event.clientX - drag.x) / rect.width) * MAP_FRAME.viewBoxWidth;
          const dy = ((event.clientY - drag.y) / rect.height) * MAP_FRAME.viewBoxHeight;
          setView((prev) => ({ ...prev, x: drag.vx + dx, y: drag.vy + dy }));
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerLeave={() => {
          dragRef.current = null;
        }}
        onClick={(event) => {
          /* Clicking empty canvas clears the selection — a real map gesture. */
          if (event.target === svgRef.current) onSelect(null);
        }}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {/* Graticule — a real coordinate grid, drawn from MAP_FRAME.
              §Visual-verification fix: the hairline token was invisible against
              the map surface in the light theme, so the grid uses the STRONG
              hairline plus an explicit opacity. A coordinate grid nobody can see
              is not a coordinate grid. */}
          <g aria-hidden="true" data-testid={`${testId}-graticule`}>
            {lonTicks.map((lon) => (
              <line
                key={`lon-${lon}`}
                x1={toX(lon)}
                y1={0}
                x2={toX(lon)}
                y2={MAP_FRAME.viewBoxHeight}
                stroke="var(--mr-hairline-strong)"
                strokeOpacity={0.55}
                strokeWidth={0.7}
              />
            ))}
            {latTicks.map((lat) => (
              <line
                key={`lat-${lat}`}
                x1={0}
                y1={toY(lat)}
                x2={MAP_FRAME.viewBoxWidth}
                y2={toY(lat)}
                stroke="var(--mr-hairline-strong)"
                strokeOpacity={0.55}
                strokeWidth={0.7}
              />
            ))}
            {/* The equator reads stronger than the rest of the grid. */}
            <line
              x1={0}
              y1={toY(0)}
              x2={MAP_FRAME.viewBoxWidth}
              y2={toY(0)}
              stroke="var(--mr-hairline-strong)"
              strokeOpacity={0.9}
              strokeWidth={1.2}
            />
            {latTicks
              .filter((lat) => lat % 30 === 0)
              .map((lat) => (
                <text
                  key={`lat-label-${lat}`}
                  x={6}
                  y={toY(lat) - 4}
                  className="fill-zinc-500 font-mono"
                  style={{ fontSize: 11 }}
                >
                  {lat}°
                </text>
              ))}
          </g>

          {/* Legs first so nodes always draw above them. */}
          <g aria-hidden="true" data-testid="logistics-map-legs">
            {drawn.map((leg) => {
              if (!leg.geometry) return null;
              const { from, control, to } = leg.geometry;
              const selected = leg.id === selectedId;
              return (
                <path
                  key={`leg-${leg.id}`}
                  d={`M ${from.x} ${from.y} Q ${control.x} ${control.y} ${to.x} ${to.y}`}
                  fill="none"
                  stroke={selected ? 'var(--mr-accent)' : TRUTH_STROKE[leg.truth]}
                  strokeWidth={selected ? TRUTH_WIDTH[leg.truth] + 1.2 : TRUTH_WIDTH[leg.truth]}
                  strokeOpacity={selected ? 0.95 : 0.5}
                  strokeDasharray={leg.truth === 'ambient' ? '7 6' : undefined}
                  strokeLinecap="round"
                  data-testid={`logistics-leg-path-${leg.id}`}
                  data-truth={leg.truth}
                />
              );
            })}
          </g>

          {/* Nodes — declared places, sized by the number of legs that touch them. */}
          <g aria-hidden="true" data-testid="logistics-map-nodes">
            {drawnNodes.map((node) => {
              const r = 3.5 + Math.min(4, node.legCount * 0.6);
              const colour =
                node.kind === 'mercenta_hub'
                  ? 'var(--mr-accent)'
                  : node.kind === 'amazon_fc'
                    ? 'var(--mr-palette-indigo)'
                    : node.kind === 'uk_gateway'
                      ? 'var(--mr-palette-teal, var(--mr-state-info))'
                      : 'var(--mr-palette-cyan)';
              return (
                <g key={node.id} data-testid={`logistics-node-${node.id}`} data-kind={node.kind}>
                  <circle cx={node.point.x} cy={node.point.y} r={r + 4} fill={colour} fillOpacity={0.12} />
                  <circle
                    cx={node.point.x}
                    cy={node.point.y}
                    r={r}
                    fill={colour}
                    fillOpacity={0.9}
                    stroke="var(--mr-hairline-strong)"
                    strokeWidth={0.6}
                  />
                  {/*
                    §Visual-verification fix — labels must be READABLE.
                    Two declared places can sit within a few pixels of each other
                    (a UK origin and the Mercenta hub are ~150 km apart on a
                    world-scale frame), so labels were overlapping. Destinations
                    are labelled BELOW their node and origins ABOVE, and every
                    label carries a plate so it stays legible over a route line.
                  */}
                  {(() => {
                    const labelBelow = node.kind === 'mercenta_hub' || node.kind === 'amazon_fc';
                    const text = node.label.length > 30 ? `${node.label.slice(0, 29)}…` : node.label;
                    const plateWidth = text.length * 5.6 + 8;
                    const labelY = labelBelow ? node.point.y + r + 13 : node.point.y - r - 7;
                    return (
                      <g>
                        <rect
                          x={node.point.x - plateWidth / 2}
                          y={labelY - 10}
                          width={plateWidth}
                          height={14}
                          rx={3}
                          fill="var(--mr-surface)"
                          fillOpacity={0.82}
                        />
                        <text
                          x={node.point.x}
                          y={labelY}
                          textAnchor="middle"
                          className="fill-zinc-300"
                          style={{ fontSize: 11 }}
                        >
                          {text}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              );
            })}
          </g>

          {/* Shipment markers — one per drawn leg, at its true stage progress. */}
          <g data-testid="logistics-map-markers">
            {drawn.map((leg) => {
              if (!leg.geometry) return null;
              const selected = leg.id === selectedId;
              const moving = isLegInMotion(leg.status) && !reducedMotion;
              const { marker } = leg.geometry;
              return (
                <g
                  key={`marker-${leg.id}`}
                  role="button"
                  tabIndex={-1}
                  aria-label={`${leg.reference} — ${leg.origin.raw} to ${leg.destination.raw}, ${leg.status} (${leg.truth})`}
                  data-testid={`logistics-marker-${leg.id}`}
                  data-truth={leg.truth}
                  data-status={leg.status}
                  className={cn('cursor-pointer', !reducedMotion && 'transition-ds duration-ds-fast')}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(leg.id);
                  }}
                >
                  {moving && (
                    <circle
                      cx={marker.x}
                      cy={marker.y}
                      r={7}
                      fill="none"
                      stroke={TRUTH_STROKE[leg.truth]}
                      strokeWidth={1.4}
                      className="animate-ambient-halo"
                    />
                  )}
                  <g className={moving ? 'animate-ambient-drift' : undefined}>
                    {selected && (
                      <circle
                        cx={marker.x}
                        cy={marker.y}
                        r={9}
                        fill="none"
                        stroke="var(--mr-accent)"
                        strokeOpacity={0.65}
                        strokeWidth={1.6}
                      />
                    )}
                    <circle
                      cx={marker.x}
                      cy={marker.y}
                      r={leg.exception ? 5.4 : 4.4}
                      fill={TRUTH_STROKE[leg.truth]}
                      stroke={leg.exception ? 'var(--mr-palette-red)' : 'var(--mr-bg-deep)'}
                      strokeWidth={leg.exception ? 1.8 : 1}
                    />
                  </g>
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {drawn.length === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-ink-950/70"
          data-testid={`${testId}-empty`}
        >
          <p className="rounded-ds-md border border-white/[0.08] bg-ink-850/95 px-4 py-2 text-ds-body text-zinc-400">
            No consignment matches the current filters. Clear a filter to see the operational picture again.
          </p>
        </div>
      )}
    </div>
  );
}