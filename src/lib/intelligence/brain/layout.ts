/**
 * §MERCENTA BRAIN — DETERMINISTIC GRAPH LAYOUT.
 *
 * A radial CLUSTER layout: each cluster owns a fixed 72° sector, and the nodes
 * inside it are placed on concentric rings in canonical order. It is completely
 * deterministic (sorted by kind then id, no force simulation, no randomness), so
 * the same domain state always produces the same picture — which is what makes
 * the canvas testable and what stops a node from "jumping" between renders.
 *
 * This is presentation only: it never reads business data, never re-orders
 * meaning, and never decides what is important. Importance is expressed by the
 * node radius table below, which is declared once here.
 */
import { BRAIN_KIND_DEFINITIONS, type BrainCluster, type BrainEntityKind, type BrainGraph } from './types';

export const BRAIN_CANVAS_SIZE = 1000;
const CENTRE = BRAIN_CANVAS_SIZE / 2;
const CLUSTER_ORDER: BrainCluster[] = ['portfolio', 'catalogue', 'commerce', 'governance', 'platform'];
const SECTOR_DEGREES = 360 / CLUSTER_ORDER.length;
const INNER_RADIUS = 132;
const RING_STEP = 54;

/** Radius by entity kind — declared once, so "big" always means the same thing. */
const NODE_RADIUS: Partial<Record<BrainEntityKind, number>> = {
  founder: 14,
  brand: 11,
  retail_channel: 12,
  prospect: 7,
  purchase_order: 8,
  product: 7,
  automation: 7,
  integration: 6,
  provider: 6,
  loa: 7,
  workflow: 9,
  rule: 6,
  policy: 8,
  case: 7,
  shipment: 7,
  document: 5,
  asin: 5,
  sku: 5,
  knowledge: 6,
};

export interface PlacedNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  cluster: BrainCluster;
  kind: BrainEntityKind;
}

export interface PlacedCluster {
  cluster: BrainCluster;
  label: string;
  /** Anchor point for the sector label. */
  x: number;
  y: number;
  count: number;
  /** Degrees — the sector's start angle, for the sector arc. */
  startDeg: number;
  endDeg: number;
}

export interface BrainLayout {
  width: number;
  height: number;
  nodes: PlacedNode[];
  clusters: PlacedCluster[];
}

function degreesToRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Place the graph. Nodes are grouped by cluster, sorted canonically, then
 * distributed over rings inside the cluster's own sector.
 */
export function layoutBrain(graph: BrainGraph): BrainLayout {
  const nodes: PlacedNode[] = [];
  const clusters: PlacedCluster[] = [];

  CLUSTER_ORDER.forEach((cluster, clusterIndex) => {
    const members = graph.nodes
      .filter((n) => (BRAIN_CLUSTER_OF[n.kind] ?? 'platform') === cluster)
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));

    const startDeg = -90 + clusterIndex * SECTOR_DEGREES;
    const endDeg = startDeg + SECTOR_DEGREES;

    if (members.length > 0) {
      /* Keep the ring count bounded (max 6 rings) so the picture stays legible
         however many records the domain holds. */
      const perRing = Math.max(8, Math.ceil(members.length / 6));
      members.forEach((node, index) => {
        const ring = Math.floor(index / perRing);
        const positionInRing = index % perRing;
        const inRing = Math.min(perRing, members.length - ring * perRing);
        /* Leave a margin inside the sector so adjacent clusters never touch. */
        const usable = SECTOR_DEGREES - 12;
        const offset = inRing === 1 ? usable / 2 : (positionInRing / (inRing - 1)) * usable;
        const angleDeg = startDeg + 6 + offset;
        const radius = INNER_RADIUS + ring * RING_STEP;
        const radians = degreesToRadians(angleDeg);
        nodes.push({
          id: node.id,
          x: CENTRE + radius * Math.cos(radians),
          y: CENTRE + radius * Math.sin(radians),
          radius: NODE_RADIUS[node.kind] ?? 5,
          cluster,
          kind: node.kind,
        });
      });
    }

    const labelRadians = degreesToRadians(startDeg + SECTOR_DEGREES / 2);
    clusters.push({
      cluster,
      label: graph.clusters.find((c) => c.cluster === cluster)?.label ?? cluster,
      /* Labels sit INSIDE the innermost ring so they never collide with nodes. */
      x: CENTRE + (INNER_RADIUS - 74) * Math.cos(labelRadians),
      y: CENTRE + (INNER_RADIUS - 74) * Math.sin(labelRadians),
      count: members.length,
      startDeg,
      endDeg,
    });
  });

  return { width: BRAIN_CANVAS_SIZE, height: BRAIN_CANVAS_SIZE, nodes, clusters };
}

/**
 * Cluster membership is owned by the kind catalogue (`BRAIN_KIND_DEFINITIONS`) —
 * declared once there, projected here. Never a second membership table.
 */
const BRAIN_CLUSTER_OF: Record<BrainEntityKind, BrainCluster> = Object.fromEntries(
  (Object.keys(BRAIN_KIND_DEFINITIONS) as BrainEntityKind[]).map((k) => [k, BRAIN_KIND_DEFINITIONS[k].cluster])
) as Record<BrainEntityKind, BrainCluster>;

/** Positions by node id, for O(1) lookup while rendering edges. */
export function layoutIndex(layout: BrainLayout): Map<string, PlacedNode> {
  return new Map(layout.nodes.map((n) => [n.id, n]));
}