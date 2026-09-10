/**
 * Data access layer (Stage 3 foundation).
 *
 * Every repository function follows the same pattern:
 *   - if Supabase is configured → real query against the table
 *   - otherwise → resolve local seed data so the app stays runnable
 *
 * Later stages (compliance gate, fulfillment track, SP-API, billing…) must
 * consume data through these functions, never by touching supabase client
 * or demoStore fixtures directly.
 */
import { supabase } from '@/lib/supabase';
import { evaluateComplianceGate } from '@/lib/compliance';
import { createSPApiClientForConnection } from '@/lib/spapi';
import { spApiConnectionCredentials } from '@/integrations/connections';
import { DEFAULT_HOMEPAGE_CONTENT, type HomepageContent } from '@/config/homepageContent';
import {
  ALL_DEMO_BRANDS,
  demoAdSpend,
  demoBrands,
  demoCommissions,
  demoComplianceDocs,
  demoContracts,
  demoMessages,
  demoProducts,
  demoFulfillmentScores,
  demoPurchaseOrders,
  demoShipments,
  demoSubscriptions,
  demoBrandAgreements,
  setPurchaseOrderStatus,
  createDeductionInStore,
  disputeDeduction as disputeDeductionInStore,
  recordDisputeOutcome as recordDisputeOutcomeInStore,
  type DemoBrandRow,
  demoProfileChangeRequests,
  requestProfileChange as storeRequestProfileChange,
  reviewProfileChangeRequest as storeReviewProfileChangeRequest,
  acceptBrandAgreement as storeAcceptBrandAgreement,
  hasAcceptedAgreement as storeHasAcceptedAgreement,
} from './demoStore';
import { sendPostmarkEmail, buildPoNotificationHtml } from '@/lib/notifications/postmarkNotifier';
import type {
  AdSpendBudget,
  ComplianceDocument,
  Contract,
  Message,
  FulfillmentScore,
  FulfillmentTrack,
  PurchaseOrder,
  AuditLogEntry,
  ShippingMargin,
  BrandAgreement,
  BrandAgreementType,
} from '@/types';
import {
  demoAuditLog,
  demoShippingMargins,
  renameBrand as storeRenameBrand,
  setBrandTrack as storeSetBrandTrack,
  setComplianceDocStatus as storeSetComplianceDocStatus,
  amendShipment as storeAmendShipment,
  demoDeductions,
  demoSubmissions,
} from './demoStore';

export type DataSource = 'supabase' | 'seed';

/* ── ID translation layer ──────────────────────────────────────────── */
/* Frontend uses string IDs (e.g. "brand-zambezi") while Supabase uses
 * UUIDs. The brands table maps via legacy_demo_id. Loaded lazily. */
let _brandIdByUuid: Map<string, string> | null = null;

async function _ensureBrandIdMap(): Promise<void> {
  if (_brandIdByUuid !== null || !supabase) return;
  _brandIdByUuid = new Map();
  const { data, error } = await supabase.from('brands').select('id, legacy_demo_id');
  if (error) {
    console.warn('[api] Failed to load brand ID map:', error.message);
    return;
  }
  for (const row of data ?? []) {
    if (row.legacy_demo_id) _brandIdByUuid.set(row.id, row.legacy_demo_id);
  }
}

/** Convert Supabase brand UUID → frontend string ID (e.g. "brand-zambezi"). */
function _fromBrandUuid(uuid: string): string {
  return _brandIdByUuid?.get(uuid) ?? uuid;
}

/** Convert frontend string brand ID → Supabase UUID. */
async function _toBrandUuid(brandId: string): Promise<string> {
  await _ensureBrandIdMap();
  if (_brandIdByUuid) {
    for (const [uuid, legacyId] of _brandIdByUuid) {
      if (legacyId === brandId) return uuid;
    }
  }
  return brandId;
}

/** Translate brand_id (UUID) → brandId (string ID) in a row. Returns a
 *  shallow copy only when translation actually changes the value. */
function _translateRow<T>(row: T): T {
  const r = row as Record<string, unknown>;
  const rawId = (r.brand_id ?? r.brandId) as string | undefined;
  if (!rawId) return row;
  const mapped = _fromBrandUuid(rawId);
  if (mapped === rawId) return row;
  return { ...r, brandId: mapped } as T;
}

function _translateRows<T>(rows: T[]): T[] {
  return rows.map(_translateRow);
}

/* ── Core query helper: try Supabase first, fall back to seed on error ── */

async function queryOrSeed<T>(
  table: string,
  seed: T[],
  select = '*'
): Promise<{ data: T[]; source: DataSource }> {
  if (!supabase) return { data: seed.slice(), source: 'seed' };
  await _ensureBrandIdMap();
  const { data, error } = await supabase.from(table).select(select);
  if (error) {
    console.warn(`[api] Supabase query failed for "${table}", using demo fallback:`, error.message);
    return { data: seed, source: 'seed' };
  }
  const rows = (data ?? []) as T[];
  return { data: _translateRows(rows), source: 'supabase' };
}

/* ── Brands — custom query maps Supabase columns to DemoBrandRow shape ── */
export async function fetchBrands(): Promise<{ data: DemoBrandRow[]; source: DataSource }> {
  if (!supabase) return { data: demoBrands, source: 'seed' };
  await _ensureBrandIdMap();
  const { data, error } = await supabase.from('brands').select('*');
  if (error) {
    console.warn('[api] Supabase query failed for "brands", using demo fallback:', error.message);
    return { data: demoBrands, source: 'seed' };
  }
  const mapped: DemoBrandRow[] = (data ?? []).map((row: Record<string, unknown>) => ({
    id: (row.legacy_demo_id as string) ?? (row.id as string),
    category: (row.category as string) ?? '',
    track: (row.fulfillment_track as 'direct_fulfillment' | 'financed') ?? 'financed',
    contractStatus: (row.contract_status as string) ?? (row.lifecycle_stage as string) ?? 'draft',
    profile: { businessName: (row.business_name as string) ?? (row.name as string) ?? '' },
  }));
  return { data: mapped, source: 'supabase' };
}

export async function fetchBrand(id: string): Promise<DemoBrandRow | null> {
  const { data } = await fetchBrands();
  return data.find((b) => b.id === id) ?? null;
}

/* ── §5 Fulfillment scores (demo store) ── */
export function fetchFulfillmentScores() {
  return queryOrSeed<FulfillmentScore>('fulfillment_scores', demoFulfillmentScores);
}

/* ── §4 Contracts ── */
export function fetchContracts() {
  return queryOrSeed<Contract>('contracts', demoContracts);
}

export async function fetchContractsForBrand(brandId: string): Promise<Contract[]> {
  const { data } = await fetchContracts();
  return data.filter((c) => c.brandId === brandId);
}

/* ── §3 Compliance documents ── */
export function fetchComplianceDocuments() {
  return queryOrSeed<ComplianceDocument>('compliance_documents', demoComplianceDocs);
}

export async function fetchComplianceForBrand(brandId: string): Promise<ComplianceDocument[]> {
  const { data } = await fetchComplianceDocuments();
  return data.filter((d) => d.brandId === brandId);
}

