/**
 * §WAVE 3 — LOGISTICS HERO: DETERMINISTIC NETWORK SIMULATION.
 *
 * A PURE projection over canonical data + declared geography. It owns no
 * business state, performs no fetching and makes ZERO network calls.
 *
 * DETERMINISM (a hard requirement, not a preference)
 * --------------------------------------------------
 * Every lane's phase and speed multiplier is derived from a stable hash of its
 * own id — never `Math.random()`, never a clock read inside a derivation. Given
 * the same `timeMs` the network produces identical positions, so the Hero is
 * reproducible, testable and screenshot-stable. Motion is a normalised progress
 * in [0,1) over `HERO_SCENE.simulation.loopMs`.
 *
 * TRUTH SEMANTICS (never conflated — §Integration modes / §Amazon truth)
 * ---------------------------------------------------------------------
 *   brand lanes    — derived from REAL canonical shipment legs. Their truth is
 *                    the leg's own classification (`classifyLegTruth`): a lane
 *                    is `simulated` ONLY when its provider positively resolves
 *                    to `simulation`, `live_verified` only with a provider
 *                    identifier, otherwise `ambient`.
 *   ambient lanes  — declared network context. ALWAYS `ambient`. Ambient traffic
 *                    is never presented as a Mercenta shipment and never as live.
 */
import {
  HERO_SCENE,
  GLOBAL_LOGISTICS_GATEWAYS,
  UK_LOGISTICS_GATEWAYS,
  heroFcDestinations,
  MERCENTA_HUB_PLACE,
  type HeroGateway,
  type UkGateway,
} from '@/config/logisticsHero';
import type { OperationalTruth } from '@/config/logisticsGeo';
import { UK_LAND_RINGS, UK_STRATEGIC_ROADS, WORLD_LAND_RINGS } from '@/data/logisticsHeroGeo';

export type HeroMotion = 'air' | 'sea' | 'road';
export type HeroRelevance = 'brand' | 'ambient';

export type Vec3 = [number, number, number];

export interface HeroPath {
  points: Vec3[];
  /** Cumulative arc length at each point (same length as `points`). */
  lengths: number[];
  total: number;
}

export interface HeroLane {
  id: string;
  motion: HeroMotion;
  relevance: HeroRelevance;
  /** Brand lanes carry the leg's truth; ambient lanes are always `ambient`. */
  truth: OperationalTruth;
  /** Accessible name for the DOM semantics layer. */
  label: string;
  fromLabel: string;
  toLabel: string;
  /** Deterministic start offset in [0,1). */
  phase: number;
  /** Deterministic speed multiplier (varied, bounded). */
  speed: number;
  path: HeroPath;
  tone: 'brand' | 'ambient' | 'exception';
}

export interface HeroNetwork {
  lanes: HeroLane[];
  counts: {
    aircraft: number;
    ships: number;
    roadVehicles: number;
    brandLegs: number;
    ambientLanes: number;
    origins: number;
    truth: Record<OperationalTruth, number>;
  };
  /** Distinct origin regions represented — used by the accessible summary. */
  regions: string[];
}

/* ── Projections (declared once; the scene and the DOM layer share them) ──── */

/** Scene units per degree — ONE constant so no layer can disagree. */
export const DEGREE_UNITS = 0.833;

const tile = HERO_SCENE.ukTile;
const backdrop = HERO_SCENE.backdrop;

export const TILE_CENTER_LAT = (tile.latMin + tile.latMax) / 2;
export const TILE_CENTER_LON = (tile.lonMin + tile.lonMax) / 2;

/** lon/lat → the UK tile's plane coordinates (x, y, z) in scene space. */
export function ukToScene(lat: number, lon: number, height = 0): Vec3 {
  const unit = DEGREE_UNITS * tile.scale;
  return [(lon - TILE_CENTER_LON) * unit, tile.lift + height, -(lat - TILE_CENTER_LAT) * unit];
}

