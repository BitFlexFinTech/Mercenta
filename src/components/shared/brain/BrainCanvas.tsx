/**
 * §Phase WAVE-4 — MERCENTA BRAIN: 3D CANVAS (DOM + accessibility layer).
 *
 * The previous implementation was a flat 2D SVG graph. This module replaces it
 * with a GENUINE 3D experience — the WebGL scene lives in `BrainScene.tsx`
 * (lazily imported, so three.js is a separate chunk) and is composed by
 * `BrainCanvas3D.tsx` from three.js / react-three-fiber / drei.
 *
 * WHAT THIS FILE OWNS, AND WHY IT IS NOT DUPLICATE WORK:
 *   - The camera-INDEPENDENT contract: filters, selection, the zoom control and
 *     the honest empty state.
 *   - The ACCESSIBILITY + TESTABILITY layer. Every visible entity is a real DOM
 *     element with the same testid (`brain-node-<id>`) and accessible name the
 *     2D canvas exposed, positioned by projecting its world coordinate through
 *     the live camera each frame. Without this, moving to WebGL would have
 *     deleted keyboard/screen-reader access and 300 records would live only
 *     inside an opaque canvas — which is explicitly not acceptable.
 *   - Keyboard navigation over the spatial model: arrow keys walk the visible
 *     records, Enter selects, Escape clears. (The page's entity list remains a
 *     second, equivalent keyboard path.)
 *
 * ZOOM: the zoom control scales the model in space (100% → 125% → 80% …), so it
 * composes with camera orbit instead of fighting it, and its readout stays
 * honest about what it did.
 *
 * LOADING — MEASURED DECISION, NOT A PREFERENCE. The scene was first written as
 * a `React.lazy` chunk so three.js stayed out of the shell bundle. A browser
 * measurement showed that was a REAL defect: the WebGL chunk is asynchronous, so
 * between mount and chunk arrival the accessible entity layer had zero
 * positioned targets — the first interaction had nothing to hit. Correctness of
 * the interaction contract wins over chunk aesthetics, so the scene is imported
 * eagerly. (The Brain is a Super-Admin destination behind an already-lazy
 * AdminShell, so three.js still never reaches a public or brand first paint.)
 *
 * MOTION: auto-rotation, node breathing, the core spin and the travelling
 * signals are all suppressed under `prefers-reduced-motion`; the scene still
 * renders, orbits and selects.
 */
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import { BRAIN_KIND_DEFINITIONS, type BrainGraph } from '@/lib/intelligence/brain/types';
import { layoutBrain3D, sectorArcs } from '@/lib/intelligence/brain/layout3d';
import { applyBrainProjection, brainCamera } from '@/lib/intelligence/brain/project';
import type { Brain3DNode } from '@/lib/intelligence/brain/layout3d';
import type { BrainLayout } from '@/lib/intelligence/brain/layout';
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion';
import { useWebglPalette } from '@/lib/hooks/useWebglPalette';
import { Maximize2, Minus, Plus } from 'lucide-react';
import type { ElementRegistry } from './BrainCanvas3D';
import BrainScene from './BrainScene';

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

const ZOOM_IN = 1.25;
const ZOOM_OUT = 0.8;
const ZOOM_MIN = 30;
const ZOOM_MAX = 400;