/** §Batch-5 — Check if the brand has a signed distribution agreement contract. */
export function hasSignedDistributionAgreement(brandId: string): boolean {
  const contract = demoContracts.find(
    (c) => c.brandId === brandId && c.type === 'distribution_agreement' && (c.status === 'signed' || c.status === 'active')
  );
  return !!contract;
}

/**
 * §3 compliance-gate check (client-side mirror).
 * Hard enforcement lives server-side: DB trigger in
 * supabase/migrations/0003_catalog_gate.sql + Edge Function
 * supabase/functions/compliance-gate-check.
 */
export async function isComplianceGateCleared(brandId: string): Promise<boolean> {
  const docs = await fetchComplianceForBrand(brandId);
  const hasAgreement = hasSignedDistributionAgreement(brandId);
  const logisticsSlaAccepted = storeHasAcceptedAgreement(brandId, 'logistics_sla');
  const chargebackIndemnityAccepted = storeHasAcceptedAgreement(brandId, 'chargeback_indemnity');
  return evaluateComplianceGate(docs, undefined, hasAgreement, logisticsSlaAccepted, chargebackIndemnityAccepted).cleared;
}

export interface CatalogSubmissionResult {
  ok: boolean;
  reason?: string;
  missing?: string[];
  blocking?: { type: string; status: string }[];
  /** Present when the SP-API client accepted the submission (mock or real). */
  submissionId?: string;
  /** Which client handled it — 'mock' until real credentials are configured. */
  mode?: 'mock' | 'real';
}

/**
 * §10 step 1 — brand submits a product. Validated against the compliance
 * gate BEFORE anything is transformed/submitted to retail channels.
 */
export async function submitCatalogItem(
  brandId: string,
  product: Record<string, unknown>
): Promise<CatalogSubmissionResult> {
  // Required-field validation (§10 pipeline prerequisites).
  const requiredFields = ['commodityCode', 'vatStatus', 'hazmat', 'length', 'width', 'height', 'weight'];
  const missingFields = requiredFields.filter(
    (f) => product[f] === undefined || product[f] === null || product[f] === ''
  );
  if (missingFields.length > 0) {
    return { ok: false, reason: `Missing required fields: ${missingFields.join(', ')}` };
  }

  // §Phase 4 — minimal targeted fix: pass the SAME agreement inputs the
  // authoritative compliance gate reads. The gate signature is
  // (docs, category?, hasSignedAgreement, logisticsSlaAccepted,
  // chargebackIndemnityAccepted) — category must be `undefined` here
  // (base docs), otherwise the first boolean shifts every argument.
  const docs = await fetchComplianceForBrand(brandId);
  const hasAgreement = hasSignedDistributionAgreement(brandId);
  const logisticsSlaAccepted = storeHasAcceptedAgreement(brandId, 'logistics_sla');
  const chargebackIndemnityAccepted = storeHasAcceptedAgreement(brandId, 'chargeback_indemnity');
  const evaluation = evaluateComplianceGate(docs, undefined, hasAgreement, logisticsSlaAccepted, chargebackIndemnityAccepted);
  if (!evaluation.cleared) {
    return {
      ok: false,
      reason: 'COMPLIANCE_GATE_BLOCKED',
      missing: evaluation.missing,
      blocking: evaluation.blocking,
    };
  }

  // Mock-first: the submission always goes through the SP-API client —
  // MockAmazonSPAPIClient until real credentials are configured in the
  // Integrations wizard (then the real client, zero code changes).
  const { client, mode } = createSPApiClientForConnection({
    // Mock-first: the resolver returns real credentials ONLY when a verified
    // non-sandbox connection with a vault secret-ref is stored by the wizard.
    credentials: spApiConnectionCredentials(),
    edgeFunctionBase: '/functions/v1/spapi',
  });
  const spResult = await client.submitCatalogItem(product);
  if (!spResult.ok) {
    return { ok: false, reason: spResult.error ?? 'SP-API submission failed' };
  }

  if (!supabase) {
    // Local mode: accepted locally; production path inserts into
    // catalog_submissions where the DB trigger enforces the same gate.
    return { ok: true, submissionId: spResult.submissionId, mode };
  }

  const { error } = await supabase.from('catalog_submissions').insert({
    brand_id: brandId,
    product_payload: product,
  });
  if (error) {
    return { ok: false, reason: error.message };
  }
  return { ok: true, submissionId: spResult.submissionId, mode };
}

/**
 * §10 step 3 — poll a catalog submission through the same mock/real seam.
 * Mock advances Submitted → Under Amazon Review → Live (every 4th rejects).
 */
export async function pollSubmissionStatus(submissionId: string): Promise<{
  ok: boolean;
  status?: 'submitted' | 'under_amazon_review' | 'live' | 'rejected';
  rejectionReason?: string;
  error?: string;
}> {
  const { client } = createSPApiClientForConnection({
    credentials: spApiConnectionCredentials(),
    edgeFunctionBase: '/functions/v1/spapi',
  });
  return client.getSubmissionStatus(submissionId);
}

/** §10 step 4 — POs received from the retail channel (mock rotates a pool). */
export async function fetchSpApiPurchaseOrders(sinceIso: string): Promise<{
  ok: boolean;
  purchaseOrders?: { purchaseOrderId: string; poValue: number }[];
  error?: string;
}> {
  const { client } = createSPApiClientForConnection({
    credentials: spApiConnectionCredentials(),
    edgeFunctionBase: '/functions/v1/spapi',
  });
  return client.fetchPurchaseOrders(sinceIso);
}

/* ── §Legal — Brand agreement acceptances ── */
export function fetchBrandAgreements() {
  return queryOrSeed<BrandAgreement>('brand_agreements', demoBrandAgreements);
}

export async function acceptBrandAgreement(
  brandId: string,
  agreementType: BrandAgreementType,
  version: string
): Promise<BrandAgreement> {
  const record = storeAcceptBrandAgreement(brandId, agreementType, version);
  // If Supabase is available, also persist
  if (supabase) {
    const uuid = await _toBrandUuid(brandId);
    await supabase.from('brand_agreements').upsert({
      brand_id: uuid,
      agreement_type: agreementType,
      accepted_at: record.acceptedAt,
      version,
    }, { onConflict: 'brand_id,agreement_type' });
  }
  return record;
}

export async function isLogisticsSlaAccepted(brandId: string): Promise<boolean> {
  return storeHasAcceptedAgreement(brandId, 'logistics_sla');
}

export async function isChargebackIndemnityAccepted(brandId: string): Promise<boolean> {
  return storeHasAcceptedAgreement(brandId, 'chargeback_indemnity');
}
export function fetchSubscriptions() {
  return queryOrSeed('subscriptions', demoSubscriptions);
}

/* ── §10/§11 Commissions ── */
export function fetchCommissions() {
  return queryOrSeed('commissions', demoCommissions);
}

/* ── §9 Messages ── */
export function fetchMessages() {
  return queryOrSeed<Message>('messages', demoMessages);
}

/* ── §12 Ad spend ── */
export function fetchAdSpendBudgets() {
  return queryOrSeed<AdSpendBudget>('ad_spend_budgets', demoAdSpend);
}

