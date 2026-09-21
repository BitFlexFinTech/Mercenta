/**
 * §Priority-1 — DHL domain workflow (simulation-first carrier seam).
 *
 *   USER ACTION → DOMAIN WORKFLOW → PROVIDER CONTRACT → SIMULATION ADAPTER
 *   → SIMULATED MILESTONE → DOMAIN PROCESSING → STATE TRANSITION → AUDIT
 *   → EVENT/NOTIFICATION → UI UPDATE
 *
 * When real DHL Enterprise credentials are entered in the Integrations Hub,
 * the factory (index.ts) returns the LIVE adapter for the SAME contract —
 * this domain function needs no rewrite. The simulated ACTION still refuses
 * to run when the provider is not positively SIMULATION-safe (UNKNOWN /
 * not_registered / live / disabled are all refused, never downgraded).
 *
 * Network isolation: the mock adapter makes no network calls. The event and
 * audit are the existing Mercenta stores — never a parallel pipeline.
 */

import { demoAuditLog, demoShipments } from '@/data/demoStore';
import { emitEvent } from '@/lib/events/eventFeed';
import { createDhlClientForConnection } from './index';
import { milestoneToShipmentStatus } from './transform';
import { isProviderSimulationSafe } from '@/integrations/types';
import type { ProviderResolutionMode } from '@/integrations/types';
import type { ShipmentStatus } from '@/types';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';

export interface DhlDomainInput {
  shipmentId: string;
  /** §Phase 4 — authoritative mode lookup; default `unknown` (never safe). */
  getMode?: (id: string) => ProviderResolutionMode;
  /** Actor label written on audit entries. */
  actorId?: string;
  /**
   * §Priority-1 — carrier-terminal manifests live in the terminal's own row
   * set (GlobalState), not the shared demo store. When `manifest` is given and
   * the shipment id is not (yet) in the shared store, the domain registers a
   * coherent tenant-scoped record so the DHL simulation, audit trail and
   * events all reference real domain state. `brandId` pins the tenant.
   */
  manifest?: {
    reference: string;
    customer: string;
    origin: string;
    destination: string;
    value: number;
  };
  brandId?: string;
}

export interface DhlAdvanceResult {
  ok: boolean;
  status?: 'ok' | 'safety_refused' | 'not_found' | 'provider_error';
  safetyReason?: string;
  providerMode?: ProviderResolutionMode;
  from?: ShipmentStatus;
  to?: ShipmentStatus;
  milestone?: string | null;
  delayed?: boolean;
  exception?: boolean;
  waybill?: string;
  trackingNumber?: string;
  error?: string;
  auditIds: string[];
  eventsEmitted: number;
}

function resolveMode(ctx: DhlDomainInput): ProviderResolutionMode {
  return (ctx.getMode ?? (() => 'unknown' as const))('dhl');
}

/** Find — or register — the domain shipment record. */
function findShipment(ctx: DhlDomainInput) {
  const existing = demoShipments.find((s) => s.id === ctx.shipmentId);
  if (existing) return existing;
  if (!ctx.manifest) return undefined;
  // Carrier manifest row not yet in the shared store: register a coherent,
  // tenant-scoped domain record so the simulation, audit trail and events
  // all operate on real shared state.
  const record = {
    id: ctx.shipmentId,
    brandId: ctx.brandId ?? 'brand-astonish',
    poNumber: (ctx.manifest.reference ?? ctx.shipmentId).toUpperCase(),
    carrier: 'dhl' as const,
    reference: ctx.manifest.reference,
    title: ctx.manifest.customer,
    value: ctx.manifest.value,
    status: 'factory_intake',
    origin: ctx.manifest.origin,
    destination: ctx.manifest.destination,
    delayed: false,
    exception: false,
    waybill: undefined,
    trackingNumber: undefined,
  };
  demoShipments.push(record);
  notifyCanonicalStoreChange();
  return record;
}

function pushAudit(entry: {
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  brandId: string;
  reason: string;
}): string {
  const id = `dhl-audit-${Date.now()}-${demoAuditLog.length}`;
  demoAuditLog.push({
    id,
    createdAt: new Date().toISOString(),
    actorId: entry.actor,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    brandId: entry.brandId,
    reason: entry.reason,
  });
  notifyCanonicalStoreChange();
  return id;
}

/** Record a DHL waybill for a shipment (simulated booking). */
export async function recordDhlWaybill(
  ctx: DhlDomainInput
): Promise<{
  ok: boolean;
  safetyRefused?: boolean;
  safetyReason?: string;
  waybill?: string;
  trackingNumber?: string;
  error?: string;
}> {
  const mode = resolveMode(ctx);
  if (!isProviderSimulationSafe(mode)) {
    return {
      ok: false,
      safetyRefused: true,
      safetyReason: `DHL resolved '${mode}' (not positively SIMULATION). Refusing simulated waybill booking.`,
    };
  }
  const shipment = findShipment({ ...ctx, manifest: ctx.manifest, brandId: ctx.brandId });
  if (!shipment) return { ok: false, error: `Unknown shipment: ${ctx.shipmentId}` };
  if (shipment.waybill) return { ok: true, waybill: shipment.waybill, trackingNumber: shipment.trackingNumber };

  const { client } = createDhlClientForConnection({ credentials: null, edgeFunctionBase: '/functions/v1/dhl' });
  const booked = await client.createShipment({
    reference: shipment.reference,
    origin: shipment.origin,
    destination: shipment.destination,
    cartons: 1,
    service: 'express',
  });
  if (!booked.ok || !booked.waybill) {
    return { ok: false, error: booked.error ?? 'Simulated DHL booking failed' };
  }
  shipment.waybill = booked.waybill;
  shipment.trackingNumber = booked.trackingNumber;
  notifyCanonicalStoreChange();
  return { ok: true, waybill: booked.waybill, trackingNumber: booked.trackingNumber };
}

