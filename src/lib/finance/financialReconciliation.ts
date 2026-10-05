/**
 * §M6 — CANONICAL FINANCIAL RECONCILIATION.
 *
 *   retail-channel payment → PO/invoice reconciliation → accounting
 *   representation → payout eligibility → brand payout
 *
 * Built on the EXISTING money model — no parallel money store:
 *   - the PO store is the source of the value and the commission;
 *   - `listCommissionsForPayout()` is the payable projection of that store;
 *   - `lib/billing/payouts.ts` owns the transfer seam, the fee maths and the
 *     double-payout guard;
 *   - this module adds the missing IDENTITY (`rec-…`, `payout-…`, `dest-…`) and
 *     the reconciliation / eligibility / payout STATE MACHINE.
 *
 * Deterministic and auditable: every step writes a canonical record and an audit
 * row, and no step assumes that a payment belongs to a PO.
 */

import type {
  BrandPayoutDestination,
  CommerceInvoice,
  CommercePayment,
  Commission,
  CommissionPayout,
  Deduction,
  PaymentReconciliation,
  PayoutState,
  VatTreatment,
} from '@/types';
import {
  demoBrands,
  demoCommercePayments,
  demoDeductions,
  demoPayoutDestinations,
  demoPayouts,
  demoPurchaseOrders,
  demoReconciliations,
  getCommerceInvoice,
  getCommercePaymentsForInvoice,
  listCommissionsForPayout,
  recordCommerceAudit,
} from '@/data/demoStore';
import {
  VAT_RATE_PCT_PLACEHOLDER,
  VAT_TREATMENT,
  VAT_TREATMENT_CONFIGURED,
} from '@/config/commercial';
import {
  computeBrandNetShare,
  FINANCED_FULFILMENT_FEE_PLACEHOLDER_GBP,
  normalisePayoutTrack,
  resolveCommissionRatePct,
} from '@/lib/billing/payouts';
import { defaultIntegrationMode } from '@/integrations/registry';
import type { ProviderResolutionMode } from '@/integrations/types';
import { selectAccountingClient } from './accountingSeam';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';

const round2 = (n: number) => Math.round(n * 100) / 100;

export type FinanceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface FinanceActor {
  staffId: string;
  canMutate: boolean;
  /** When present, the acting brand tenant — cross-tenant access is refused. */
  tenantId?: string;
}

/* ── VAT — resolved from the ONE configuration seam, never invented ──────── */

export interface VatResolution {
  treatment: VatTreatment;
  configured: boolean;
  /** The rate when the configured treatment is a rated one. */
  ratePct?: number;
}

export function resolveVatTreatment(): VatResolution {
  if (!VAT_TREATMENT_CONFIGURED) return { treatment: 'configuration_required', configured: false };
  const rated = VAT_TREATMENT === 'standard_20';
  return {
    treatment: VAT_TREATMENT,
    configured: true,
    ...(rated ? { ratePct: VAT_RATE_PCT_PLACEHOLDER } : {}),
  };
}

/**
 * The VAT amount for an amount, ONLY when a treatment has actually been
 * configured. An unconfigured treatment returns `undefined` — the platform does
 * not guess a production tax figure.
 */
export function vatAmountFor(amountGbp: number): number | undefined {
  const vat = resolveVatTreatment();
  if (!vat.configured || vat.ratePct === undefined) return undefined;
  return round2((amountGbp * vat.ratePct) / 100);
}

/* ── Read models (single source of truth for every surface) ──────────────── */

export function getReconciliationForPayment(paymentId: string): PaymentReconciliation | undefined {
  return demoReconciliations.find((r) => r.paymentId === paymentId);
}

export function getReconciliationForPo(poId: string): PaymentReconciliation | undefined {
  return demoReconciliations.find((r) => r.purchaseOrderId === poId);
}

export function listReconciliationsForBrand(brandId: string): PaymentReconciliation[] {
  return demoReconciliations.filter((r) => r.brandId === brandId);
}

export function listAllReconciliations(): PaymentReconciliation[] {
  return [...demoReconciliations];
}

export function listPayoutsForBrand(brandId: string): CommissionPayout[] {
  return demoPayouts.filter((p) => p.brandId === brandId);
}

export function listAllPayouts(): CommissionPayout[] {
  return [...demoPayouts];
}