/**
 * lon/lat → a scene-space point on the world backdrop. The backdrop group in the
 * scene applies the same position/rotation, so an aircraft lane can start at a
 * backdrop point and be handed to the scene as a plain scene coordinate.
 */
export function worldToScene(lat: number, lon: number): Vec3 {
  const localX = lon * DEGREE_UNITS;
  const localZ = -lat * DEGREE_UNITS;
  const theta = backdrop.rotationX;
  const y = -localZ * Math.sin(theta);
  const z = localZ * Math.cos(theta);
  const [px, py, pz] = backdrop.position;
  return [localX + px, y + py, z + pz];
}

/* ── Geometry helpers ────────────────────────────────────────────────────── */

export function buildPath(points: Vec3[]): HeroPath {
  const lengths = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const [ax, ay, az] = points[i - 1];
    const [bx, by, bz] = points[i];
    total += Math.hypot(bx - ax, by - ay, bz - az);
    lengths.push(total);
  }
  return { points, lengths, total };
}

/** Sample a path by normalised arc length, returning position + heading. */
export function samplePath(path: HeroPath, t: number): { position: Vec3; heading: number } {
  if (path.points.length === 0) return { position: [0, 0, 0], heading: 0 };
  if (path.points.length === 1 || path.total === 0) {
    return { position: path.points[0], heading: 0 };
  }
  const target = Math.min(1, Math.max(0, t)) * path.total;
  let i = 1;
  while (i < path.lengths.length - 1 && path.lengths[i] < target) i++;
  const segStart = path.lengths[i - 1];
  const segLength = path.lengths[i] - segStart || 1;
  const local = (target - segStart) / segLength;
  const a = path.points[i - 1];
  const b = path.points[i];
  const position: Vec3 = [
    a[0] + (b[0] - a[0]) * local,
    a[1] + (b[1] - a[1]) * local,
    a[2] + (b[2] - a[2]) * local,
  ];
  return { position, heading: Math.atan2(b[0] - a[0], b[2] - a[2]) };
}

/** Quadratic bezier sampled into a polyline — used for arcs and sea lanes. */
export function arcPoints(from: Vec3, control: Vec3, to: Vec3, segments: number): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const mt = 1 - t;
    out.push([
      mt * mt * from[0] + 2 * mt * t * control[0] + t * t * to[0],
      mt * mt * from[1] + 2 * mt * t * control[1] + t * t * to[1],
      mt * mt * from[2] + 2 * mt * t * control[2] + t * t * to[2],
    ]);
  }
  return out;
}

/* ── Deterministic variation (stable hash — never random) ────────────────── */

export function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** A stable value in [0,1) derived from an id and a salt. */
export function stableUnit(id: string, salt: number): number {
  return (stableHash(`${id}:${salt}`) % 100000) / 100000;
}

/* ── Land / road geometry into scene space (computed once, memoised) ─────── */

function ringToScene(ring: readonly number[]): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < ring.length; i += 2) out.push(ukToScene(ring[i + 1], ring[i], 0));
  return out;
}

/** UK landmass rings on the tile surface (authentic coastline). */
export function ukLandRings(): Vec3[][] {
  return UK_LAND_RINGS.map(ringToScene);
}

/** World landmass rings on the backdrop plane (authentic world silhouette). */
export function worldLandRings(): Vec3[][] {
  const out: Vec3[][] = [];
  for (const ring of WORLD_LAND_RINGS) {
    const points: Vec3[] = [];
    for (let i = 0; i < ring.length; i += 2) points.push(worldToScene(ring[i + 1], ring[i]));
    out.push(points);
  }
  return out;
}

interface RoadLine {
  points: Vec3[];
  midpoint: Vec3;
  length: number;
}

let roadCache: RoadLine[] | null = null;

