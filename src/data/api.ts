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
import { evaluateComplianceGate, latestDocumentsByType } from '@/lib/compliance';
import { submitDocumentForVerification } from '@/lib/verification/documentVerification';
import { validateCarrierForShipment } from '@/lib/shipping/carrierRouting';
import { ackStatusTransitionRefusal, backOrderBlockedReason } from '@/lib/commerce/backorderGate';
import { issueChannelInstruction, instructionLineFor } from '@/lib/commerce/channelInstructions';
import {
  ingestChannelPurchaseOrders as ingestChannelPurchaseOrdersFromChannel,
  type ChannelIngestionResult,
} from '@/lib/commerce/channelPurchaseOrderIngestion';
import type { ChannelPurchaseOrderReadResult } from '@/lib/spapi/client';
import { deriveShipmentEta, etaWindowKindFor } from '@/lib/logistics/shipmentEta';
import type { DemoShipment } from '@/data/demoData';
import type { ShipmentEta } from '@/types';
import { originForBrand } from '@/config/logisticsGeo';
import { declaredShipToParty, destinationLabelForPo } from '@/config/destinationFc';
import { REQUIRED_SUBMISSION_FIELDS } from '@/lib/catalog/productCompleteness';
import { createSPApiClientForConnection } from '@/lib/spapi';
import { spApiConnectionCredentials } from '@/integrations/connections';
import { DEFAULT_HOMEPAGE_CONTENT, normaliseHomepageContent, type HomepageContent } from '@/config/homepageContent';
import {
  demoAdSpend,
  demoBrands,
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
  getCommission,
  listCommissionsForPayout,
  markCommissionPaid as markCommissionPaidInStore,
  ensureDistributionAgreement as storeEnsureDistributionAgreement,
  demoAdCampaigns,
  demoAdSpendRecommendations,
  setAdSpendBudgetForBrand as storeSetAdSpendBudgetForBrand,
  reviewAdSpendRecommendation as storeReviewAdSpendRecommendation,
  setListingRecommendationReview as storeSetListingRecommendationReview,
  applyListingReviewOverrides as storeApplyListingReviewOverrides,
} from './demoStore';
import { COMMISSION_RATE_PLACEHOLDER, MONTHLY_FEE_PLACEHOLDER_GBP } from '@/config/commercial';
import {
  createPayoutClient,
  normalisePayoutTrack,
  resolveCommissionRatePct,
  settleCommission,
} from '@/lib/billing/payouts';
import type {
  AdSpendBudget,
  AdCampaign,
  AdSpendRecommendation,
  CatalogSubmissionStatus,
  Commission,
  ComplianceDocument,
  Contract,
  Message,
  FulfillmentScore,
  FulfillmentTrack,
  ProductSubmission,
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
  demoProductSubmissions,
  recordCatalogSubmission,
  recordCommerceAudit,
} from './demoStore';
import {
  ensureCommissionPayout,
  evaluatePayoutEligibility,
  markPayoutFailed,
  markPayoutSettled,
  markPayoutSubmitted,
} from '@/lib/finance/financialReconciliation';

export type DataSource = 'supabase' | 'seed';

/* ── ID translation layer ──────────────────────────────────────────── */
/* Frontend uses string IDs (e.g. "brand-astonish") while Supabase uses
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

/** Convert Supabase brand UUID → frontend string ID (e.g. "brand-astonish"). */
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
    nation: (row.nation as string) ?? (row.country as string) ?? undefined,
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
 * §Phase E3 — THE canonical resolution of the compliance-gate inputs.
 *
 * `isComplianceGateCleared` and `submitCatalogItem` previously repeated these
 * same four resolutions independently (the exact duplication that caused the
 * historical argument-shift defect). Both now read from this one function, and
 * the E3 lifecycle uses it too, so the gate can never be evaluated with
 * different inputs in different places.
 */
export async function evaluateBrandCatalogGate(brandId: string) {
  const docs = await fetchComplianceForBrand(brandId);
  const hasAgreement = hasSignedDistributionAgreement(brandId);
  const logisticsSlaAccepted = storeHasAcceptedAgreement(brandId, 'logistics_sla');
  const chargebackIndemnityAccepted = storeHasAcceptedAgreement(brandId, 'chargeback_indemnity');
  // NOTE: category is deliberately `undefined` (base documents) — passing it
  // would shift every following argument. Unchanged from the fixed version.
  return evaluateComplianceGate(
    docs,
    undefined,
    hasAgreement,
    logisticsSlaAccepted,
    chargebackIndemnityAccepted
  );
}

/**
 * §3 compliance-gate check (client-side mirror).
 * Hard enforcement lives server-side: DB trigger in
 * supabase/migrations/0003_catalog_gate.sql + Edge Function
 * supabase/functions/compliance-gate-check.
 */