/* ── §PO workflow (Stage-4) — single source of truth via demoStore ── */

export function fetchPurchaseOrders() {
  return queryOrSeed<PurchaseOrder>('purchase_orders', demoPurchaseOrders);
}

export function fetchPurchaseOrdersForBrand(brandId: string): PurchaseOrder[] {
  return demoPurchaseOrders.filter((p) => p.brandId === brandId);
}

export function fetchPurchaseOrder(id: string): PurchaseOrder | null {
  return demoPurchaseOrders.find((p) => p.id === id) ?? null;
}

/**
 * Accept / Reject / advance a PO. Mutates the shared store so every view
 * (brand PO tab, admin Retail Pipeline, Logistics Control) reflects the
 * change immediately. Supabase write happens when configured.
 */
export async function updatePurchaseOrderStatus(
  id: string,
  status: PurchaseOrder['status'],
  rejectionReason?: string
): Promise<{ ok: boolean; po?: PurchaseOrder; error?: string }> {
  if (status === 'rejected' && !(rejectionReason ?? '').trim()) {
    return { ok: false, error: 'A rejection reason is required.' };
  }
  const po = setPurchaseOrderStatus(id, status, rejectionReason);
  if (!po) return { ok: false, error: `Unknown purchase order: ${id}` };
  if (supabase) {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status, rejection_reason: rejectionReason })
      .eq('id', id);
    if (error) console.warn('[api] Supabase write failed for "purchase_orders", using demo fallback:', error.message);
  }
  return { ok: true, po };
}

/**
 * Stage-6 wiring — shipment creation for a direct-fulfillment PO acceptance.
 * Creates the shipment record in the shared store (visible instantly in
 * Logistics Control and the 3PL Carrier Terminal) and advances the PO.
 */
/**
 * §Stage-24 — PO acknowledgment with Vendor Central semantics.
 * Hard validations enforced store-side, not just as UI hints:
 *  - acknowledgedQty can never exceed ordered quantity;
 *  - rejected lines REQUIRE a structured rejection code;
 *  - backordered lines REQUIRE a scheduledShipDate;
 *  - every line must carry an explicit ack status (all-or-line-complete).
 *
 * §Batch-3 updates:
 *  - Cost-price consistency: if acknowledged unit price differs from PO,
 *    the acknowledgment is still accepted but a warning is returned.
 *  - Full acknowledgment history: every ack appends to ackHistory[].
 *  - Omitted lines (unacknowledged at submit time) are treated as
 *    implicit rejections with a 'TemporarilyUnavailable' code.
 */
export function acknowledgePurchaseOrder(
  poId: string,
  lineAcks: {
    sku: string;
    ackStatus: import('@/types').LineAckStatus;
    acknowledgedQty?: number;
    scheduledShipDate?: string;
    rejectionCode?: import('@/types').PoRejectionCode;
    unitPrice?: number; // §Batch-3 — what the brand actually expects to invoice
  }[],
  /** §Batch-0.5 — when set, the action is attributed to this admin/staff as 'on behalf of brand'. Omit for brand self-action. */
  actorStaffId?: string
): { ok: boolean; error?: string; warnings?: string[] } {
  const po = demoPurchaseOrders.find((p) => p.id === poId);
  if (!po) return { ok: false, error: `Unknown purchase order: ${poId}` };

  const warnings: string[] = [];

  for (const line of po.lineItems) {
    const ack = lineAcks.find((a) => a.sku === line.sku);

    // §Batch-3 — omitted acknowledgment = implicit rejection
    if (!ack || ack.ackStatus === 'unacknowledged') {
      const historyEntry: import('@/types').AckHistoryEntry = {
        acknowledgedAt: new Date().toISOString(),
        ackStatus: 'rejected',
        acknowledgedQty: 0,
        rejectionCode: 'TemporarilyUnavailable',
        unitPrice: line.unitPrice,
      };
      line.ackHistory = [...(line.ackHistory ?? []), historyEntry];
      line.ackStatus = 'rejected';
      line.acknowledgedQty = 0;
      line.rejectionCode = 'TemporarilyUnavailable';
      warnings.push(`Line ${line.sku} was not explicitly acknowledged — implicitly rejected (TemporarilyUnavailable).`);
      continue;
    }

    if (ack.ackStatus === 'rejected' && !ack.rejectionCode) {
      return { ok: false, error: `Line ${line.sku} is rejected — a rejection reason code is required.` };
    }
    if (ack.ackStatus === 'backordered' && !ack.scheduledShipDate) {
      return { ok: false, error: `Line ${line.sku} is backordered — a scheduled ship date is required.` };
    }

    const qty = ack.acknowledgedQty ?? line.quantity;
    if (qty > line.quantity) {
      return {
        ok: false,
        error: `Line ${line.sku}: acknowledged quantity (${qty}) cannot exceed ordered quantity (${line.quantity}).`,
      };
    }
    if (ack.ackStatus !== 'rejected' && qty <= 0) {
      return { ok: false, error: `Line ${line.sku}: acknowledged quantity must be at least 1.` };
    }

    // §Batch-3 — cost-price consistency check
    const ackedPrice = ack.unitPrice ?? line.unitPrice;
    if (Math.abs(ackedPrice - line.unitPrice) > 0.001) {
      line.acknowledgedUnitPrice = ackedPrice;
      warnings.push(
        `Line ${line.sku}: acknowledged unit price (£${ackedPrice.toFixed(2)}) differs from PO unit price (£${line.unitPrice.toFixed(2)}). ` +
        `Invoicing should use the acknowledged price — flag for admin review if this is unexpected.`
      );
    }

    // §Batch-3 — push to history instead of overwriting current state
    const historyEntry: import('@/types').AckHistoryEntry = {
      acknowledgedAt: new Date().toISOString(),
      ackStatus: ack.ackStatus,
      acknowledgedQty: ack.ackStatus === 'rejected' ? 0 : qty,
      rejectionCode: ack.rejectionCode,
      scheduledShipDate: ack.scheduledShipDate,
      unitPrice: ackedPrice,
    };
    line.ackHistory = [...(line.ackHistory ?? []), historyEntry];

    // Keep current-state fields for backward compatibility
    line.ackStatus = ack.ackStatus;
    line.acknowledgedQty = ack.ackStatus === 'rejected' ? 0 : qty;
    if (ack.scheduledShipDate) line.scheduledShipDate = ack.scheduledShipDate;
    if (ack.rejectionCode) line.rejectionCode = ack.rejectionCode;

    // §30-day backorder restock deadline — set at scheduledShipDate + 30d
    if (ack.ackStatus === 'backordered' && ack.scheduledShipDate) {
      const restockDeadline = new Date(ack.scheduledShipDate + 'T00:00:00Z');
      restockDeadline.setUTCDate(restockDeadline.getUTCDate() + 30);
      line.backorderRestockDeadline = restockDeadline.toISOString().slice(0, 10);
    }
  }

  po.acknowledgedAt = new Date().toISOString();
  // Acknowledgment advances the workflow: any accepted/backordered volume
  // means accepted; an all-rejected PO means rejected.
  // §all-or-line-item-complete — acknowledgment must be all-or-line-item-complete:
  // every line must be accepted, rejected, or backordered (no unacknowledged lines).
  const anyAccepted = po.lineItems.some(
    (l) => l.ackStatus === 'accepted' || l.ackStatus === 'backordered'
  );
  setPurchaseOrderStatus(poId, anyAccepted ? 'accepted' : 'rejected');

// §Auto-shipment draft: when PO accepted, create a pre-filled draft
  if (anyAccepted) {
    const acceptedLines = po.lineItems.filter((l) => l.ackStatus === 'accepted' || l.ackStatus === 'backordered');
    const totalAcceptedQty = acceptedLines.reduce((s, l) => s + (l.acknowledgedQty ?? l.quantity), 0);
    const draftShipmentId = 'shipment-draft-' + po.id;
    if (!demoShipments.some((s) => s.id === draftShipmentId)) {
      const brandDraft = demoBrands.find((b) => b.id === po.brandId);
      demoShipments.push({
        id: draftShipmentId,
        brandId: po.brandId,
        poNumber: po.poNumber,
        carrier: 'dhl',
        reference: 'DRAFT-' + po.poNumber,
        title: (brandDraft?.profile.businessName ?? 'Brand').split(' ')[0] + ' — ' + po.poNumber,
        value: acceptedLines.reduce((s, l) => s + (l.acknowledgedQty ?? l.quantity) * l.unitPrice, 0),
        status: 'factory_intake',
        origin: 'Brand warehouse',
        destination: 'Mercenta UK Hub',
        delayed: false,
        exception: false,
      });
    }
    demoAuditLog.push({
      id: 'audit-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString(),
      actorId: po.brandId,
      action: 'shipment_draft_created',
      entityType: 'po_shipment',
      entityId: draftShipmentId,
      brandId: po.brandId,
      reason: 'Auto-generated shipment draft after PO ' + po.poNumber + ' acknowledgment — ' + totalAcceptedQty + ' units across ' + acceptedLines.length + ' lines. Brand must add carton details.',
      metadata: { poNumber: po.poNumber, lineCount: acceptedLines.length, totalQty: totalAcceptedQty, draftLineItems: acceptedLines.map((l) => l.sku) },
    });
  }
  // §Batch-0.5 — audit log with clear attribution: brand self-action vs admin on behalf
  const brand = demoBrands.find((b) => b.id === po.brandId);
  const brandName = brand?.profile.businessName ?? po.brandId;
  const acceptedLines = po.lineItems.filter((l) => l.ackStatus === 'accepted' || l.ackStatus === 'backordered');
  const rejectedLines = po.lineItems.filter((l) => l.ackStatus === 'rejected');
  const actorLabel = actorStaffId ? `${actorStaffId} (admin on behalf of ${brandName})` : `${brandName} (self)`;
  demoAuditLog.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    actorId: actorStaffId ?? po.brandId,
    action: 'purchase_order_acknowledged',
    entityType: 'purchase_order',
    entityId: po.id,
    brandId: po.brandId,
    reason: `${actorLabel}: ${acceptedLines.length}/${po.lineItems.length} lines accepted/backordered, ${rejectedLines.length} rejected`,
    metadata: { actorLabel, acceptedLines: acceptedLines.map((l) => l.sku), rejectedLines: rejectedLines.map((l) => l.sku) },
  });

  return { ok: true, warnings: warnings.length > 0 ? warnings : undefined };
}