function roadLines(): RoadLine[] {
  if (roadCache) return roadCache;
  const lines: RoadLine[] = [];
  for (const raw of UK_STRATEGIC_ROADS) {
    const points: Vec3[] = [];
    for (let i = 0; i < raw.length; i += 2) points.push(ukToScene(raw[i + 1], raw[i], 0));
    if (points.length < 2) continue;
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += Math.hypot(points[i][0] - points[i - 1][0], points[i][2] - points[i - 1][2]);
    }
    lines.push({ points, midpoint: points[Math.floor(points.length / 2)], length });
  }
  roadCache = lines.sort((a, b) => b.length - a.length);
  return roadCache;
}

/** The authentic UK strategic road network, in tile scene space (memoised). */
export function ukStrategicRoadLines(): Vec3[][] {
  return roadLines().map((line) => line.points);
}

/**
 * Select road corridors with GEOGRAPHIC SPREAD — the longest way per grid cell,
 * so vehicles are distributed across the UK instead of clustering in one
 * region. Deterministic: driven by the length-sorted road list, never random.
 */
function spreadRoadSelection(max: number): RoadLine[] {
  /**
   * Grid cell size in scene units. The tile spans ≈114 × 92 units, so 12 units
   * gives ~10 × 8 cells. TWO corridors per cell are permitted so the declared
   * vehicle budget is reachable on a network that concentrates in the southern
   * half of the tile, while the traffic still stays spread out.
   */
  const cellSize = 12;
  const perCell = 2;
  const used = new Map<string, number>();
  const picked: RoadLine[] = [];
  for (const line of roadLines()) {
    const cell = `${Math.round(line.midpoint[0] / cellSize)}:${Math.round(line.midpoint[2] / cellSize)}`;
    const count = used.get(cell) ?? 0;
    if (count >= perCell) continue;
    used.set(cell, count + 1);
    picked.push(line);
    if (picked.length >= max) break;
  }
  return picked;
}

/** The nearest point on the authentic road network to a tile coordinate. */
function nearestRoadPoint(target: Vec3): { point: Vec3; lineIndex: number; pointIndex: number; distance: number } | null {
  let best: { point: Vec3; lineIndex: number; pointIndex: number; distance: number } | null = null;
  const lines = roadLines();
  for (let li = 0; li < lines.length; li++) {
    const points = lines[li].points;
    for (let pi = 0; pi < points.length; pi++) {
      const point = points[pi];
      const distance = Math.hypot(point[0] - target[0], point[2] - target[2]);
      if (!best || distance < best.distance) best = { point, lineIndex: li, pointIndex: pi, distance };
    }
  }
  return best;
}

/* ── Ambient lane tables (declared, deterministic, bounded) ──────────────── */

const GATEWAYS_BY_ID = new Map<string, HeroGateway>(
  [...GLOBAL_LOGISTICS_GATEWAYS, ...(UK_LOGISTICS_GATEWAYS as readonly HeroGateway[])].map((g) => [g.id, g])
);

function gateway(id: string): HeroGateway {
  const found = GATEWAYS_BY_ID.get(id);
  if (!found) throw new Error(`Logistics Hero lane references an undeclared gateway: ${id}`);
  return found;
}

/**
 * Air lanes: international gateway → UK air gateway.
 *
 * Deliberately spread across continents and BOTH hemispheres so the inbound
 * network reads as global. Each lane's phase/speed come from the stable hash of
 * its id — staggered starts and varied speeds, never synchronised.
 */
