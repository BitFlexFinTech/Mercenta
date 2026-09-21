/**
 * §LOGISTICS HUB — OPERATIONAL MAP DERIVATION (pure, presentation-adjacent).
 *
 * Turns canonical shipment records into the geometry the operational map draws:
 * projected origin/destination points, an indicative arc, an in-transit marker,
 * and — critically — an HONEST truth classification for each leg.
 *
 * This module owns NO business state and performs NO fetching. It is a
 * projection, exactly like the Mercenta Brain graph: callers pass already
 * tenant-scoped records and receive geometry + labels back.
 *
 * TRUTH DISCIPLINE (§Integration modes — fail closed)
 * ---------------------------------------------------
 * A leg is `simulated` ONLY when its carrier provider POSITIVELY resolves to
 * `simulation` via `isProviderSimulationSafe`. Every other mode — configuring,
 * degraded, disabled, not_registered, unknown — is either `live_verified` (live
 * AND the record carries the provider's own identifier) or `ambient`. An unknown
 * provider is NEVER treated as simulation.
 *
 * CARRIER DISCIPLINE (§Canonical business model — Amazon truth)
 * ------------------------------------------------------------
 * The map never assigns a carrier. Carrier expectations come from the canonical
 * `validateCarrierForShipment` / `selectCarrierForShipment` rule, and a Freight
 * Collect PO is explicitly labelled channel-arranged so Mercenta is never shown
 * as choosing the channel's carrier.
 */
import {
  MAP_FRAME,
  OPERATIONAL_TRUTH,
  resolveGeoPlace,
  type GeoPlace,
  type OperationalTruth,
} from '@/config/logisticsGeo';
import {
  isProviderSimulationSafe,
  resolveProviderMode,
  type IntegrationId,
  type IntegrationMode,
} from '@/integrations/types';
import { selectCarrierForShipment, validateCarrierForShipment } from '@/lib/shipping/carrierRouting';
import { STAGE_BY_STATUS } from '@/data/brandDossiers';
import type { FreightTerm, ShipmentStage } from '@/types';

export interface MapPoint {
  x: number;
  y: number;
}

/**
 * Equirectangular projection into the declared MAP_FRAME viewBox.
 * Declared once here so the drawn graticule and every plotted point agree.
 */
export function projectGeo(lat: number, lon: number): MapPoint {
  const { viewBoxWidth, viewBoxHeight, lonMin, lonMax, latMin, latMax } = MAP_FRAME;
  const x = ((lon - lonMin) / (lonMax - lonMin)) * viewBoxWidth;
  const y = ((latMax - lat) / (latMax - latMin)) * viewBoxHeight;
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}

/** Quadratic-bezier control point for an indicative arc between two points. */
export function arcControlPoint(from: MapPoint, to: MapPoint): MapPoint {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  // Bow the arc so it never overlaps the straight chord.
  const bow = Math.min(120, length * 0.16);
  return { x: mx + (-dy / length) * bow, y: my + (dx / length) * bow };
}

/** Point on a quadratic bezier at t ∈ [0,1]. */
export function quadraticPoint(
  from: MapPoint,
  control: MapPoint,
  to: MapPoint,
  t: number
): MapPoint {
  const mt = 1 - t;
  return {
    x: mt * mt * from.x + 2 * mt * t * control.x + t * t * to.x,
    y: mt * mt * from.y + 2 * mt * t * control.y + t * t * to.y,
  };
}

const STAGE_PROGRESS: Record<ShipmentStage, number> = {
  factory_intake: 0.06,
  bak_depot: 0.24,
  international_forwarding: 0.48,
  uk_port_hmrc: 0.7,
  mercenta_hub: 0.86,
  live_amazon: 1,
};

/** Resolve a shipment's real stage from its status (canonical map, no copy). */
export function stageForStatus(status: string, fallbackStage?: ShipmentStage): ShipmentStage {
  const mapped = STAGE_BY_STATUS[status as keyof typeof STAGE_BY_STATUS];
  if (mapped) return mapped;
  return fallbackStage ?? 'factory_intake';
}

export function progressForStage(stage: ShipmentStage): number {
  return STAGE_PROGRESS[stage] ?? 0;
}