export function getPayoutForCommission(commissionId: string): CommissionPayout | undefined {
  return demoPayouts.find((p) => p.commissionId === commissionId);
}

export function getDestinations(): BrandPayoutDestination[] {
  return [...demoPayoutDestinations];
}

export function getDestinationForBrand(brandId: string): BrandPayoutDestination | undefined {
  return demoPayoutDestinations.find((d) => d.brandId === brandId);
}

export function getCommission(commissionId: string): Commission | undefined {
  return listCommissionsForPayout().find((c) => c.id === commissionId);
}

function brandNameFor(brandId: string): string {
  return demoBrands.find((b) => b.id === brandId)?.profile.businessName ?? brandId;
}

function fulfilmentTrackFor(brandId: string): 'direct_fulfillment' | 'financed' {
  return normalisePayoutTrack(demoBrands.find((b) => b.id === brandId)?.track ?? 'financed');
}

/** Deductions on a PO that are NOT yet resolved — these block a payout. */
export function unresolvedDeductionsForPo(poNumber: string): Deduction[] {
  return demoDeductions.filter(
    (d) => d.purchaseOrderId === poNumber && (d.status === 'open' || d.status === 'disputed')
  );
}

/** Deductions on a PO that the brand must bear (accepted or resolved). */
export function appliedDeductionsForPo(poNumber: string): Deduction[] {
  return demoDeductions.filter(
    (d) => d.purchaseOrderId === poNumber && (d.status === 'accepted' || d.status === 'resolved')
  );
}


/* ── Reconciliation ──────────────────────────────────────────────────────── */

export interface ReconcileOptions {
  getMode?: (providerId: string) => ProviderResolutionMode;
  /** Which provider this posting is attributed to (default: xero). */
  providerKey?: string;
  /**
   * The caller's asserted PO number for this payment. When supplied and it does
   * not match the payment's recorded PO, the reconciliation is an EXCEPTION —
   * a payment is never re-pointed at a PO by assumption.
   */
  confirmPurchaseOrderNumber?: string;
}

/**
 * Reconcile a RECEIVED payment to the PO/invoice identity it belongs to.
 *
 * Deterministic and idempotent: one payment produces exactly ONE reconciliation
 * (`rec-<paymentId>`); a second call returns the existing record and performs no
 * further accounting posting.
 */
