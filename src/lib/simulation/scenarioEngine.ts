/**
 * §2C — Simulation Scenario Engine.
 *
 * Deterministic, reproducible scenarios that exercise the SAME domain stores,
 * business rules and integration seams as live operation — never a static
 * array dump. Every scenario:
 *   - reuses the existing demo store (demoPurchaseOrders, demoShipments,
 *     demoDeductions, demoTickets, demoAuditLog, eventFeed);
 *   - reuses existing domain mutations where they are SAFE for simulation
 *     (acknowledgePurchaseOrder, createShipmentForPO, reconcileDelivery,
 *     createDeductionInStore, disputeDeduction, recordDisputeOutcome,
 *     ticketStore, submitCatalogItem, pollSubmissionStatus);
 *   - NEVER calls `createPurchaseOrder` (it sends a real Postmark email) —
 *     new POs are constructed directly and pushed into demoPurchaseOrders;
 *   - refuses to run against a LIVE provider (scenario safety gate);
 *   - generates coherent entities with a deterministic run id prefix so
 *     created records are traceable and reset is non-destructive;
 *   - records a full event→action→state→effect→audit→notification trail.
 *
 * The engine NEVER invokes a live provider: integration scenarios route
 * through the Mock SP-API seam (same contract as the live client, zero code
 * change when real credentials arrive). No external network/email/payment
 * side effects are possible from a scenario.
 */

import { emitEvent } from '@/lib/events/eventFeed';
import {
  demoAuditLog,
  demoDeductions,
  demoPurchaseOrders,
  demoShipments,
  createDeductionInStore,
  disputeDeduction,
  recordDisputeOutcome,
  reconcileDelivery,
  setPurchaseOrderStatus,
} from '@/data/demoStore';
import {
  acknowledgePurchaseOrder,
  createShipmentForPO,
  pollSubmissionStatus,
  submitCatalogItem,
} from '@/data/api';
import {
  createTicket,
  updateTicketStatus,
  assignTicket,
} from '@/lib/helpdesk/ticketStore';
import { validateProductImage } from '@/lib/amazon/productImageValidator';
import { resetMockAmazonState } from '@/lib/spapi/mockClient';
import { advanceShipmentViaDhl, recordDhlWaybill } from '@/lib/dhl/domain';
import {
  verifyBrandCompany,
  checkHmrcStatus,
  fileHmrcReturn,
} from '@/lib/compliance/complianceSync';
import type {
  Deduction,
  PurchaseOrder,
  PurchaseOrderLineItem,
  Shipment,
  Ticket,
} from '@/types';
import { isProviderSimulationSafe } from '@/integrations/types';
import type { ProviderResolutionMode } from '@/integrations/types';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';

export type ScenarioId =
  | 'NORMAL_PO'
  | 'PARTIAL_PO'
  | 'DELAYED_DELIVERY'
  | 'FINANCIAL_EXCEPTION'
  | 'CASE'
  | 'PRODUCT_FAILURE'
  | 'INTEGRATION_FAILURE'
  // §Priority-1 — provider-driven workflows (DHL milestone progression +
  // government compliance verification), exercising the SAME domain seams.
  | 'SHIPMENT_PROGRESSION'
  | 'COMPLIANCE_VERIFICATION';

export interface ScenarioRunContext {
  /** Brand whose tenant the scenario operates in. Defaults to the first cleared brand. */
  brandId?: string;
  /** Deterministic seed — same seed ⇒ same runId ⇒ same record ids. */
  seed?: number;
  /** Base timestamp (ISO). Records derive their dates from this. */
  timestamp?: string;
  /** Actor label written on audit entries. */
  actorId?: string;
  /**
   * Per-provider mode lookup for the safety gate. Default returns `'unknown'`
   * so an unprovided lookup is NEVER treated as simulation-safe.
   * §Phase 4 — UNKNOWN ≠ SIMULATION.
   */
  getMode?: (id: string) => ProviderResolutionMode;
}

export interface ScenarioStep {
  step: number;
  action: string;
  entityType: string;
  entityId: string;
  from?: string;
  to?: string;
  detail?: string;
  at: string;
}

export interface ScenarioResult {
  scenario: ScenarioId;
  runId: string;
  status: 'ok' | 'safety_refused' | 'error';
  /** Safety refusal reason when stopped at the LIVE gate. */
  safetyReason?: string;
  /** Message when the scenario builder returned an error. */
  error?: string;
  steps: ScenarioStep[];
  created: {
    purchaseOrder?: string;
    shipmentId?: string;
    deductions: string[];
    ticketId?: string;
    productSku?: string;
    submissionId?: string;
  };
  auditIds: string[];
  [key: string]: unknown;
}

/** Deterministic id from runId + kind + counter. No randomness. */
function deriveId(runId: string, kind: string, n = 0): string {
  return `sim-${runId}-${kind}-${n}`;
}

/** Coherent relative timestamp derived from base + days offset. */
function atDays(base: Date, daysOffset: number): string {
  const d = new Date(base.getTime() + daysOffset * 864e5);
  return d.toISOString();
}

/** Resolve the brand the scenario operates in. Prefers an explicitly-cleared demo brand. */
function resolveBrandId(ctx: ScenarioRunContext): string {
  if (ctx.brandId) return ctx.brandId;
  // The first cleared brand (brand-astonish) has a full catalog + contracts +
  // agreements, so it is a coherent tenant for any scenario.
  return 'brand-astonish';
}

/** Coherent audit-entry builder. Deterministic id from runId. */
function audit(
  runId: string,
  ctr: () => number,
  action: string,
  entityType: string,
  entityId: string,
  brandId: string,
  reason: string,
  metadata?: Record<string, unknown>,
  actorId: string = 'system'
): string {
  const n = ctr();
  const id = deriveId(runId, 'audit', n);
  demoAuditLog.push({
    id,
    createdAt: new Date().toISOString(),
    actorId,
    action,
    entityType,
    entityId,
    brandId,
    reason,
    metadata,
  });
  notifyCanonicalStoreChange();
  return id;
}

/** Emit an informational event into the shared feed (never a live send). */
function emitScenarioEvent(
  runId: string,
  type: import('@/lib/events/types').EventType,
  severity: import('@/lib/events/types').EventSeverity,
  title: string,
  description: string,
  entityId: string,
  metadata: Record<string, unknown>
): import('@/lib/events/types').PlatformEvent {
  return emitEvent({
    type,
    severity,
    title,
    description,
    entityId,
    metadata: { runId, ...metadata },
  });
}