export async function isComplianceGateCleared(brandId: string): Promise<boolean> {
  return (await evaluateBrandCatalogGate(brandId)).cleared;
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
  /** §Phase E3 — TRUE whenever no live provider could have been reached. */
  simulated?: boolean;
  /** §Phase E3 — the canonical submission record created by this call. */
  submission?: ProductSubmission;
}

/**
 * §10 step 1 — brand submits a product. Validated against the compliance
 * gate BEFORE anything is transformed/submitted to retail channels.
 *
 * §Phase E3 — on success this now RECORDS the resulting submission in the
 * canonical catalog store (idempotent by brand + sku), so the product's
 * resulting state is observable by the brand, by the admin catalog and by every
 * existing consumer of `fetchCatalogSubmissions()`. Before E3 the tracking id
 * was discarded and the "persist" branch wrote to a `catalog_submissions` table
 * that no migration ever created — a write that could never have run. Durable
 * persistence is owned by the E3 lifecycle, through the D4 port.
 */
export async function submitCatalogItem(
  brandId: string,
  product: Record<string, unknown>
): Promise<CatalogSubmissionResult> {
  // Required-field validation (§10 pipeline prerequisites). The prerequisite
  // list is the ONE canonical definition, shared with the completeness that the
  // brand is shown BEFORE submitting — the two can no longer disagree.
  const missingFields = REQUIRED_SUBMISSION_FIELDS.filter(
    (f) => product[f] === undefined || product[f] === null || product[f] === ''
  );
  if (missingFields.length > 0) {
    return {
      ok: false,
      reason: `Missing required fields: ${missingFields.join(', ')}`,
      missing: [...missingFields],
    };
  }

  // §Phase E3 — the gate inputs are resolved in exactly one place.
  const evaluation = await evaluateBrandCatalogGate(brandId);
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

  // §Phase E3 — truthful provenance: 'mock' means NO live call occurred.
  const simulated = mode === 'mock';
  const sku = typeof product.sku === 'string' ? product.sku : '';
  const submission = sku
    ? recordCatalogSubmission({
        brandId,
        productId: typeof product.id === 'string' ? product.id : `prd-${brandId}-${sku}`,
        productName: typeof product.name === 'string' ? product.name : sku,
        sku,
        submissionId: spResult.submissionId ?? '',
        mode,
        simulated,
      })
    : undefined;

  return { ok: true, submissionId: spResult.submissionId, mode, simulated, submission };
}

/**
 * §10 step 3 — poll a catalog submission through the same mock/real seam.
 * Mock advances Submitted → Under Amazon Review → Live (every 4th rejects).
 */
export async function pollSubmissionStatus(submissionId: string): Promise<{
  ok: boolean;
  status?: CatalogSubmissionStatus;
  rejectionReason?: string;
  /** §P8 — the channel's identifier once it accepts the product (decision 10). */
  asin?: string;
  error?: string;
}> {
  const { client } = createSPApiClientForConnection({
    credentials: spApiConnectionCredentials(),
    edgeFunctionBase: '/functions/v1/spapi',
  });
  return client.getSubmissionStatus(submissionId);
}

/**
 * §10 step 4 / §P11 — POs received from the retail channel.
 *
 * §P11 — REPOINTED (old contract recorded): this read previously returned only
 * `{ purchaseOrderId, poValue }`, which nothing could be ROUTED by. It now
 * returns the channel's own PO payload, which is what the ingestion owner needs
 * (decision 3: the PO is addressed to Mercenta; the brand is identified from it).
 * Mock-first: the MockAmazon client rotates a pool until real credentials exist.
 */
export async function fetchSpApiPurchaseOrders(
  sinceIso: string
): Promise<ChannelPurchaseOrderReadResult> {
  const { client } = createSPApiClientForConnection({
    credentials: spApiConnectionCredentials(),
    edgeFunctionBase: '/functions/v1/spapi',
  });
  return client.fetchPurchaseOrders(sinceIso);
}

/**
 * §P11 — INGEST purchase orders from the retail channel into the canonical store.
 *
 * The ONLY way a purchase order enters Mercenta (decision 3): there is no
 * "Create PO" anywhere. The channel's PO is addressed to Mercenta; the routing
 * owner identifies the brand from the PO's own lines and files it in that
 * brand's workspace, refusing anything it cannot route.
 *
 * The catalogue supplied for routing is the platform's OWN canonical catalogue
 * (one source of truth for SKUs) — never a second list.
 */