export async function reconcilePayment(
  paymentId: string,
  actor: FinanceActor,
  opts: ReconcileOptions = {}
): Promise<FinanceResult<PaymentReconciliation>> {
  if (!actor.canMutate) return { ok: false, error: 'this account cannot mutate financial records' };

  const payment: CommercePayment | undefined = demoCommercePayments.find((p) => p.id === paymentId);
  if (!payment) return { ok: false, error: `unknown payment ${paymentId}` };
  if (actor.tenantId && actor.tenantId !== payment.brandId) {
    return { ok: false, error: `payment ${paymentId} does not belong to this brand` };
  }

  // DUPLICATE-RECONCILIATION GUARD: one reconciliation per payment, ever.
  const existing = getReconciliationForPayment(paymentId);
  if (existing) return { ok: true, value: existing };

  const invoice: CommerceInvoice | undefined = getCommerceInvoice(payment.invoiceId);
  const po = demoPurchaseOrders.find((p) => p.id === payment.purchaseOrderId);
  const identityMismatch =
    !!po && !!opts.confirmPurchaseOrderNumber && opts.confirmPurchaseOrderNumber !== po.poNumber;

  let state: PaymentReconciliation['state'] = 'reconciled';
  let exceptionReason: string | undefined;
  if (!invoice || !po) {
    state = 'exception';
    exceptionReason = `payment ${paymentId} could not be matched to a PO/invoice identity (invoice ${
      invoice ? 'found' : 'missing'
    }, PO ${po ? 'found' : 'missing'})`;
  } else if (identityMismatch) {
    state = 'exception';
    exceptionReason = `asserted PO ${opts.confirmPurchaseOrderNumber} does not match the payment's recorded PO ${po.poNumber}`;
  }

  const ratePct = po
    ? resolveCommissionRatePct({
        commissionRate: po.commissionRate,
        commissionAmount: po.commissionAmount,
        poValue: po.poValue,
      })
    : 0;
  const poNumber = po?.poNumber ?? payment.purchaseOrderId;
  const applied = po ? appliedDeductionsForPo(po.poNumber) : [];
  const unresolved = po ? unresolvedDeductionsForPo(po.poNumber) : [];
  const appliedGbp = round2(applied.reduce((s, d) => s + d.amountGbp, 0));
  const unresolvedGbp = round2(unresolved.reduce((s, d) => s + d.amountGbp, 0));
  const track = fulfilmentTrackFor(payment.brandId);
  const fees = track === 'financed' ? FINANCED_FULFILMENT_FEE_PLACEHOLDER_GBP : 0;
  const grossNet = po
    ? computeBrandNetShare({ poValue: po.poValue, commissionRatePct: ratePct, fulfillmentTrack: track })
    : 0;
  const netToBrand = round2(grossNet - appliedGbp - fees);
  const vat = resolveVatTreatment();
  const vatAmount = vatAmountFor(netToBrand);

  const reconciliationId = `rec-${payment.id}`;
  const destination = getDestinationForBrand(payment.brandId);
  const payoutEligible =
    state === 'reconciled' && unresolved.length === 0 && destination?.status === 'verified';

  // The accounting representation goes through the canonical seam.
  const getMode = opts.getMode ?? defaultIntegrationMode;
  const providerKey = opts.providerKey ?? 'xero';
  const mode = getMode(providerKey);
  const accountingClient = selectAccountingClient({ mode, partnerId: payment.brandId });
  const posting = await accountingClient.post({
    reconciliationId,
    brandId: payment.brandId,
    brandName: brandNameFor(payment.brandId),
    purchaseOrderNumber: poNumber,
    invoiceId: payment.invoiceId,
    paymentId: payment.id,
    currency: 'GBP',
    amountGbp: payment.amountGbp,
    poValueGbp: po?.poValue ?? payment.amountGbp,
    commissionAmountGbp: po?.commissionAmount ?? 0,
    deductionsAppliedGbp: appliedGbp,
    netToBrandGbp: netToBrand,
    vatTreatment: vat.treatment,
    ...(vatAmount !== undefined ? { vatAmountGbp: vatAmount } : {}),
    periodStart: payment.at.slice(0, 10),
    periodEnd: payment.at.slice(0, 10),
  });

  const record: PaymentReconciliation = {
    id: reconciliationId,
    paymentId: payment.id,
    invoiceId: payment.invoiceId,
    purchaseOrderId: payment.purchaseOrderId,
    purchaseOrderNumber: poNumber,
    brandId: payment.brandId,
    amountGbp: payment.amountGbp,
    currency: 'GBP',
    paymentSource: payment.method,
    paymentDate: payment.at,
    state,
    reconciledAt: new Date().toISOString(),
    reconciledBy: actor.staffId,
    ...(exceptionReason ? { exceptionReason } : {}),
    fact: {
      poValueGbp: po?.poValue ?? 0,
      commissionRatePct: ratePct,
      commissionAmountGbp: po?.commissionAmount ?? 0,
      deductionsAppliedGbp: appliedGbp,
      deductionsUnresolvedGbp: unresolvedGbp,
      deductionsUnresolvedCount: unresolved.length,
      fulfilmentFeesGbp: fees,
      netToBrandGbp: netToBrand,
      vatTreatment: vat.treatment,
      vatConfigured: vat.configured,
      ...(vatAmount !== undefined ? { vatAmountGbp: vatAmount } : {}),
    },
    accounting: {
      provider: posting.provider,
      mode: posting.mode,
      represented: posting.represented,
      ...(posting.representationId ? { representationId: posting.representationId } : {}),
      ...(posting.represented ? { postedAt: new Date().toISOString() } : {}),
      ...(posting.error ? { error: posting.error } : {}),
      simulated: posting.simulated,
    },
    payoutEligible,
    ...(payoutEligible
      ? {}
      : {
          payoutBlockedReason:
            state !== 'reconciled'
              ? exceptionReason ?? 'reconciliation is an exception'
              : unresolved.length > 0
                ? `${unresolved.length} unresolved deduction(s) on ${poNumber}`
                : 'no verified payout destination on file',
        }),
    mode: 'simulation',
    simulated: true,
  };

  demoReconciliations.push(record);

  // Link/refresh the payout identity for the PO's commission (eligibility only —
  // no money moves here).
  const commission = listCommissionsForPayout().find((c) => c.purchaseOrderId === poNumber);
  if (commission) ensureCommissionPayout(commission, record);

  recordCommerceAudit(
    'payment_reconciled',
    record.id,
    record.brandId,
    `Payment ${payment.id} reconciled to ${poNumber} — GBP ${payment.amountGbp.toFixed(2)}; accounting representation via ${posting.provider} (${
      posting.represented ? 'represented' : `NOT represented: ${posting.error ?? 'unknown'}`
    })`,
    actor.staffId,
    {
      reconciliationId: record.id,
      paymentId: payment.id,
      invoiceId: payment.invoiceId,
      purchaseOrderId: record.purchaseOrderId,
      state: record.state,
      payoutEligible: record.payoutEligible,
      netToBrandGbp: record.fact.netToBrandGbp,
      accountingProvider: posting.provider,
      accountingMode: posting.mode,
      accountingRepresented: posting.represented,
      accountingSimulated: posting.simulated,
      vatTreatment: record.fact.vatTreatment,
      vatConfigured: record.fact.vatConfigured,
    }
  );

  return { ok: true, value: record };
}