/**
 * §Phase 4 — safety gate. A scenario executes ONLY when every required
 * provider is POSITIVELY resolved as `simulation`. `unknown`,
 * `not_registered`, `available`, `configuring`, `disabled`, `degraded`,
 * `error`, or `live` all REFUSE — never silently downgraded.
 */
function assertSimulationOnly(
  ctx: ScenarioRunContext,
  scenario: ScenarioId,
  requiredProviderIds: string[]
): string | null {
  const getMode = ctx.getMode ?? (() => 'unknown' as const);
  for (const id of requiredProviderIds) {
    const mode = getMode(id);
    if (!isProviderSimulationSafe(mode)) {
      return `${scenario} requires provider '${id}' which resolved '${mode}' (not positively SIMULATION). Scenario engine refuses non-simulation execution.`;
    }
  }
  return null;
}

/** Build the canonical PO for a scenario run — no email side-effect. */
function buildScenarioPo(
  runId: string,
  brandId: string,
  lineItems: { sku: string; productName: string; quantity: number; unitPrice: number; commodityCode: string }[],
  base: Date,
  freightTerm: 'collect' | 'prepaid' = 'collect'
): PurchaseOrder {
  const total = lineItems.reduce((a, l) => a + l.quantity * l.unitPrice, 0);
  const po: PurchaseOrder = {
    id: deriveId(runId, 'po'),
    brandId,
    poNumber: `SIM-PO-${runId.slice(-6).toUpperCase()}`,
    status: 'received',
    poValue: Math.round(total * 100) / 100,
    commissionRate: 0.07,
    commissionAmount: Math.round(total * 0.07 * 100) / 100,
    orderDate: base.toISOString(),
    freightTerm,
    lineItems: lineItems.map<PurchaseOrderLineItem>((l) => ({
      sku: l.sku,
      productName: l.productName,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      commodityCode: l.commodityCode,
    })),
  };
  po.shipWindowStart = atDays(base, 14).slice(0, 10);
  po.shipWindowEnd = atDays(base, 21).slice(0, 10);
  po.deliveryWindowStart = atDays(base, 21).slice(0, 10);
  po.deliveryWindowEnd = atDays(base, 28).slice(0, 10);
  demoPurchaseOrders.push(po);
  notifyCanonicalStoreChange();
  return po;
}

function chooseLineItemsFor(brandId: string): { sku: string; productName: string; quantity: number; unitPrice: number; commodityCode: string }[] {
  // Deterministic canonical two-line PO for any cleared brand. Line items are
  // generic simulated SKUs (no fake brand or product claim); the SKU prefix is
  // derived from the brand id so scenario POs are tenant-distinct.
  const slug = brandId.replace(/^brand-/, '').slice(0, 4).toUpperCase();
  return [
    { sku: `${slug}-001`, productName: `${slug} simulated line 001`, quantity: 120, unitPrice: 12.5, commodityCode: '3304990090' },
    { sku: `${slug}-002`, productName: `${slug} simulated line 002`, quantity: 80, unitPrice: 15, commodityCode: '3304990090' },
  ];
}