export async function ingestChannelPurchaseOrders(input: {
  /** The Mercenta operator performing the read (attribution + audit). */
  actorId: string;
  /** Only POs received since this instant are read. */
  sinceIso?: string;
}): Promise<ChannelIngestionResult> {
  const { client, mode } = createSPApiClientForConnection({
    credentials: spApiConnectionCredentials(),
    edgeFunctionBase: '/functions/v1/spapi',
  });
  const since = input.sinceIso ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  return ingestChannelPurchaseOrdersFromChannel({
    reader: client,
    catalogue: demoProducts.map((p) => ({ sku: p.sku, brandId: p.brandId })),
    sinceIso: since,
    actorId: input.actorId,
  }).then((result) => ({ ...result, mode }));
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

/**
 * §Phase E2E — ISSUE the canonical distribution agreement for a tenant.
 *
 * Operator action required by the compliance gate: `evaluateComplianceGate`
 * counts a signed/active distribution agreement as a gate input, and a tenant
 * created through the real onboarding path had no way to obtain one. This wraps
 * the ONE canonical contract store — no second contract system, no second gate
 * input. Idempotent by deterministic contract id.
 */
export function issueDistributionAgreement(input: {
  brandId: string;
  signatoryName: string;
  signatoryEmail: string;
  commissionRate?: number;
  monthlyFee?: number;
  fulfillmentTrack?: FulfillmentTrack;
  effectiveDate?: string;
  renewalDate?: string;
}): Contract {
  const effectiveDate = input.effectiveDate ?? '2026-09-01';
  const renewalDate = input.renewalDate ?? '2027-09-01';
  const contract = storeEnsureDistributionAgreement({
    brandId: input.brandId,
    signatoryName: input.signatoryName,
    signatoryEmail: input.signatoryEmail,
    commissionRate: input.commissionRate ?? COMMISSION_RATE_PLACEHOLDER,
    monthlyFee: input.monthlyFee ?? MONTHLY_FEE_PLACEHOLDER_GBP,
    fulfillmentTrack: input.fulfillmentTrack ?? 'direct_fulfillment',
    effectiveDate,
    renewalDate,
  });
  demoAuditLog.push({
    id: `audit-contract-issued-${input.brandId}`,
    createdAt: new Date().toISOString(),
    actorId: 'staff-001',
    action: 'distribution_agreement_issued',
    entityType: 'contract',
    entityId: contract.id,
    brandId: input.brandId,
    reason: `Distribution agreement ${contract.id} issued (${contract.status}) — commission ${contract.commissionRate}%, monthly fee £${contract.monthlyFee}.`,
  });
  notifyCanonicalStoreChange();
  return contract;
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
  // §Phase D6 — the LIVE projection (derives accrual from the canonical PO store),
  // so a PO accepted at runtime accrues a payout instead of the ledger being a
  // frozen module-load snapshot.
  return queryOrSeed<Commission>('commissions', listCommissionsForPayout());
}

/* ── §Phase D6 — brand payout settlement (the seam's ONLY call site) ───── */

/**
 * Clearly-fake Stripe Connect destination (mock-first policy). A real
 * `acct_…` value only ever appears when a verified non-mock secret is supplied,
 * so a simulated transfer can never look like a live one.
 */
export const MOCK_CONNECT_DESTINATION = 'acct_mock_XX-PENDING-STRIPE-CONNECT';

export interface SettlePayoutResult {
  ok: boolean;
  /** Which implementation actually ran — reported so no UI can claim "live". */
  mode: 'mock' | 'real';
  transferId?: string;
  netShareGbp?: number;
  error?: string;
}

/**
 * Settle ONE pending brand payout through the EXISTING seam:
 * `createPayoutClient` → `settleCommission` → canonical store write + audit.
 *
 * Before this, `settleCommission` had ZERO call sites and the Accounting screen
 * hardcoded "No pending payouts", so a commission could never leave
 * `accrued`/`invoiced`. Nothing new is invented here: the fee maths, the
 * double-payout guard and the mock/real factory all live in
 * `lib/billing/payouts.ts`; this wires them to the canonical commission store.
 *
 * Commissions have no Supabase table yet (documented in PRODUCTION_READINESS.md),
 * so the canonical store + the canonical audit log are the persistence; the
 * audit row is written only after the transfer client reports success.
 */
export async function settleBrandPayout(
  commissionId: string,
  actorId = 'admin',
  credentials: { secretRef: string; verified: boolean } | null = null
): Promise<SettlePayoutResult> {
  const commission = getCommission(commissionId);
  if (!commission) {
    return { ok: false, mode: 'mock', error: `commission ${commissionId} not found` };
  }

  // ── §M6 — THE CANONICAL ELIGIBILITY GATE ────────────────────────────────
  // A payout may only be submitted when the payment has actually been RECEIVED
  // and RECONCILED to this PO, no deduction on the PO is unresolved, and the
  // destination account is VERIFIED. The payout identity is created here so a
  // refusal is recorded as a blocked payout, not silence.
  const eligibility = evaluatePayoutEligibility(commissionId);
  const payoutRecord = eligibility.payout ?? ensureCommissionPayout(commission, eligibility.reconciliation);
  if (!eligibility.eligible) {
    const blockedReason = eligibility.blockers.join('; ');
    // A refusal may only mark the payout as blocked while it is still in the
    // pre-submission states. A settled/submitted payout is NEVER downgraded by a
    // later refusal (that would corrupt the money record).
    if (payoutRecord.state === 'pending' || payoutRecord.state === 'eligible' || payoutRecord.state === 'failed') {
      payoutRecord.state = 'pending';
    }
    payoutRecord.blockedReason = blockedReason;
    recordCommerceAudit(
      'brand_payout_blocked',
      commissionId,
      commission.brandId,
      `Payout refused for ${commissionId}: ${blockedReason}`,
      actorId,
      { commissionId, blockers: eligibility.blockers, payoutState: payoutRecord.state }
    );
    return { ok: false, mode: 'mock', error: `PAYOUT_BLOCKED — ${blockedReason}` };
  }
  markPayoutSubmitted(commissionId);

  const { data: brands } = await fetchBrands();
  const fulfillmentTrack = normalisePayoutTrack(
    brands.find((b) => b.id === commission.brandId)?.track ?? 'financed'
  );
  const client = createPayoutClient(credentials);
  const ratePct = resolveCommissionRatePct({
    commissionRate: commission.commissionRate,
    commissionAmount: commission.commissionAmount,
    poValue: commission.poValue,
  });

  const result = await settleCommission(
    {
      id: commission.id,
      brandId: commission.brandId,
      poValue: commission.poValue,
      commissionRate: ratePct,
      status: commission.status,
    },
    {
      fulfillmentTrack,
      destinationAccountId: MOCK_CONNECT_DESTINATION,
      client,
      markPaid: async (id) => {
        // Only the status mutation — the audit row is written after success.
        markCommissionPaidInStore(id);
      },
    }
  );

  if (!result.ok) {
    // §M6 — a declined/failed payout is recorded as FAILED, stays unpaid, and is
    // retryable. Nothing is marked paid.
    const failureReason = result.error ?? 'payout refused';
    markPayoutFailed(commissionId, failureReason);
    recordCommerceAudit(
      'brand_payout_failed',
      commissionId,
      commission.brandId,
      `Payout failed for ${commissionId} (${client.mode}) — ${failureReason}; the commission remains unpaid and the payout is retryable`,
      actorId,
      { commissionId, mode: client.mode, failureReason }
    );
    return { ok: false, mode: client.mode, error: failureReason };
  }

  markPayoutSettled(commissionId, result.transferId ?? '', client.mode);

  const reason = result.netShareGbp !== undefined
    ? `simulated brand payout — net £${result.netShareGbp.toFixed(2)} via transfer ${result.transferId} (${client.mode})`
    : `simulated brand payout via transfer ${result.transferId} (${client.mode})`;
  const audit: AuditLogEntry = {
    id: `audit-payout-${commission.id}`,
    createdAt: new Date().toISOString(),
    actorId,
    action: 'commission_payout_settled',
    entityType: 'commission',
    entityId: commission.id,
    brandId: commission.brandId,
    reason,
    metadata: {
      transferId: result.transferId ?? null,
      mode: client.mode,
      netShareGbp: result.netShareGbp ?? null,
      commissionRatePct: ratePct,
      // §M6 — every payout is traceable back to the money it pays out.
      reconciliationId: eligibility.reconciliation?.id ?? null,
      paymentId: eligibility.reconciliation?.paymentId ?? null,
      purchaseOrderNumber: commission.purchaseOrderId,
      destinationId: eligibility.destination?.id ?? null,
      destinationVerified: eligibility.destination?.status === 'verified',
      vatTreatment: eligibility.reconciliation?.fact.vatTreatment ?? 'configuration_required',
      vatConfigured: eligibility.reconciliation?.fact.vatConfigured ?? false,
    },
  };
  demoAuditLog.push(audit);

  if (supabase) {
    void (async () => {
      try {
        const brandUuid = await _toBrandUuid(commission.brandId);
        const res = await supabase.from('audit_log').insert({
          actor_id: actorId,
          action: audit.action,
          entity_type: audit.entityType,
          entity_id: audit.entityId,
          brand_id: brandUuid,
          reason: audit.reason,
          metadata: audit.metadata,
        });
        if (res.error) console.warn('[api] Supabase write failed for "audit_log" (payout):', res.error.message);
      } catch (err) {
        console.warn('[api] Supabase write failed for "audit_log" (payout):', err);
      }
    })();
  }

  notifyCanonicalStoreChange();
  return { ok: true, mode: client.mode, transferId: result.transferId, netShareGbp: result.netShareGbp };
}

/* ── §9 Messages ── */
export function fetchMessages() {
  return queryOrSeed<Message>('messages', demoMessages);
}

/* ── §12 Ad spend ── */
export function fetchAdSpendBudgets() {
  return queryOrSeed<AdSpendBudget>('ad_spend_budgets', demoAdSpend);
}

/* ── §Functional-completion — Advertising depth (simulation) ──────── */

export function fetchAdCampaigns() {
  return queryOrSeed<AdCampaign>('ad_campaigns', demoAdCampaigns);
}

export function fetchAdSpendRecommendations() {
  return queryOrSeed<AdSpendRecommendation>('ad_spend_recommendations', demoAdSpendRecommendations);
}

/**
 * Manual monthly-budget input (admin, Super-only surface). Mutates the
 * shared store so every surface reflects it immediately; Supabase write
 * happens only when configured. Attributed + audited in the store.
 */
export async function setAdSpendBudget(
  brandId: string,
  monthlyBudgetGbp: number,
  actorId: string
): Promise<{ ok: boolean; budget?: AdSpendBudget; error?: string }> {
  const result = storeSetAdSpendBudgetForBrand(brandId, monthlyBudgetGbp, actorId);
  if (!result.ok || !result.budget) return result;
  if (supabase) {
    const { error } = await supabase
      .from('ad_spend_budgets')
      .upsert({ brand_id: brandId, monthly_budget_gbp: monthlyBudgetGbp, status: 'active' })
      .eq('brand_id', brandId);
    if (error) console.warn('[api] Supabase write failed for "ad_spend_budgets", using demo fallback:', error.message);
  }
  return result;
}

/**
 * Brand (or admin-on-behalf) decision on a Mercenta-prepared budget
 * recommendation. One-shot state transition; Supabase write when configured.
 */
export async function reviewAdSpendRecommendation(
  id: string,
  decision: 'approved' | 'amended' | 'rejected',
  opts: { amendedBudgetGbp?: number; note?: string; actorId?: string } = {}
): Promise<{ ok: boolean; recommendation?: AdSpendRecommendation; error?: string }> {
  const result = storeReviewAdSpendRecommendation(id, decision, opts);
  if (!result.ok || !result.recommendation) return result;
  if (supabase) {
    const { error } = await supabase
      .from('ad_spend_recommendations')
      .update({
        status: result.recommendation.status,
        reviewed_at: result.recommendation.reviewedAt,
        amended_budget_gbp: result.recommendation.amendedBudgetGbp,
      })
      .eq('id', id);
    if (error) console.warn('[api] Supabase write failed for "ad_spend_recommendations", using demo fallback:', error.message);
  }
  return result;
}

/* ── §Functional-completion — Listing Analyzer reviews (simulation) ── */

/**
 * Brand decision on a Mercenta-suggested listing improvement. One shot;
 * audited. Supabase write only when configured (RLS-scoped by brand).
 */
export async function reviewListingRecommendation(
  brandId: string,
  recommendationId: string,
  action: 'approved' | 'edited' | 'rejected',
  opts: { editedCopy?: string; note?: string; actorId?: string } = {}
): Promise<{ ok: boolean; error?: string }> {
  const result = storeSetListingRecommendationReview(brandId, recommendationId, action, opts);
  if (result.ok && supabase) {
    const { error } = await supabase
      .from('listing_recommendation_reviews')
      .upsert({
        brand_id: brandId,
        recommendation_id: recommendationId,
        status: action,
        edited_copy: opts.editedCopy,
      });
    if (error) console.warn('[api] Supabase write failed for "listing_recommendation_reviews", using demo fallback:', error.message);
  }
  return { ok: result.ok, error: result.error };
}

/** Overlay the brand's stored decisions onto an engine analysis. */
export function applyListingReviewOverrides(
  analysis: import('@/types').ProductListingAnalysis,
  brandId: string
): import('@/types').ProductListingAnalysis {
  return storeApplyListingReviewOverrides(analysis, brandId);
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
 * Creates the shipment record in the shared store (visible instantly in the
 * admin Logistics Control workspace) and advances the PO.
 * §P9 repoint: the old contract named the 3PL Carrier Terminal, which is removed.
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
): { ok: boolean; error?: string; warnings?: string[]; instructionId?: string } {
  const po = demoPurchaseOrders.find((p) => p.id === poId);
  if (!po) return { ok: false, error: `Unknown purchase order: ${poId}` };

  /**
   * §WAVE 3 — DUPLICATE ACKNOWLEDGEMENT REFUSED.
   * Acknowledging twice would let a second submission rewrite a line that was
   * already rejected, which is exactly the contradictory state
   * `docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md → AV-007` forbids.
   */
  if (po.acknowledgedAt) {
    return {
      ok: false,
      error: `PO ${po.poNumber} has already been acknowledged — a duplicate acknowledgement is refused.`,
    };
  }

  const warnings: string[] = [];

  /**
   * §WAVE 3 — FAIL-CLOSED PRE-PASS.
   *
   * The channel's per-line backorder permission (`isBackOrderAllowed`) and the
   * permanence of a rejection (AV-007) are checked BEFORE any line is mutated, so
   * a refused submission leaves the purchase order byte-for-byte unchanged.
   */
  for (const line of po.lineItems) {
    const ack = lineAcks.find((a) => a.sku === line.sku);
    if (!ack || ack.ackStatus === 'unacknowledged') continue;

    const backOrderReason = backOrderBlockedReason(line);
    if (ack.ackStatus === 'backordered' && backOrderReason) {
      return { ok: false, error: backOrderReason };
    }
    const transitionRefusal = ackStatusTransitionRefusal(line, ack.ackStatus);
    if (transitionRefusal) {
      return { ok: false, error: transitionRefusal };
    }
  }

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

  /**
   * §P4 — THE BRAND'S DECISION BECOMES AN INSTRUCTION TO MERCENTA.
   *
   * §P4 REPLACED THE AUTO-SHIPMENT DRAFT. That block created a shipment draft
   * titled "... Brand must add carton details" and hardcoded `carrier: 'dhl'` /
   * `destination: 'Mercenta UK Hub'`, which presented the channel steps as the
   * BRAND's work and left the direction of the proxy model unrecorded
   * (`.clinerules/mercenta-business-model.md`). Under the proxy model the brand
   * issues an INSTRUCTION and **MERCENTA** raises the routing/shipment request
   * and files the ASN (`src/lib/commerce/proxyProcessor.ts`) — so the real
   * consignment is created by Mercenta's processing and a PO no longer ends up
   * with both a draft and a filed shipment.
   *
   * §P5 CONTINUED THE SAME CORRECTION one layer down: the draft also hardcoded
   * `destination: 'Mercenta UK Hub'`; the destination is now read from the PO's own
   * ship-to party in `createShipmentForPO` (see the note there).
   *
   * This writer is deliberately synchronous and touches nothing else: the
   * channel action is Mercenta's, and the caller (the brand surface or
   * `src/lib/commerce/commerceLifecycle.ts`) then begins Mercenta's processing.
   */
  let instructionId: string | undefined;
  const issued = issueChannelInstruction({
    type: 'po_acknowledgement',
    brandId: po.brandId,
    purchaseOrderId: po.id,
    poNumber: po.poNumber,
    issuedBy: actorStaffId ?? po.brandId,
    /** The decision is recorded VERBATIM from the PO's own acknowledged state. */
    lines: po.lineItems.map((l) => instructionLineFor(po, l)),
  });
  if (issued.ok && issued.instruction) instructionId = issued.instruction.id;
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
    /**
     * §P4 — the wording states the corrected direction: the brand ISSUED an
     * instruction; Mercenta performs the channel acknowledgement, the routing
     * request and the ASN filing.
     */
    reason:
      `${actorLabel}: ${acceptedLines.length}/${po.lineItems.length} lines accepted/backordered, ` +
      `${rejectedLines.length} rejected — decision issued to Mercenta as an INSTRUCTION` +
      `${instructionId ? ` (${instructionId})` : ''}. Mercenta performs the channel action.`,
    metadata: {
      actorLabel,
      acceptedLines: acceptedLines.map((l) => l.sku),
      rejectedLines: rejectedLines.map((l) => l.sku),
      instructionId,
      direction: 'brand → Mercenta → retail channel',
    },
  });

  notifyCanonicalStoreChange();
  return { ok: true, warnings: warnings.length > 0 ? warnings : undefined, instructionId };
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