/** Provenance inputs the truth classification is derived from. */
export interface LegProvenance {
  /** Provider modes keyed by integration id (from IntegrationsContext). */
  providerModes: Partial<Record<IntegrationId, IntegrationMode>>;
  /** The carrier identity recorded on the shipment. */
  carrier: string;
  /** Provider-issued identifier, when one genuinely exists on the record. */
  providerReference?: string | null;
  /** §Phase E4 provenance flag on the originating PO, when known. */
  simulated?: boolean;
}

export interface LegTruth {
  truth: OperationalTruth;
  /** Why — always stated, never left to the reader to infer. */
  reason: string;
}

/**
 * Classify how a shipment leg is KNOWN. Fails closed.
 *
 * Order matters: LIVE requires BOTH a live mode AND the provider's own
 * identifier. A live mode with no provider reference is NOT live-verified —
 * claiming a live tracking state with no provider evidence is exactly the
 * fabrication this rule exists to prevent.
 */
export function classifyLegTruth(provenance: LegProvenance): LegTruth {
  const mode = resolveProviderMode(provenance.providerModes, provenance.carrier);

  if (isProviderSimulationSafe(mode)) {
    return {
      truth: 'simulated',
      reason:
        `Provider "${provenance.carrier}" positively resolves to SIMULATION — the leg is a working ` +
        `simulation through the canonical adapter seam and made no external network call.`,
    };
  }

  if (mode === 'live') {
    if (provenance.providerReference) {
      return {
        truth: 'live_verified',
        reason:
          `Provider "${provenance.carrier}" is LIVE and the record carries provider reference ` +
          `"${provenance.providerReference}".`,
      };
    }
    return {
      truth: 'ambient',
      reason:
        `Provider "${provenance.carrier}" is LIVE but this record carries no provider-issued ` +
        `identifier, so the leg cannot be verified against the provider. Plotted as context only.`,
    };
  }

  return {
    truth: 'ambient',
    reason:
      `Provider "${provenance.carrier}" did not positively resolve to simulation (mode: ${mode}). ` +
      `Unknown modes are never treated as simulation — the leg is plotted as ambient context only.`,
  };
}

export interface OperationalLegInput {
  id: string;
  reference: string;
  title: string;
  poNumber?: string;
  brandId?: string;
  carrier: string;
  status: string;
  stage?: ShipmentStage;
  origin?: string;
  destination?: string;
  value?: number;
  cbm?: number;
  delayed?: boolean;
  exception?: boolean;
  waybill?: string | null;
  trackingNumber?: string | null;
  freightTerm?: FreightTerm | null;
  providerModes: Partial<Record<IntegrationId, IntegrationMode>>;
  simulated?: boolean;
}

export interface OperationalLeg {
  id: string;
  reference: string;
  title: string;
  poNumber: string;
  brandId: string;
  carrier: string;
  status: string;
  stage: ShipmentStage;
  origin: ReturnType<typeof resolveGeoPlace>;
  destination: ReturnType<typeof resolveGeoPlace>;
  /** null when either end is undeclared — the leg is schematic, never guessed. */
  geometry: { from: MapPoint; control: MapPoint; to: MapPoint; marker: MapPoint } | null;
  progress: number;
  truth: OperationalTruth;
  truthReason: string;
  value: number;
  cbm: number;
  delayed: boolean;
  exception: boolean;
  freightTerm: FreightTerm | null;
  channelArranged: boolean;
  /** The carrier the canonical lane rule expects (null when channel-arranged). */
  expectedCarrier: string | null;
  carrierValidationError: string | null;
}

export interface OperationalMapNode {
  id: string;
  label: string;
  kind: GeoPlace['kind'];
  point: MapPoint;
  /** How many legs touch this node — drives visual weight, never decoration. */
  legCount: number;
}

export interface OperationalMapModel {
  legs: OperationalLeg[];
  /** Locatable legs — these are drawn on the frame. */
  mapped: OperationalLeg[];
  /** Legs whose geography is not declared — surfaced, never silently dropped. */
  schematic: OperationalLeg[];
  nodes: OperationalMapNode[];
  truthCounts: Record<OperationalTruth, number>;
  carrierCounts: { carrier: string; count: number }[];
  exceptionCount: number;
}

