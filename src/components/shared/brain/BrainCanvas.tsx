/**
 * §MERCENTA BRAIN — INTERACTIVE GRAPH CANVAS.
 *
 * A real, usable relationship surface, not a decorative network picture: pan,
 * zoom, hover, selection, cluster sectors and keyboard access through a parallel
 * list of real buttons rendered by the caller.
 *
 * ACCESSIBILITY MODEL (deliberate, not incidental):
 *  - The SVG is ONE `role="img"` with a text alternative describing the counts,
 *    because 300 focusable SVG nodes would be a tab trap.
 *  - Every entity is ALSO a real <button> in the companion entity list, which is
 *    what keyboard and screen-reader users actually drive. Selection state is
 *    shared, so the two are one control.
 *  - Colour is never the only signal: a non-verified node is drawn with a dashed
 *    ring AND its status word appears in the inspector; every node has an
 *    accessible name.
 *
 * MOTION: transitions are suppressed under `prefers-reduced-motion`.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { DOMAIN_COLOURS } from '@/config/themes';
import { BRAIN_KIND_DEFINITIONS, type BrainGraph } from '@/lib/intelligence/brain/types';
import { layoutIndex, type BrainLayout } from '@/lib/intelligence/brain/layout';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { Maximize2, Minus, Plus } from 'lucide-react';

export interface BrainCanvasProps {
  graph: BrainGraph;
  layout: BrainLayout;
  /** Ids currently passing the caller's filters. */
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

const MIN_K = 0.35;
const MAX_K = 4;