const AIR_LANE_TABLE: readonly { from: string; to: string }[] = [
  { from: 'air_pudong', to: 'uk_air_heathrow' },
  { from: 'air_baoan', to: 'uk_air_stansted' },
  { from: 'air_incheon', to: 'uk_air_east_midlands' },
  { from: 'air_narita', to: 'uk_air_heathrow' },
  { from: 'air_changi', to: 'uk_air_heathrow' },
  { from: 'air_mumbai', to: 'uk_air_east_midlands' },
  { from: 'air_delhi', to: 'uk_air_manchester' },
  { from: 'air_dubai', to: 'uk_air_heathrow' },
  { from: 'air_doha', to: 'uk_air_stansted' },
  { from: 'air_istanbul', to: 'uk_air_east_midlands' },
  { from: 'air_frankfurt', to: 'uk_air_east_midlands' },
  { from: 'air_amsterdam', to: 'uk_air_heathrow' },
  { from: 'air_paris', to: 'uk_air_manchester' },
  { from: 'air_jfk', to: 'uk_air_heathrow' },
  { from: 'air_ord', to: 'uk_air_prestwick' },
  { from: 'air_lax', to: 'uk_air_heathrow' },
  { from: 'air_atl', to: 'uk_air_manchester' },
  { from: 'air_gru', to: 'uk_air_heathrow' },
  { from: 'air_jnb', to: 'uk_air_east_midlands' },
  { from: 'air_nbo', to: 'uk_air_heathrow' },
  { from: 'air_los', to: 'uk_air_stansted' },
  { from: 'air_sydney', to: 'uk_air_heathrow' },
];

/**
 * Sea lanes: international port → UK sea gateway. The approach BEARING is the
 * authentic bearing from the real origin port to the real UK port, so the
 * traffic genuinely arrives from the right direction.
 */
const SEA_LANE_TABLE: readonly { from: string; to: string }[] = [
  { from: 'port_shanghai', to: 'uk_port_felixstowe' },
  { from: 'port_yantian', to: 'uk_port_gateway' },
  { from: 'port_ningbo', to: 'uk_port_southampton' },
  { from: 'port_busan', to: 'uk_port_felixstowe' },
  { from: 'port_yokohama', to: 'uk_port_gateway' },
  { from: 'port_singapore', to: 'uk_port_felixstowe' },
  { from: 'port_nhava', to: 'uk_port_southampton' },
  { from: 'port_jebel_ali', to: 'uk_port_liverpool' },
  { from: 'port_jeddah', to: 'uk_port_liverpool' },
  { from: 'port_rotterdam', to: 'uk_port_immingham' },
  { from: 'port_hamburg', to: 'uk_port_immingham' },
  { from: 'port_antwerp', to: 'uk_port_gateway' },
  { from: 'port_piraeus', to: 'uk_port_southampton' },
  { from: 'port_valencia', to: 'uk_port_southampton' },
  { from: 'port_los_angeles', to: 'uk_port_liverpool' },
  { from: 'port_newark', to: 'uk_port_liverpool' },
  { from: 'port_savannah', to: 'uk_port_liverpool' },
  { from: 'port_santos', to: 'uk_port_liverpool' },
  { from: 'port_durban', to: 'uk_port_southampton' },
  { from: 'port_mombasa', to: 'uk_port_southampton' },
  { from: 'port_lagos', to: 'uk_port_liverpool' },
  { from: 'port_botany', to: 'uk_port_gateway' },
];

/** Great-circle initial bearing (degrees) from origin to destination. */
export function bearingDeg(fromLat: number, fromLon: number, toLat: number, toLon: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(fromLat);
  const φ2 = toRad(toLat);
  const Δλ = toRad(toLon - fromLon);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const airLaneId = (from: string, to: string) => `air:${from}->${to}`;
const seaLaneId = (from: string, to: string) => `sea:${from}->${to}`;

export function airLane(from: string, to: string): HeroLane {
  const origin = gateway(from);
  const destination = gateway(to);
  const id = airLaneId(from, to);
  const start = worldToScene(origin.lat, origin.lon);
  const end = ukToScene(destination.lat, destination.lon, 2.4);
  // Bow the arc away from the straight chord so lanes never overlap exactly.
  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[2] + end[2]) / 2;
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const span = Math.hypot(dx, dz) || 1;
  const bow = Math.min(120, span * 0.18) * (stableUnit(id, 1) > 0.5 ? 1 : -1);
  const control: Vec3 = [
    midX + (-dz / span) * bow,
    HERO_SCENE.simulation.cruiseAltitude + stableUnit(id, 2) * 14,
    midZ + (dx / span) * bow,
  ];
  return {
    id,
    motion: 'air',
    relevance: 'ambient',
    truth: 'ambient',
    label: `Ambient air lane — ${origin.label} → ${destination.label}`,
    fromLabel: origin.label,
    toLabel: destination.label,
    phase: stableUnit(id, 3),
    speed: 0.72 + stableUnit(id, 4) * 0.62,
    path: buildPath(arcPoints(start, control, end, 48)),
    tone: 'ambient',
  };
}