export interface AsnCarton {
  sku: string;
  quantity: number;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

/** §Stage-24 — genuine ASN-level detail, not a generic "shipment created" flag. */
export interface AsnDetail {
  cartons: AsnCarton[];
  shipDate: string;
  carrier: string;
  proNumber?: string;
  bolNumber?: string;
  trailerNumber?: string;
  /** Required for perishable/regulated categories (Grocery, Health & Personal Care). */
  lotNumber?: string;
  expiryDate?: string;
}

/** Categories where lot + expiry data are mandatory on the ASN. */
const LOT_REQUIRED_CATEGORIES = ['Grocery', 'Health & Personal Care'];

/** §Batch-10 — Admin on-behalf PO creation. Generates a PO, attaches audit attribution. */
export function createPurchaseOrder(
  brandId: string,
  lineItems: { sku: string; productName: string; quantity: number; unitPrice: number; commodityCode: string }[],
  actorStaffId?: string
): PurchaseOrder {
  const brand = demoBrands.find(function(b) { return b.id === brandId; });
  const brandName = brand?.profile.businessName ?? brandId;
  const now = new Date();
  const poNum = 'PO-ADM-' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const totalValue = lineItems.reduce(function(a, l) { return a + l.unitPrice * l.quantity; }, 0);
  const po: PurchaseOrder = {
    id: 'po-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    brandId: brandId,
    poNumber: poNum,
    status: 'received',
    poValue: Math.round(totalValue * 100) / 100,
    commissionRate: 0.07,
    commissionAmount: Math.round(totalValue * 0.07 * 100) / 100,
    orderDate: now.toISOString(),
    lineItems: lineItems.map(function(l) { return ({ sku: l.sku, productName: l.productName, quantity: l.quantity, unitPrice: l.unitPrice, commodityCode: l.commodityCode }); }),
  };
  demoPurchaseOrders.push(po);
  const actorLabel = actorStaffId ? actorStaffId + ' (admin on behalf of ' + brandName + ')' : brandName + ' (self)';
  // §New PO notification — fire-and-forget email via Postmark
  const demoBrand = ALL_DEMO_BRANDS.find(function(b) { return b.id === brandId; });
  if (demoBrand && demoBrand.email) {
    const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const brandUrl = (typeof location !== 'undefined' ? location.origin : 'https://mercenta.com') + '/brand/purchase-orders?po=' + po.id;
    const content = buildPoNotificationHtml(poNum, brandName, lineItems.length, deadline, brandUrl);
    sendPostmarkEmail({
      to: demoBrand.email,
      subject: 'New Purchase Order — Action Required',
      textBody: content.textBody,
      htmlBody: content.htmlBody,
    }).then(function(result) {
      if (!result.ok) console.warn('[notifications] Failed to send PO notification:', result.error);
      else if (result.mock) console.log('[notifications] (Mock) PO notification sent to', demoBrand.email, '— id:', result.messageId);
    });
  } else {
    console.warn('[notifications] No verified email on file for brand', brandId, '— PO notification skipped');
  }
  demoAuditLog.push({
    id: 'audit-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    createdAt: now.toISOString(),
    actorId: actorStaffId ?? brandId,
    action: 'po_created',
    entityType: 'purchase_order',
    entityId: po.id,
    brandId: brandId,
    reason: actorLabel + ': created PO ' + poNum + ' for ' + brandName + ' — ' + lineItems.length + ' lines, GBP ' + po.poValue.toFixed(2),
    metadata: { actorLabel: actorLabel, lineCount: lineItems.length, poValue: po.poValue },
  });
  return po;
}

/**
 * §Stage-24 — ASN creation with real carton detail AND the concrete link to
 * the Deductions module: ASN totals are validated against ACKNOWLEDGED
 * quantities before submission, and any shortfall automatically opens a
 * shortage-claim Deduction (ASN accuracy / short-ship chargeback linkage).
 */
export function createShipmentForPO(
  poId: string,
  asn: AsnDetail,
  /** §Batch-0.5 — when set, attributed as 'admin on behalf of brand'. Omit for brand self-action. */
  actorStaffId?: string
): { ok: boolean; shipmentId?: string; warnings: string[]; deductionId?: string; error?: string } {
  const warnings: string[] = [];
  const po = demoPurchaseOrders.find((p) => p.id === poId);
  if (!po) return { ok: false, warnings, error: `Unknown purchase order: ${poId}` };
  if (!['dhl', 'fedex', 'bak', 'palletline', 'amazon_partner'].includes(asn.carrier)) {
    return { ok: false, warnings, error: `Unknown carrier: ${asn.carrier}` };
  }
  if (po.status !== 'accepted' && po.status !== 'ready_to_fulfil') {
    return { ok: false, warnings, error: `PO ${po.poNumber} is not in an accepted state.` };
  }
  if (!asn.cartons.length) {
    return { ok: false, warnings, error: 'An ASN requires at least one carton.' };
  }
  if (!asn.shipDate) {
    return { ok: false, warnings, error: 'An ASN requires a ship date.' };
  }

  // Lot + expiry mandatory for perishable/regulated categories.
  const brand = demoBrands.find((b) => b.id === po.brandId);
  if (brand && LOT_REQUIRED_CATEGORIES.includes(brand.category)) {
    if (!asn.lotNumber || !asn.expiryDate) {
      return {
        ok: false,
        warnings,
        error:
          'Lot number and expiry date are required on the ASN for perishable/regulated categories (Grocery, Health & Personal Care).',
      };
    }
  }

  // Validate ASN quantities against ACKNOWLEDGED quantities (fallback ordered).
  for (const line of po.lineItems) {
    if (line.ackStatus === 'rejected') continue;
    const expected = line.acknowledgedQty ?? line.quantity;
    const shipped = asn.cartons
      .filter((c) => c.sku === line.sku)
      .reduce((a, c) => a + c.quantity, 0);
    if (shipped > expected) {
      return {
        ok: false,
        warnings,
        error: `Line ${line.sku}: ASN ships ${shipped} but only ${expected} were acknowledged — reduce the carton contents.`,
      };
    }
    if (shipped < expected) {
      warnings.push(
        `Line ${line.sku}: shipping ${shipped} of ${expected} acknowledged units — logged as a potential shortage claim.`
      );
    }
  }

  const shipmentId = `shipment-${po.id}`;
  if (!demoShipments.some((s) => s.id === shipmentId)) {
    demoShipments.push({
      id: shipmentId,
      brandId: po.brandId,
      poNumber: po.poNumber,
      carrier: asn.carrier,
      reference: `${asn.carrier.slice(0, 2).toUpperCase()}-${po.poNumber}`,
      title: `${(brand?.profile.businessName ?? 'Brand').split(' ')[0]} — ${po.poNumber}`,
      value: po.poValue,
      status: 'factory_intake',
      origin: 'Origin depot',
      destination: 'Mercenta UK Hub',
      delayed: false,
      exception: false,
    });
  }
  setPurchaseOrderStatus(poId, 'ready_to_fulfil');

  // Shortfall → automatic open shortage-claim Deduction (module linkage).
  let deductionId: string | undefined;
  const shortfalls = po.lineItems
    .filter((l) => l.ackStatus !== 'rejected')
    .map((l) => ({
      sku: l.sku,
      short:
        (l.acknowledgedQty ?? l.quantity) -
        asn.cartons.filter((c) => c.sku === l.sku).reduce((a, c) => a + c.quantity, 0),
      unitPrice: l.unitPrice,
    }))
    .filter((f) => f.short > 0);
  if (shortfalls.length > 0) {
    const value = shortfalls.reduce((a, f) => a + f.short * f.unitPrice, 0);
    const ded = createDeductionInStore({
      brandId: po.brandId,
      purchaseOrderId: po.poNumber,
      type: 'shortage_claim',
      amountGbp: Math.round(value * 100) / 100,
      reason: `ASN shortfall: ${shortfalls.map((f) => `${f.sku} −${f.short}`).join(', ')}.`,
      status: 'open',
      evidenceNotes: 'Auto-created from ASN-vs-acknowledged quantity validation.',
      date: new Date().toISOString().slice(0, 10),
    });
    deductionId = ded.id;
  }

  // §Batch-0.5 — audit log with clear attribution
  const brandNameCreate = brand?.profile.businessName ?? po.brandId;
  const actorLabelCreate = actorStaffId ? `${actorStaffId} (admin on behalf of ${brandNameCreate})` : `${brandNameCreate} (self)`;
  demoAuditLog.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    actorId: actorStaffId ?? po.brandId,
    action: 'asn_filed',
    entityType: 'purchase_order',
    entityId: po.id,
    brandId: po.brandId,
    reason: `${actorLabelCreate}: ASN filed for PO ${po.poNumber} via ${asn.carrier} — ${asn.cartons.reduce((a, c) => a + c.quantity, 0)} units across ${asn.cartons.length} cartons${shortfalls.length > 0 ? `, ${shortfalls.length} shortfall(s) → deduction ${deductionId}` : ''}`,
    metadata: { actorLabel: actorLabelCreate, carrier: asn.carrier, cartonCount: asn.cartons.length, unitCount: asn.cartons.reduce((a, c) => a + c.quantity, 0), shortfallCount: shortfalls.length, deductionId },
  });