/* ── Payout identity, eligibility and the payout state machine ───────────── */

/**
 * Every commission has AT MOST one payout identity (`payout-<commissionId>`).
 * Creating it does not move money; it records the operational state, including
 * why it is not yet eligible.
 */
export function ensureCommissionPayout(
  commission: Commission,
  reconciliation?: PaymentReconciliation
): CommissionPayout {
  const existing = getPayoutForCommission(commission.id);
  const eligibility = evaluatePayoutEligibility(commission.id, reconciliation);
  if (existing) {
    if (existing.state === 'pending' || existing.state === 'eligible') {
      existing.state = eligibility.eligible ? 'eligible' : 'pending';
      existing.blockedReason = eligibility.eligible ? undefined : eligibility.blockers.join('; ');
    }
    // Derived links/amounts are refreshed whenever the record is not yet settled
    // (a settled payout is immutable).
    if (existing.state !== 'settled') {
      if (eligibility.reconciliation) existing.reconciliationId = eligibility.reconciliation.id;
      if (eligibility.destination) existing.destinationId = eligibility.destination.id;
      existing.netAmountGbp = eligibility.netAmountGbp;
      existing.vatTreatment = resolveVatTreatment().treatment;
    }
    return existing;
  }
  const payout: CommissionPayout = {
    id: `payout-${commission.id}`,
    commissionId: commission.id,
    brandId: commission.brandId,
    purchaseOrderId: commission.purchaseOrderId,
    ...(eligibility.reconciliation ? { reconciliationId: eligibility.reconciliation.id } : {}),
    ...(eligibility.destination ? { destinationId: eligibility.destination.id } : {}),
    netAmountGbp: eligibility.netAmountGbp,
    currency: 'GBP',
    state: eligibility.eligible ? 'eligible' : 'pending',
    attempts: 0,
    mode: 'mock',
    ...(eligibility.eligible ? {} : { blockedReason: eligibility.blockers.join('; ') }),
    vatTreatment: resolveVatTreatment().treatment,
    simulated: true,
  };
  demoPayouts.push(payout);
  return payout;
}

export interface PayoutEligibility {
  eligible: boolean;
  blockers: string[];
  netAmountGbp: number;
  reconciliation?: PaymentReconciliation;
  destination?: BrandPayoutDestination;
  commission?: Commission;
  payout?: CommissionPayout;
}

/**
 * THE canonical payout-eligibility rule. A brand payout may only be submitted
 * when EVERY condition holds:
 *   1. the commission exists and is not already paid;
 *   2. a reconciliation exists for its PO and is not an exception;
 *   3. no deduction on the PO is unresolved;
 *   4. a VERIFIED payout destination is on file;
 *   5. the payout is not already submitted/settled.
 */