export function BrainCanvas({
  graph,
  layout,
  visibleIds,
  selectedId,
  onSelect,
  className,
  testId = 'brain-canvas',
}: BrainCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const dragRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const index = useMemo(() => layoutIndex(layout), [layout]);

  /* The visible edge set: an edge is drawn only when BOTH endpoints are visible,
     so a filter can never imply a relationship the data does not contain. */
  const edges = useMemo(
    () => graph.edges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to)),
    [graph.edges, visibleIds]
  );

  /* Wheel zoom — registered manually so `preventDefault` is permitted (React's
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
        const px = ((event.clientX - rect.left) / rect.width) * layout.width;
        const py = ((event.clientY - rect.top) / rect.height) * layout.height;
        return { k, x: px - (px - prev.x) * factor, y: py - (py - prev.y) * factor };
      });
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [layout.width, layout.height]);

  const zoomBy = (scale: number) => {
    setView((prev) => ({ ...prev, k: Math.min(MAX_K, Math.max(MIN_K, prev.k * scale)) }));
  };

  return (
    <div className={cn('relative overflow-hidden rounded-ds-lg border border-white/[0.06] bg-ink-900', className)}>
      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-ds-md border border-white/[0.08] bg-ink-850/90 p-0.5 backdrop-blur">
        <button
          type="button"
          onClick={() => zoomBy(1 / 1.25)}
          className="rounded-ds-sm p-1.5 text-zinc-400 transition-ds duration-ds-fast hover:bg-white/[0.06] hover:text-white"
          aria-label="Zoom out"
          data-testid="brain-zoom-out"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span className="min-w-[42px] text-center font-mono text-ds-micro text-zinc-500" data-testid="brain-zoom-level">
          {Math.round(view.k * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoomBy(1.25)}
          className="rounded-ds-sm p-1.5 text-zinc-400 transition-ds duration-ds-fast hover:bg-white/[0.06] hover:text-white"
          aria-label="Zoom in"
          data-testid="brain-zoom-in"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setView({ x: 0, y: 0, k: 1 })}
          className="rounded-ds-sm p-1.5 text-zinc-400 transition-ds duration-ds-fast hover:bg-white/[0.06] hover:text-white"
          aria-label="Reset view"
          data-testid="brain-zoom-reset"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="img"
        aria-label={`Mercenta Brain graph: ${visibleIds.size} visible entities and ${edges.length} relationships`}
        className="block h-full w-full cursor-grab touch-none select-none"
        data-testid={testId}
        onPointerDown={(event) => {
          dragRef.current = { x: event.clientX, y: event.clientY, vx: view.x, vy: view.y };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          const svg = svgRef.current;
          if (!drag || !svg) return;
          const rect = svg.getBoundingClientRect();
          const dx = ((event.clientX - drag.x) / rect.width) * layout.width;
          const dy = ((event.clientY - drag.y) / rect.height) * layout.height;
          setView((prev) => ({ ...prev, x: drag.vx + dx, y: drag.vy + dy }));
        }}
        onPointerUp={() => {
          dragRef.current = null;
        }}
        onPointerLeave={() => {
          dragRef.current = null;
        }}
        onClick={(event) => {
          /* Clicking empty canvas clears the selection — a real graph gesture. */
          if (event.target === svgRef.current) onSelect(null);
        }}
      >
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {layout.clusters
            .filter((c) => c.count > 0)
            .map((cluster) => (
              <text
                key={cluster.cluster}
                x={cluster.x}
                y={cluster.y}
                textAnchor="middle"
                className="fill-zinc-500 font-semibold uppercase"
                style={{ letterSpacing: '0.16em', fontSize: 13 }}
              >
                {cluster.label} · {cluster.count}
              </text>
            ))}

          {/* Relationships first, so nodes always draw above the lines. */}
          <g aria-hidden="true">
            {edges.map((edge) => {
              const a = index.get(edge.from);
              const b = index.get(edge.to);
              if (!a || !b) return null;
              const touchesSelection = selectedId === edge.from || selectedId === edge.to;
              return (
                <line
                  key={edge.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={touchesSelection ? 'var(--mr-accent)' : 'var(--mr-hairline-strong)'}
                  strokeWidth={touchesSelection ? 1.6 : 0.7}
                  strokeOpacity={touchesSelection ? 0.9 : 0.22}
                  strokeDasharray={edge.status === 'simulation' ? '4 3' : undefined}
                />
              );
            })}
          </g>

          {/* Entities. */}
          {layout.nodes
            .filter((placed) => visibleIds.has(placed.id))
            .map((placed) => {
              const node = graph.nodes.find((n) => n.id === placed.id);
              if (!node) return null;
              const def = BRAIN_KIND_DEFINITIONS[node.kind];
              const colour = DOMAIN_COLOURS[def.domain].solid;
              const selected = node.id === selectedId;
              const unverified = node.status !== 'verified';
              return (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={-1}
                  aria-label={`${def.label}: ${node.label} (${node.status.toUpperCase()})`}
                  data-testid={`brain-node-${node.id}`}
                  data-status={node.status}
                  data-kind={node.kind}
                  className={cn('cursor-pointer', !reducedMotion && 'transition-ds duration-ds-fast')}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(node.id);
                  }}
                >
                  <circle
                    cx={placed.x}
                    cy={placed.y}
                    r={placed.radius}
                    fill={colour}
                    fillOpacity={unverified ? 0.35 : 0.95}
                    stroke={selected ? 'var(--mr-accent)' : colour}
                    strokeWidth={selected ? 2.6 : 1}
                    strokeDasharray={unverified ? '3 2' : undefined}
                  />
                  {selected && (
                    <circle
                      cx={placed.x}
                      cy={placed.y}
                      r={placed.radius + 6}
                      fill="none"
                      stroke="var(--mr-accent)"
                      strokeOpacity={0.5}
                    />
                  )}
                  {(node.kind === 'brand' || node.kind === 'founder' || node.kind === 'amazon') && (
                    <text
                      x={placed.x}
                      y={placed.y + placed.radius + 11}
                      textAnchor="middle"
                      className="fill-zinc-400"
                      style={{ fontSize: 11 }}
                    >
                      {node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label}
                    </text>
                  )}
                </g>
              );
            })}
        </g>
      </svg>

      {visibleIds.size === 0 && (
        <div className="absolute inset-0 flex items-center justify-center" data-testid="brain-canvas-empty">
          <p className="rounded-ds-md border border-white/[0.08] bg-ink-850/90 px-4 py-2 text-xs text-zinc-400">
            No entity matches the current filters. Clear a filter to see the graph again.
          </p>
        </div>
      )}
    </div>
  );
}