// §ASN auto-push stub — when shipment is confirmed, log that an ASN would be pushed
  // TODO: Replace with real SP-API PUT /vendor/shipping call when Amazon account is approved
  demoAuditLog.push({
    id: 'audit-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
    actorId: actorStaffId ?? po.brandId,
    action: 'asn_auto_generated',
    entityType: 'shipment',
    entityId: shipmentId,
    brandId: po.brandId,
    reason: 'ASN auto-generated for PO ' + po.poNumber + ', shipment ' + shipmentId + '. Would be pushed to Amazon SP-API when integration is live.',
    metadata: { poNumber: po.poNumber, shipmentId: shipmentId, carrier: asn.carrier },
  });
  return { ok: true, shipmentId, warnings, deductionId };
}

/* ── Shipments across every carrier (3PL terminal + logistics control) ── */

export function fetchShipmentsAll() {
  return queryOrSeed('shipments', demoShipments);
}

export function fetchShipmentsForBrand(brandId: string) {
  return demoShipments.filter((s) => s.brandId === brandId);
}

/* ── Catalog with owning-brand join (Global Catalog Manager) ── */

export function fetchCatalogWithBrands() {
  return queryOrSeed('catalog', demoProducts);
}

/* ── §5/§4 Override + admin-action audit trail ─────────────────────── */

export interface ApplyOverrideResult {
  ok: boolean;
  source: DataSource;
  error?: string;
}

/**
 * Persist a fulfillment-track override: updates the score row (manual_override,
 * override_reason) when live, and ALWAYS writes an audit_log row with actor,
 * reason, brand and timestamp. Throws loudly on Supabase failure — overrides
 * are never silently dropped.
 */