/*
 * §P11 — REMOVED: "Create PO" (admin on-behalf purchase-order creation).
 *
 * Programme decision 3: ONE PO record = the PO from Amazon. Mercenta never
 * creates a purchase order, so `createPurchaseOrder` and the Postmark
 * notification it fired are gone. The ONLY way a PO enters the platform is now
 * CHANNEL INGESTION (`ingestChannelPurchaseOrders` below, owning
 * `src/lib/commerce/channelPurchaseOrderIngestion.ts`).
 *
 * Old contract recorded (was asserted by validate-e4 S1, validate-e5 J2 and
 * validate-e6 F2, and deliberately REPOINTED rather than weakened):
 * "createPurchaseOrder STILL performs its real notification — `export function
 * createPurchaseOrder(` present in api.ts AND `sendPostmarkEmail` present in
 * api.ts". Both are now required to be ABSENT.
 */

/**
 * §Phase E4 — SIMULATION-SAFE operational purchase-order creation.
 *
 * The operational commerce simulation must NEVER send an email and must never
 * contact a live provider. §P11 — REPOINTED (old contract recorded): this used
 * to be described as "a SEPARATE path from `createPurchaseOrder` (whose real
 * Postmark behaviour is deliberately left untouched)". `createPurchaseOrder` no
 * longer exists (decision 3), so this path is now simply the SIMULATION-ONLY
 * way the scenario engine models a channel PO arriving; a real PO enters
 * through `ingestChannelPurchaseOrders`. Everything else — the canonical
 * `PurchaseOrder` shape, the deterministic id, the audit entry — is unchanged,
 * and the record is EXPLICITLY marked `mode: 'simulation'`.
 *
 * IDEMPOTENT: replaying the same (brandId, product) returns the existing PO
 * instead of creating a duplicate.
 */