async function scenarioNormalPo(ctx: ScenarioRunContext): Promise<ScenarioResult> {
  const brandId = resolveBrandId(ctx);
  const refuse = assertSimulationOnly(ctx, 'NORMAL_PO', ['amazon_sp_api', 'dhl']);
  if (refuse) {
    return { scenario: 'NORMAL_PO', runId: deriveId(ctx.seed?.toString() ?? '0', 'run'), status: 'safety_refused', safetyReason: refuse, steps: [], created: { deductions: [] }, auditIds: [] };
  }

  const seed = ctx.seed ?? 0;
  const runId = `normal-${seed}`;
  const base = new Date(ctx.timestamp ?? Date.now());
  const actorId = ctx.actorId ?? 'system';
  const steps: ScenarioStep[] = [];
  const auditIds: string[] = [];
  const auditCounter = { n: 0 };

  const lines = chooseLineItemsFor(brandId);
  const po = buildScenarioPo(runId, brandId, lines, base, 'collect');
  steps.push({ step: 1, action: 'po_received', entityType: 'purchase_order', entityId: po.id, to: 'received', detail: `${po.poNumber} received`, at: base.toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_po_received', 'purchase_order', po.id, brandId, `${actorId}: SIM PO ${po.poNumber} received (scenario NORMAL_PO)`, { runId, scenario: 'NORMAL_PO' }));
  emitScenarioEvent(runId, 'new_po_above_threshold', 'critical', `PO ${po.poNumber} received`,
    `Simulated NORMAL_PO received for ${brandId} — ${lines.reduce((a, l) => a + l.quantity, 0)} units`, po.id, { scenario: 'NORMAL_PO', poNumber: po.poNumber });

  // Acknowledge all lines accepted via the real domain rule.
  const ack = acknowledgePurchaseOrder(po.id, lines.map((l) => ({ sku: l.sku, ackStatus: 'accepted' as const, acknowledgedQty: l.quantity })));
  if (!ack.ok) {
    return { scenario: 'NORMAL_PO', runId, status: 'error', steps, created: { deductions: [], purchaseOrder: po.id }, auditIds, error: ack.error };
  }
  steps.push({ step: 2, action: 'po_acknowledged', entityType: 'purchase_order', entityId: po.id, from: 'received', to: 'accepted', detail: 'all lines accepted', at: new Date().toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_po_acknowledged', 'purchase_order', po.id, brandId, `${actorId}: PO ${po.poNumber} fully acknowledged`, { runId, scenario: 'NORMAL_PO' }));

  // Shipment via the real ASN path (safe, mock-only; no email).
  // Food/health categories → real rule requires lot + expiry (kept harmless).
  const ship = createShipmentForPO(po.id, {
    cartons: lines.map((l) => ({ sku: l.sku, quantity: l.quantity, weightKg: 1.5, lengthCm: 20, widthCm: 15, heightCm: 10 })),
    shipDate: new Date().toISOString().slice(0, 10),
    carrier: 'dhl',
    proNumber: `SIM-${runId}`,
    lotNumber: `LOT-${runId.slice(-4)}`,
    expiryDate: atDays(base, 365).slice(0, 10),
  });
  if (!ship.ok) {
    return { scenario: 'NORMAL_PO', runId, status: 'error', steps, created: { deductions: [] }, auditIds, error: ship.error };
  }
  const shipmentId = ship.shipmentId ?? '';
  steps.push({ step: 3, action: 'shipment_created', entityType: 'shipment', entityId: shipmentId, from: 'accepted', to: 'ready_to_fulfil', detail: `ASN filed via ${ship.shipmentId}, carrier dhl`, at: new Date().toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_shipment_created', 'shipment', shipmentId, brandId, `${actorId}: shipment created for PO ${po.poNumber}`, { runId, scenario: 'NORMAL_PO' }));

  // Deliver + reconcile: full receipt, no shortfall.
  const received: Record<string, number> = {};
  lines.forEach((l) => { received[l.sku] = l.quantity; });
  const rec = reconcileDelivery(po.id, received, actorId);
  if (rec) {
    // Final lifecycle state: delivered (reconcileDelivery reconciles qty only;
    // the scenario advances the PO status to complete the chain faithfully).
    const delivered = setPurchaseOrderStatus(po.id, 'delivered');
    steps.push({ step: 4, action: 'delivered', entityType: 'purchase_order', entityId: po.id, from: 'ready_to_fulfil', to: delivered ? 'delivered' : 'ready_to_fulfil', detail: 'receipt matched confirmed quantities, no shortfalls', at: new Date().toISOString() });
    auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_delivery_reconciled', 'purchase_order', po.id, brandId, `${actorId}: PO ${po.poNumber} delivered — receipt matches confirmed (${rec.shortfalls.length} shortfalls)`, { runId, scenario: 'NORMAL_PO' }));
  }

  return { scenario: 'NORMAL_PO', runId, status: 'ok', steps, created: { purchaseOrder: po.id, shipmentId, deductions: [] }, auditIds };
}
async function scenarioPartialPo(ctx: ScenarioRunContext): Promise<ScenarioResult> {
  const brandId = resolveBrandId(ctx);
  const refuse = assertSimulationOnly(ctx, 'PARTIAL_PO', ['amazon_sp_api']);
  if (refuse) {
    return { scenario: 'PARTIAL_PO', runId: deriveId(String(ctx.seed ?? 0), 'run'), status: 'safety_refused', safetyReason: refuse, steps: [], created: { deductions: [] }, auditIds: [] };
  }
  const seed = ctx.seed ?? 0;
  const runId = `partial-${seed}`;
  const base = new Date(ctx.timestamp ?? Date.now());
  const actorId = ctx.actorId ?? 'system';
  const steps: ScenarioStep[] = [];
  const auditIds: string[] = [];
  const auditCounter = { n: 0 };

  const lines = chooseLineItemsFor(brandId);
  const po = buildScenarioPo(runId, brandId, lines, base, 'prepaid');
  steps.push({ step: 1, action: 'po_received', entityType: 'purchase_order', entityId: po.id, to: 'received', at: base.toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_po_received', 'purchase_order', po.id, brandId, `${actorId}: SIM PO ${po.poNumber} received (PARTIAL_PO)`, { runId, scenario: 'PARTIAL_PO' }));

  // Partial acceptance: first line accepted, second line backordered with a future date.
  const ack = acknowledgePurchaseOrder(po.id, [
    { sku: lines[0].sku, ackStatus: 'accepted', acknowledgedQty: lines[0].quantity },
    { sku: lines[1].sku, ackStatus: 'backordered', acknowledgedQty: Math.floor(lines[1].quantity / 2), scheduledShipDate: atDays(base, 14).slice(0, 10) },
  ]);
  if (!ack.ok) {
    return { scenario: 'PARTIAL_PO', runId, status: 'error', steps, created: { deductions: [], purchaseOrder: po.id }, auditIds, error: ack.error };
  }
  steps.push({ step: 2, action: 'po_partially_acknowledged', entityType: 'purchase_order', entityId: po.id, from: 'received', to: 'accepted', detail: `line ${lines[1].sku} backordered half, rest accepted`, at: new Date().toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_po_acknowledged_partial', 'purchase_order', po.id, po.brandId, `${actorId}: PO ${po.poNumber} partially acknowledged (1 accepted, 1 backordered)`, { runId, scenario: 'PARTIAL_PO' }));

  // Ship only the accepted quantity; the shortfall auto-raises an open deduction via the real ASN validation.
  const ship = createShipmentForPO(po.id, {
    cartons: [
      { sku: lines[0].sku, quantity: lines[0].quantity, weightKg: 1.5, lengthCm: 20, widthCm: 15, heightCm: 10 },
      { sku: lines[1].sku, quantity: Math.floor(lines[1].quantity / 2), weightKg: 1.2, lengthCm: 18, widthCm: 14, heightCm: 9 },
    ],
    shipDate: atDays(base, 3).slice(0, 10),
    carrier: 'fedex',
    proNumber: `SIM-${runId}`,
    lotNumber: `LOT-${runId.slice(-4)}`,
    expiryDate: atDays(base, 365).slice(0, 10),
  });
  const shipmentId = ship.shipmentId ?? '';
  if (ship.ok) {
    steps.push({ step: 3, action: 'shipment_created', entityType: 'shipment', entityId: shipmentId, from: 'accepted', to: 'ready_to_fulfil', detail: `fedex shipment; backorder line short-shipped → ${ship.deductionId ?? 'no deduction'}`, at: new Date().toISOString() });
    auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_shipment_created', 'shipment', shipmentId, po.brandId, `${actorId}: shipment created for partial PO ${po.poNumber}`, { runId, scenario: 'PARTIAL_PO' }));
    if (ship.deductionId) steps.push({ step: 4, action: 'shortage_deduction', entityType: 'deduction', entityId: ship.deductionId, to: 'open', detail: 'short-ship auto-raised shortage_claim', at: new Date().toISOString() });
  }

  return { scenario: 'PARTIAL_PO', runId, status: 'ok', steps, created: { purchaseOrder: po.id, shipmentId, deductions: [] }, auditIds };
}
async function scenarioDelayedDelivery(ctx: ScenarioRunContext): Promise<ScenarioResult> {
  const brandId = resolveBrandId(ctx);
  const refuse = assertSimulationOnly(ctx, 'DELAYED_DELIVERY', ['dhl']);
  if (refuse) {
    return { scenario: 'DELAYED_DELIVERY', runId: deriveId(String(ctx.seed ?? 0), 'run'), status: 'safety_refused', safetyReason: refuse, steps: [], created: { deductions: [] }, auditIds: [] };
  }
  const seed = ctx.seed ?? 0;
  const runId = `delay-${seed}`;
  const base = new Date(ctx.timestamp ?? Date.now());
  const actorId = ctx.actorId ?? 'system';
  const steps: ScenarioStep[] = [];
  const auditIds: string[] = [];
  const auditCounter = { n: 0 };

  const lines = chooseLineItemsFor(brandId);
  const po = buildScenarioPo(runId, brandId, lines, base, 'collect');
  steps.push({ step: 1, action: 'po_received', entityType: 'purchase_order', entityId: po.id, to: 'received', at: base.toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_po_received', 'purchase_order', po.id, brandId, `${actorId}: SIM PO ${po.poNumber} received (DELAYED_DELIVERY)`, { runId, scenario: 'DELAYED_DELIVERY' }));

  const ack = acknowledgePurchaseOrder(po.id, lines.map((l) => ({ sku: l.sku, ackStatus: 'accepted', acknowledgedQty: l.quantity })));
  if (!ack.ok) return { scenario: 'DELAYED_DELIVERY', runId, status: 'error', steps, created: { deductions: [], purchaseOrder: po.id }, auditIds, error: ack.error };
  steps.push({ step: 2, action: 'po_acknowledged', entityType: 'purchase_order', entityId: po.id, from: 'received', to: 'accepted', at: new Date().toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_acknowledged', 'purchase_order', po.id, brandId, `${actorId}: PO ${po.poNumber} acknowledged`, { runId, scenario: 'DELAYED_DELIVERY' }));

  const ship = createShipmentForPO(po.id, {
    cartons: lines.map((l) => ({ sku: l.sku, quantity: l.quantity, weightKg: 1.5, lengthCm: 20, widthCm: 15, heightCm: 10 })),
    shipDate: atDays(base, 13).slice(0, 10),
    carrier: 'dhl',
    proNumber: `SIM-${runId}`,
    lotNumber: `LOT-${runId.slice(-4)}`,
    expiryDate: atDays(base, 365).slice(0, 10),
  });
  const shipmentId = ship.shipmentId ?? '';
  if (!ship.ok) return { scenario: 'DELAYED_DELIVERY', runId, status: 'error', steps, created: { deductions: [], purchaseOrder: po.id }, auditIds, error: ship.error };
  steps.push({ step: 3, action: 'shipment_created', entityType: 'shipment', entityId: shipmentId, to: 'factory_intake', at: new Date().toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_shipment_created', 'shipment', shipmentId, brandId, `${actorId}: shipment created for PO ${po.poNumber}`, { runId, scenario: 'DELAYED_DELIVERY' }));

  // Mark shipment delayed + exception (real store flags), emit notification.
  const s = demoShipments.find((x) => x.id === shipmentId);
  if (s) {
    s.delayed = true;
    s.status = 'uk_customs_cleared';
  }
  steps.push({ step: 4, action: 'delivery_delayed', entityType: 'shipment', entityId: shipmentId, from: 'factory_intake', to: 'delayed', detail: 'uk_customs_cleared delayed', at: new Date().toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_delay', 'shipment', shipmentId, brandId, `${actorId}: shipment ${shipmentId} delayed`, { runId, scenario: 'DELAYED_DELIVERY' }));
  emitScenarioEvent(runId, 'compliance_doc_expiring', 'important', 'Shipment delayed', `SIM shipment ${shipmentId} delayed`, shipmentId, { scenario: 'DELAYED_DELIVERY' });

  notifyCanonicalStoreChange();
  return { scenario: 'DELAYED_DELIVERY', runId, status: 'ok', steps, created: { purchaseOrder: po.id, shipmentId, deductions: [] }, auditIds };
}
async function scenarioFinancialException(ctx: ScenarioRunContext): Promise<ScenarioResult> {
  const brandId = resolveBrandId(ctx);
  const refuse = assertSimulationOnly(ctx, 'FINANCIAL_EXCEPTION', ['stripe', 'xero']);
  if (refuse) {
    return { scenario: 'FINANCIAL_EXCEPTION', runId: deriveId(String(ctx.seed ?? 0), 'run'), status: 'safety_refused', safetyReason: refuse, steps: [], created: { deductions: [] }, auditIds: [] };
  }
  const seed = ctx.seed ?? 0;
  const runId = `fin-${seed}`;
  const base = new Date(ctx.timestamp ?? Date.now());
  const actorId = ctx.actorId ?? 'system';
  const steps: ScenarioStep[] = [];
  const auditIds: string[] = [];
  const auditCounter = { n: 0 };

  // Create an open deduction and dispute it — full financial exception lifecycle.
  const ded = createDeductionInStore({
    brandId,
    purchaseOrderId: `SIM-PO-${runId.slice(-6).toUpperCase()}`,
    type: 'shortage_claim',
    amountGbp: 96.25,
    reason: 'Shortage on simulated financial exception PO — 5 units vs expected.',
    status: 'open',
    date: atDays(base, 0).slice(0, 10),
    evidenceNotes: 'Scenario engine (FINANCIAL_EXCEPTION) — simulated only.',
  });
  steps.push({ step: 1, action: 'deduction_open', entityType: 'deduction', entityId: ded.id, to: 'open', detail: `${ded.type} £${ded.amountGbp}`, at: base.toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_deduction', 'deduction', ded.id, brandId, `${actorId}: deduction opened for £${ded.amountGbp} (FINANCIAL_EXCEPTION)`, { runId, scenario: 'FINANCIAL_EXCEPTION' }));

  const disputed = disputeDeduction(ded.id, 'Brand disputes shortage claim; POD shows full cartons. Investigation in progress.');
  if (disputed) {
    steps.push({ step: 2, action: 'dispute_opened', entityType: 'deduction', entityId: ded.id, from: 'open', to: 'disputed', detail: 'brand raised dispute', at: new Date().toISOString() });
    auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_dispute', 'deduction', ded.id, brandId, `${actorId}: dispute opened on deduction ${ded.id}`, { runId, scenario: 'FINANCIAL_EXCEPTION' }));
  }

  const resolved = recordDisputeOutcome(ded.id, 'won');
  if (resolved) {
    steps.push({ step: 3, action: 'dispute_resolved', entityType: 'deduction', entityId: ded.id, from: 'disputed', to: 'resolved', detail: 'outcome: won', at: new Date().toISOString() });
    auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_dispute_resolution', 'deduction', ded.id, brandId, `${actorId}: dispute resolved 'won' on deduction ${ded.id}`, { runId, scenario: 'FINANCIAL_EXCEPTION' }));
    emitScenarioEvent(runId, 'deduction_posted', 'important', 'Financial exception resolved', `Deduction ${ded.id} resolved (won) after investigation`, ded.id, { scenario: 'FINANCIAL_EXCEPTION' });
  }

  return { scenario: 'FINANCIAL_EXCEPTION', runId, status: 'ok', steps, created: { deductions: [ded.id] }, auditIds };
}

async function scenarioCase(ctx: ScenarioRunContext): Promise<ScenarioResult> {
  const brandId = resolveBrandId(ctx);
  // Phase D1 — Rocket.Chat removed from the platform. The CASE scenario
  // requires NO external provider: it exercises the internal helpdesk ticket
  // store end to end, so an empty provider list is the truthful requirement
  // (never a weakened gate — there is no external execution to gate).
  const refuse = assertSimulationOnly(ctx, 'CASE', []);
  if (refuse) {
    return { scenario: 'CASE', runId: deriveId(String(ctx.seed ?? 0), 'run'), status: 'safety_refused', safetyReason: refuse, steps: [], created: { deductions: [] }, auditIds: [] };
  }
  const seed = ctx.seed ?? 0;
  const runId = `case-${seed}`;
  const base = new Date(ctx.timestamp ?? Date.now());
  const actorId = ctx.actorId ?? 'system';
  const steps: ScenarioStep[] = [];
  const auditIds: string[] = [];
  const auditCounter = { n: 0 };

  // Open a support case via the real ticket store.
  const ticket: Ticket | null = createTicket(brandId, 'Simulated case: shipment labelling discrepancy', 'in_app', 'high', 'logistics');
  if (!ticket) return { scenario: 'CASE', runId, status: 'error', steps, created: { deductions: [] }, auditIds, error: 'ticket creation failed' };
  const ticketId = ticket.id;
  steps.push({ step: 1, action: 'case_opened', entityType: 'helpdesk_ticket', entityId: ticketId, to: 'open', detail: ticket.subject, at: base.toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_case_open', 'helpdesk_ticket', ticketId, brandId, `${actorId}: case opened — ${ticket.subject}`, { runId, scenario: 'CASE' }));
  emitScenarioEvent(runId, 'security_alert', 'important', 'Case opened', `Support case ${ticketId} opened for ${brandId}`, ticketId, { scenario: 'CASE' });

  // Assign, progress, resolve.
  const assigned = assignTicket(ticketId, 'staff-01', actorId);
  if (assigned) {
    steps.push({ step: 2, action: 'case_assigned', entityType: 'helpdesk_ticket', entityId: ticketId, to: 'assigned', detail: 'assigned to staff-01', at: new Date().toISOString() });
    auditIds.push(audit(runId, () => ++auditCounter.n, 'ticket_assigned', 'helpdesk_ticket', ticketId, brandId, `${actorId}: assigned case to staff-01`, { runId, scenario: 'CASE' }));
  }
  const resolved = updateTicketStatus(ticketId, 'resolved', actorId);
  if (resolved) {
    steps.push({ step: 3, action: 'case_resolved', entityType: 'helpdesk_ticket', entityId: ticketId, from: 'open', to: 'resolved', detail: 'resolved after investigation', at: new Date().toISOString() });
    auditIds.push(audit(runId, () => ++auditCounter.n, 'ticket_resolved', 'helpdesk_ticket', ticketId, brandId, `${actorId}: case resolved`, { runId, scenario: 'CASE' }));
  }

  return { scenario: 'CASE', runId, status: 'ok', steps, created: { deductions: [], ticketId }, auditIds };
}

async function scenarioProductFailure(ctx: ScenarioRunContext): Promise<ScenarioResult> {
  const brandId = resolveBrandId(ctx);
  const refuse = assertSimulationOnly(ctx, 'PRODUCT_FAILURE', ['amazon_sp_api']);
  if (refuse) {
    return { scenario: 'PRODUCT_FAILURE', runId: deriveId(String(ctx.seed ?? 0), 'run'), status: 'safety_refused', safetyReason: refuse, steps: [], created: { deductions: [] }, auditIds: [] };
  }
  const seed = ctx.seed ?? 0;
  const runId = `prod-${seed}`;
  const base = new Date(ctx.timestamp ?? Date.now());
  const actorId = ctx.actorId ?? 'system';
  const steps: ScenarioStep[] = [];
  const auditIds: string[] = [];
  const auditCounter = { n: 0 };

  // Image validation failure via the REAL product-image validator (mock path).
  const imageChecks = validateProductImage('main', 'https://example.com/sim-main.jpg', true);
  const hasError = imageChecks.some((c) => c.severity === 'error' && !c.passed);
  const sku = 'SIM-PROD-001';
  steps.push({ step: 1, action: 'product_validated', entityType: 'product', entityId: sku, detail: `image validation: ${imageChecks.filter((c) => !c.passed).length} failed checks`, at: base.toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_product_validation', 'product', sku, brandId, `${actorId}: product ${sku} validation — ${hasError ? 'FAILED' : 'PASSED'} (${imageChecks.filter((c) => !c.passed).length} failed checks)`, { runId, scenario: 'PRODUCT_FAILURE', failedChecks: imageChecks.filter((c) => !c.passed).map((c) => c.id) }));

  // Retry after "correction": validate again with a mock-compliant image (passes).
  const retryChecks = validateProductImage('main', 'https://picsum.photos/seed/sim-main/1000/1000', true);
  const retryHasError = retryChecks.some((c) => c.severity === 'error' && !c.passed);
  steps.push({ step: 2, action: 'product_corrected_and_revalidated', entityType: 'product', entityId: sku, detail: `revalidation: ${retryHasError ? 'still failing' : 'passing'}`, at: new Date().toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_product_revalidated', 'product', sku, brandId, `${actorId}: product ${sku} revalidated — ${retryHasError ? 'STILL FAILING' : 'PASSED'}`, { runId, scenario: 'PRODUCT_FAILURE' }));

  // Submit the now-compliant product through the SP-API seam (mock; never live).
  const submission = await submitCatalogItem(brandId, {
    commodityCode: '3304990090',
    vatStatus: 'Standard 20%',
    hazmat: false,
    length: 12,
    width: 10,
    height: 18,
    weight: 0.5,
    sku,
    name: 'Simulated product',
  });
  steps.push({ step: 3, action: 'product_submitted', entityType: 'product', entityId: sku, detail: submission.ok ? `submission ${submission.submissionId} (${submission.mode})` : (submission.reason ?? 'failed'), at: new Date().toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_product_submit', 'product', sku, brandId, `${actorId}: product ${sku} submitted to retail pipeline — ${submission.ok ? 'accepted' : submission.reason}`, { runId, scenario: 'PRODUCT_FAILURE', submissionId: submission.submissionId }));

  return { scenario: 'PRODUCT_FAILURE', runId, status: 'ok', steps, created: { deductions: [], productSku: sku, submissionId: submission.submissionId }, auditIds };
}

async function scenarioIntegrationFailure(ctx: ScenarioRunContext): Promise<ScenarioResult> {
  const brandId = resolveBrandId(ctx);
  const refuse = assertSimulationOnly(ctx, 'INTEGRATION_FAILURE', ['amazon_sp_api', 'dhl', 'stripe']);
  if (refuse) {
    return { scenario: 'INTEGRATION_FAILURE', runId: deriveId(String(ctx.seed ?? 0), 'run'), status: 'safety_refused', safetyReason: refuse, steps: [], created: { deductions: [] }, auditIds: [] };
  }
  const seed = ctx.seed ?? 0;
  const runId = `int-${seed}`;
  const base = new Date(ctx.timestamp ?? Date.now());
  const actorId = ctx.actorId ?? 'system';
  const steps: ScenarioStep[] = [];
  const auditIds: string[] = [];
  const auditCounter = { n: 0 };

  // Simulate a provider failure then retry → eventual success via the Mock SP-API seam.
  resetMockAmazonState();
  const sku = 'SIM-INT-SKU-001';
  const failedSubmission = await submitCatalogItem(brandId, {
    commodityCode: '3304990090', vatStatus: 'Standard 20%', hazmat: false,
    length: 12, width: 10, height: 18, weight: 0.5, sku, name: 'Sim integration-failure product',
  });
  // The catalog gate is a REAL pre-submission check. If it blocks, the
  // scenario reports the compliant operational state (held at gate) instead
  // of crashing — that is a legitimate, honest provider-flow outcome.
  if (!failedSubmission.ok && failedSubmission.reason === 'COMPLIANCE_GATE_BLOCKED') {
    steps.push({ step: 1, action: 'submission_held_at_gate', entityType: 'catalog_submission', entityId: sku, to: 'gate_blocked', detail: 'compliance gate blocked pre-submission', at: base.toISOString() });
    auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_submit_gate_held', 'catalog_submission', sku, brandId, `${actorId}: submission for ${sku} held at compliance gate (simulation runs the real gate)`, { runId, scenario: 'INTEGRATION_FAILURE', gate: failedSubmission.missing ?? [] }));
    emitScenarioEvent(runId, 'test_suite_failure', 'important', 'Integration held at compliance gate',
      `Simulated integration failure: submission ${sku} blocked by the compliance gate`,
      sku, { scenario: 'INTEGRATION_FAILURE', gate: failedSubmission.missing ?? [] });
    return { scenario: 'INTEGRATION_FAILURE', runId, status: 'ok', steps, created: { deductions: [] }, auditIds, note: 'Held at compliance gate (real gate behavior)' };
  }
  if (!failedSubmission.ok) {
    return { scenario: 'INTEGRATION_FAILURE', runId, status: 'error', steps, created: { deductions: [] }, auditIds, error: failedSubmission.reason };
  }
  const submissionId = failedSubmission.submissionId;
  steps.push({ step: 1, action: 'submission_started', entityType: 'catalog_submission', entityId: submissionId ?? '', to: 'submitted', at: base.toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_submit_start', 'catalog_submission', submissionId ?? '', brandId, `${actorId}: submission ${submissionId} started (INTEGRATION_FAILURE)`, { runId, scenario: 'INTEGRATION_FAILURE' }));

  // First poll → still submitted; second poll may reject deterministically (every 4th mock submission rejects).
  const poll1 = await pollSubmissionStatus(submissionId ?? '');
  steps.push({ step: 2, action: 'provider_poll', entityType: 'catalog_submission', entityId: submissionId ?? '', from: 'submitted', to: poll1.status ?? 'submitted', detail: poll1.ok ? `status ${poll1.status}` : poll1.error, at: new Date().toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_provider_poll', 'catalog_submission', submissionId ?? '', brandId, `${actorId}: polled submission ${submissionId} → ${poll1.status ?? 'unknown'}`, { runId, scenario: 'INTEGRATION_FAILURE' }));

  const poll2 = await pollSubmissionStatus(submissionId ?? '');
  steps.push({ step: 3, action: 'provider_retry', entityType: 'catalog_submission', entityId: submissionId ?? '', from: poll1.status ?? 'submitted', to: poll2.status ?? 'submitted', detail: poll2.ok ? `status ${poll2.status}` : poll2.error, at: new Date().toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_provider_retry', 'catalog_submission', submissionId ?? '', brandId, `${actorId}: retried submission ${submissionId} → ${poll2.status ?? 'unknown'}`, { runId, scenario: 'INTEGRATION_FAILURE' }));

  const finalStatus = poll2.status === 'rejected'
    ? 'rejected'
    : poll2.status === 'live'
    ? 'live'
    : 'retrying';
  emitScenarioEvent(runId, 'security_alert', finalStatus === 'live' ? 'informational' : 'important',
    `Integration ${finalStatus === 'live' ? 'recovered' : 'failure'}`,
    `Submission ${submissionId} ${finalStatus === 'live' ? 'eventually succeeded after retries' : `ended at ${finalStatus}`}`,
    submissionId ?? '', { scenario: 'INTEGRATION_FAILURE', finalStatus });

  return { scenario: 'INTEGRATION_FAILURE', runId, status: 'ok', steps, created: { deductions: [], submissionId }, auditIds };
}

/** §Priority-1 — DHL milestone progression through the real carrier seam. */
async function scenarioShipmentProgression(ctx: ScenarioRunContext): Promise<ScenarioResult> {
  const brandId = resolveBrandId(ctx);
  const refuse = assertSimulationOnly(ctx, 'SHIPMENT_PROGRESSION', ['dhl']);
  if (refuse) {
    return { scenario: 'SHIPMENT_PROGRESSION', runId: deriveId(String(ctx.seed ?? 0), 'run'), status: 'safety_refused', safetyReason: refuse, steps: [], created: { deductions: [] }, auditIds: [] };
  }
  const seed = ctx.seed ?? 0;
  const runId = `shipment-${seed}`;
  const base = new Date(ctx.timestamp ?? Date.now());
  const actorId = ctx.actorId ?? 'system';
  const steps: ScenarioStep[] = [];
  const auditIds: string[] = [];
  const auditCounter = { n: 0 };

  const lines = chooseLineItemsFor(brandId);
  const po = buildScenarioPo(runId, brandId, lines, base, 'collect');
  steps.push({ step: 1, action: 'po_received', entityType: 'purchase_order', entityId: po.id, to: 'received', detail: `${po.poNumber} received`, at: base.toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_po_received', 'purchase_order', po.id, brandId, `${actorId}: SIM PO ${po.poNumber} received (SHIPMENT_PROGRESSION)`, { runId, scenario: 'SHIPMENT_PROGRESSION' }));

  const ack = acknowledgePurchaseOrder(po.id, lines.map((l) => ({ sku: l.sku, ackStatus: 'accepted', acknowledgedQty: l.quantity })));
  if (!ack.ok) return { scenario: 'SHIPMENT_PROGRESSION', runId, status: 'error', steps, created: { deductions: [], purchaseOrder: po.id }, auditIds, error: ack.error };
  steps.push({ step: 2, action: 'po_acknowledged', entityType: 'purchase_order', entityId: po.id, from: 'received', to: 'accepted', at: new Date().toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_acknowledged', 'purchase_order', po.id, brandId, `${actorId}: PO ${po.poNumber} acknowledged`, { runId, scenario: 'SHIPMENT_PROGRESSION' }));

  const ship = createShipmentForPO(po.id, {
    cartons: lines.map((l) => ({ sku: l.sku, quantity: l.quantity, weightKg: 1.5, lengthCm: 20, widthCm: 15, heightCm: 10 })),
    shipDate: atDays(base, 2).slice(0, 10),
    carrier: 'dhl',
    proNumber: `SIM-${runId}`,
    lotNumber: `LOT-${runId.slice(-4)}`,
    expiryDate: atDays(base, 365).slice(0, 10),
  });
  const shipmentId = ship.shipmentId ?? '';
  if (!ship.ok) return { scenario: 'SHIPMENT_PROGRESSION', runId, status: 'error', steps, created: { deductions: [], purchaseOrder: po.id }, auditIds, error: ship.error };
  steps.push({ step: 3, action: 'shipment_created', entityType: 'shipment', entityId: shipmentId, to: 'factory_intake', detail: 'DHL consignment booked into shared store', at: new Date().toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_shipment_created', 'shipment', shipmentId, brandId, `${actorId}: shipment created for PO ${po.poNumber}`, { runId, scenario: 'SHIPMENT_PROGRESSION' }));

  // Provider boundary: book the DHL waybill through the mock adapter.
  const booked = await recordDhlWaybill({ shipmentId, getMode: ctx.getMode, actorId });
  if (!booked.ok || !booked.waybill) {
    return { scenario: 'SHIPMENT_PROGRESSION', runId, status: booked.safetyRefused ? 'safety_refused' : 'error', safetyReason: booked.safetyReason, steps, created: { deductions: [], purchaseOrder: po.id, shipmentId }, auditIds, error: booked.error ?? booked.safetyReason };
  }
  steps.push({ step: 4, action: 'waybill_booked', entityType: 'shipment', entityId: shipmentId, detail: `DHL ${booked.waybill} · ${booked.trackingNumber ?? ''}`, at: new Date().toISOString() });

  // Walk milestone polls through the provider boundary: any transition,
  // delay, or exception applies to the domain state via the SAME workflow.
  let poll = 1;
  let advanceCount = 0;
  while (advanceCount < 3) {
    const res = await advanceShipmentViaDhl({ shipmentId, getMode: ctx.getMode, actorId });
    auditIds.push(...res.auditIds);
    if (!res.ok) {
      steps.push({ step: 4 + poll, action: 'provider_error', entityType: 'shipment', entityId: shipmentId, detail: res.error ?? 'provider error', at: new Date().toISOString() });
      auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_provider_retry_scheduled', 'shipment', shipmentId, brandId, `${actorId}: DHL poll failed (${res.error ?? ''}) — retry scheduled deterministically`, { runId, scenario: 'SHIPMENT_PROGRESSION', poll }));
      break;
    }
    steps.push({
      step: 4 + poll,
      action: res.exception ? 'milestone_exception' : 'milestone',
      entityType: 'shipment',
      entityId: shipmentId,
      from: res.from,
      to: res.to,
      detail: res.exception ? (res.milestone ?? 'exception') : (res.milestone ?? 'poll'),
      at: new Date().toISOString(),
    });
    if (res.exception) {
      auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_exception_awaiting_retry', 'shipment', shipmentId, brandId, `${actorId}: DHL exception (${res.milestone ?? ''}) — retry next poll will verify recovery`, { runId, scenario: 'SHIPMENT_PROGRESSION' }));
    }
    advanceCount += 1;
    poll += 1;
  }

  return { scenario: 'SHIPMENT_PROGRESSION', runId, status: 'ok', steps, created: { purchaseOrder: po.id, shipmentId, deductions: [] }, auditIds };
}

/** §Priority-1 — government compliance verification + filing workflow. */
async function scenarioComplianceVerification(ctx: ScenarioRunContext): Promise<ScenarioResult> {
  const brandId = resolveBrandId(ctx);
  const refuse = assertSimulationOnly(ctx, 'COMPLIANCE_VERIFICATION', ['companies_house', 'hmrc']);
  if (refuse) {
    return { scenario: 'COMPLIANCE_VERIFICATION', runId: deriveId(String(ctx.seed ?? 0), 'run'), status: 'safety_refused', safetyReason: refuse, steps: [], created: { deductions: [] }, auditIds: [] };
  }
  const seed = ctx.seed ?? 0;
  const runId = `compliance-${seed}`;
  const actorId = ctx.actorId ?? 'system';
  const steps: ScenarioStep[] = [];
  const auditIds: string[] = [];
  const auditCounter = { n: 0 };

  // 1. Companies House company verification (with one deterministic retry
  //    when the simulated registrar rate-limits).
  let verify = await verifyBrandCompany(brandId, { getMode: ctx.getMode, actorId });
  auditIds.push(...verify.auditIds);
  if (!verify.ok && verify.status !== 'safety_refused') {
    steps.push({ step: 1, action: 'company_lookup_failed', entityType: 'company', entityId: brandId, detail: verify.error ?? 'verification failed', at: new Date().toISOString() });
    verify = await verifyBrandCompany(brandId, { getMode: ctx.getMode, actorId });
    auditIds.push(...verify.auditIds);
  }
  if (verify.status === 'safety_refused') {
    return { scenario: 'COMPLIANCE_VERIFICATION', runId, status: 'safety_refused', safetyReason: verify.safetyReason, steps, created: { deductions: [] }, auditIds };
  }
  steps.push({
    step: 1, action: verify.ok ? 'company_verified' : 'company_not_verified',
    entityType: 'company', entityId: brandId,
    to: verify.ok ? 'verified' : 'error',
    detail: verify.ok ? `${verify.companyName ?? ''} · ${verify.companyNumber ?? ''} · ${verify.registrarStatus ?? ''}` : 'registrar error',
    at: new Date().toISOString(),
  });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_company_check', 'company', brandId, brandId, `${actorId}: Companies House ${verify.ok ? 'verified' : 'not verified'} (${verify.error ?? 'ok'})`, { runId, scenario: 'COMPLIANCE_VERIFICATION' }));

  // 2. HMRC VAT status check.
  const vat = await checkHmrcStatus(brandId, { getMode: ctx.getMode, actorId });
  auditIds.push(...vat.auditIds);
  if (vat.status === 'safety_refused') {
    return { scenario: 'COMPLIANCE_VERIFICATION', runId, status: 'safety_refused', safetyReason: vat.safetyReason, steps, created: { deductions: [] }, auditIds };
  }
  steps.push({ step: 2, action: 'vat_status_checked', entityType: 'vat', entityId: vat.vrn ?? brandId, to: vat.vatStatus ?? (vat.ok ? 'registered' : 'error'), at: new Date().toISOString() });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_vat_status', 'vat', vat.vrn ?? brandId, brandId, `${actorId}: HMRC VAT status ${vat.vatStatus ?? 'unknown'}`, { runId, scenario: 'COMPLIANCE_VERIFICATION' }));

  // 3. HMRC VAT filing — rejected submissions are retried and accepted.
  const period = 'Q3 2026';
  let filing = await fileHmrcReturn(brandId, { period, totalSalesGbp: 48250, vatDueGbp: 9650 }, { getMode: ctx.getMode, actorId });
  auditIds.push(...filing.auditIds);
  if (filing.status === 'safety_refused') {
    return { scenario: 'COMPLIANCE_VERIFICATION', runId, status: 'safety_refused', safetyReason: filing.safetyReason, steps, created: { deductions: [] }, auditIds };
  }
  steps.push({
    step: 3, action: filing.ok ? 'vat_filed' : 'vat_filing_rejected', entityType: 'hmrc_filing',
    entityId: filing.filingId ?? period,
    to: filing.filingStatus ?? (filing.ok ? 'accepted' : 'rejected'),
    detail: filing.ok ? `accepted · ${filing.submissionId ?? ''}` : (filing.rejectionReason ?? filing.error ?? 'rejected'),
    at: new Date().toISOString(),
  });
  auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_vat_filing_attempt', 'hmrc_filing', period, brandId, `${actorId}: VAT ${period} ${filing.ok ? 'accepted' : `rejected: ${filing.rejectionReason ?? 'schema'}`}`, { runId, scenario: 'COMPLIANCE_VERIFICATION' }));

  if (!filing.ok && filing.filingStatus === 'rejected') {
    // Deterministic retry — the corrected filing is accepted.
    filing = await fileHmrcReturn(brandId, { period, totalSalesGbp: 48250, vatDueGbp: 9320 }, { getMode: ctx.getMode, actorId });
    auditIds.push(...filing.auditIds);
    if (filing.status === 'safety_refused') {
      return { scenario: 'COMPLIANCE_VERIFICATION', runId, status: 'safety_refused', safetyReason: filing.safetyReason, steps, created: { deductions: [] }, auditIds };
    }
    steps.push({ step: 4, action: filing.ok ? 'vat_filing_retry_accepted' : 'vat_filing_retry_failed', entityType: 'hmrc_filing', entityId: filing.filingId ?? period, to: filing.filingStatus ?? 'accepted', detail: filing.ok ? `retry accepted · ${filing.submissionId ?? ''}` : (filing.error ?? 'retry failed'), at: new Date().toISOString() });
    auditIds.push(audit(runId, () => ++auditCounter.n, 'scenario_vat_filing_retry', 'hmrc_filing', period, brandId, `${actorId}: VAT ${period} retry ${filing.ok ? 'ACCEPTED' : 'failed'}`, { runId, scenario: 'COMPLIANCE_VERIFICATION' }));
  }

  return { scenario: 'COMPLIANCE_VERIFICATION', runId, status: 'ok', steps, created: { deductions: [] }, auditIds };
}

/** Dispatch table — extensible (add a scenario by registering its builder here). */
const SCENARIO_BUILDERS: Record<ScenarioId, (ctx: ScenarioRunContext) => Promise<ScenarioResult>> = {
  NORMAL_PO: scenarioNormalPo,
  PARTIAL_PO: scenarioPartialPo,
  DELAYED_DELIVERY: scenarioDelayedDelivery,
  FINANCIAL_EXCEPTION: scenarioFinancialException,
  CASE: scenarioCase,
  PRODUCT_FAILURE: scenarioProductFailure,
  INTEGRATION_FAILURE: scenarioIntegrationFailure,
  SHIPMENT_PROGRESSION: scenarioShipmentProgression,
  COMPLIANCE_VERIFICATION: scenarioComplianceVerification,
};

/**
 * Run a simulation scenario. Deterministic for a given (scenario, seed,
 * timestamp, brandId). NEVER executes against a live provider — the safety
 * gate (`assertSimulationOnly`) refuses unless every required provider is
 * SIMULATION-safe.
 */
export async function runScenario(
  scenario: ScenarioId,
  ctx: ScenarioRunContext = {}
): Promise<ScenarioResult> {
  const builder = SCENARIO_BUILDERS[scenario];
  if (!builder) {
    return {
      scenario,
      runId: deriveId(String(ctx.seed ?? 0), 'run'),
      status: 'error',
      steps: [],
      created: { deductions: [] },
      auditIds: [],
      error: `Unknown scenario: ${scenario}`,
    };
  }
  try {
    return await builder(ctx);
  } catch (err) {
    return {
      scenario,
      runId: deriveId(String(ctx.seed ?? 0), 'run'),
      status: 'error',
      steps: [],
      created: { deductions: [] },
      auditIds: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Run every registered scenario (for a seed) — returns per-scenario results. */
export async function runAllScenarios(ctx: ScenarioRunContext = {}): Promise<Record<ScenarioId, ScenarioResult>> {
  const out = {} as Record<ScenarioId, ScenarioResult>;
  for (const id of Object.keys(SCENARIO_BUILDERS) as ScenarioId[]) {
    out[id] = await runScenario(id, ctx);
  }
  return out;
}

/** List of scenario ids (for the future Simulation Control Centre). */
export function listScenarios(): ScenarioId[] {
  return Object.keys(SCENARIO_BUILDERS) as ScenarioId[];
}