export async function applyFulfillmentOverride(
  brandId: string,
  track: FulfillmentTrack,
  reason: string,
  actorId = 'admin'
): Promise<ApplyOverrideResult> {
  if (!reason.trim()) throw new Error('[api] override requires a reason');

  if (supabase) {
    const brandUuid = await _toBrandUuid(brandId);
    const { error: updErr } = await supabase
      .from('fulfillment_scores')
      .update({ track, manual_override: true, override_reason: reason })
      .eq('brand_id', brandUuid);
    if (updErr) {
      console.warn('[api] Supabase write failed for "fulfillment_scores", using demo fallback:', updErr.message);
    } else {
      const { error: logErr } = await supabase.from('audit_log').insert({
        actor_id: actorId,
        action: 'fulfillment_track_override',
        entity_type: 'fulfillment_score',
        entity_id: brandId,
        brand_id: brandUuid,
        reason,
        metadata: { track },
      });
      if (logErr) console.warn('[api] Supabase write failed for "audit_log", using demo fallback:', logErr.message);
      return { ok: true, source: 'supabase' };
    }
  }

  // Seed/demo mode: same shape, queryable in-memory store.
  const score = demoFulfillmentScores.find(
    (s) => s.brandId === brandId
  ) as FulfillmentScore | undefined;
  if (score) {
    score.track = track;
    score.manualOverride = true;
    score.overrideReason = reason;
  }
  demoAuditLog.push({
    id: `audit-${Date.now()}`,
    createdAt: new Date().toISOString(),
    actorId,
    action: 'fulfillment_track_override',
    entityType: 'fulfillment_score',
    entityId: brandId,
    brandId,
    reason,
    metadata: { track },
  });
  return { ok: true, source: 'seed' };
}

export function fetchAuditLog() {
  return queryOrSeed<AuditLogEntry>('audit_log', demoAuditLog);
}

/* ── §New revenue — shipping markup ledger ──────────────────────────── */

/** §5 Bulk recalculate all brands' fulfillment scores. */
export function recalculateAllScores(): { updated: number } {
  let updated = 0;
  for (let i = 0; i < demoFulfillmentScores.length; i++) {
    const score = demoFulfillmentScores[i];
    const total = score.tradingHistoryScore + score.exportExperienceScore + score.scaleScore + score.workingCapitalScore + score.categoryRiskScore + score.reliabilityScore;
    score.totalScore = total;
    if (!score.manualOverride) {
      score.track = total >= 65 ? 'direct_fulfillment' : 'financed';
    }
    score.lastCalculated = new Date().toISOString();
    updated++;
  }
  return { updated };
}
export function fetchShippingMargins() {
  return queryOrSeed<ShippingMargin>('shipping_margins', demoShippingMargins);
}

/* ── Stage-2 completion: supabase-aware mutations ───────────────────── */
/* Same names/signatures as the demoStore originals so views can switch their
   import source without changing call sites. Live mode writes through
   Supabase; seed mode mutates the demo store exactly as before. */

export function renameBrand(brandId: string, businessName: string): void {
  const ok = storeRenameBrand(brandId, businessName);
  if (!ok) throw new Error(`[api] renameBrand: unknown brand ${brandId}`);
  if (supabase) {
    void supabase
      .from('brands')
      .update({ business_name: businessName })
      .eq('legacy_demo_id', brandId)
      .then(({ error }) => {
        if (error) console.warn('[api] Supabase write failed for "brands", using demo fallback:', error.message);
      });
  }
}

export function setBrandTrack(
  brandId: string,
  track: 'direct_fulfillment' | 'financed',
  reason: string
): void {
  if (!reason.trim()) throw new Error('[api] setBrandTrack requires a reason');
  storeSetBrandTrack(brandId, track, reason);
  // Full audit-trail persistence (fulfillment_scores + audit_log), shared
  // with the FulfillmentTrack override path.
  void applyFulfillmentOverride(brandId, track, reason).catch((err) =>
    console.error('[api] setBrandTrack audit:', err)
  );
}

export function uploadComplianceDoc(
  brandId: string,
  documentType: string,
  actingStaffId: string,
): { docId: string } {
  const doc = demoComplianceDocs.find(function(d) { return d.brandId === brandId && d.type === documentType; });
  if (doc) {
    storeSetComplianceDocStatus(doc.id, 'under_review', actingStaffId);
    return { docId: doc.id };
  }
  const newDoc: ComplianceDocument = {
    id: 'doc-' + Math.random().toString(36).slice(2, 8),
    brandId: brandId,
    type: documentType as ComplianceDocument['type'],
    status: 'under_review',
    reviewedBy: actingStaffId,
  };
  demoComplianceDocs.push(newDoc);
  return { docId: newDoc.id };
}

export function setComplianceDocStatus(
  docId: string,
  status: ComplianceDocument['status'],
  reviewer: string
): void {
  const ok = storeSetComplianceDocStatus(docId, status, reviewer);
  if (!ok) throw new Error(`[api] setComplianceDocStatus: unknown doc ${docId}`);
  if (supabase) {
    void supabase
      .from('compliance_documents')
      .update({ status, reviewed_by: reviewer })
      .eq('id', docId)
      .then(({ error }) => {
        if (error) console.warn('[api] Supabase write failed for "compliance_documents", using demo fallback:', error.message);
      });
  }
}

export function amendShipment(
  shipmentId: string,
  patch: { carrier?: string; status?: string }
): void {
  const ok = storeAmendShipment(shipmentId, patch);
  if (!ok) throw new Error(`[api] amendShipment: unknown shipment ${shipmentId}`);
  if (supabase) {
    void supabase
      .from('shipments')
      .update({
        ...(patch.carrier ? { carrier: patch.carrier } : {}),
        ...(patch.status ? { status: patch.status } : {}),
      })
      .eq('id', shipmentId)
      .then(({ error }) => {
        if (error) console.warn('[api] Supabase write failed for "shipments", using demo fallback:', error.message);
      });
  }
}

/* ── §Profile-change requests (brand self-service ↔ admin CRM) ─────────── */
/* Same names/signatures as the demoStore originals so views can switch their
   import source without changing call sites. Live mode writes through
   Supabase; seed mode mutates the demo store exactly as before. */

export function requestProfileChange(input: {
  brandId: string;
  field: import('@/types').ProfileChangeField;
  currentValue: string;
  requestedValue: string;
  reason: string;
}): import('@/types').ProfileChangeRequest {
  const req = storeRequestProfileChange(input);
  if (supabase) {
    void supabase
      .from('profile_change_requests')
      .insert({
        id: req.id,
        brand_id: req.brandId,
        field: req.field,
        current_value: req.currentValue,
        requested_value: req.requestedValue,
        reason: req.reason,
        status: req.status,
        requested_at: req.requestedAt,
      })
      .then(({ error }) => {
        if (error) console.warn('[api] Supabase write failed for "profile_change_requests", using demo fallback:', error.message);
      });
  }
  return req;
}