export function seaLane(from: string, to: string): HeroLane {
  const origin = gateway(from);
  const destination = gateway(to);
  const id = seaLaneId(from, to);
  const port = ukToScene(destination.lat, destination.lon, 0);
  /**
   * The sea plane is COPLANAR with the UK tile base (`ukTile.lift`), so a ship
   * sails on the water AROUND the landmass and can never render on top of it —
   * the defect that appeared when the tile was lifted above the sea plane.
   * The lane also stops well offshore rather than at the port coordinate, so the
   * vessel never clips through the coastline.
   */
  const seaY = HERO_SCENE.ukTile.lift + HERO_SCENE.simulation.shipHeight;
  const bearing = bearingDeg(origin.lat, origin.lon, destination.lat, destination.lon);
  const toRad = (d: number) => (d * Math.PI) / 180;
  const offshore = 7;
  const end: Vec3 = [
    port[0] + Math.sin(toRad(bearing)) * offshore,
    seaY,
    port[2] - Math.cos(toRad(bearing)) * offshore,
  ];
  const approach = 70 + stableUnit(id, 5) * 60;
  const start: Vec3 = [
    end[0] + Math.sin(toRad(bearing)) * approach,
    seaY,
    end[2] - Math.cos(toRad(bearing)) * approach,
  ];
  const control: Vec3 = [
    (start[0] + end[0]) / 2 + Math.cos(toRad(bearing)) * approach * 0.16,
    seaY,
    (start[2] + end[2]) / 2 + Math.sin(toRad(bearing)) * approach * 0.16,
  ];
  return {
    id,
    motion: 'sea',
    relevance: 'ambient',
    truth: 'ambient',
    label: `Ambient maritime lane — ${origin.label} → ${destination.label}`,
    fromLabel: origin.label,
    toLabel: destination.label,
    phase: stableUnit(id, 6),
    speed: 0.5 + stableUnit(id, 7) * 0.5,
    path: buildPath(arcPoints(start, control, end, 40)),
    tone: 'ambient',
  };
}

/* ── Road lanes (authentic corridors + canonical FC approaches) ──────────── */

export function roadCorridorLane(index: number, points: Vec3[]): HeroLane {
  const id = `road:corridor:${index}`;
  return {
    id,
    motion: 'road',
    relevance: 'ambient',
    truth: 'ambient',
    label: `Ambient road movement — UK strategic corridor ${index + 1}`,
    fromLabel: 'UK strategic road network',
    toLabel: 'UK strategic road network',
    phase: stableUnit(id, 8),
    speed: 0.6 + stableUnit(id, 9) * 0.7,
    path: buildPath(points),
    tone: 'ambient',
  };
}

/**
 * FC approach lanes — the canonical destination connections.
 *
 * For every canonical UK fulfilment-centre CITY (derived from
 * `DEFAULT_UK_FC_LIST`, coordinates from `logisticsGeo.FC_CITY_POINTS`), the
 * nearest point on the AUTHENTIC strategic road network is found and a short
 * approach lane is built from that road point to the FC node. Road traffic
 * therefore visibly connects to the canonical destinations, and neither the
 * road nor the destination is invented.
 */