export function createSimulatedPurchaseOrder(
  brandId: string,
  lineItems: { sku: string; productName: string; quantity: number; unitPrice: number; commodityCode: string }[],
  originProductId?: string,
  actorStaffId?: string
): { ok: true; po: PurchaseOrder; created: boolean } | { ok: false; error: string } {
  if (lineItems.length === 0) {
    return { ok: false, error: 'A purchase order needs at least one line.' };
  }

  const brand = demoBrands.find((b) => b.id === brandId);
  const brandName = brand?.profile.businessName ?? brandId;
  const deterministicKey = originProductId ?? lineItems[0].sku;
  const poNumber = `PO-SIM-${brandId}-${deterministicKey}`.toUpperCase();

  const existing = demoPurchaseOrders.find((p) => p.poNumber === poNumber);
  if (existing) return { ok: true, po: existing, created: false };

  const now = new Date();
  const totalValue = lineItems.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
  const po: PurchaseOrder = {
    id: `po-sim-${brandId}-${deterministicKey}`,
    brandId,
    poNumber,
    status: 'received',
    poValue: Math.round(totalValue * 100) / 100,
    commissionRate: 0.07,
    commissionAmount: Math.round(totalValue * 0.07 * 100) / 100,
    orderDate: now.toISOString(),
    /** §P5 — the simulated channel PO declares its destination FC (canonical directory). */
    shipToParty: declaredShipToParty(brandId.length + deterministicKey.length),
    lineItems: lineItems.map((l) => ({
      sku: l.sku,
      productName: l.productName,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      commodityCode: l.commodityCode,
    })),
    mode: 'simulation',
    simulated: true,
    originProductId,
  };
  demoPurchaseOrders.push(po);

  const actorLabel = actorStaffId
    ? `${actorStaffId} (admin on behalf of ${brandName})`
    : `${brandName} (self)`;
  demoAuditLog.push({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now.toISOString(),
    actorId: actorStaffId ?? brandId,
    action: 'po_created',
    entityType: 'purchase_order',
    entityId: po.id,
    brandId,
    reason: `${actorLabel}: SIMULATED PO ${poNumber} created for ${brandName} — ${lineItems.length} line(s), GBP ${po.poValue.toFixed(2)}. No email sent; no live provider contacted.`,
    metadata: { actorLabel, lineCount: lineItems.length, poValue: po.poValue, mode: 'simulation', simulated: true },
  });
  notifyCanonicalStoreChange();
  return { ok: true, po, created: true };
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
  actorStaffId?: string,
  /**
   * §Canonical model §10/§8 — the brand tenant the caller is acting for. When
   * provided (brand self-service), the PO MUST belong to it: a brand can never
   * create a shipment against another tenant's PO. Admin (omitting it) retains
   * the documented cross-tenant override, which is still attribution-stamped.
   */
  actingBrandId?: string
): { ok: boolean; shipmentId?: string; warnings: string[]; deductionId?: string; error?: string } {
  const warnings: string[] = [];
  const po = demoPurchaseOrders.find((p) => p.id === poId);
  if (!po) return { ok: false, warnings, error: `Unknown purchase order: ${poId}` };
  if (actingBrandId && po.brandId !== actingBrandId) {
    return {
      ok: false,
      warnings,
      error: `Purchase order ${po.poNumber} does not belong to this brand — a shipment can only be derived from your own eligible PO.`,
    };
  }

  // §11 — carrier is decided by the canonical routing rule, not by free choice.
  const brand = demoBrands.find((b) => b.id === po.brandId);
  const carrierCheck = validateCarrierForShipment({
    carrier: asn.carrier,
    brandNation: brand?.nation,
    freightTerm: po.freightTerm,
  });
  if (!carrierCheck.ok) {
    return { ok: false, warnings, error: carrierCheck.error };
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
      /** §Logistics-map — placeholder 'Origin depot' replaced by the brand's declared nation. */
      origin: originForBrand(brand),
      /**
       * §P5 — THE DESTINATION IS THE FC ON THE PO.
       *
       * §P5 REPOINTED THIS (old contract, for the record): it was the literal
       * `'Mercenta UK Hub'`, which made a Mercenta-owned site the destination of
       * every consignment even though no channel source requires one (matrix
       * `D09-13`, register `AV-026`/`AV-027`, decision `T-4`). The destination now
       * comes from the PO's own ship-to party — the channel's `shipToPartyId`,
       * which IS the FC code (register `S5`) — through the ONE owner,
       * `src/config/destinationFc.ts`. A PO that declares no ship-to party records
       * the explicit not-declared string and the map draws a schematic leg; it is
       * never defaulted to a Mercenta site.
       */
      destination: destinationLabelForPo(po),
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
    reason: 'ASN auto-generated for PO ' + po.poNumber + ', shipment ' + shipmentId + '. Would be pushed to the live retail-channel API once the integration is connected.',
    metadata: { poNumber: po.poNumber, shipmentId: shipmentId, carrier: asn.carrier },
  });
  notifyCanonicalStoreChange();
  return { ok: true, shipmentId, warnings, deductionId };
}