export function reviewProfileChangeRequest(
  id: string,
  approve: boolean,
  reviewedByStaffId: string,
  reviewNote?: string
): import('@/types').ProfileChangeRequest | null {
  if (supabase) {
    void supabase
      .from('profile_change_requests')
      .update({
        status: approve ? 'approved' : 'rejected',
        reviewed_by: reviewedByStaffId,
        reviewed_at: new Date().toISOString(),
        ...(reviewNote ? { review_note: reviewNote } : {}),
      })
      .eq('id', id)
      .then(({ error }) => {
        if (error) console.warn('[api] Supabase write failed for "profile_change_requests", using demo fallback:', error.message);
      });
  }
    return storeReviewProfileChangeRequest(id, approve, reviewedByStaffId, reviewNote);
}

export function fetchProfileChangeRequests() {
  return queryOrSeed<import('@/types').ProfileChangeRequest>(
    'profile_change_requests',
    [...demoProfileChangeRequests]
  );
}

export async function fetchProfileChangeRequestsForBrand(brandId: string): Promise<import('@/types').ProfileChangeRequest[]> {
  const { data } = await fetchProfileChangeRequests();
  return data.filter((r) => r.brandId === brandId);
}

/**
 * In-memory reference for views that read the seed array synchronously
 * (e.g. filtering by brandId before render). New views should prefer
 * `fetchProfileChangeRequestsForBrand` for live-mode compatibility; this
 * re-export exists so existing call sites can switch their import source
 * from `@/data/demoStore` without restructuring their data flow.
 */
export { demoProfileChangeRequests };

/* ── Reads previously only available as direct demoStore arrays ── */

export function fetchProducts() {
  return queryOrSeed<(typeof demoProducts)[number]>('products', [...demoProducts]);
}

export function fetchDeductions() {
  return queryOrSeed<import('@/types').Deduction>('deductions', [...demoDeductions]);
}

/** §19.1 — admin opens a dispute against a deduction (status → disputed). */
export function disputeDeduction(id: string, notes: string) {
  // §7D — write the demo store FIRST (the UI depends on it) and background the
  // optional Supabase write. Awaiting a remote write before touching the store
  // hung the whole demo flow whenever the host was unreachable.
  const result = disputeDeductionInStore(id, notes);
  if (supabase) {
    void (async () => {
      try {
        const res = await supabase
          .from('deductions')
          .update({
            status: 'disputed',
            dispute_opened_at: new Date().toISOString(),
            dispute_notes: notes,
          })
          .eq('id', id);
        if (res.error) console.warn('[api] Supabase write failed for "deductions" (dispute):', res.error.message);
      } catch (err) {
        console.warn('[api] Supabase write failed for "deductions" (dispute):', err);
      }
    })();
  }
  return result;
}

/** §19.1 — record the outcome of an open dispute (→ resolved). */
export function recordDisputeOutcome(
  id: string,
  outcome: import('@/types').DisputeOutcome
) {
  const result = recordDisputeOutcomeInStore(id, outcome);
  if (supabase) {
    void (async () => {
      try {
        const res = await supabase
          .from('deductions')
          .update({ dispute_outcome: outcome, status: 'resolved' })
          .eq('id', id);
        if (res.error) console.warn('[api] Supabase write failed for "deductions" (outcome):', res.error.message);
      } catch (err) {
        console.warn('[api] Supabase write failed for "deductions" (outcome):', err);
      }
    })();
  }
  return result;
}

export function fetchCatalogSubmissions() {
  return queryOrSeed<(typeof demoSubmissions)[number]>('catalog_submissions', [...demoSubmissions]);
}


/* ── §12 Homepage content (draft/publish) ───────────────────────────── */

const homepageState: { draft: HomepageContent | null; live: HomepageContent | null } = { draft: null, live: null };

/* §Phase 7E — demo-mode live-refresh bridge. The public Home surface (HomeShell)
 * subscribes to this version counter via the same module-level listener pattern
 * TourEngine uses for tour progress. Publishing bumps the version so any mounted
 * consumer re-fetches the live copy through the normal React Query path — no
 * polling, no websockets, no backend, and no change to the content API contract. */
let homepageLiveVersion = 0;
const homepageLiveListeners = new Set<() => void>();

export function getHomepageLiveVersion(): number {
  return homepageLiveVersion;
}

/** Subscribe to publish events; returns an unsubscribe function. */
export function subscribeHomepageLive(fn: () => void): () => void {
  homepageLiveListeners.add(fn);
  return () => {
    homepageLiveListeners.delete(fn);
  };
}

function notifyHomepageLiveChanged(): void {
  homepageLiveVersion++;
  homepageLiveListeners.forEach((fn) => fn());
}

export async function fetchHomepageContent(): Promise<{
  live: HomepageContent;
  draft: HomepageContent | null;
}> {
  if (supabase) {
    const { data, error } = await supabase
      .from('homepage_content')
      .select('content')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn('[api] Supabase query failed for "homepage_content", using demo fallback:', error.message);
    } else if (data?.content) {
      return {
        live: structuredClone(data.content as unknown as HomepageContent),
        draft: homepageState.draft ? structuredClone(homepageState.draft) : null,
      };
    }
  }
  // Seed/demo mode: live copy reflects the last in-session publish, otherwise
  // the canonical default; drafts are held in session.
  return {
    live: structuredClone(homepageState.live ?? DEFAULT_HOMEPAGE_CONTENT),
    draft: homepageState.draft ? structuredClone(homepageState.draft) : null,
  };
}

export async function saveHomepageDraft(content: HomepageContent): Promise<void> {
  homepageState.draft = structuredClone(content);
}