export function BrainCanvas({
  graph,
  layout,
  visibleIds,
  selectedId,
  onSelect,
  className,
  testId = 'brain-canvas',
}: BrainCanvasProps) {
  const reducedMotion = usePrefersReducedMotion();
  const palette = useWebglPalette();
  const [zoom, setZoom] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * §Phase WAVE-4 — FOCUS THE SPATIAL MODEL ON MOUNT.
   *
   * The Brain is a destination, not a widget buried in a page: a user who opens
   * it should SEE it. It also fixes a real interaction defect — the interactive
   * entity layer is clipped by this container, so if the container sits below
   * the fold the records are unreachable by pointer. Scrolling the container
   * into view when it is not already visible makes the whole spatial model
   * operable, and it is skipped entirely when the graph is already on screen
   * (no jarring jump) and reduced to an instant jump under reduced motion.
   */
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const fullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
    if (fullyVisible) return;
    /* INSTANT, never `smooth`: a page-load entrance is not the place to animate
       (better-ui — "skip animation on page load"), and an in-flight smooth
       scroll leaves the graph mid-flight for the first interaction, which is
       both a UX defect and a genuine operability bug for a clipped layer. */
    node.scrollIntoView({ block: 'center', behavior: 'auto' });
    // Runs once per mount: this is a navigation affordance, not a reaction.
  }, []);

  /* Real DOM elements, registered by id so the projection bridge can position
     them without a React render per frame. */
  const nodeEls = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const clusterEls = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const registerNode = useCallback((id: string, el: HTMLDivElement | null) => {
    nodeEls.current.set(id, el);
  }, []);
  const registerCluster = useCallback((cluster: string, el: HTMLDivElement | null) => {
    clusterEls.current.set(cluster, el);
  }, []);

  const zoomScale = zoom / 100;

  /* §Placement authority — the 3D positions come from `layout.ts`'s ring/angle
     decision; nothing here re-decides where a record sits. */
  const base = useMemo(() => layoutBrain3D(layout), [layout]);

  const nodes = useMemo(
    () =>
      base.nodes
        .filter((node) => visibleIds.has(node.id))
        .map((node) => ({
          ...node,
          x: node.x * zoomScale,
          y: node.y * zoomScale,
          z: node.z * zoomScale,
        })),
    [base.nodes, visibleIds, zoomScale]
  );

  const clusters = useMemo(
    () =>
      base.clusters
        .filter((cluster) => cluster.count > 0)
        .map((cluster) => ({
          ...cluster,
          x: cluster.x * zoomScale,
          y: cluster.y * zoomScale,
          z: cluster.z * zoomScale,
        })),
    [base.clusters, zoomScale]
  );

  const arcs = useMemo(
    () =>
      sectorArcs(layout.clusters.map((c) => ({ startDeg: c.startDeg, endDeg: c.endDeg }))).map((line) =>
        line.map(([x, y, z]) => [x * zoomScale, y * zoomScale, z * zoomScale] as [number, number, number])
      ),
    [layout.clusters, zoomScale]
  );

  const positions = useMemo(
    () => new Map<string, [number, number, number]>(nodes.map((n) => [n.id, [n.x, n.y, n.z]])),
    [nodes]
  );

  const visibleEdges = useMemo(
    () =>
      graph.edges
        .filter((edge) => positions.has(edge.from) && positions.has(edge.to))
        .map((edge) => ({ id: edge.id, from: edge.from, to: edge.to })),
    [graph.edges, positions]
  );

  const selectedEdges = useMemo(
    () => (selectedId ? visibleEdges.filter((e) => e.from === selectedId || e.to === selectedId) : []),
    [visibleEdges, selectedId]
  );

  const neighbourIds = useMemo(() => {
    const ids = new Set<string>();
    for (const edge of selectedEdges) {
      ids.add(edge.from);
      ids.add(edge.to);
    }
    return ids;
  }, [selectedEdges]);

  /* Node → concrete hex, resolved from the LIVE theme tokens (useWebglPalette),
     so the 3D scene genuinely recolours when the user switches theme. */
  const colourOf = useCallback(
    (node: Brain3DNode) => palette.palette[BRAIN_KIND_DEFINITIONS[node.kind].domain] ?? palette.accent,
    [palette]
  );

  /* Kind + status per id for the DOM layer's accessible names and data-* truth. */
  const nodeMeta = useMemo(() => {
    const map = new Map<string, { kind: string; status: string; label: string }>();
    for (const node of graph.nodes) {
      map.set(node.id, { kind: node.kind, status: node.status, label: node.label });
    }
    return map;
  }, [graph.nodes]);

  const ids = useMemo(() => nodes.map((n) => n.id), [nodes]);

  /* Keyboard navigation over the spatial model. */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (ids.length === 0) return;
      const current = selectedId ? ids.indexOf(selectedId) : -1;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        onSelect(ids[(current + 1 + ids.length) % ids.length]);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        onSelect(ids[(current - 1 + ids.length) % ids.length]);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSelect(ids[current < 0 ? 0 : current]);
      } else if (event.key === 'Escape') {
        onSelect(null);
      }
    },
    [ids, onSelect, selectedId]
  );

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, Math.round(z * ZOOM_IN)));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, Math.round(z * ZOOM_OUT)));
  const zoomReset = () => setZoom(100);

  const summary =
    `${nodes.length} of ${graph.nodes.length} entities · ${visibleEdges.length} relationships · ` +
    `${clusters.length} clusters · 3D spatial view. Keyboard: arrow keys change the selected record, Enter selects, Escape clears.`;

  /**
   * §Phase WAVE-4 — PRE-PAINT POSITIONING (the fix for a MEASURED defect).
   *
   * A browser measurement showed `visibleNodes: 0` at the moment the Brain
   * became interactive: positions were only written by the WebGL frame loop, so
   * the first animation frame had not run and every entity element was still
   * `visibility:hidden` at zero size. The first interaction therefore had no
   * targets, and a force-click reported "Element is outside of the viewport".
   *
   * Running the SAME pure projection before paint removes that window entirely.
   * The frame loop keeps the layer in step with the orbiting camera afterwards;
   * a ResizeObserver keeps it correct across responsive width changes without
   * waiting for a frame.
   */
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const camera = brainCamera(base.extent);
    const apply = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      applyBrainProjection({
        nodes,
        clusters,
        cameraPosition: camera.position,
        fovDeg: camera.fov,
        width: rect.width,
        height: rect.height,
        nodeEls,
        clusterEls,
      });
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(container);
    return () => observer.disconnect();
  }, [base.extent, nodes, clusters, nodeEls, clusterEls]);

  const handleNodeClick = (id: string) => (event: React.MouseEvent) => {
    event.stopPropagation();
    onSelect(id);
  };
  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden rounded-ds-lg border border-white/[0.06] bg-ink-950', className)}
      data-testid={testId}
      role="group"
      aria-label={summary}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* ── The 3D scene. Lazy: three.js is fetched the first time the Brain opens. ── */}
      <Suspense
        fallback={
          <div className="absolute inset-0 flex items-center justify-center" data-testid="brain-canvas-loading">
            <p className="text-ds-micro text-zinc-500">Building the 3D relationship field…</p>
          </div>
        }
      >
        {nodes.length > 0 && (
          <BrainScene
            nodes={nodes}
            clusters={clusters}
            arcs={arcs}
            positions={positions}
            allEdges={visibleEdges}
            selectedEdges={selectedEdges}
            extent={base.extent}
            colourOf={colourOf}
            palette={palette}
            selectedId={selectedId}
            neighbourIds={neighbourIds}
            reducedMotion={reducedMotion}
            nodeEls={nodeEls as ElementRegistry}
            clusterEls={clusterEls as ElementRegistry}
          />
        )}
      </Suspense>

      {/* ── ACCESSIBILITY / INTERACTION LAYER ─────────────────────────────────
          Real DOM for every visible entity, projected from the 3D world each
          frame by ProjectionBridge. This is what keyboard and screen-reader
          users drive, and what the acceptance tests assert against. */}
      <div className="pointer-events-none absolute inset-0">
        {clusters.map((cluster) => (
          <div
            key={cluster.cluster}
            ref={(el) => registerCluster(cluster.cluster, el)}
            data-testid={`brain-cluster-${cluster.cluster}`}
            style={{ visibility: 'hidden', position: 'absolute', left: 0, top: 0 }}
            className="pointer-events-none select-none whitespace-nowrap rounded-ds-sm bg-ink-950/70 px-1.5 py-0.5 font-mono text-ds-micro uppercase tracking-[0.16em] text-zinc-400"
          >
            {cluster.label} · {cluster.count}
          </div>
        ))}

        {nodes.map((node) => {
          const meta = nodeMeta.get(node.id);
          const def = BRAIN_KIND_DEFINITIONS[node.kind];
          const selected = node.id === selectedId;
          const related = neighbourIds.has(node.id);
          return (
            <div
              key={node.id}
              ref={(el) => registerNode(node.id, el)}
              role="button"
              tabIndex={-1}
              aria-label={`${def.label}: ${meta?.label ?? node.id} (${(meta?.status ?? 'unknown').toUpperCase()})`}
              data-testid={`brain-node-${node.id}`}
              data-status={meta?.status}
              data-kind={meta?.kind}
              data-selected={selected ? 'true' : undefined}
              onClick={handleNodeClick(node.id)}
              /* Size AND depth order are written by ProjectionBridge each frame
                 so the pointer target is exactly the visible sphere, with the
                 nearest record on top. */
              style={{ visibility: 'hidden', position: 'absolute', left: 0, top: 0, width: 0, height: 0 }}
              className={cn(
                'pointer-events-auto cursor-pointer rounded-full',
                'transition-shadow duration-ds-fast',
                selected && 'ring-2 ring-state-info',
                !selected && related && 'ring-1 ring-white/25'
              )}
            />
          );
        })}
      </div>

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-ds-md border border-white/[0.08] bg-ink-950/85 p-1 backdrop-blur">
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom the network out"
          data-testid="brain-zoom-out"
          className="rounded-ds-sm p-1.5 text-zinc-400 transition-colors duration-ds-fast hover:bg-white/[0.06] hover:text-white"
        >
          <Minus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <span
          className="min-w-[42px] text-center font-mono text-ds-micro text-zinc-400"
          data-testid="brain-zoom-level"
        >
          {zoom}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          aria-label="Zoom the network in"
          data-testid="brain-zoom-in"
          className="rounded-ds-sm p-1.5 text-zinc-400 transition-colors duration-ds-fast hover:bg-white/[0.06] hover:text-white"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={zoomReset}
          aria-label="Reset the network zoom to 100 percent"
          data-testid="brain-zoom-reset"
          className="rounded-ds-sm p-1.5 text-zinc-400 transition-colors duration-ds-fast hover:bg-white/[0.06] hover:text-white"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Motion is never the only feedback channel: the orbit affordance and the
          reduced-motion state are stated in words, not implied by movement. */}
      <p className="pointer-events-none absolute bottom-2 left-3 font-mono text-ds-micro text-zinc-500">
        Drag to orbit · {reducedMotion ? 'motion reduced' : 'auto-rotating'} · 3D
      </p>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center" data-testid="brain-canvas-empty">
          <p className="rounded-ds-md border border-white/[0.08] bg-ink-850/90 px-4 py-2 text-xs text-zinc-400">
            No entity matches the current filters. Clear a filter to see the graph again.
          </p>
        </div>
      )}
    </div>
  );
}