export function fcApproachLanes(): HeroLane[] {
  const lanes: HeroLane[] = [];
  const lines = roadLines();
  for (const fc of heroFcDestinations()) {
    const node = ukToScene(fc.place.lat, fc.place.lon, 2.4);
    const nearest = nearestRoadPoint(node);
    if (!nearest || nearest.distance < 0.4) continue;

    /**
     * The approach runs from a point ON the authentic road network to the
     * canonical FC node. Real FC cities sit close to the strategic network, so
     * the lane is built by walking back along the SAME road line until the spur
     * is long enough to read — never by inventing a road.
     */
    const line = lines[nearest.lineIndex];
    let startIndex = nearest.pointIndex;
    let travelled = 0;
    while (startIndex > 0 && travelled < 4.5) {
      const a = line.points[startIndex];
      const b = line.points[startIndex - 1];
      travelled += Math.hypot(a[0] - b[0], a[2] - b[2]);
      startIndex -= 1;
    }
    const roadPoints = line.points.slice(startIndex, nearest.pointIndex + 1);
    if (roadPoints.length < 2) continue;

    const id = `road:fc:${fc.city}`;
    lanes.push({
      id,
      motion: 'road',
      relevance: 'ambient',
      truth: 'ambient',
      label: `Ambient road approach — strategic road network → ${fc.city} (${fc.codes.join(', ')})`,
      fromLabel: 'UK strategic road network',
      toLabel: `${fc.city} (${fc.codes.join(', ')})`,
      phase: stableUnit(id, 10),
      speed: 0.55 + stableUnit(id, 11) * 0.5,
      path: buildPath([...roadPoints, node]),
      tone: 'ambient',
    });
  }
  return lanes;
}

/* ── Brand-relevant legs (canonical shipments — the ONLY non-ambient lanes) ─ */

export interface HeroBrandLegInput {
  id: string;
  reference: string;
  title: string;
  origin: { label: string; lat: number; lon: number; kind: string } | null;
  destination: { label: string; lat: number; lon: number; kind: string } | null;
  truth: OperationalTruth;
  exception?: boolean;
}

const UK_KINDS = new Set(['mercenta_hub', 'uk_gateway', 'amazon_fc']);

/** Where a place sits in the scene: on the UK tile, or on the world backdrop. */
export function sceneForPlace(place: { lat: number; lon: number; kind: string }): Vec3 {
  return UK_KINDS.has(place.kind)
    ? ukToScene(place.lat, place.lon, 2.4)
    : worldToScene(place.lat, place.lon);
}

export function brandLegLane(leg: HeroBrandLegInput): HeroLane | null {
  if (!leg.origin || !leg.destination) return null;
  const id = `brand:${leg.id}`;
  const start = sceneForPlace(leg.origin);
  const end = sceneForPlace(leg.destination);
  const domestic = UK_KINDS.has(leg.origin.kind) && UK_KINDS.has(leg.destination.kind);
  const midX = (start[0] + end[0]) / 2;
  const midZ = (start[2] + end[2]) / 2;
  const control: Vec3 = [
    midX,
    domestic
      ? HERO_SCENE.ukTile.lift + 10 + stableUnit(id, 12) * 6
      : HERO_SCENE.simulation.cruiseAltitude * 0.72,
    midZ,
  ];
  return {
    id,
    motion: 'air',
    relevance: 'brand',
    truth: leg.truth,
    label: `Consignment ${leg.reference} — ${leg.origin.label} → ${leg.destination.label} (${leg.truth})`,
    fromLabel: leg.origin.label,
    toLabel: leg.destination.label,
    phase: stableUnit(id, 13),
    speed: 0.45 + stableUnit(id, 14) * 0.4,
    path: buildPath(arcPoints(start, control, end, 44)),
    tone: leg.exception ? 'exception' : 'brand',
  };
}

/* ── Network assembly ────────────────────────────────────────────────────── */

export interface HeroNetworkInput {
  /** Canonical shipment legs (already tenant-scoped by the caller). */
  brandLegs?: HeroBrandLegInput[];
}

/**
 * Build the whole Hero network.
 *
 * Ambient lanes are always present (the network must read as alive even with no
 * shipments); brand lanes are added only where a real canonical leg resolves to
 * geography. Nothing is fabricated for a brand that has no consignments.
 */