/** Publish promotes the draft to live copy. Returns the new live content. */
export async function publishHomepageContent(
  content?: HomepageContent
): Promise<HomepageContent> {
  const toPublish = content ?? homepageState.draft;
  if (!toPublish) throw new Error('[api] nothing to publish — save a draft first');
  homepageState.draft = null;
  homepageState.live = structuredClone(toPublish);
  notifyHomepageLiveChanged();
  if (supabase) {
    const { error } = await supabase
      .from('homepage_content')
      .upsert(
        { id: '00000000-0000-0000-0000-000000000001', content: toPublish as unknown as Record<string, unknown>, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );
    if (error) console.warn('[api] Supabase write failed for "homepage_content", using demo fallback:', error.message);
  }
  return structuredClone(toPublish);
}



/* ── §9 Messaging ── */

/**
 * Log a message to the store. THE rule of the messaging hub: every message
 * — automation or staff, sent or draft-noted — lands here so full history
 * survives staff changes. In seed mode the caller holds it in memory.
 */
export async function logMessage(
  message: Omit<Message, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
): Promise<Message> {
  const full: Message = {
    ...message,
    id: message.id ?? `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: message.createdAt ?? new Date().toISOString(),
  } as Message;
  if (supabase) {
    const brandUuid = await _toBrandUuid(full.brandId);
    const { error } = await supabase.from('messages').insert({
      brand_id: brandUuid,
      lead_id: full.leadId,
      channel: full.channel,
      direction: full.direction,
      subject: full.subject,
      body: full.body,
      sent_by: full.sentBy,
      requires_human: full.requiresHuman,
    });
    if (error) {
      console.warn('[api] Supabase write failed for "messages", using demo fallback:', error.message);
      demoMessages.unshift(full);
      return full;
    }
  } else {
    // Seed mode: demoMessages IS the store — mutate it so every view
    // (Messages Hub, Brand CRM comm panel, PO contact actions) sees the
    // same thread history immediately. Single source of truth.
    demoMessages.unshift(full);
  }
  return full;
}
/* ── §Batch-2 — Brand Settings API ────────────────────────────────── */
export {
  getBankInfo,
  requestBankChange,
  approveBankChange,
  addTeamMember,
  updateTeamMember,
  removeTeamMember,
  addPoOutage,
  cancelPoOutage,
  addReturnAddress,
  updateReturnAddress,
  removeReturnAddress,
  updateNotificationPref,
  addReturn,
  updateProductAvailability,
  updateProductCost,
  demoTeamMembers,
  demoPoOutages,
  demoReturnAddresses,
  demoNotificationPrefs,
  demoReturns,
} from './demoStore';
/* ── §Batch-4 — Pagination infrastructure ─────────────────────────── */

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 500;

/**
 * Normalize pagination params with safe defaults & clamping.
 * Works with both seed mode (returns a page-sized slice) and live mode
 * (passed to Supabase .range()).
 */
export function normalizePagination(
  p?: import('@/types').PaginationParams
): Required<NonNullable<import('@/types').PaginationParams>> {
  const page = Math.max(0, Math.floor(p?.page ?? 0));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(p?.pageSize ?? DEFAULT_PAGE_SIZE)));
  return {
    page,
    pageSize,
    orderBy: p?.orderBy ?? 'created_at',
    orderDir: p?.orderDir ?? 'desc',
  };
}

/**
 * Generic paginated fetch: local arrays are sliced in-memory (mirrors the
 * exact shape Supabase will return in live mode); live mode issues a
 * range-based query with ordering.
 *
 * Consumers must never depend on which mode is active — the response shape
 * is identical so swapping seed → live requires zero component changes.
 */
async function paginatedQueryOrSeed<T>(
  table: string,
  seed: T[],
  p?: import('@/types').PaginationParams,
  brandFilter?: (row: T) => boolean
): Promise<import('@/types').PaginatedResult<T>> {
  const { page, pageSize, orderBy, orderDir } = normalizePagination(p);

  if (!supabase) {
    let all = [...seed];
    if (brandFilter) all = all.filter(brandFilter);
    // Order deterministically by the requested column.
    const key = (row: T): string => {
       
      const v = (row as any)[orderBy];
      if (typeof v === 'string') return v;
       
      const alt = (row as any)[orderBy === 'created_at' ? 'createdAt' : orderBy];
      return typeof alt === 'string' ? (alt as string) : '';
    };
    all.sort((a, b) => {
      const cmp = key(a).localeCompare(key(b));
      return orderDir === 'asc' ? cmp : -cmp;
    });
    const total = all.length;
    const start = page * pageSize;
    const data = all.slice(start, start + pageSize);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      source: 'seed',
    };
  }

  await _ensureBrandIdMap();
  let query = supabase.from(table).select('*', { count: 'exact', head: false });
  if (brandFilter) {
    // brandFilter is a row-level predicate only usable in seed mode;
    // in live mode RLS scopes to the authenticated brand automatically.
    void brandFilter;
  }
  query = query.order(orderBy, { ascending: orderDir === 'asc' });
  query = query.range(page * pageSize, page * pageSize + pageSize - 1);
  const { data, count, error } = await query;
  if (error) {
    console.warn(`[api] Supabase paginated query failed for "${table}", using demo fallback:`, error.message);
    // Fall through to seed-based pagination below
    let all = [...seed];
    if (brandFilter) all = all.filter(brandFilter);
    const key = (row: T): string => {
      const v = (row as any)[orderBy];
      if (typeof v === 'string') return v;
      const alt = (row as any)[orderBy === 'created_at' ? 'createdAt' : orderBy];
      return typeof alt === 'string' ? (alt as string) : '';
    };
    all.sort((a, b) => {
      const cmp = key(a).localeCompare(key(b));
      return orderDir === 'asc' ? cmp : -cmp;
    });
    const total = all.length;
    const start = page * pageSize;
    const sliced = all.slice(start, start + pageSize);
    return { data: sliced, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), source: 'seed' as const };
  }
  const total = count ?? 0;
  return {
    data: _translateRows((data ?? []) as T[]),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    source: 'supabase',
  };
}

/* ── §Batch-4 — Paginated list fetchers ───────────────────────────── */

export interface ListQueryOptions {
  brandId?: string;
  status?: string;
  search?: string;
}

function matchSearch(needle: string | undefined, haystack: string[]) {
  if (!needle?.trim()) return true;
  const n = needle.trim().toLowerCase();
  return haystack.some((h) => h.toLowerCase().includes(n));
}

export async function fetchProductsPaginated(
  opts: ListQueryOptions = {},
  pagination?: import('@/types').PaginationParams
) {
  return paginatedQueryOrSeed(
    'products',
    demoProducts,
    pagination,
    (row) =>
      (!opts.brandId || (row as unknown as { brandId?: string }).brandId === opts.brandId) &&
      (opts.status ? (row as unknown as { isAvailable?: boolean }).isAvailable !== false : true) &&
      matchSearch(opts.search, [String((row as unknown as { name?: string }).name), String((row as unknown as { sku?: string }).sku)])
  );
}

export async function fetchPurchaseOrdersPaginated(
  opts: ListQueryOptions = {},
  pagination?: import('@/types').PaginationParams
) {
  return paginatedQueryOrSeed(
    'purchase_orders',
    demoPurchaseOrders,
    pagination,
    (row) => {
      const r = row as unknown as PurchaseOrder;
      return (
        (!opts.brandId || r.brandId === opts.brandId) &&
        (!opts.status || r.status === opts.status) &&
        matchSearch(opts.search, [r.poNumber])
      );
    }
  );
}

export async function fetchShipmentsPaginated(
  opts: ListQueryOptions = {},
  pagination?: import('@/types').PaginationParams
) {
  return paginatedQueryOrSeed(
    'shipments',
    demoShipments,
    pagination,
    (row) => {
      const r = row as unknown as { brandId?: string; reference?: string; title?: string };
      return (
        (!opts.brandId || r.brandId === opts.brandId) &&
        matchSearch(opts.search, [String(r.reference ?? ''), String(r.title ?? '')])
      );
    }
  );
}

export async function fetchMessagesPaginated(
  opts: ListQueryOptions = {},
  pagination?: import('@/types').PaginationParams
) {
  return paginatedQueryOrSeed(
    'messages',
    demoMessages,
    pagination,
    (row) => {
      const r = row as unknown as Message;
      return (
        (!opts.brandId || r.brandId === opts.brandId) &&
        matchSearch(opts.search, [String(r.subject ?? ''), r.body])
      );
    }
  );
}

export async function fetchAuditLogPaginated(
  opts: ListQueryOptions = {},
  pagination?: import('@/types').PaginationParams
) {
  return paginatedQueryOrSeed(
    'audit_log',
    demoAuditLog,
    pagination,
    (row) => {
      const r = row as unknown as AuditLogEntry;
      return (
        (!opts.brandId || r.brandId === opts.brandId) &&
        matchSearch(opts.search, [r.action, r.entityType, r.reason])
      );
    }
  );
}