export function buildOperationalMap(inputs: OperationalLegInput[]): OperationalMapModel {
  const legs: OperationalLeg[] = inputs.map((input) => {
    const stage = input.stage ?? stageForStatus(input.status);
    const origin = resolveGeoPlace(input.origin);
    const destination = resolveGeoPlace(input.destination);
    const progress = progressForStage(stage);

    let geometry: OperationalLeg['geometry'] = null;
    if (origin.place && destination.place) {
      const from = projectGeo(origin.place.lat, origin.place.lon);
      const to = projectGeo(destination.place.lat, destination.place.lon);
      const control = arcControlPoint(from, to);
      const marker = quadraticPoint(from, control, to, Math.max(0.02, Math.min(0.98, progress)));
      geometry = { from, control, to, marker };
    }

    const providerReference = input.waybill ?? input.trackingNumber ?? null;
    const { truth, reason } = classifyLegTruth({
      providerModes: input.providerModes,
      carrier: input.carrier,
      providerReference,
      simulated: input.simulated,
    });

    // Carrier expectation comes from the canonical rule — never asserted here.
    const brandNation = origin.raw || null;
    const decision = selectCarrierForShipment({ brandNation, originCountry: origin.raw || null });
    const validation = validateCarrierForShipment({
      carrier: input.carrier,
      brandNation,
      originCountry: origin.raw || null,
      freightTerm: input.freightTerm ?? undefined,
    });

    return {
      id: input.id,
      reference: input.reference,
      title: input.title,
      poNumber: input.poNumber ?? '',
      brandId: input.brandId ?? '',
      carrier: input.carrier,
      status: input.status,
      stage,
      origin,
      destination,
      geometry,
      progress,
      truth,
      truthReason: reason,
      value: input.value ?? 0,
      cbm: input.cbm ?? 0,
      delayed: Boolean(input.delayed),
      exception: Boolean(input.exception),
      freightTerm: input.freightTerm ?? null,
      channelArranged: (input.freightTerm ?? null) === 'collect',
      expectedCarrier: validation.amazonArranged ? null : decision.carrier,
      carrierValidationError: validation.ok ? null : validation.error ?? null,
    };
  });

  const nodeMap = new Map<string, OperationalMapNode>();
  for (const leg of legs) {
    if (!leg.geometry) continue;
    for (const end of [leg.origin, leg.destination]) {
      if (!end.place) continue;
      const existing = nodeMap.get(end.place.id);
      if (existing) {
        existing.legCount += 1;
      } else {
        nodeMap.set(end.place.id, {
          id: end.place.id,
          label: end.place.label,
          kind: end.place.kind,
          point: projectGeo(end.place.lat, end.place.lon),
          legCount: 1,
        });
      }
    }
  }

  const truthCounts: Record<OperationalTruth, number> = {
    live_verified: 0,
    simulated: 0,
    ambient: 0,
  };
  const carrierMap = new Map<string, number>();
  for (const leg of legs) {
    truthCounts[leg.truth] += 1;
    carrierMap.set(leg.carrier, (carrierMap.get(leg.carrier) ?? 0) + 1);
  }

  return {
    legs,
    mapped: legs.filter((l) => l.geometry !== null),
    schematic: legs.filter((l) => l.geometry === null),
    nodes: [...nodeMap.values()].sort((a, b) => b.legCount - a.legCount),
    truthCounts,
    carrierCounts: [...carrierMap.entries()]
      .map(([carrier, count]) => ({ carrier, count }))
      .sort((a, b) => b.count - a.count || a.carrier.localeCompare(b.carrier)),
    exceptionCount: legs.filter((l) => l.exception || l.delayed).length,
  };
}

/** Truth presentation lookup for legends, filters and the inspector. */
export function truthPresentation(truth: OperationalTruth) {
  return OPERATIONAL_TRUTH[truth];
}

/** Statuses still moving — these are the legs eligible for ambient drift. */
export function isLegInMotion(status: string): boolean {
  return (
    status === 'sea_transit' ||
    status === 'air_transit' ||
    status === 'uk_customs_cleared' ||
    status === 'bak_depot'
  );
}