/* ── Shipments across every carrier (admin logistics control) ── */

/**
 * §WAVE 3 — THE CANONICAL SHIPMENT ETA PROJECTION.
 *
 * ONE derivation point for every consignment read. The ETA is derived from the
 * consignment's own canonical record — the applicable PO window (delivery window
 * for prepaid, ship window for collect) plus the recorded delay/exception state
 * — and it always carries its basis, so a derived estimate can never be read as
 * a carrier confirmation. A consignment whose PO declares no window gets
 * `unavailable`; a date is never invented.
 */
export function attachShipmentEta(shipment: DemoShipment): DemoShipment & { eta: ShipmentEta } {
  const po = demoPurchaseOrders.find((p) => p.poNumber === shipment.poNumber);
  const windowKind = etaWindowKindFor(po?.freightTerm ?? null);
  const windowEnd =
    windowKind === 'delivery' ? (po?.deliveryWindowEnd ?? null) : (po?.shipWindowEnd ?? null);
  return {
    ...shipment,
    eta: deriveShipmentEta({
      status: shipment.status,
      stage: (po?.status ?? '') as string,
      windowEnd,
      windowKind,
      delayed: shipment.delayed,
      exception: shipment.exception,
      simulated: true,
    }),
  };
}

export async function fetchShipmentsAll() {
  const result = await queryOrSeed('shipments', demoShipments);
  return { ...result, data: result.data.map(attachShipmentEta) };
}