export { mockWaybillForReference } from './mockClient';
/**
 * Advance a shipment by one simulated provider milestone. Every call polls
 * the provider contract once, maps the returned milestone onto the domain
 * status, mutates the shared store, and records audit + event. Repeated
 * calls walk the milestone sequence to delivered; exceptions surface and are
 * cleared by the following (retry) poll.
 */
export async function advanceShipmentViaDhl(ctx: DhlDomainInput): Promise<DhlAdvanceResult> {
  const mode = resolveMode(ctx);
  const actor = ctx.actorId ?? 'system';
  const auditIds: string[] = [];
  let eventsEmitted = 0;

  if (!isProviderSimulationSafe(mode)) {
    return {
      ok: false,
      status: 'safety_refused',
      safetyReason: `DHL resolved '${mode}' (not positively SIMULATION). Shipment progression refused.`,
      providerMode: mode,
      auditIds,
      eventsEmitted,
    };
  }

  const shipment = findShipment(ctx);
  if (!shipment) {
    return { ok: false, status: 'not_found', error: `Unknown shipment: ${ctx.shipmentId}`, providerMode: mode, auditIds, eventsEmitted };
  }
  const from = shipment.status as ShipmentStatus;

  // Book a waybill first if the carrier has not yet been handed a consignment.
  const booked = await recordDhlWaybill(ctx);
  if (!booked.ok) {
    return { ok: false, status: 'provider_error', error: booked.error ?? 'Waybill booking failed', providerMode: mode, auditIds, eventsEmitted };
  }
  const waybill = booked.waybill as string;

  const { client } = createDhlClientForConnection({ credentials: null, edgeFunctionBase: '/functions/v1/dhl' });
  const status = await client.getShipmentStatus(waybill);

  if (!status.ok) {
    // Deterministic provider error — recorded as a failure + event; no state
    // transition (the retry is the NEXT poll, which the mock recovers).
    auditIds.push(pushAudit({
      actor,
      action: 'shipment_provider_error',
      entityType: 'shipment',
      entityId: ctx.shipmentId,
      brandId: shipment.brandId,
      reason: `DHL status poll failed (simulated): ${status.error ?? 'provider error'}`,
    }));
    emitEvent({
      type: 'provider_failure',
      severity: 'important',
      title: 'DHL status poll failed (simulated)',
      description: `Waybill ${waybill} — ${status.error ?? 'provider error'}`,
      entityId: ctx.shipmentId,
      metadata: { provider: 'dhl', waybill, shipmentId: ctx.shipmentId, retryable: true },
    });
    eventsEmitted += 1;
    return { ok: false, status: 'provider_error', error: status.error, providerMode: mode, waybill, auditIds, eventsEmitted };
  }

  if (!status.milestone) {
    return { ok: false, status: 'provider_error', error: 'DHL returned no milestone (mock or live)', providerMode: mode, waybill, auditIds, eventsEmitted };
  }

  const to = milestoneToShipmentStatus(status.milestone);
  const exception = status.exception === true;
  const delayed = status.delayed === true;

  // Domain state transition (shared store — Carrier and Brand views see the
  // SAME record, tenant-scoped by their own queries).
  shipment.status = to;
  shipment.delayed = delayed || shipment.delayed;
  shipment.exception = exception || shipment.exception;

  auditIds.push(pushAudit({
    actor,
    action: exception ? 'shipment_exception' : 'shipment_milestone',
    entityType: 'shipment',
    entityId: ctx.shipmentId,
    brandId: shipment.brandId,
    reason: exception
      ? `DHL exception (simulated): ${status.exceptionReason ?? 'customs hold'}`
      : `DHL milestone ${status.milestone} applied — ${from} → ${to}`,
  }));

  emitEvent({
    type: exception ? 'provider_failure' : 'shipment_milestone',
    severity: exception ? 'important' : 'informational',
    title: exception
      ? `Shipment exception: ${status.exceptionReason ?? 'DHL hold'}`
      : `${to.replace(/_/g, ' ')} milestone`,
    description: `${from.replace(/_/g, ' ')} → ${to.replace(/_/g, ' ')} (DHL simulated waybill ${waybill})`,
    entityId: ctx.shipmentId,
    metadata: { provider: 'dhl', waybill, from, to, milestone: status.milestone, exception, delayed },
  });
  eventsEmitted += 1;

  return {
    ok: true,
    status: 'ok',
    providerMode: mode,
    from,
    to,
    milestone: status.milestone,
    delayed,
    exception,
    waybill,
    trackingNumber: shipment.trackingNumber,
    auditIds,
    eventsEmitted,
  };
  notifyCanonicalStoreChange();
}