export function evaluatePayoutEligibility(
  commissionId: string,
  reconciliation?: PaymentReconciliation
): PayoutEligibility {
  const blockers: string[] = [];
  const commission = getCommission(commissionId);
  if (!commission) {
    return { eligible: false, blockers: [`unknown commission ${commissionId}`], netAmountGbp: 0 };
  }
  const poNumber = commission.purchaseOrderId;
  const rec = reconciliation ?? demoReconciliations.find((r) => r.purchaseOrderNumber === poNumber);
  const destination = getDestinationForBrand(commission.brandId);
  const payout = getPayoutForCommission(commissionId);

  const ratePct = resolveCommissionRatePct({
    commissionRate: commission.commissionRate,
    commissionAmount: commission.commissionAmount,
    poValue: commission.poValue,
  });
  const track = fulfilmentTrackFor(commission.brandId);
  const fees = track === 'financed' ? FINANCED_FULFILMENT_FEE_PLACEHOLDER_GBP : 0;
  const appliedGbp = round2(appliedDeductionsForPo(poNumber).reduce((s, d) => s + d.amountGbp, 0));
  const netAmountGbp = round2(
    computeBrandNetShare({
      poValue: commission.poValue,
      commissionRatePct: ratePct,
      fulfillmentTrack: track,
    }) -
      appliedGbp -
      fees
  );

  if (commission.status === 'paid') blockers.push('the commission is already paid');
  if (!rec) blockers.push(`no payment has been reconciled to ${poNumber}`);
  else if (rec.state === 'exception') {
    blockers.push(rec.exceptionReason ?? 'the reconciliation is an exception');
  }
  const unresolved = unresolvedDeductionsForPo(poNumber);
  if (unresolved.length > 0) {
    blockers.push(`${unresolved.length} unresolved deduction(s) on ${poNumber} must be resolved first`);
  }
  if (!destination) blockers.push('no payout destination is on file');
  else if (destination.status !== 'verified') {
    blockers.push(
      `the payout destination is ${destination.status} — it must be verified before payment`
    );
  }
  if (payout && (payout.state === 'submitted' || payout.state === 'settled')) {
    blockers.push(`the payout is already ${payout.state}`);
  }

  return {
    eligible: blockers.length === 0,
    blockers,
    netAmountGbp,
    ...(rec ? { reconciliation: rec } : {}),
    ...(destination ? { destination } : {}),
    commission,
    ...(payout ? { payout } : {}),
  };
}


/* ── Payout state transitions (called by the ONE settlement path) ────────── */

export function markPayoutSubmitted(commissionId: string): CommissionPayout | undefined {
  const payout = getPayoutForCommission(commissionId);
  if (!payout) return undefined;
  payout.state = 'submitted';
  payout.attempts += 1;
  payout.submittedAt = new Date().toISOString();
  payout.failedAt = undefined;
  payout.failureReason = undefined;
  delete payout.blockedReason;
  return payout;
}

export function markPayoutSettled(
  commissionId: string,
  transferId: string,
  mode: 'mock' | 'real'
): CommissionPayout | undefined {
  const payout = getPayoutForCommission(commissionId);
  if (!payout) return undefined;
  payout.state = 'settled';
  payout.transferId = transferId;
  payout.mode = mode;
  payout.settledAt = new Date().toISOString();
  payout.failureReason = undefined;
  delete payout.blockedReason;
  return payout;
}

export function markPayoutFailed(commissionId: string, reason: string): CommissionPayout | undefined {
  const payout = getPayoutForCommission(commissionId);
  if (!payout) return undefined;
  payout.state = 'failed';
  payout.failedAt = new Date().toISOString();
  payout.failureReason = reason;
  return payout;
}

/** A failed payout is retryable: it returns to `eligible` for the next attempt. */
export function retryPayout(commissionId: string, actor: FinanceActor): FinanceResult<CommissionPayout> {
  if (!actor.canMutate) return { ok: false, error: 'this account cannot mutate financial records' };
  const payout = getPayoutForCommission(commissionId);
  if (!payout) return { ok: false, error: `no payout identity for ${commissionId}` };
  if (payout.state !== 'failed') {
    return { ok: false, error: `payout ${payout.id} is ${payout.state} — only a failed payout is retryable` };
  }
  const eligibility = evaluatePayoutEligibility(commissionId);
  if (!eligibility.eligible) {
    return { ok: false, error: `payout is still blocked: ${eligibility.blockers.join('; ')}` };
  }
  payout.state = 'eligible';
  payout.failureReason = undefined;
  delete payout.blockedReason;
  recordCommerceAudit(
    'brand_payout_retry_prepared',
    payout.id,
    payout.brandId,
    `Failed payout ${payout.id} returned to eligible for retry (attempt ${payout.attempts + 1})`,
    actor.staffId,
    { payoutId: payout.id, attempts: payout.attempts }
  );
  return { ok: true, value: payout };
}