export function buildHeroNetwork(input: HeroNetworkInput = {}): HeroNetwork {
  const lanes: HeroLane[] = [];

  for (const lane of AIR_LANE_TABLE.slice(0, HERO_SCENE.budget.maxAircraft).map(({ from, to }) => airLane(from, to))) {
    lanes.push(lane);
  }
  for (const lane of SEA_LANE_TABLE.slice(0, HERO_SCENE.budget.maxShips).map(({ from, to }) => seaLane(from, to))) {
    lanes.push(lane);
  }

  const corridors = spreadRoadSelection(
    Math.max(1, HERO_SCENE.budget.maxRoadVehicles - heroFcDestinations().length)
  );
  corridors.forEach((corridor, index) => lanes.push(roadCorridorLane(index, corridor.points)));
  for (const lane of fcApproachLanes()) lanes.push(lane);

  const brandLanes: HeroLane[] = [];
  for (const leg of (input.brandLegs ?? []).slice(0, HERO_SCENE.budget.maxBrandLegs)) {
    const lane = brandLegLane(leg);
    if (lane) brandLanes.push(lane);
  }
  lanes.push(...brandLanes);

  const truth: Record<OperationalTruth, number> = { live_verified: 0, simulated: 0, ambient: 0 };
  for (const lane of lanes) truth[lane.truth] += 1;

  const regions = new Set<string>();
  for (const lane of [...AIR_LANE_TABLE, ...SEA_LANE_TABLE]) {
    const origin = gateway(lane.from);
    if (origin.region !== 'UK') regions.add(origin.region);
  }

  return {
    lanes,
    counts: {
      aircraft: lanes.filter((l) => l.motion === 'air' && l.relevance === 'ambient').length,
      ships: lanes.filter((l) => l.motion === 'sea').length,
      roadVehicles: lanes.filter((l) => l.motion === 'road').length,
      brandLegs: brandLanes.length,
      ambientLanes: lanes.filter((l) => l.relevance === 'ambient').length,
      origins: new Set([...AIR_LANE_TABLE, ...SEA_LANE_TABLE].map((l) => l.from)).size,
      truth,
    },
    regions: [...regions].sort(),
  };
}

/** Progress along a lane at a simulated time, in [0,1). Pure. */
export function laneProgress(lane: HeroLane, timeMs: number): number {
  const loop = HERO_SCENE.simulation.loopMs;
  const raw = (timeMs / loop) * lane.speed + lane.phase;
  return raw - Math.floor(raw);
}

/** Position + heading of a lane's vehicle at a simulated time. */
export function laneSample(lane: HeroLane, timeMs: number): { position: Vec3; heading: number } {
  return samplePath(lane.path, laneProgress(lane, timeMs));
}

/**
 * The reduced-motion composition: every entity is placed at its own staggered
 * phase, so the still frame still shows the whole network with its variation.
 */
export const HERO_STATIC_TIME_MS = 42_000;

/** The accessible summary the DOM semantics layer renders. */
export function heroSummary(network: HeroNetwork): string {
  const { counts } = network;
  const brand =
    counts.brandLegs === 0
      ? 'No consignments are plotted for this account right now'
      : `${counts.brandLegs} consignment ${counts.brandLegs === 1 ? 'lane' : 'lanes'} from your own shipments`;
  return (
    `Global inbound logistics network. ${counts.aircraft} aircraft inbound on international air lanes and ` +
    `${counts.ships} container ships on maritime approach lanes, from ${counts.origins} declared gateway origins ` +
    `across ${network.regions.length} world regions; ${counts.roadVehicles} road vehicles on the UK strategic road ` +
    `network and its approaches to the declared fulfilment-centre cities. ${brand}. ` +
    `${counts.ambientLanes} lanes are ambient network context and are not Mercenta shipments. ` +
    `Fixed camera, no interaction — the operational Logistics Hub controls are below.`
  );
}