export function fetchShipmentsForBrand(brandId: string) {
  return demoShipments.filter((s) => s.brandId === brandId).map(attachShipmentEta);
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
  notifyCanonicalStoreChange();
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
  evidence?: { fileUrl?: string; reference?: string; issuer?: string; expiryDate?: string },
): { docId: string; verificationRecordId?: string } {
  const type = documentType as ComplianceDocument['type'];
  // §M2 — a submission acts on the LATEST version of the requirement, never on
  // an older superseded record.
  const latest = latestDocumentsByType(demoComplianceDocs.filter((d) => d.brandId === brandId));
  let doc = latest.get(type);

  if (!doc) {
    const brandSlug = brandId.replace(/^brand-/, '');
    doc = {
      id: `doc-${brandSlug}-${type}-v1`,
      brandId,
      type,
      status: 'uploaded',
      version: 1,
      verificationStatus: 'not_requested',
    };
    demoComplianceDocs.push(doc);
  }

  // §M2 — evidence attached to the submission. When no real artefact is
  // supplied this records nothing structural, so an automated verification can
  // only fail — it can never pass a document that does not exist.
  if (evidence) {
    if (evidence.fileUrl) doc.fileUrl = evidence.fileUrl;
    if (evidence.reference) doc.reference = evidence.reference;
    if (evidence.issuer) doc.issuer = evidence.issuer;
    if (evidence.expiryDate) doc.expiryDate = evidence.expiryDate;
  }

  // §M2 — submission ≠ verdict: the document moves to under_review and a
  // `pending` verification record is opened. The gate stays BLOCKED.
  const submitted = submitDocumentForVerification(doc.id, {
    staffId: actingStaffId,
    canMutate: true,
  });
  return {
    docId: doc.id,
    ...(submitted.ok ? { verificationRecordId: submitted.value.id } : {}),
  };
  notifyCanonicalStoreChange();
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

/**
 * §Phase E3 — reads the CANONICAL catalog-submission store.
 *
 * The store is the live, mutable collection the submission seam writes to, so a
 * brand's real submission is immediately visible on the admin surfaces. Before
 * E3 this returned a snapshot of six read-only derived fixture rows that no
 * code path could ever add to.
 */
export function fetchCatalogSubmissions() {
  return queryOrSeed<ProductSubmission>('catalog_submissions', [...demoProductSubmissions]);
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
      /**
       * §UI/UX Wave 2 completion — REAL DEFECT FIXED. This used to return the raw
       * persisted payload. Migration 001 seeds `homepage_content` as
       * `'{}'::jsonb`, and `Home` reads the content model UNGUARDED, so a
       * Supabase-configured deployment rendered the public homepage from `{}`
       * and threw. The persisted payload is now normalised onto the canonical
       * model at this single seam, so a partial/legacy row can never produce a
       * partial render (see `normaliseHomepageContent`).
       */
      return {
        live: normaliseHomepageContent(data.content),
        draft: homepageState.draft ? normaliseHomepageContent(homepageState.draft) : null,
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
  notifyCanonicalStoreChange();
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
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';
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
