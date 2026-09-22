/**
 * §Phase WAVE-4 — MERCENTA BRAIN: SPATIAL (3D) PROJECTION OF THE CANONICAL LAYOUT.
 *
 * THE 3D BRAIN IS NOT A SECOND LAYOUT SYSTEM. `layout.ts` remains the single
 * placement authority (it decides the cluster sector, the ring and the angle of
 * every record). This module performs ONE job — projecting that decision into a
 * genuinely spatial coordinate system:
 *
 *   ring   → RADIUS (outward from the core) and HEIGHT (depth stratification)
 *   angle  → AZIMUTH around the core (the cluster's own 72° sector)
 *   cluster→ which fifth of the wheel, exactly as in 2D (CLUSTER_ORDER)
 *
 * Determinism is preserved and is the point: identical canonical domain state
 * produces an identical scene. There is no force simulation, no `Math.random()`
 * and no `Date.now()`-derived identity, so a record can never "jump" between
 * renders and the scene is testable.
 *
 * Units are world units (roughly 1 unit ≈ 1 cluster radius), not pixels.
 */
import { BRAIN_CLUSTER_LABELS, type BrainCluster, type BrainEntityKind } from './types';
import type { BrainLayout, PlacedNode } from './layout';

/** Canonical cluster order — identical to `layout.ts` CLUSTER_ORDER. */
export const CLUSTER_ORDER_3D: readonly BrainCluster[] = [
  'portfolio',
  'catalogue',
  'commerce',
  'governance',
  'platform',
];

const INNER_RADIUS = 1.15;
const RING_STEP = 0.62;
/** How far a ring rises. Gives the wheel real depth instead of a flat disc. */
const RING_LIFT = 0.55;
/** The ring whose centre sits on the equatorial plane. */
const NEUTRAL_RING = 1.6;

export interface Brain3DNode {
  id: string;
  kind: BrainEntityKind;
  cluster: BrainCluster;
  x: number;
  y: number;
  z: number;
  /** World-space sphere radius. */
  radius: number;
  /** Stable 0..1 phase so per-node motion is deterministic, never random. */
  phase: number;
}

export interface Brain3DCluster {
  cluster: BrainCluster;
  label: string;
  x: number;
  y: number;
  z: number;
  count: number;
}

export interface Brain3DLayout {
  nodes: Brain3DNode[];
  clusters: Brain3DCluster[];
  /** Suggested camera distance for the whole graph. */
  extent: number;
}

/**
 * Deterministic, collision-resistant phase in [0,1) from a node id. A pure hash
 * of the id — the same record always animates with the same offset, and no
 * randomness enters the scene.
 */
function phaseOf(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

/** 2D canvas radius (5–14) → world sphere radius (~0.05–0.11). */
function worldRadius(canvasRadius: number): number {
  return 0.012 + canvasRadius * 0.007;
}

export function layoutBrain3D(layout: BrainLayout): Brain3DLayout {
  const nodes: Brain3DNode[] = layout.nodes.map((placed: PlacedNode) => {
    const radians = (placed.angleDeg * Math.PI) / 180;
    const radius = INNER_RADIUS + placed.ring * RING_STEP;
    return {
      id: placed.id,
      kind: placed.kind,
      cluster: placed.cluster,
      x: radius * Math.cos(radians),
      z: radius * Math.sin(radians),
      y: (placed.ring - NEUTRAL_RING) * RING_LIFT,
      radius: worldRadius(placed.radius),
      phase: phaseOf(placed.id),
    };
  });

  const clusters: Brain3DCluster[] = layout.clusters.map((placed) => {
    const midDeg = (placed.startDeg + placed.endDeg) / 2;
    const radians = (midDeg * Math.PI) / 180;
    const labelRadius = 0.92;
    return {
      cluster: placed.cluster,
      label: BRAIN_CLUSTER_LABELS[placed.cluster] ?? placed.label,
      x: labelRadius * Math.cos(radians),
      y: -0.72,
      z: labelRadius * Math.sin(radians),
      count: placed.count,
    };
  });

  /* Extent = the furthest node radius + a margin, so the camera framing adapts
     to how much the canonical domain actually contains. */
  const extent = nodes.reduce((max, n) => Math.max(max, Math.hypot(n.x, n.z) + 0.5), INNER_RADIUS + 1);

  return { nodes, clusters, extent };
}

/* ── Cluster sector geometry (pure math — deliberately three.js-free) ───────
   The sector arcs/spokes are computed here rather than inside the WebGL module
   so a non-WebGL caller can build them without pulling three.js into its
   bundle, and so the sector geometry has exactly ONE definition. */

const ARC_RADIUS = 1.02;
const ARC_Y = -0.62;

export { ARC_RADIUS, ARC_Y };

/** Arc + two spokes per cluster sector, as 3D line segments' endpoints. */
export function sectorArcs(
  sectors: { startDeg: number; endDeg: number }[]
): [number, number, number][][] {
  const lines: [number, number, number][][] = [];
  for (const sector of sectors) {
    const arc: [number, number, number][] = [];
    const steps = 14;
    for (let i = 0; i <= steps; i++) {
      const deg = sector.startDeg + 6 + ((sector.endDeg - sector.startDeg - 12) * i) / steps;
      const radians = (deg * Math.PI) / 180;
      arc.push([ARC_RADIUS * Math.cos(radians), ARC_Y, ARC_RADIUS * Math.sin(radians)]);
    }
    lines.push(arc);
    const startRad = ((sector.startDeg + 6) * Math.PI) / 180;
    const endRad = ((sector.endDeg - 6) * Math.PI) / 180;
    lines.push([
      [0, ARC_Y, 0],
      [ARC_RADIUS * Math.cos(startRad), ARC_Y, ARC_RADIUS * Math.sin(startRad)],
    ]);
    lines.push([
      [0, ARC_Y, 0],
      [ARC_RADIUS * Math.cos(endRad), ARC_Y, ARC_RADIUS * Math.sin(endRad)],
    ]);
  }
  return lines;
}