/* ── Payout destinations (verification is a real, audited action) ────────── */

/**
 * Ensure a payout destination record exists for a brand. A brand that has never
 * registered an account gets an UNVERIFIED record — it can be reviewed and
 * verified, but it can never be paid until it is.
 */
export function ensurePayoutDestination(brandId: string): BrandPayoutDestination {
  const existing = getDestinationForBrand(brandId);
  if (existing) return existing;
  const name = brandNameFor(brandId);
  const slug = brandId.replace(/^brand-/, '').toUpperCase();
  const destination: BrandPayoutDestination = {
    id: `dest-${brandId}`,
    brandId,
    accountName: name,
    accountRefMasked: `••••••${String(Math.abs(hashText(slug)) % 10000).padStart(4, '0')}`,
    bankName: 'Destination awaiting verification (no bank provider contacted)',
    country: 'United Kingdom',
    currency: 'GBP',
    status: 'unverified',
    mode: 'simulation',
    simulated: true,
  };
  demoPayoutDestinations.push(destination);
  return destination;
}

function hashText(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return h;
}

export function setDestinationStatus(
  destinationId: string,
  status: BrandPayoutDestination['status'],
  actor: FinanceActor,
  detail: { reason?: string; verificationMethod?: string; verificationRef?: string } = {}
): FinanceResult<BrandPayoutDestination> {
  if (!actor.canMutate) return { ok: false, error: 'this account cannot mutate financial records' };
  const destination = demoPayoutDestinations.find((d) => d.id === destinationId);
  if (!destination) return { ok: false, error: `unknown payout destination ${destinationId}` };
  if (status === 'verified' && !detail.verificationRef) {
    return { ok: false, error: 'verifying a destination requires a verification reference' };
  }
  destination.status = status;
  if (status === 'verified') {
    destination.verificationMethod = detail.verificationMethod ?? 'Founder / Super Admin review';
    destination.verificationRef = detail.verificationRef;
    destination.verifiedAt = new Date().toISOString();
    destination.verifiedBy = actor.staffId;
    destination.failureReason = undefined;
  } else if (status === 'unverified') {
    destination.verificationMethod = undefined;
    destination.verificationRef = undefined;
    destination.verifiedAt = undefined;
    destination.verifiedBy = undefined;
  } else {
    destination.failureReason = detail.reason ?? `destination ${status} by ${actor.staffId}`;
  }
  recordCommerceAudit(
    `payout_destination_${status}`,
    destination.id,
    destination.brandId,
    `Payout destination ${destination.accountRefMasked} (${destination.bankName}) → ${status}${
      detail.reason ? ` — ${detail.reason}` : ''
    }`,
    actor.staffId,
    {
      destinationId: destination.id,
      status,
      verificationMethod: destination.verificationMethod ?? null,
      verificationRef: destination.verificationRef ?? null,
    }
  );
  notifyCanonicalStoreChange();
  return { ok: true, value: destination };
}

/* ── Brand-facing financial standing ────────────────────────────────────── */

export interface BrandFinancialStanding {
  brandId: string;
  destination?: BrandPayoutDestination;
  reconciliations: PaymentReconciliation[];
  payouts: CommissionPayout[];
  /** Money received and matched to a PO but not yet eligible for payout. */
  blockedPayoutCount: number;
  settledPayoutCount: number;
  netSettledGbp: number;
}

export function financialStandingForBrand(brandId: string): BrandFinancialStanding {
  const payouts = listPayoutsForBrand(brandId);
  return {
    brandId,
    ...(getDestinationForBrand(brandId) ? { destination: getDestinationForBrand(brandId) } : {}),
    reconciliations: listReconciliationsForBrand(brandId),
    payouts,
    blockedPayoutCount: payouts.filter((p) => p.state === 'pending' || p.state === 'failed').length,
    settledPayoutCount: payouts.filter((p) => p.state === 'settled').length,
    netSettledGbp: round2(
      payouts.filter((p) => p.state === 'settled').reduce((s, p) => s + p.netAmountGbp, 0)
    ),
  };
}

