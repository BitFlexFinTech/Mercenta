/**
 * §Phase E2E — DETERMINISTIC INVESTOR-DEMO ORCHESTRATION.
 *
 * ONE runnable, zero-network, reset/replayable lifecycle across the WHOLE
 * platform, built ENTIRELY on the existing canonical architecture:
 *
 *   application → approval → onboarding → compliance → catalogue
 *     → purchase order → acknowledgement → fulfilment → shipment → delivery
 *     → returns → deductions → dispute → resolution → commission → payout
 *     → CRM → marketing → integrations → social → RBAC → audit → error/recovery
 *
 * Nothing here is a parallel demo application. Every stage calls the SAME
 * domain seams the product's own UI calls:
 *   - `applicationStore.submitApplication` / `updateApplicationStatus`
 *   - `onboardingLifecycle` (E1/E2: one canonical tenant identity)
 *   - `api.uploadComplianceDoc` / `setComplianceDocStatus` +
 *     `evaluateBrandCatalogGate` (the EXISTING compliance gate, unchanged)
 *   - `catalogLifecycle` (E3 completeness → gate → submit → poll)
 *   - `commerceLifecycle` (E4 eligibility → PO → ack → fulfil → ship → receive
 *     → invoice → payment → exception → dispute → operator resolution)
 *   - `billing/payouts` + `api.settleBrandPayout` (Stage-8 commission payout)
 *   - `crmStore`, `returnsTracking`, `prospectStore`, `acquisitionStore`
 *   - the Integration Hub's own mode resolution (Phase 4 fail-closed gate)
 *   - `social/engineAdapter` (Phase S deterministic mock-first social seam)
 *
 * HONESTY CONTRACT:
 *   - ZERO network calls. `networkCalls` is reported as 0 and NO live provider,
 *     email, payment or accounting system is ever contacted.
 *   - Simulation is POSITIVELY identified everywhere (provenance is written by
 *     the seams themselves; nothing is re-labelled here).
 *   - Fail-closed: the run refuses to execute a provider-backed stage unless the
 *     provider positively resolves `simulation`. Unknown/available/disabled/
 *     degraded/error/live all refuse.
 *   - Determinism: all ids are canonical/deterministic, money is asserted
 *     numerically, and the `digest` covers only deterministic facts (never
 *     wall-clock timestamps), so `reset → run` reproduces the SAME digest.
 */

import type {
  ApprovedCategory,
  CarrierId,
  ComplianceDocument,
  Deduction,
  DisputeOutcome,
  Product,
  PurchaseOrder,
  ReturnTrackingEntry,
} from '@/types';
import {
  demoApplications,
  getApplicationById,
  submitApplication,
  updateApplicationStatus,
} from '@/data/applicationStore';
import {
  beginOnboardingFromApplication,
  acceptOnboarding,
  completeOnboardingStep,
  finishBrandOnboarding,
  getOnboardingForTenant,
  listOnboardingPipeline,
  ONBOARDING_STEP_ORDER,
  tenantIdForApplication,
  type OnboardingActor,
} from '@/lib/onboarding/onboardingLifecycle';
import {
  BASE_REQUIRED_DOCUMENTS,
  CATEGORY_DOC_LABELS,
  getRequiredDocumentsForCategory,
  latestDocumentsByType,
  REQUIRED_BRAND_AGREEMENTS,
} from '@/lib/compliance';
import {
  replaceComplianceDocument,
  verifyDocumentVersion,
} from '@/lib/verification/documentVerification';
import {
  ensurePayoutDestination,
  evaluatePayoutEligibility,
  financialStandingForBrand,
  getReconciliationForPayment,
  reconcilePayment,
  setDestinationStatus,
  vatAmountFor,
} from '@/lib/finance/financialReconciliation';
import {
  acceptBrandAgreement,
  createShipmentForPO,
  evaluateBrandCatalogGate,
  fetchComplianceForBrand,
  issueDistributionAgreement,
  settleBrandPayout,
  uploadComplianceDoc,
  type AsnDetail,
} from '@/data/api';
import {
  evaluateCatalogReadiness,
  pollCatalogSubmission,
  submitCatalogProduct,
  type CatalogActor,
} from '@/lib/catalog/catalogLifecycle';
import {
  acknowledgeCommercePurchaseOrder,
  advanceCommerceShipment,
  createCommercePurchaseOrder,
  evaluateCommerceEligibility,
  fulfilCommercePurchaseOrder,
  issueCommerceInvoice,
  listAllCommerceExceptions,
  listBrandCommerceActivity,
  listBrandCommerceExceptions,
  openCommerceDispute,
  raiseCommerceException,
  receiveCommercePurchaseOrder,
  recordCommercePayment,
  resolveCommerceDispute,
  type CommerceActor,
} from '@/lib/commerce/commerceLifecycle';
import {
  computeBrandNetShare,
  MockStripePayoutClient,
  resetMockPayouts,
  resolveCommissionRatePct,
  settleCommission,
} from '@/lib/billing/payouts';
import {
  addCatalogProduct,
  addReturn,
  amendShipment,
  demoAuditLog,
  demoBrandAgreements,
  demoCommerceActivities,
  demoCommerceInvoices,
  demoCommercePayments,
  demoComplianceDocs,
  demoContracts,
  demoDeductions,
  demoDocumentVerifications,
  demoPayoutDestinations,
  demoPayouts,
  demoProductSubmissions,
  demoProducts,
  demoPurchaseOrders,
  demoReconciliations,
  demoReturns,
  demoShipments,
  getCommerceInvoiceForPo,
  listCommissionsForPayout,
  recordShippingMargin,
  resetSettledCommissions,
  updateProductAvailability,
} from '@/data/demoStore';
import { removeOnboarding } from '@/data/acquisitionStore';
import {
  demoReturnTracking,
  getReturnTracking,
  recordQualityCheck,
  recordWarehouseReceipt,
} from '@/lib/warehouse/returnsTracking';
import { buildBrandTimeline, getCrmMeta } from '@/lib/crm/crmStore';
import { getProspects, getAcquisitionLeads } from '@/data/prospectStore';
import { resolveOutreachTransport } from '@/lib/acquisition/outreachSender';
import * as routing from '@/lib/shipping/carrierRouting';
import * as calc from '@/lib/shipping/shippingCalculator';
import {
  beginCaseReview,
  createCase,
  demoTickets,
  escalateCaseToProvider,
  getTicketById,
  listAllCases,
  listCasesForBrand,
  recordProviderCaseResponse,
  resetCaseSequence,
  resolveCase,
  reviewCase,
} from '@/lib/helpdesk/ticketStore';
import { resetMockAmazonCases } from '@/lib/helpdesk/amazonCaseClient';
import { resetEvents } from '@/lib/events/eventFeed';
import { resetMockAmazonState } from '@/lib/spapi/mockClient';
import { resetMockDhlState } from '@/lib/dhl/mockClient';
import {
  resetMockCompaniesHouseState,
  resetMockHmrcState,
  simulateHmrcOutage,
} from '@/lib/compliance/index';
import { fileHmrcReturn } from '@/lib/compliance/complianceSync';
import { resetMockEsignState } from '@/lib/esign/esign';
import {
  INITIAL_INTEGRATIONS,
  INTEGRATION_MODE_LABELS,
  isProviderSimulationSafe,
  modeForState,
  resolveProviderMode,
  type ProviderResolutionMode,
} from '@/integrations/types';
import { INTEGRATION_ORDER, defaultIntegrationMode, integrationMeta } from '@/integrations/registry';
import {
  createIsolatedSimulatedSocialClient,
  createSocialEngineClient,
  SIMULATED_FAILURE_MARKER,
  type SocialEngineClient,
} from '@/lib/social/engineAdapter';
import { stableHash } from '@/lib/social/workspace';
import {
  canAccessEnvironment,
  canAccessView,
  type SessionTier,
} from '@/lib/auth/rbac';

/* ── Stage vocabulary ─────────────────────────────────────────────────────── */

export type InvestorDemoStageId =
  | 'application'
  | 'approval'
  | 'onboarding'
  | 'compliance'
  | 'catalogue'
  | 'purchase_order'
  | 'acknowledgement'
  | 'fulfilment'
  | 'shipment'
  | 'shipping_commercial'
  | 'delivery'
  | 'returns'
  | 'deductions'
  | 'dispute'
  | 'commission'
  | 'payout'
  | 'crm'
  | 'marketing'
  | 'integrations'
  | 'cases'
  | 'social'
  | 'rbac'
  | 'audit'
  | 'error_recovery';

export type InvestorDemoStageStatus = 'ok' | 'blocked' | 'error';

export interface InvestorDemoStage {
  id: InvestorDemoStageId;
  label: string;
  status: InvestorDemoStageStatus;
  detail: string;
  entityIds: string[];
  /**
   * Deterministic facts this stage is the only evidence for. `facts` (plus the
   * stage statuses/entity ids) are what the replay digest is computed from —
   * never wall-clock timestamps.
   */
  facts: Record<string, string | number | boolean>;
}

export interface InvestorDemoSummary {
  total: number;
  ok: number;
  blocked: number;
  error: number;
}

export interface InvestorDemoRun {
  /** Deterministic run id derived from the seed. */
  runId: string;
  seed: number;
  mode: 'simulation';
  deterministic: true;
  /** The canonical tenant the lifecycle ran in (from the application id). */
  tenantId: string;
  brandName: string;
  applicationId: string;
  onboardingId: string;
  startedAt: string;
  finishedAt: string;
  stages: InvestorDemoStage[];
  summary: InvestorDemoSummary;
  /** Stable hash over deterministic facts — equal across identical replays. */
  digest: string;
  /** ALWAYS 0: this orchestration performs no network call. */
  networkCalls: 0;
  /** Canonical platform audit rows attributable to the demo tenant. */
  auditRows: number;
  /** Canonical audit actions recorded for the demo tenant (ordered). */
  auditActions: string[];
}

export interface InvestorDemoOptions {
  /** Deterministic seed. Same seed ⇒ same run id ⇒ same digest. */
  seed?: number;
  /** Actor label written on the domain operations. */
  actorId?: string;
  /**
   * Provider-mode lookup. DEFAULT (fail-closed): the app's own documented
   * default mode per provider (`INTEGRATION_META[id].defaultMode` via
   * `modeForState`), and `not_registered` for anything else. An unregistered
   * provider is NEVER simulation.
   */
  getMode?: (providerId: string) => ProviderResolutionMode;
  /** Actor label representing the brand tenant. */
  brandActorLabel?: string;
}

/* ── Deterministic constants (one declaration each) ───────────────────────── */

export const INVESTOR_DEMO_APPLICATION_ID = 'app-investor-demo';
export const INVESTOR_DEMO_BRAND_NAME = 'Cape Verdant Foods Ltd';
export const INVESTOR_DEMO_CATEGORY: ApprovedCategory = 'Grocery';
export const INVESTOR_DEMO_SKU = 'CVF-HERB-500';
export const INVESTOR_DEMO_SIGNATORY = { name: 'Naledi Mokoena', email: 'ops@capeverdant.example' };
const DEMO_QUANTITY = 120;
const DEMO_EX_WORKS_PRICE = 4.2;
const DEMO_RETURN_ID = 'ret-investor-demo-1';
const DEMO_DEDUCTION_ID = 'ded-investor-demo-1';
const OPS_ACTOR_ID = 'staff-001';

/** The canonical tenant id, derived — never hand-written. */
export const INVESTOR_DEMO_TENANT_ID = tenantIdForApplication(INVESTOR_DEMO_APPLICATION_ID);
export const INVESTOR_DEMO_ONBOARDING_ID = `onb-app-${INVESTOR_DEMO_APPLICATION_ID}`;

/* ── Actors (tenant isolation is enforced in the DOMAIN, not here) ────────── */

export function investorDemoOpsActor(actorId = OPS_ACTOR_ID) {
  return { staffId: actorId, canMutate: true } as const;
}

export function investorDemoBrandActor(tenantId: string, label = `brand:${tenantId}`) {
  return { staffId: label, canMutate: true, tenantId } as const;
}

export function investorDemoViewOnlyActor(tenantId?: string) {
  return { staffId: 'staff-view-only', canMutate: false, ...(tenantId ? { tenantId } : {}) } as const;
}

/* ── Provider-mode resolution (the app's own default, fail-closed) ────────── */

/** Default mode lookup — the app's documented default per provider. */
export function defaultDemoProviderMode(providerId: string): ProviderResolutionMode {
  return defaultIntegrationMode(providerId);
}

/* ── Baseline / reset (deterministic replay) ─────────────────────────────── */

interface Restorable {
  name: string;
  restore: () => void;
}

function restorable<T>(name: string, arr: T[]): Restorable {
  // Deep snapshot: the platform mutates records IN PLACE (status, milestones),
  // so a shallow copy would let a run poison the baseline it must return to.
  const snapshot: T[] = structuredClone(arr);
  return {
    name,
    restore: () => {
      const fresh: T[] = structuredClone(snapshot);
      arr.length = 0;
      arr.push(...fresh);
    },
  };
}

/**
 * The canonical stores this orchestration writes to. A reset restores each to
 * the baseline captured when this module loaded, so:
 *   - scenario-created records are removed (no stale data, no duplicates), and
 *   - every SEEDED record is preserved byte-for-byte.
 */
const RESTORABLE: Restorable[] = [
  restorable('applications', demoApplications),
  restorable('purchase_orders', demoPurchaseOrders),
  restorable('shipments', demoShipments),
  restorable('deductions', demoDeductions),
  restorable('returns', demoReturns),
  restorable('return_tracking', demoReturnTracking),
  restorable('catalog_products', demoProducts),
  restorable('catalog_submissions', demoProductSubmissions),
  restorable('compliance_documents', demoComplianceDocs),
  restorable('document_verifications', demoDocumentVerifications),
  restorable('payout_destinations', demoPayoutDestinations),
  restorable('reconciliations', demoReconciliations),
  restorable('payouts', demoPayouts),
  restorable('brand_agreements', demoBrandAgreements),
  restorable('contracts', demoContracts),
  restorable('commerce_activities', demoCommerceActivities),
  restorable('commerce_invoices', demoCommerceInvoices),
  restorable('commerce_payments', demoCommercePayments),
  restorable('audit_log', demoAuditLog),
  restorable('tickets', demoTickets),
];

export interface InvestorDemoResetResult {
  resetAt: string;
  restoredStores: string[];
  onboardingRemoved: boolean;
  /** §M2 — demo-tenant records purged from every canonical store. */
  purgedRecords: number;
}

/**
 * §M2 — REAL DEFECT FIXED (run-again corruption).
 *
 * `RESTORABLE` restores the stores to the baseline captured when THIS module
 * instance loaded. That is not sufficient: if the instance loads after a demo
 * run already happened (a second module instance, an HMR reload, or the same
 * app instance being re-run), the captured "baseline" already contains the
 * previous run's records — so a reset could not undo it and a second run died
 * on the first stage (`ILLEGAL_TRANSITION — onboarding is already complete`),
 * cascading into 15 failed stages.
 *
 * The demo run OWNS its records. This purge removes exactly the demo tenant's
 * records (and its application/onboarding identity) from every canonical store,
 * so `reset → run` is reproducible regardless of how the module was loaded, and
 * so clicking Run twice is safe.
 */
function purgeInvestorDemoRecords(): number {
  const tenant = INVESTOR_DEMO_TENANT_ID;
  let removed = 0;
  const purge = <T extends { brandId?: string | null }>(arr: T[]) => {
    for (let i = arr.length - 1; i >= 0; i -= 1) {
      if (arr[i]?.brandId === tenant) {
        arr.splice(i, 1);
        removed += 1;
      }
    }
  };
  purge(demoBrandAgreements);
  purge(demoCommerceActivities);
  purge(demoCommerceInvoices);
  purge(demoCommercePayments);
  purge(demoComplianceDocs);
  purge(demoContracts);
  purge(demoDeductions);
  purge(demoDocumentVerifications as { brandId?: string | null }[]);
  purge(demoPayoutDestinations);
  purge(demoPayouts);
  purge(demoProductSubmissions);
  purge(demoProducts);
  purge(demoPurchaseOrders);
  purge(demoReconciliations);
  purge(demoReturnTracking);
  purge(demoReturns);
  purge(demoShipments);
  purge(demoAuditLog);
  purge(demoTickets);
  // The application + onboarding identity of the demo tenant.
  for (let i = demoApplications.length - 1; i >= 0; i -= 1) {
    if (demoApplications[i]?.id === INVESTOR_DEMO_APPLICATION_ID) {
      demoApplications.splice(i, 1);
      removed += 1;
    }
  }
  return removed;
}

/**
 * Return the demo environment to its baseline. Deliberately SCOPED:
 *   - restores only the stores above (seeded data intact),
 *   - purges only the demo tenant's own records + its onboarding record,
 *   - resets only the deterministic simulation seams (mocks, events, payouts,
 *     social client, settled-commission ledger).
 * Nothing else in the session is destroyed.
 */
export function resetInvestorDemo(): InvestorDemoResetResult {
  for (const r of RESTORABLE) r.restore();
  const purgedRecords = purgeInvestorDemoRecords();
  const onboardingRemoved = removeOnboarding(INVESTOR_DEMO_ONBOARDING_ID);

  resetMockAmazonState();
  resetMockDhlState();
  resetMockCompaniesHouseState();
  resetMockHmrcState();
  resetMockEsignState();
  resetMockPayouts();
  resetSettledCommissions();
  resetEvents();
  simulateHmrcOutage(false);

  const social = createSocialEngineClient('simulation');
  if (social.ok) social.value.reset();

  return {
    resetAt: new Date().toISOString(),
    restoredStores: RESTORABLE.map((r) => r.name),
    onboardingRemoved,
    purgedRecords,
  };
}

/* ── Stage labels (the investor-facing narrative, in order) ───────────────── */

export const INVESTOR_DEMO_STAGES: readonly { id: InvestorDemoStageId; label: string }[] = [
  { id: 'application', label: 'Application' },
  { id: 'approval', label: 'Approval → onboarding record' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'catalogue', label: 'Catalogue & product submission' },
  { id: 'purchase_order', label: 'Purchase order' },
  { id: 'acknowledgement', label: 'PO acknowledgement' },
  { id: 'fulfilment', label: 'Fulfilment / ASN' },
  { id: 'shipment', label: 'Shipment milestones' },
  { id: 'shipping_commercial', label: 'Shipping lane & commercial model' },
  { id: 'delivery', label: 'Delivery & receiving' },
  { id: 'returns', label: 'Returns' },
  { id: 'deductions', label: 'Deductions / chargebacks' },
  { id: 'dispute', label: 'Dispute & operator resolution' },
  { id: 'commission', label: 'Commission accrual' },
  { id: 'payout', label: 'Brand payout settlement' },
  { id: 'crm', label: 'CRM lifecycle' },
  { id: 'marketing', label: 'Acquisition / marketing' },
  { id: 'integrations', label: 'Integration Hub (simulation)' },
  { id: 'cases', label: 'Cases — Mercenta review before channel escalation' },
  { id: 'social', label: 'Mercenta Social' },
  { id: 'rbac', label: 'RBAC & tenant isolation' },
  { id: 'audit', label: 'Auditability' },
  { id: 'error_recovery', label: 'Error & recovery' },
] as const;

const LABEL: Record<InvestorDemoStageId, string> = Object.fromEntries(
  INVESTOR_DEMO_STAGES.map((s) => [s.id, s.label])
) as Record<InvestorDemoStageId, string>;

type Fact = string | number | boolean;

/** The canonical platform audit rows attributable to the demo tenant. */
export function auditRowsForTenant(tenantId: string) {
  return demoAuditLog.filter((e) => e.brandId === tenantId);
}

/** Round to pennies — the money convention used across the platform. */
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ── The run ─────────────────────────────────────────────────────────────── */

/**
 * Execute the full deterministic investor-demo lifecycle.
 *
 * Every stage is individually guarded: an unexpected throw is recorded as an
 * `error` stage (with the real message) and the run CONTINUES, so the investor
 * always sees the complete picture rather than a single aborted step.
 */
export async function runInvestorDemo(
  opts: InvestorDemoOptions = {}
): Promise<InvestorDemoRun> {
  // §M2 — A RUN ALWAYS STARTS FROM THE CANONICAL BASELINE. The orchestration
  // owns its tenant's records, so re-running must never depend on a manual reset
  // having happened first (clicking Run twice, an HMR reload, or a second module
  // instance previously corrupted the run — see `purgeInvestorDemoRecords`).
  // Reset-then-run and run-twice therefore produce the same deterministic digest.
  resetInvestorDemo();

  const seed = opts.seed ?? 1;
  const runId = `investor-demo-${seed}`;
  const actorId = opts.actorId ?? OPS_ACTOR_ID;
  const getMode = opts.getMode ?? defaultDemoProviderMode;
  const ops = investorDemoOpsActor(actorId);
  const brandLabel = opts.brandActorLabel ?? `brand:${INVESTOR_DEMO_TENANT_ID}`;

  const stages: InvestorDemoStage[] = [];
  const startedAt = new Date().toISOString();

  const push = (
    id: InvestorDemoStageId,
    status: InvestorDemoStageStatus,
    detail: string,
    entityIds: string[] = [],
    facts: Record<string, Fact> = {}
  ) => {
    stages.push({ id, label: LABEL[id], status, detail, entityIds, facts });
  };

  /** Run one stage body, recording ok / blocked / error honestly. */
  const stage = async (
    id: InvestorDemoStageId,
    body: () => Promise<{
      status?: InvestorDemoStageStatus;
      detail: string;
      entityIds?: string[];
      facts?: Record<string, Fact>;
    }>
  ) => {
    try {
      const r = await body();
      push(id, r.status ?? 'ok', r.detail, r.entityIds ?? [], r.facts ?? {});
    } catch (err) {
      push(id, 'error', err instanceof Error ? err.message : String(err));
    }
  };

  const tenant: string = INVESTOR_DEMO_TENANT_ID;
  const onboarding: string = INVESTOR_DEMO_ONBOARDING_ID;


  /* 1 — APPLICATION ------------------------------------------------------ */
  await stage('application', async () => {
    const application = submitApplication(
      {
        companyName: INVESTOR_DEMO_BRAND_NAME,
        country: 'United Kingdom',
        category: INVESTOR_DEMO_CATEGORY,
        phone: '+44 20 7946 0958',
        skuCount: 12,
        monthlyRevenue: '£250k–£1m',
        websiteUrl: 'https://capeverdant.example',
        instagramUrl: null,
        facebookUrl: null,
        websiteStatus: 'verified',
        instagramStatus: null,
        facebookStatus: null,
        referralSource: 'Investor demonstration',
        description: 'Deterministic investor-demo applicant brand (no live data).',
        // Deterministic id → deterministic tenant identity → replayable run.
        opts: { id: INVESTOR_DEMO_APPLICATION_ID },
      }
    );
    const stored = getApplicationById(INVESTOR_DEMO_APPLICATION_ID);
    if (!stored || stored.status !== 'pending') {
      throw new Error('application record was not created in the canonical store');
    }
    return {
      detail: `Public application ${application.id} submitted by ${INVESTOR_DEMO_BRAND_NAME} — status pending`,
      entityIds: [application.id],
      facts: { applicationStatus: stored.status, companyName: stored.companyName },
    };
  });

  /* 2 — APPROVAL → canonical onboarding --------------------------------- */
  await stage('approval', async () => {
    const approved = updateApplicationStatus(
      INVESTOR_DEMO_APPLICATION_ID,
      'approved',
      ops.staffId,
      'Approved in the deterministic investor demonstration.'
    );
    if (!approved || approved.status !== 'approved') {
      throw new Error('approval did not record the approved status');
    }
    const began = beginOnboardingFromApplication(INVESTOR_DEMO_APPLICATION_ID, ops);
    if (!began.ok) throw new Error(`onboarding hand-off refused: ${began.error}`);
    const record = began.value;
    return {
      detail: `Application approved → canonical onboarding ${record.id} (tenant ${record.brandId}, origin ${record.origin})`,
      entityIds: [approved.id, record.id, record.brandId],
      facts: {
        applicationStatus: approved.status,
        onboardingStatus: record.status,
        origin: record.origin ?? 'partner_application',
        tenantId: record.brandId,
      },
    };
  });

  /* 3 — ONBOARDING ------------------------------------------------------- */
  await stage('onboarding', async () => {
    const brand: OnboardingActor = { staffId: brandLabel, canMutate: true, tenantId: tenant };
    const accepted = acceptOnboarding(onboarding, brand, 'Brand accepted in the demo portal');
    if (!accepted.ok) throw new Error(`acceptance refused: ${accepted.error}`);

    for (const stepId of ONBOARDING_STEP_ORDER) {
      // The legal-agreements step is where the brand accepts the two mandatory
      // §4.1/§4.2 agreements — the SAME store the onboarding wizard writes to.
      if (stepId === 'legal_agreements') {
        for (const agreementType of REQUIRED_BRAND_AGREEMENTS) {
          await acceptBrandAgreement(tenant, agreementType, '1.0');
        }
      }
      const done = completeOnboardingStep(onboarding, stepId, brand, `Demo: ${stepId}`);
      if (!done.ok) throw new Error(`step ${stepId} refused: ${done.error}`);
    }
    const finished = finishBrandOnboarding(onboarding, brand);
    if (!finished.ok) throw new Error(`completion refused: ${finished.error}`);

    const record = getOnboardingForTenant(tenant);
    if (!record || record.status !== 'completed') {
      throw new Error('onboarding record did not reach completed');
    }
    const stepsDone = record.steps.filter((s) => s.status === 'done').length;
    const inPipeline = listOnboardingPipeline().some(
      (r) => r.onboarding.brandId === tenant
    );
    return {
      detail: `Onboarding ${onboarding} completed — ${stepsDone}/${record.steps.length} steps verified, tenant ${tenant}, visible in the operations pipeline`,
      entityIds: [onboarding, tenant],
      facts: {
        onboardingStatus: record.status,
        steps: record.steps.length,
        stepsDone,
        agreementsAccepted: REQUIRED_BRAND_AGREEMENTS.length,
        inPipeline,
      },
    };
  });

  /** Cross-stage state established by the deterministic lifecycle. */
  const demoProduct = (): Product => ({
    id: `prd-${tenant}-${INVESTOR_DEMO_SKU}`,
    name: 'Cape Verdant Wild Herb Blend 500g',
    sku: INVESTOR_DEMO_SKU,
    barcode: '5060999000017',
    image: '',
    exWorksPrice: DEMO_EX_WORKS_PRICE,
    ukRetailPrice: 9.99,
    commodityCode: '2009909500',
    vatStatus: 'standard',
    hazmat: false,
    length: 24,
    width: 16,
    height: 12,
    weight: 0.5,
    unitsPerCase: 12,
    caseOrderable: true,
    productTaxCode: 'A_GEN_TAX',
    isAvailable: true,
    leadTimeDays: 7,
  });

  const catalogueActor: CatalogActor = { staffId: brandLabel, canMutate: true, tenantId: tenant };
  const commerceActor: CommerceActor = { staffId: brandLabel, canMutate: true, tenantId: tenant };

  let gateBlockedSubmissionReason = '';
  let submissionId = '';
  let poId = '';
  let poNumber = '';
  let shipId = '';
  let invoiceId = '';
  let commissionId = '';

  /* 4 — COMPLIANCE ------------------------------------------------------- */
  await stage('compliance', async () => {
    const requiredDocs = getRequiredDocumentsForCategory(INVESTOR_DEMO_CATEGORY);
    const extraDocs = requiredDocs.filter((t) => !BASE_REQUIRED_DOCUMENTS.includes(t));
    if (requiredDocs.length === 0) throw new Error('no required compliance documents resolved');

    // (a) SIMULATED UPLOAD — every required document is SUBMITTED for
    //     verification: `under_review` with a `pending` verification record.
    //     The MV2 evidence is unmistakably simulated (no external provider).
    const simulatedEvidence = (type: string) => ({
      fileUrl: `simulated://compliance/${tenant}/${type}`,
      reference: `SIM-${type.toUpperCase()}-${tenant.replace(/^brand-/, '').toUpperCase()}`,
      issuer: 'Simulated issuing body (no external provider)',
    });
    for (const type of requiredDocs) uploadComplianceDoc(tenant, type, ops.staffId, simulatedEvidence(type));
    const uploaded = await fetchComplianceForBrand(tenant);
    const latestByType = latestDocumentsByType(uploaded);
    const underReview = requiredDocs.filter((t) => latestByType.get(t)?.status === 'under_review');
    if (underReview.length !== requiredDocs.length) {
      throw new Error(
        `upload did not reach under_review for every document (${underReview.length}/${requiredDocs.length})`
      );
    }
    const pendingRecords = demoDocumentVerifications.filter(
      (r) => r.brandId === tenant && r.status === 'pending'
    );
    if (pendingRecords.length !== requiredDocs.length) {
      throw new Error(
        `every submission must open a pending verification record (${pendingRecords.length}/${requiredDocs.length})`
      );
    }

    // (b) AN UPLOAD IS NOT AN APPROVAL — the gate must still block, and the
    //     catalogue lifecycle must genuinely refuse to start.
    const blockedGate = await evaluateBrandCatalogGate(tenant);
    const premature = await submitCatalogProduct(
      tenant,
      demoProduct() as unknown as Record<string, unknown>,
      catalogueActor
    );
    gateBlockedSubmissionReason = premature.ok ? 'NOT_BLOCKED' : premature.error;
    if (blockedGate.cleared) throw new Error('gate reported cleared while documents were under review');
    if (premature.ok) throw new Error('catalogue submission was allowed before compliance approval');

    // (c) OPERATOR ISSUES THE AGREEMENT + BRAND ACCEPTS THE MANDATORY TERMS.
    const contract = issueDistributionAgreement({
      brandId: tenant,
      signatoryName: INVESTOR_DEMO_SIGNATORY.name,
      signatoryEmail: INVESTOR_DEMO_SIGNATORY.email,
      fulfillmentTrack: 'direct_fulfillment',
    });
    for (const agreementType of REQUIRED_BRAND_AGREEMENTS) {
      await acceptBrandAgreement(tenant, agreementType, '1.0');
    }

    // (d) VERIFICATION — automated provider; then the FAILURE + REPLACEMENT
    //     path for one requirement.
    const failureType = requiredDocs[requiredDocs.length - 1];
    const failureDoc = latestByType.get(failureType);
    if (!failureDoc) throw new Error(`missing compliance record for ${failureType}`);

    //     d1. one document deliberately FAILS automated verification.
    const failedVerification = await verifyDocumentVersion(failureDoc.id, ops, {
      getMode,
      providerKey: 'companies_house',
      simulateFailure: true,
    });
    if (!failedVerification.ok) throw new Error(`verification refused: ${failedVerification.error}`);
    if (failedVerification.value.result !== 'fail' || failureDoc.status !== 'rejected') {
      throw new Error(
        `a failed verification must reject the document (result ${failedVerification.value.result}, status ${failureDoc.status})`
      );
    }
    const gateWithRejection = await evaluateBrandCatalogGate(tenant);
    if (gateWithRejection.cleared) throw new Error('the gate cleared with a rejected document');

    //     d2. the brand REPLACES it (next version); the rejected version is
    //         superseded + retained for audit, and the gate is STILL blocked.
    const rejectedVersion = failureDoc.version ?? 1;
    const replacement = replaceComplianceDocument({
      documentId: failureDoc.id,
      actor: commerceActor,
      reason: 'Deterministic demo: replacement after a failed verification.',
      ...simulatedEvidence(failureType),
    });
    if (!replacement.ok) throw new Error(`replacement refused: ${replacement.error}`);
    // Re-read from the store: replacement mutates the record in place.
    const supersededStatus = demoComplianceDocs.find((d) => d.id === failureDoc.id)?.status;
    if (supersededStatus !== 'superseded') {
      throw new Error(`the replaced document must be superseded (was ${supersededStatus})`);
    }
    if (replacement.value.version !== rejectedVersion + 1) {
      throw new Error('the replacement did not create the next document version');
    }
    const gateWithReplacement = await evaluateBrandCatalogGate(tenant);
    if (gateWithReplacement.cleared) throw new Error('the gate cleared on an unverified replacement');

    //     d3. the replacement PASSES automated verification.
    const replacementVerified = await verifyDocumentVersion(replacement.value.newDocument.id, ops, {
      getMode,
      providerKey: 'companies_house',
    });
    if (!replacementVerified.ok) {
      throw new Error(`replacement verification refused: ${replacementVerified.error}`);
    }
    if (replacement.value.newDocument.status !== 'approved') {
      throw new Error('the verified replacement did not clear its requirement');
    }

    // (e) AUTOMATED VERIFICATION for every remaining requirement.
    for (const type of requiredDocs) {
      if (type === failureType) continue;
      const doc = latestByType.get(type);
      if (!doc) throw new Error(`missing compliance record for ${type}`);
      const verified = await verifyDocumentVersion(doc.id, ops, {
        getMode,
        providerKey: 'companies_house',
      });
      if (!verified.ok) throw new Error(`verification refused for ${type}: ${verified.error}`);
      if (doc.status !== 'approved') {
        throw new Error(`${type} did not clear after a passing automated verification`);
      }
    }

    const clearedGate = await evaluateBrandCatalogGate(tenant);
    if (!clearedGate.cleared) {
      throw new Error(
        `gate not cleared after approval — missing [${clearedGate.missing.join(', ')}], blocking [${clearedGate.blocking
          .map((b) => `${b.type}:${b.status}`)
          .join(', ')}]`
      );
    }
    const verificationRecords = demoDocumentVerifications.filter((r) => r.brandId === tenant);
    // A `pending` record is a submission, not a verdict: only records that
    // actually carry a verdict can be judged for provenance.
    const verdictRecords = verificationRecords.filter(
      (r) => r.result === 'pass' || r.result === 'fail'
    );
    const failedRecords = verdictRecords.filter((r) => r.result === 'fail');
    const passRecords = verdictRecords.filter((r) => r.result === 'pass');
    if (failedRecords.length !== 1 || passRecords.length !== requiredDocs.length) {
      throw new Error(
        `verification ledger is not the expected size (fail=${failedRecords.length}, pass=${passRecords.length})`
      );
    }
    if (verdictRecords.some((r) => r.external)) {
      throw new Error('a verification record claimed an EXTERNAL provider verified the document');
    }
    if (!verdictRecords.every((r) => r.simulated)) {
      throw new Error('the demo verification verdicts are not marked simulated');
    }
    if (verdictRecords.some((r) => r.external === false && r.simulated === false)) {
      throw new Error('a demo verdict claims neither simulation nor an external provider');
    }
    const supersededRecords = verificationRecords.filter((r) => r.superseded === true);
    if (supersededRecords.length === 0) {
      throw new Error('superseded verification records were not retained for audit');
    }
    return {
      detail: `${requiredDocs.length} required document(s) submitted → pending verification (gate BLOCKED) → one deliberately failed → rejected → replaced as v${replacement.value.version} (v${rejectedVersion} superseded, audit retained) → replacement verified → all ${requiredDocs.length} requirements verified (simulated provider) → agreement ${contract.id} active → gate CLEARED.`,
      entityIds: [tenant, contract.id, ...requiredDocs],
      facts: {
        requiredDocs: requiredDocs.length,
        categoryExtraDocs: extraDocs.length,
        uploadedUnderReview: underReview.length,
        pendingVerificationRecords: pendingRecords.length,
        gateBlockedBeforeApproval: !blockedGate.cleared,
        blockedSubmissionReason: gateBlockedSubmissionReason,
        verificationFailureRejected: failedVerification.value.result === 'fail',
        gateBlockedWithRejection: !gateWithRejection.cleared,
        replacementVersion: replacement.value.version,
        supersededRetained: supersededStatus === 'superseded',
        gateBlockedWithReplacement: !gateWithReplacement.cleared,
        replacementVerified: replacement.value.newDocument.status === 'approved',
        verificationRecords: verificationRecords.length,
        verificationVerdicts: verdictRecords.length,
        failedVerificationRecords: failedRecords.length,
        passedVerificationRecords: passRecords.length,
        verificationSimulated: verdictRecords.every((r) => r.simulated === true),
        verificationExternalClaims: verdictRecords.filter((r) => r.external).length,
        supersededVerificationRecords: supersededRecords.length,
        gateClearedAfterApproval: clearedGate.cleared,
        agreementSigned: clearedGate.agreementSigned,
        logisticsSla: clearedGate.logisticsSlaAccepted,
        chargebackIndemnity: clearedGate.chargebackIndemnityAccepted,
      },
    };
  });

  /* 5 — CATALOGUE & PRODUCT SUBMISSION ----------------------------------- */
  await stage('catalogue', async () => {
    const product = demoProduct();
    addCatalogProduct(tenant, product);

    const readiness = await evaluateCatalogReadiness(
      tenant,
      product as unknown as Record<string, unknown>
    );
    if (!readiness.readyForSubmission) {
      throw new Error(
        `product not ready (complete=${readiness.complete}, compliant=${readiness.compliant}, missing=${readiness.missing.join(',')})`
      );
    }

    const submitted = await submitCatalogProduct(
      tenant,
      product as unknown as Record<string, unknown>,
      catalogueActor
    );
    if (!submitted.ok) throw new Error(`submission refused: ${submitted.error}`);
    const submission = submitted.value;
    submissionId = submission.id;

    // Deterministic polling through the mock SP-API seam: submitted →
    // under review → live. No ASIN is ever invented for a simulated result.
    let status = submission.status;
    for (let i = 0; i < 3; i += 1) {
      const poll = await pollCatalogSubmission(submissionId, catalogueActor);
      if (!poll.ok) throw new Error(`poll refused: ${poll.error}`);
      status = poll.value.status;
    }

    // Availability is a REAL control, not a display toggle.
    const offApplied = updateProductAvailability(INVESTOR_DEMO_SKU, false);
    const offRead = demoProducts.find((p) => p.sku === INVESTOR_DEMO_SKU)?.isAvailable;
    const onApplied = updateProductAvailability(INVESTOR_DEMO_SKU, true, 7);
    const onRead = demoProducts.find((p) => p.sku === INVESTOR_DEMO_SKU)?.isAvailable;

    return {
      detail: `Product ${INVESTOR_DEMO_SKU} submitted through the catalogue seam → ${status} (simulated provider ${submission.submissionId}); availability control verified ${String(offRead)} → ${String(onRead)}`,
      entityIds: [submission.id, product.id, INVESTOR_DEMO_SKU],
      facts: {
        readinessComplete: readiness.complete,
        readinessCompliant: readiness.compliant,
        submissionStatus: status,
        submissionMode: submission.mode,
        submissionSimulated: submission.simulated,
        availabilityOffApplied: offApplied && offRead === false,
        availabilityOnApplied: onApplied && onRead === true,
      },
    };
  });


  /* 6 — PURCHASE ORDER --------------------------------------------------- */
  await stage('purchase_order', async () => {
    const eligibility = await evaluateCommerceEligibility(tenant, INVESTOR_DEMO_SKU, commerceActor);
    if (!eligibility.ok) throw new Error(`eligibility refused: ${eligibility.error}`);
    if (!eligibility.value.eligible) {
      throw new Error(`not eligible — ${eligibility.value.reasons.join('; ')}`);
    }

    const created = await createCommercePurchaseOrder(
      tenant,
      INVESTOR_DEMO_SKU,
      DEMO_QUANTITY,
      commerceActor
    );
    if (!created.ok) throw new Error(`PO creation refused: ${created.error}`);
    const po = created.value;
    poId = po.id;
    poNumber = po.poNumber;

    // CANONICAL MONEY MATHS — asserted numerically, never assumed.
    const expectedValue = round2(DEMO_EX_WORKS_PRICE * DEMO_QUANTITY);
    const ratePct = resolveCommissionRatePct({
      commissionRate: po.commissionRate,
      commissionAmount: po.commissionAmount,
      poValue: po.poValue,
    });
    const expectedCommission = round2((po.poValue * ratePct) / 100);
    if (po.poValue !== expectedValue) {
      throw new Error(`poValue ${po.poValue} ≠ expected ${expectedValue}`);
    }
    if (po.commissionAmount !== expectedCommission) {
      throw new Error(
        `commissionAmount ${po.commissionAmount} ≠ ${expectedCommission} at ${ratePct}%`
      );
    }
    if (po.simulated !== true || po.mode !== 'simulation') {
      throw new Error('PO was not written with simulation provenance');
    }
    const line = po.lineItems[0];
    if (!line || line.quantity !== DEMO_QUANTITY || line.unitPrice !== DEMO_EX_WORKS_PRICE) {
      throw new Error('PO line items are not the ordered quantity/price');
    }
    return {
      detail: `Simulated PO ${po.poNumber} raised for ${DEMO_QUANTITY} × ${INVESTOR_DEMO_SKU} — £${po.poValue.toFixed(2)} value, £${po.commissionAmount.toFixed(2)} commission at ${ratePct}% (canonical maths). No email, no live provider.`,
      entityIds: [po.id, po.poNumber],
      facts: {
        poNumber: po.poNumber,
        status: po.status,
        poValue: po.poValue,
        commissionRatePct: ratePct,
        commissionAmount: po.commissionAmount,
        lineItems: po.lineItems.length,
        simulated: po.simulated === true,
        mode: po.mode ?? 'unknown',
      },
    };
  });

  /* 7 — PO ACKNOWLEDGEMENT ----------------------------------------------- */
  await stage('acknowledgement', async () => {
    const before = demoPurchaseOrders.find((p) => p.id === poId);
    if (!before) throw new Error('PO missing from the canonical store');
    // Vendor Central semantics: the 24h acknowledgement window is derived from
    // the PO's own order date — the same rule the UI countdown uses.
    const windowHours = 24;
    const wasUnacknowledged = !before.acknowledgedAt;
    const deadlineAt = new Date(
      Date.parse(before.orderDate) + windowHours * 3600_000
    ).toISOString();

    const acked = acknowledgeCommercePurchaseOrder(poId, commerceActor);
    if (!acked.ok) throw new Error(`acknowledgement refused: ${acked.error}`);
    const po = acked.value;
    if (!po.acknowledgedAt) throw new Error('acknowledgedAt was not recorded');
    if (po.status !== 'accepted' && po.status !== 'ready_to_fulfil') {
      throw new Error(`unexpected status after acknowledgement: ${po.status}`);
    }
    if (!po.lineItems.every((l) => l.ackStatus === 'accepted' && l.acknowledgedQty === l.quantity)) {
      throw new Error('line-level acknowledgements are not all accepted');
    }
    // A duplicate acknowledgement is refused (never a second transition).
    const duplicate = acknowledgeCommercePurchaseOrder(poId, commerceActor);
    if (duplicate.ok) throw new Error('duplicate acknowledgement was allowed');
    return {
      detail: `PO ${po.poNumber} acknowledged (all ${po.lineItems.length} line(s) accepted; ${windowHours}h window, open until ${deadlineAt}); duplicate acknowledgement refused.`,
      entityIds: [po.id],
      facts: {
        acknowledged: !!po.acknowledgedAt,
        status: po.status,
        acknowledgedLines: po.lineItems.length,
        acknowledgementWindowHours: windowHours,
        deadlineWarningBeforeAck: wasUnacknowledged,
        duplicateRefused: !duplicate.ok,
      },
    };
  });


  /* 8 — FULFILMENT / ASN -------------------------------------------------- */
  await stage('fulfilment', async () => {
    const fulfilled = fulfilCommercePurchaseOrder(poId, commerceActor);
    if (!fulfilled.ok) throw new Error(`fulfilment refused: ${fulfilled.error}`);
    shipId = fulfilled.value.shipmentId;
    const shipment = demoShipments.find((s) => s.id === shipId);
    if (!shipment) throw new Error('ASN/shipment was not created in the canonical store');
    if (shipment.brandId !== tenant) throw new Error('shipment was created for another tenant');
    return {
      detail: `ASN filed through the existing shipment seam — shipment ${shipId} created for ${tenant} (status ${shipment.status}), PO now ${fulfilled.value.po.status}`,
      entityIds: [shipId, fulfilled.value.po.id],
      facts: {
        shipmentStatus: shipment.status,
        carrier: shipment.carrier,
        poStatus: fulfilled.value.po.status,
        tenantOwnsShipment: shipment.brandId === tenant,
      },
    };
  });

  /* 9 — SHIPMENT MILESTONES ---------------------------------------------- */
  await stage('shipment', async () => {
    const milestones: string[] = [];
    let last = '';
    let refusedAtEnd = false;
    for (let i = 0; i < 12; i += 1) {
      const advanced = advanceCommerceShipment(shipId, commerceActor);
      if (!advanced.ok) {
        refusedAtEnd = true;
        break;
      }
      last = advanced.value.status;
      milestones.push(last);
    }
    if (milestones.length === 0) throw new Error('shipment did not advance a single milestone');
    if (!refusedAtEnd) throw new Error('shipment track did not terminate');
    if (last !== 'live_amazon') throw new Error(`unexpected terminal milestone: ${last}`);
    return {
      detail: `Shipment ${shipId} advanced through ${milestones.length} milestone(s): ${milestones.join(' → ')} — no live carrier API contacted.`,
      entityIds: [shipId],
      facts: {
        milestones: milestones.length,
        firstMilestone: milestones[0],
        finalMilestone: last,
        trackTerminated: refusedAtEnd,
      },
    };
  });

  /* 9b — SHIPPING LANE + COMMERCIAL MODEL -------------------------------- */
  await stage('shipping_commercial', async () => {
    // (a) THE CANONICAL ROUTING RULE — international → DHL, UK domestic →
    //     Palletline. Both lanes are proven, and an arbitrary carrier is refused.
    const ukLane = routing.resolveShippingLane({ brandNation: 'United Kingdom' });
    const intlLane = routing.resolveShippingLane({ brandNation: 'Zimbabwe' });
    const ukCarrier = routing.selectCarrierForShipment({ brandNation: 'United Kingdom' }).carrier;
    const intlCarrier = routing.selectCarrierForShipment({ brandNation: 'Zimbabwe' }).carrier;
    if (ukLane !== 'uk_domestic' || ukCarrier !== 'palletline') {
      throw new Error(`UK domestic lane did not route to Palletline (${ukLane}/${ukCarrier})`);
    }
    if (intlLane !== 'international' || intlCarrier !== 'dhl') {
      throw new Error(`international lane did not route to DHL (${intlLane}/${intlCarrier})`);
    }
    const badCarrier = routing.validateCarrierForShipment({ carrier: 'fedex', brandNation: 'Zimbabwe' });
    if (badCarrier.ok) throw new Error('an arbitrary carrier was accepted');

    // (b) PO-GATED SHIPMENT CREATION — the shipment in this run was derived from
    //     the demo brand's own eligible PO, and no other tenant can derive one.
    const shipment = demoShipments.find((s) => s.id === shipId);
    if (!shipment) throw new Error('the demo shipment is missing');
    // The seeded shipment rows carry their carrier as a string; the canonical
    // rule works on the CarrierId union, so narrow it once, here.
    const shipmentCarrier = shipment.carrier as CarrierId;
    const asn: AsnDetail = {
      cartons: [
        {
          sku: INVESTOR_DEMO_SKU,
          quantity: DEMO_QUANTITY,
          weightKg: 5,
          lengthCm: 30,
          widthCm: 20,
          heightCm: 15,
        },
      ],
      shipDate: '2026-10-01',
      carrier: shipmentCarrier,
    };
    const foreign = createShipmentForPO(poId, asn, undefined, 'brand-not-this-one');
    if (foreign.ok) throw new Error('another tenant created a shipment from this PO');
    const nonCanonical = createShipmentForPO(
      poId,
      { ...asn, carrier: 'fedex' as CarrierId },
      undefined,
      tenant
    );
    if (nonCanonical.ok) throw new Error('a non-canonical carrier shipment was created');

    // (c) THE COMMERCIAL BREAKDOWN — carrier list cost → negotiated discount →
    //     carrier invoice cost → mark-up/surcharge/handling → brand charge →
    //     VAT → shipping margin. Both sides of the deal are retained.
    const estimate = calc.computeShippingEstimate({
      carrier: shipmentCarrier,
      totalWeightKg: 120,
      totalCbm: 2,
      cartonCount: 10,
    });
    const commercials = calc.computeShippingCommercials({
      lane: intlLane,
      carrier: shipmentCarrier,
      carrierListCost: estimate.baseCarrierCost,
    });
    if (!(commercials.carrierInvoiceCost < commercials.carrierListCost)) {
      throw new Error('the negotiated discount did not reduce the carrier invoice cost');
    }
    if (!(commercials.brandAmountCharged > commercials.carrierInvoiceCost)) {
      throw new Error("the brand charge does not exceed Mercenta's carrier cost");
    }
    if (commercials.placeholderTerms !== true) {
      throw new Error('the commercial terms are not flagged as placeholders');
    }
    if (commercials.grossShippingMargin / commercials.brandAmountCharged >= 0.9) {
      throw new Error('the margin fraction looks like the retired hardcoded 90% rule');
    }

    // (d) THE UPFRONT BRAND CHARGE lands on the existing shipping-margin ledger.
    const margin = recordShippingMargin(
      calc.buildShippingMargin(
        shipment.id,
        tenant,
        shipment.carrier,
        commercials.carrierInvoiceCost,
        commercials.brandAmountCharged
      )
    );
    if (margin.brandBilledPrice !== commercials.brandAmountCharged) {
      throw new Error('the recorded brand charge does not match the canonical commercial model');
    }
    if (margin.carrierCostPrice !== commercials.carrierInvoiceCost) {
      throw new Error('the recorded carrier cost was overwritten by the brand price');
    }
    return {
      detail: `Lane resolution: UK domestic → ${ukCarrier.toUpperCase()}, international → ${intlCarrier.toUpperCase()} (arbitrary carrier refused). Shipment ${shipment.id} is PO-gated (foreign tenant and non-canonical carrier both refused). Commercials: list £${commercials.carrierListCost.toFixed(2)} − negotiated discount £${commercials.negotiatedDiscountAmount.toFixed(2)} = carrier invoice £${commercials.carrierInvoiceCost.toFixed(2)} → brand charged £${commercials.brandAmountCharged.toFixed(2)} UPFRONT (mark-up £${commercials.markUpAmount.toFixed(2)}, surcharge £${commercials.surchargeAmount.toFixed(2)}, handling £${commercials.handlingFee.toFixed(2)}, VAT £${commercials.vatAmount.toFixed(2)}), gross shipping margin £${commercials.grossShippingMargin.toFixed(2)}, Mercenta net £${commercials.netMercentaRevenue.toFixed(2)}.`,
      entityIds: [shipment.id, margin.id, poId],
      facts: {
        ukLaneCarrier: ukCarrier,
        intlLaneCarrier: intlCarrier,
        arbitraryCarrierRefused: !badCarrier.ok,
        foreignTenantShipmentRefused: !foreign.ok,
        nonCanonicalCarrierShipmentRefused: !nonCanonical.ok,
        shipmentCarrier: shipment.carrier,
        carrierListCost: commercials.carrierListCost,
        negotiatedDiscount: commercials.negotiatedDiscountAmount,
        carrierInvoiceCost: commercials.carrierInvoiceCost,
        markUpAmount: commercials.markUpAmount,
        surchargeAmount: commercials.surchargeAmount,
        handlingFee: commercials.handlingFee,
        brandAmountCharged: commercials.brandAmountCharged,
        vatAmount: commercials.vatAmount,
        grossShippingMargin: commercials.grossShippingMargin,
        netMercentaRevenue: commercials.netMercentaRevenue,
        placeholderTerms: commercials.placeholderTerms,
        chargeRecordedUpfront: true,
        carrierCostRetained: margin.carrierCostPrice,
        marginFractionBelowRetiredRule:
          commercials.grossShippingMargin / commercials.brandAmountCharged < 0.9,
      },
    };
  });


  /* 10 — DELIVERY, RECEIVING, INVOICE & PAYMENT -------------------------- */
  await stage('delivery', async () => {
    const received = receiveCommercePurchaseOrder(poId, commerceActor);
    if (!received.ok) throw new Error(`receiving refused: ${received.error}`);
    const { po, shortfalls, deductions } = received.value;
    if (po.status !== 'delivered') throw new Error(`PO did not reach delivered (${po.status})`);

    // SIMULATED goods invoice + SIMULATED payment (E4) — no accounting or
    // payment provider is contacted; both are keyed deterministically by the PO.
    const invoiced = issueCommerceInvoice(poId, commerceActor);
    if (!invoiced.ok) throw new Error(`invoice refused: ${invoiced.error}`);
    invoiceId = invoiced.value.id;
    const paid = recordCommercePayment(invoiceId, commerceActor);
    if (!paid.ok) throw new Error(`payment refused: ${paid.error}`);
    if (paid.value.status !== 'settled') throw new Error('simulated payment did not settle');

    const canonicalInvoice = getCommerceInvoiceForPo(poId);
    if (!canonicalInvoice || canonicalInvoice.status !== 'paid') {
      throw new Error('the canonical invoice did not move to paid');
    }
    return {
      detail: `Goods received for ${po.poNumber} — PO delivered, ${shortfalls.length} shortfall line(s); simulated invoice ${invoiced.value.number} issued and settled by a simulated bank transfer (£${paid.value.amountGbp.toFixed(2)}). No payment provider contacted.`,
      entityIds: [po.id, invoiced.value.id, paid.value.id],
      facts: {
        poStatus: po.status,
        shortfalls: shortfalls.length,
        autoDeductions: deductions.length,
        invoiceIssued: true,
        invoiceStatus: canonicalInvoice.status,
        invoiceSubtotalGbp: canonicalInvoice.subtotalGbp,
        paymentStatus: paid.value.status,
        paymentMethod: paid.value.method,
        paymentAmountGbp: paid.value.amountGbp,
      },
    };
  });


  /* 11 — RETURNS ---------------------------------------------------------- */
  await stage('returns', async () => {
    const po = demoPurchaseOrders.find((p) => p.id === poId);
    if (!po) throw new Error('PO missing — a return is derived from canonical commerce state');

    const created = addReturn({
      id: DEMO_RETURN_ID,
      brandId: tenant,
      poNumber: po.poNumber,
      productSku: INVESTOR_DEMO_SKU,
      productName: 'Cape Verdant Wild Herb Blend 500g',
      quantity: 6,
      reason: 'damaged_in_transit',
      description: 'Investor demo: 6 units damaged in transit (simulated).',
      returnDate: '2026-09-13',
    });

    // Warehouse tracking on the EXISTING returns-tracking store.
    const tracking = recordWarehouseReceipt({
      returnId: created.id,
      brandId: tenant,
      inboundCarrier: 'DHL (simulated)',
      inboundTrackingNumber: 'SIM-DHL-RET-0001',
      conditionOnReceipt: 'Carton crushed in transit — 6 units unsaleable (simulated).',
    });
    const checked = recordQualityCheck(
      tracking.id,
      false,
      'Simulated QC: 6 units confirmed damaged and unsaleable.'
    );
    if (!checked) throw new Error('quality check did not record');

    const readBack = getReturnTracking(created.id);
    if (!readBack || readBack.brandId !== tenant) {
      throw new Error('return tracking is not tenant-scoped');
    }
    if (readBack.status !== 'quality_checked') {
      throw new Error(`unexpected return tracking status: ${readBack.status}`);
    }
    // Another tenant's ledger never contains this return.
    const foreignLedger = demoReturns.filter(
      (r) => r.brandId === 'brand-deskforge' && r.id === created.id
    );
    if (foreignLedger.length > 0) throw new Error('return leaked into another tenant ledger');
    return {
      detail: `Return ${created.id} raised against canonical PO ${po.poNumber} (${created.quantity} units, ${created.reason}); warehouse tracking ${readBack.status}, tenant-scoped.`,
      entityIds: [created.id, tracking.id],
      facts: {
        returnId: created.id,
        poNumber: created.poNumber,
        quantity: created.quantity,
        reason: created.reason,
        trackingStatus: readBack.status,
        qualityCheckPassed: readBack.qualityCheckPassed === true,
        tenantOwnsReturn: true,
        foreignLedgerLeak: false,
      },
    };
  });


  /* 12 — DEDUCTIONS / CHARGEBACKS ---------------------------------------- */
  await stage('deductions', async () => {
    const raised = raiseCommerceException(
      poId,
      'shortage_claim',
      45.5,
      'Investor demo: simulated receiving discrepancy on the delivered PO.',
      commerceActor,
      { id: DEMO_DEDUCTION_ID }
    );
    if (!raised.ok) throw new Error(`exception refused: ${raised.error}`);
    const deduction = raised.value;
    if (deduction.brandId !== tenant) throw new Error('deduction was not pinned to the demo tenant');

    const brandLedger = listBrandCommerceExceptions(tenant, commerceActor);
    if (!brandLedger.ok) throw new Error(`brand ledger refused: ${brandLedger.error}`);
    const inBrandLedger = brandLedger.value.some((d) => d.id === deduction.id);

    const opsLedger = listAllCommerceExceptions(ops);
    if (!opsLedger.ok) throw new Error(`operator ledger refused: ${opsLedger.error}`);
    const inOperatorLedger = opsLedger.value.some((d) => d.id === deduction.id);

    // A foreign tenant can never read this ledger.
    const foreignActor: CommerceActor = {
      staffId: 'brand:brand-deskforge',
      canMutate: true,
      tenantId: 'brand-deskforge',
    };
    const foreignRead = listBrandCommerceExceptions(tenant, foreignActor);

    if (!inBrandLedger) throw new Error('deduction missing from the brand ledger');
    if (!inOperatorLedger) throw new Error('deduction missing from the operator ledger');
    if (foreignRead.ok) throw new Error('foreign tenant read the brand ledger');
    return {
      detail: `Deduction ${deduction.id} (£${deduction.amountGbp.toFixed(2)}, ${deduction.type}) raised on ${deduction.purchaseOrderId} — visible to the brand AND the operator, refused for a foreign tenant.`,
      entityIds: [deduction.id],
      facts: {
        deductionId: deduction.id,
        amountGbp: deduction.amountGbp,
        type: deduction.type,
        status: deduction.status,
        inBrandLedger,
        inOperatorLedger,
        foreignReadRefused: !foreignRead.ok,
        simulated: deduction.simulated === true,
      },
    };
  });

  /* 13 — DISPUTE & OPERATOR RESOLUTION ----------------------------------- */
  await stage('dispute', async () => {
    const opened = openCommerceDispute(
      DEMO_DEDUCTION_ID,
      'Brand disputes the shortage claim; signed POD shows full cartons (simulated evidence).',
      commerceActor
    );
    if (!opened.ok) throw new Error(`dispute refused: ${opened.error}`);
    if (opened.value.status !== 'disputed') {
      throw new Error(`unexpected status after dispute: ${opened.value.status}`);
    }

    // A brand cannot declare its own outcome.
    const brandResolve = resolveCommerceDispute(DEMO_DEDUCTION_ID, 'won', commerceActor);
    const afterRefusal = demoDeductions.find((d) => d.id === DEMO_DEDUCTION_ID);
    if (brandResolve.ok) throw new Error('a brand declared its own dispute outcome');
    if (afterRefusal?.status !== 'disputed' || afterRefusal?.dispute?.outcome) {
      throw new Error('the refused brand resolution mutated canonical state');
    }

    // The OPERATOR decides, and the outcome is the canonical recorded state.
    const resolved = resolveCommerceDispute(DEMO_DEDUCTION_ID, 'partial', ops);
    if (!resolved.ok) throw new Error(`operator resolution refused: ${resolved.error}`);
    if (resolved.value.status !== 'resolved' || resolved.value.dispute?.outcome !== 'partial') {
      throw new Error('the operator outcome was not recorded');
    }
    const brandRead = listBrandCommerceExceptions(tenant, commerceActor);
    const opsRead = listAllCommerceExceptions(ops);
    const brandOutcome = brandRead.ok
      ? brandRead.value.find((d) => d.id === DEMO_DEDUCTION_ID)?.dispute?.outcome
      : undefined;
    const opsOutcome = opsRead.ok
      ? opsRead.value.find((d) => d.id === DEMO_DEDUCTION_ID)?.dispute?.outcome
      : undefined;
    if (brandOutcome !== 'partial' || opsOutcome !== 'partial') {
      throw new Error(`outcome is not consistent across surfaces (${brandOutcome}/${opsOutcome})`);
    }
    return {
      detail: `Dispute opened on ${DEMO_DEDUCTION_ID} → brand resolution REFUSED → operator resolved as 'partial'; outcome consistent on the brand and operator surfaces.`,
      entityIds: [DEMO_DEDUCTION_ID],
      facts: {
        brandOutcomeRefused: !brandResolve.ok,
        outcome: 'partial',
        status: resolved.value.status,
        consistentAcrossSurfaces: brandOutcome === opsOutcome,
      },
    };
  });


  /* 14 — COMMISSION ACCRUAL ---------------------------------------------- */
  await stage('commission', async () => {
    const po = demoPurchaseOrders.find((p) => p.id === poId);
    if (!po) throw new Error('PO missing from the canonical store');

    // The commission LEDGER IS A PROJECTION of the PO store — never a second
    // ledger. The accepted/delivered PO must therefore have accrued one.
    const commission = listCommissionsForPayout().find((c) => c.id === `comm-${po.id}`);
    if (!commission) throw new Error('no commission accrued for the delivered PO');
    if (commission.brandId !== tenant) throw new Error('commission is not tenant-scoped');
    commissionId = commission.id;

    const ratePct = resolveCommissionRatePct({
      commissionRate: commission.commissionRate,
      commissionAmount: commission.commissionAmount,
      poValue: commission.poValue,
    });
    const expectedCommission = round2((commission.poValue * ratePct) / 100);
    const expectedNet = computeBrandNetShare({
      poValue: commission.poValue,
      commissionRatePct: ratePct,
      fulfillmentTrack: 'direct_fulfillment',
    });
    if (commission.commissionAmount !== expectedCommission) {
      throw new Error(
        `commission £${commission.commissionAmount} ≠ canonical £${expectedCommission} at ${ratePct}%`
      );
    }
    if (expectedNet !== round2(commission.poValue - expectedCommission)) {
      throw new Error('brand net share is not PO value minus the commission');
    }
    return {
      detail: `Commission ${commission.id} accrued from the delivered PO — £${commission.poValue.toFixed(2)} value, £${commission.commissionAmount.toFixed(2)} commission at ${ratePct}%, £${expectedNet.toFixed(2)} payable to the brand (status ${commission.status}).`,
      entityIds: [commission.id, po.poNumber],
      facts: {
        commissionId: commission.id,
        poValue: commission.poValue,
        commissionRatePct: ratePct,
        commissionAmount: commission.commissionAmount,
        netShareGbp: expectedNet,
        statusBeforeSettlement: commission.status,
      },
    };
  });

  /* 15 — BRAND PAYOUT SETTLEMENT (reconciliation-gated) ------------------- */
  await stage('payout', async () => {
    const before = listCommissionsForPayout().filter(
      (c) => c.brandId === tenant && c.status !== 'paid'
    );
    if (before.length === 0) throw new Error('no pending payout for the brand');

    // (a) A payout must NOT be possible before the payment is reconciled: the
    //     eligibility gate is evaluated FIRST and must refuse.
    const payment = demoCommercePayments.find((p) => p.brandId === tenant);
    if (!payment) throw new Error('no simulated payment was recorded for the demo tenant');
    const preReconciliation = evaluatePayoutEligibility(commissionId);
    if (preReconciliation.eligible) {
      throw new Error('a payout was eligible BEFORE the payment was reconciled');
    }
    const blockedBeforeReconciliation = await settleBrandPayout(commissionId, ops.staffId);
    if (blockedBeforeReconciliation.ok) {
      throw new Error('a payout was submitted before the payment was reconciled');
    }
    // Snapshot the refusal reason NOW: later attempts legitimately overwrite the
    // live payout record's blockedReason.
    const blockedPayoutRecord = demoPayouts.find((p) => p.commissionId === commissionId);
    const blockedPayoutReasonAtReconciliation = blockedPayoutRecord?.blockedReason ?? '';

    // (b) THE VERIFIED PAYOUT DESTINATION — a payout to an unverified account is
    //     refused, then the operator verifies it through the audited action.
    const destination = ensurePayoutDestination(tenant);
    const unverifiedAttempt = await settleBrandPayout(commissionId, ops.staffId);
    if (unverifiedAttempt.ok) {
      throw new Error('a payout was sent to an unverified destination');
    }
    const verified = setDestinationStatus(destination.id, 'verified', ops, {
      verificationMethod: 'Mercenta operator review (simulated)',
      verificationRef: `SIM-DEST-VERIFY-${tenant}`,
    });
    if (!verified.ok) throw new Error(`destination verification refused: ${verified.error}`);

    // (c) RECONCILE the received payment to its PO identity.
    const reconciliation = await reconcilePayment(payment.id, ops, { getMode, providerKey: 'xero' });
    if (!reconciliation.ok) throw new Error(`reconciliation refused: ${reconciliation.error}`);
    const rec = reconciliation.value;
    if (rec.state !== 'reconciled') {
      throw new Error(`reconciliation is ${rec.state}: ${rec.exceptionReason}`);
    }
    if (rec.purchaseOrderId !== poId) throw new Error('the reconciliation matched the WRONG PO');
    if (!rec.accounting.represented || rec.accounting.mode !== 'simulation') {
      throw new Error('the accounting representation was not written by the simulation seam');
    }
    if (!rec.accounting.simulated) {
      throw new Error('the accounting representation claims an EXTERNAL posting');
    }

    // (d) DUPLICATE-RECONCILIATION GUARD — the same payment reconciles once.
    const replay = await reconcilePayment(payment.id, ops, { getMode, providerKey: 'xero' });
    if (!replay.ok || replay.value.id !== rec.id) {
      throw new Error('the same payment produced a second reconciliation identity');
    }
    if (demoReconciliations.filter((r) => r.paymentId === payment.id).length !== 1) {
      throw new Error('duplicate reconciliation rows exist for one payment');
    }

    const eligible = evaluatePayoutEligibility(commissionId);
    if (!eligible.eligible) {
      throw new Error(`still not eligible after reconciliation: ${eligible.blockers.join('; ')}`);
    }

    // (e) SETTLE through the ONE canonical settlement path.
    const settled = await settleBrandPayout(commissionId, ops.staffId);
    if (!settled.ok) throw new Error(`settlement refused: ${settled.error}`);
    if (settled.mode !== 'mock') throw new Error(`payout mode is "${settled.mode}" — not a simulation`);
    if (!settled.transferId || !settled.transferId.startsWith('mock_tr_')) {
      throw new Error(`unexpected simulated transfer id: ${settled.transferId}`);
    }

    // The canonical audit row is written ONLY after the transfer succeeds.
    const auditRow = demoAuditLog.find(
      (e) => e.action === 'commission_payout_settled' && e.entityId === commissionId
    );
    if (!auditRow || auditRow.brandId !== tenant) {
      throw new Error('payout settlement was not audited for the tenant');
    }

    // DOUBLE-PAYOUT GUARD — a second settlement must be refused.
    const second = await settleBrandPayout(commissionId, ops.staffId);
    if (second.ok) throw new Error('a commission was paid twice');

    const pendingAfter = listCommissionsForPayout().filter(
      (c) => c.brandId === tenant && c.status !== 'paid'
    );
    if (pendingAfter.length !== 0) throw new Error('the settled payout is still pending');

    const payoutRecord = demoPayouts.find((p) => p.commissionId === commissionId);
    if (!payoutRecord || payoutRecord.state !== 'settled') {
      throw new Error(`the payout identity did not reach settled (${payoutRecord?.state})`);
    }
    if (payoutRecord.reconciliationId !== rec.id) {
      throw new Error('the payout is not linked to its reconciliation');
    }
    if (getReconciliationForPayment(payment.id)?.id !== rec.id) {
      throw new Error('the reconciliation is not readable by its payment identity');
    }
    const standing = financialStandingForBrand(tenant);
    if (standing.settledPayoutCount !== 1) {
      throw new Error(`the brand standing reports ${standing.settledPayoutCount} settled payouts`);
    }
    return {
      detail: `Payment ${payment.id} reconciled to ${rec.purchaseOrderNumber} (accounting representation ${rec.accounting.representationId}, simulated) → destination ${destination.accountRefMasked} verified → payout settled as ${settled.transferId}, net £${(settled.netShareGbp ?? 0).toFixed(2)}. Blocked BEFORE reconciliation and BEFORE destination verification; second settlement refused (double-payout guard).`,
      entityIds: [commissionId, settled.transferId ?? '', rec.id, destination.id],
      facts: {
        settled: true,
        payoutMode: settled.mode,
        netShareGbp: settled.netShareGbp ?? 0,
        auditRecorded: true,
        pendingBefore: before.length,
        pendingAfter: pendingAfter.length,
        doublePayoutRefused: !second.ok,
        blockedBeforeReconciliation: !blockedBeforeReconciliation.ok,
        blockedReason: blockedPayoutReasonAtReconciliation,
        blockedReasonAtReconciliation: blockedPayoutReasonAtReconciliation,
        blockedBeforeDestinationVerification: !unverifiedAttempt.ok,
        destinationStatus: destination.status,
        reconciliationId: rec.id,
        reconciliationState: rec.state,
        reconciliationsForPayment: demoReconciliations.filter((r) => r.paymentId === payment.id).length,
        accountingRepresented: rec.accounting.represented,
        accountingSimulated: rec.accounting.simulated,
        accountingProvider: rec.accounting.provider,
        commissionAmountGbp: rec.fact.commissionAmountGbp,
        netToBrandGbp: rec.fact.netToBrandGbp,
        deductionsAppliedGbp: rec.fact.deductionsAppliedGbp,
        vatTreatment: rec.fact.vatTreatment,
        vatConfigured: rec.fact.vatConfigured,
        vatAmountGbp: vatAmountFor(rec.fact.netToBrandGbp) ?? 0,
        payoutState: payoutRecord.state,
        payoutAttempts: payoutRecord.attempts,
        settledPayoutCount: standing.settledPayoutCount,
      },
    };
  });


  /* 16 — CRM LIFECYCLE ---------------------------------------------------- */
  await stage('crm', async () => {
    const meta = getCrmMeta(tenant);
    const timeline = buildBrandTimeline(tenant);
    const po = demoPurchaseOrders.find((p) => p.id === poId);
    const poEntry = timeline.find((e) => e.kind === 'system_po' && e.ref === po?.poNumber);
    if (!poEntry) throw new Error('the CRM timeline did not reflect the canonical PO state');
    const hasDeduction = timeline.some((e) => e.kind === 'system_deduction');
    const hasCompliance = timeline.some((e) => e.kind === 'system_compliance');
    const hasContract = timeline.some((e) => e.kind === 'system_contract');
    if (!hasDeduction || !hasCompliance || !hasContract) {
      throw new Error('the CRM timeline did not reflect the real domain state');
    }
    // Tenant boundary: another tenant's timeline has none of this.
    const otherTimeline = buildBrandTimeline('brand-deskforge');
    const leak = otherTimeline.some(
      (e) => e.kind === 'system_po' && e.ref === po?.poNumber
    );
    if (leak) throw new Error('the demo PO leaked into another tenant CRM timeline');
    return {
      detail: `CRM: ${tenant} has lifecycle "${meta.lifecycleStage}" and a real ${timeline.length}-entry activity timeline (PO, contract, compliance, deduction) — no cross-tenant leakage.`,
      entityIds: [tenant],
      facts: {
        lifecycleStage: meta.lifecycleStage,
        timelineEntries: timeline.length,
        poInTimeline: !!poEntry,
        deductionInTimeline: hasDeduction,
        complianceInTimeline: hasCompliance,
        contractInTimeline: hasContract,
        crossTenantLeak: leak,
      },
    };
  });

  /* 17 — ACQUISITION / MARKETING ----------------------------------------- */
  await stage('marketing', async () => {
    // The acquisition universe is the canonical Brand Intelligence prospect
    // store — deterministic, and no mock lead list is introduced.
    const prospects = getProspects();
    const leads = getAcquisitionLeads();
    if (prospects.length < 10) throw new Error('canonical prospect universe is not populated');

    // The demo tenant is a REAL pipeline row (same onboarding record).
    const pipelineRow = listOnboardingPipeline().find(
      (r) => r.onboarding.brandId === tenant
    );
    if (!pipelineRow) throw new Error('the demo tenant is missing from the onboarding pipeline');

    // Simulated outreach is objectively identifiable and never live.
    const transport = resolveOutreachTransport(INITIAL_INTEGRATIONS.email, null);
    if (transport.live) throw new Error('outreach transport resolved LIVE in the demo environment');
    const candidates = new Set(leads.map((l) => l.outreachStatus));
    return {
      detail: `Marketing: ${prospects.length} canonical prospects / ${leads.length} ICP leads (deterministic), demo tenant present in the onboarding pipeline; outreach transport is ${transport.providerState} (${transport.resolvedMode}, live=${String(transport.live)}) — no message is sent.`,
      entityIds: [tenant],
      facts: {
        prospects: prospects.length,
        icpLeads: leads.length,
        pipelineRowPresent: true,
        outreachMode: transport.resolvedMode,
        outreachProviderState: transport.providerState,
        outreachLive: transport.live,
        distinctLeadStatuses: candidates.size,
      },
    };
  });


  /* 18 — INTEGRATION HUB (SIMULATION) ------------------------------------ */
  await stage('integrations', async () => {
    const modes = INTEGRATION_ORDER.map((id) => ({ id, mode: getMode(id) }));
    const simulationProviders = modes.filter((m) => isProviderSimulationSafe(m.mode));
    const refusalReasons = modes
      .filter((m) => !isProviderSimulationSafe(m.mode))
      .map((m) => `${m.id}:${m.mode}`);

    // The providers the lifecycle actually relies on MUST be simulation-safe.
    const required = ['amazon_sp_api', 'dhl', 'stripe', 'xero', 'companies_house', 'hmrc'];
    const unsafeRequired = required.filter(
      (id) => !isProviderSimulationSafe(modes.find((m) => m.id === id)?.mode)
    );
    if (unsafeRequired.length > 0) {
      throw new Error(`required provider(s) not simulation-safe: ${unsafeRequired.join(', ')}`);
    }

    // FAIL-CLOSED PROOFS (unknown is never simulation; live is never simulation).
    const unknownMode = resolveProviderMode({}, 'amazon_sp_api');
    const unknownSafe = isProviderSimulationSafe(unknownMode);
    const liveMode = modeForState(
      { status: 'connected', sandbox: false },
      integrationMeta('amazon_sp_api').defaultMode
    );
    const sandboxMode = modeForState(
      { status: 'connected', sandbox: true },
      integrationMeta('amazon_sp_api').defaultMode
    );
    const disabledMode = modeForState(
      { status: 'connected', sandbox: true, disabled: true },
      integrationMeta('amazon_sp_api').defaultMode
    );
    if (unknownSafe) throw new Error('an unknown/unregistered provider was treated as simulation');
    if (isProviderSimulationSafe(liveMode)) throw new Error('a LIVE connection was treated as simulation');
    if (liveMode !== 'live' || sandboxMode !== 'simulation' || disabledMode !== 'disabled') {
      throw new Error('integration mode derivation is not truthful');
    }
    return {
      detail: `Integration Hub: ${modes.length} provider(s) resolved, ${simulationProviders.length} positively simulation, ${refusalReasons.length} not simulation-safe; unknown → ${unknownMode} (refused), live connection → ${liveMode} (refused), sandbox → ${sandboxMode} (${INTEGRATION_MODE_LABELS[sandboxMode] ?? ''}).`,
      entityIds: modes.map((m) => m.id),
      facts: {
        providers: modes.length,
        simulationProviders: simulationProviders.length,
        notSimulationSafe: refusalReasons.length,
        requiredProvidersSafe: required.length - unsafeRequired.length,
        unknownMode,
        unknownIsUnsafe: !unknownSafe,
        liveMode,
        liveIsUnsafe: !isProviderSimulationSafe(liveMode),
        sandboxMode,
        disabledMode,
      },
    };
  });


  /* 18b — CASES: Mercenta review BEFORE channel escalation -------------- */
  await stage('cases', async () => {
    resetMockAmazonCases();
    resetCaseSequence(0);

    // (a) THE BRAND OPENS A CASE against its own tenant + related entities.
    const kase = createCase({
      brandId: tenant,
      subject: `Deduction query on ${DEMO_DEDUCTION_ID}`,
      description: 'Brand disputes the resolved shortage amount and asks Mercenta to review.',
      caseCategory: 'deduction',
      relatedDeductionId: DEMO_DEDUCTION_ID,
      relatedPoNumber: poNumber,
      id: `case-${tenant}-deduction`,
      caseRef: 'MC-0001',
    });
    if (kase.escalationState !== 'brand_submitted' || !kase.caseRef) {
      throw new Error(`a new brand case must await Mercenta review (${kase.escalationState})`);
    }
    // A fresh read for every later assertion (the store is the source of truth).
    const live = () => getTicketById(kase.id);

    // (b) NO CHANNEL ESCALATION BEFORE REVIEW — the provider path is refused.
    const early = await escalateCaseToProvider(kase.id, ops.staffId, 'simulation');
    if (early.ok || live()?.amazonCase) {
      throw new Error('a case reached the retail channel before Mercenta review');
    }

    // (c) MERCENTA ADMIN REVIEWS IT.
    const begun = beginCaseReview(kase.id, ops.staffId);
    if (!begun.ok || live()?.escalationState !== 'under_mercenta_review') {
      throw new Error(`review did not start: ${begun.error}`);
    }
    const reviewed = reviewCase(
      kase.id,
      ops.staffId,
      'approve_escalation',
      'Verified against the signed POD; escalating to the retail channel.'
    );
    if (!reviewed.ok || live()?.escalationState !== 'approved_for_escalation') {
      throw new Error(`review decision not recorded: ${reviewed.error}`);
    }

    // (d) FAIL-CLOSED: an unknown provider mode never opens a provider case.
    const unknownMode = await escalateCaseToProvider(kase.id, ops.staffId, 'unknown');
    if (unknownMode.ok || live()?.amazonCase) {
      throw new Error('an unknown provider mode simulated a channel case');
    }

    // (e) ESCALATION — only now, and idempotent.
    const escalated = await escalateCaseToProvider(kase.id, ops.staffId, 'simulation');
    if (!escalated.ok || !/^AMZ-CASE-MOCK-/.test(escalated.caseReferenceId ?? '')) {
      throw new Error(`escalation did not open a clearly-fake provider case: ${escalated.error}`);
    }
    if (live()?.amazonCase?.simulated !== true) {
      throw new Error('the provider case is not marked simulated');
    }
    const again = await escalateCaseToProvider(kase.id, ops.staffId, 'simulation');
    if (!again.ok || again.caseReferenceId !== escalated.caseReferenceId) {
      throw new Error('escalation was not idempotent');
    }

    // (f) THE PROVIDER RESPONDS, THEN MERCENTA RESOLVES.
    const responded = recordProviderCaseResponse(kase.id, ops.staffId, {
      outcome: 'accepted',
      response: 'Retail channel confirmed the deduction adjustment; credit note to follow.',
    });
    if (!responded.ok || live()?.escalationState !== 'provider_responded') {
      throw new Error(`provider response not recorded: ${responded.error}`);
    }
    const resolvedCase = resolveCase(
      kase.id,
      ops.staffId,
      'Deduction adjusted with the retail channel; brand notified.'
    );
    if (!resolvedCase.ok || live()?.escalationState !== 'resolved') {
      throw new Error(`case resolution not recorded: ${resolvedCase.error}`);
    }
    const finalCase = live();

    // (g) TENANT-SCOPED READS.
    const brandCases = listCasesForBrand(tenant);
    const foreignCases = listCasesForBrand('brand-deskforge');
    if (!brandCases.some((c) => c.id === kase.id) || foreignCases.length !== 0) {
      throw new Error('case reads are not tenant-scoped');
    }
    if (!listAllCases().some((c) => c.id === kase.id)) {
      throw new Error('the operator read model cannot see the case');
    }
    const caseAudit = demoAuditLog.filter((e) => e.brandId === tenant && /^case_/.test(e.action));
    if (caseAudit.length < 3) {
      throw new Error(`the case lifecycle is not fully audited (${caseAudit.length} rows)`);
    }
    return {
      detail: `Brand case ${kase.caseRef} opened against ${DEMO_DEDUCTION_ID} → channel escalation REFUSED before review → Mercenta reviewed and approved escalation → provider case ${escalated.caseReferenceId} opened (simulated, idempotent) → provider response recorded → case resolved. Tenant-scoped reads verified; ${caseAudit.length} audit rows.`,
      entityIds: [kase.id, escalated.caseReferenceId ?? '', DEMO_DEDUCTION_ID],
      facts: {
        caseRef: kase.caseRef ?? '',
        escalationState: finalCase?.escalationState ?? '',
        escalationBeforeReviewRefused: !early.ok,
        reviewRecorded: finalCase?.adminReview?.decision === 'approve_escalation',
        unknownModeRefused: !unknownMode.ok,
        providerCaseOpened: /^AMZ-CASE-MOCK-/.test(escalated.caseReferenceId ?? ''),
        providerCaseSimulated: finalCase?.amazonCase?.simulated === true,
        escalationIdempotent: again.caseReferenceId === escalated.caseReferenceId,
        providerResponseRecorded: !!finalCase?.providerResponse,
        resolved: finalCase?.escalationState === 'resolved',
        brandCases: brandCases.length,
        foreignCases: foreignCases.length,
        auditRows: caseAudit.length,
      },
    };
  });


  /* 19 — MERCENTA SOCIAL (deterministic engine seam) --------------------- */
  await stage('social', async () => {
    // FAIL-CLOSED factory: only a positively identified simulation executes.
    const refusedModes = ['configured', 'live', 'degraded', 'error', 'disabled', 'unknown'];
    const wronglyAccepted = refusedModes.filter((m) => createSocialEngineClient(m).ok);
    if (wronglyAccepted.length > 0) {
      throw new Error(`non-simulation social modes were accepted: ${wronglyAccepted.join(', ')}`);
    }
    const factory = createSocialEngineClient('simulation');
    if (!factory.ok) throw new Error(`simulation social client refused: ${factory.error}`);
    const engine = factory.value;

    // connect a simulated channel
    const channel = engine.connectChannel('x');
    if (!channel.ok) throw new Error(`channel connect refused: ${channel.error}`);
    if (channel.value.simulated !== true) throw new Error('channel is not marked simulated');

    // create a post → QUEUE (scheduled in the future)
    const scheduled = engine.createPost({
      channelId: channel.value.id,
      body: 'Cape Verdant launches with Mercenta (simulated)',
      scheduledFor: '2026-09-14T09:00:00.000Z',
    });
    if (!scheduled.ok || scheduled.value.state !== 'QUEUE') {
      throw new Error('scheduled post did not enter the queue');
    }

    // the queue is deterministic: a not-yet-due schedule is NOT executed
    const early = engine.runQueue('2026-09-13T09:00:00.000Z');
    if (early.length !== 0) throw new Error('queue executed a post before its schedule');

    // execute the queue → simulated publish with a sim-only release id
    engine.runQueue('2026-09-14T09:00:00.000Z');
    const published = engine.listPosts().find((p) => p.id === scheduled.value.id);
    if (!published || published.state !== 'PUBLISHED') {
      throw new Error('scheduled post was not published');
    }
    if (!published.releaseId?.startsWith('sim-rel-')) {
      throw new Error(`release id is not unmistakably simulated: ${published.releaseId}`);
    }

    // failure → retry → recovery on a degraded provider
    engine.connectChannel('tiktok');
    const failing = engine.createPost({
      channelId: 'sim-ch-tiktok',
      body: `Degraded provider ${SIMULATED_FAILURE_MARKER} recovery proof`,
    });
    if (!failing.ok) throw new Error('failure-path post was not created');
    engine.runQueue('2026-09-14T09:00:00.000Z');
    const failed = engine.listPosts().find((p) => p.id === failing.value.id);
    if (!failed || failed.state !== 'ERROR') throw new Error('the degraded provider did not fail');
    const retried = engine.retryPost(failed.id);
    if (!retried.ok || retried.value.state !== 'PUBLISHED') {
      throw new Error('retry did not recover the failed post');
    }

    // cancel a queued item → DRAFT (held back for review)
    const toCancel = engine.createPost({
      channelId: channel.value.id,
      body: 'Draft held back for review (simulated)',
    });
    if (!toCancel.ok) throw new Error('cancel-path post was not created');
    const cancelled = engine.cancelPost(toCancel.value.id);
    if (!cancelled.ok || cancelled.value.state !== 'DRAFT') {
      throw new Error('queued post did not cancel back to DRAFT');
    }

    // analytics reflect the same canonical simulation state
    const analytics = engine.analytics();
    const live = engine.listPosts();
    if (
      analytics.posts !== live.length ||
      analytics.published !== live.filter((p) => p.state === 'PUBLISHED').length
    ) {
      throw new Error('social analytics do not match the simulation state');
    }
    const allSimulated = live.every((p) => p.simulated === true);
    if (!allSimulated) throw new Error('a social post was not marked simulated');
    return {
      detail: `Social studio (simulation): channel connected, scheduled post published (${published.releaseId}), degraded provider failed → retried → recovered, queued item cancelled → DRAFT, analytics ${analytics.published} published / ${analytics.drafts} draft / ${analytics.failed} failed.`,
      entityIds: live.map((p) => p.id),
      facts: {
        failClosedModes: refusedModes.length,
        wronglyAccepted: wronglyAccepted.length,
        channels: analytics.channels,
        posts: analytics.posts,
        published: analytics.published,
        drafts: analytics.drafts,
        failed: analytics.failed,
        scheduledNotRunEarly: early.length === 0,
        retryRecovered: retried.ok,
        allSimulated,
      },
    };
  });



  /* 20 — RBAC & TENANT ISOLATION ----------------------------------------- */
  await stage('rbac', async () => {
    // (a) A brand can never initiate onboarding for itself or another tenant.
    const brandInitiates = beginOnboardingFromApplication(
      INVESTOR_DEMO_APPLICATION_ID,
      commerceActor
    );
    if (brandInitiates.ok) throw new Error('a brand-pinned account initiated onboarding');
    // (b) A brand cannot read another tenant's operational records.
    const crossRead = listBrandCommerceActivity('brand-deskforge', commerceActor);
    if (crossRead.ok) throw new Error('a brand read another tenant activity trail');
    // (c) A view-only account cannot mutate.
    const viewOnly = acknowledgeCommercePurchaseOrder(poId, investorDemoViewOnlyActor(tenant));
    if (viewOnly.ok) throw new Error('a view-only account mutated a PO');
    // (d) The operator IS allowed (positive control — the refusals above are
    //     authorisation, not a blanket block).
    const operatorAllowed = await evaluateCommerceEligibility(
      tenant,
      INVESTOR_DEMO_SKU,
      investorDemoOpsActor(actorId)
    );
    if (!operatorAllowed.ok) throw new Error('the operator account was blocked');

    // (e) Tier matrix — environments and nav views (the real RBAC module).
    const matrix: Record<string, boolean> = {
      brandCannotEnterAdmin: canAccessEnvironment('brand', 'admin') === false,
      brandCannotEnterCarrier: canAccessEnvironment('brand', 'carrier') === false,
      brandCannotSeeSuperAdminView: canAccessView('brand', 'super_admin') === false,
      brandCannotSeeIntegrationsView: canAccessView('brand', 'integrations') === false,
      adminStaffCannotSeeSuperAdminView: canAccessView('admin_staff', 'super_admin') === false,
      carrierHasNoCrm: canAccessView('3pl', 'crm') === false,
      carrierHasManifest: canAccessView('3pl', 'manifest') === true,
      brandHasOwnOrders: canAccessView('brand', 'purchase_orders') === true,
      superAdminHasEverything: canAccessView('super_admin', 'integrations') === true,
    };
    const failed = Object.entries(matrix).filter(([, ok]) => !ok).map(([k]) => k);
    if (failed.length > 0) throw new Error(`RBAC matrix violations: ${failed.join(', ')}`);

    return {
      detail: `RBAC: brand onboarding-initiation, cross-tenant read and view-only mutation all REFUSED in the domain; operator allowed. Tier matrix verified (${Object.keys(matrix).length} checks).`,
      entityIds: [tenant, 'brand-deskforge'],
      facts: {
        brandOnboardingInitiationRefused: !brandInitiates.ok,
        crossTenantReadRefused: !crossRead.ok,
        viewOnlyMutationRefused: !viewOnly.ok,
        operatorAllowed: operatorAllowed.ok,
        matrixChecks: Object.keys(matrix).length,
        matrixFailures: failed.length,
      },
    };
  });

  /* 21 — AUDITABILITY ---------------------------------------------------- */
  await stage('audit', async () => {
    const rows = auditRowsForTenant(tenant);
    const actions = [...new Set(rows.map((r) => r.action))].sort();
    const requiredActions = [
      'onboarding_started_from_application',
      'catalog_product_submitted',
      'po_created',
      'purchase_order_acknowledged',
      'asn_filed',
      'commerce_shipment_advanced',
      'commerce_exception_raised',
      'commerce_dispute_resolved',
      'deduction_dispute_resolved',
      'distribution_agreement_issued',
      'commission_payout_settled',
    ];
    const missing = requiredActions.filter((a) => !actions.includes(a));
    if (missing.length > 0) {
      throw new Error(`audit trail is missing action(s): ${missing.join(', ')}`);
    }
    const incomplete = rows.filter(
      (r) => !r.actorId || !r.action || !r.createdAt || !r.entityId || r.brandId !== tenant
    );
    if (incomplete.length > 0) {
      throw new Error(`${incomplete.length} audit row(s) are not fully attributed`);
    }
    return {
      detail: `Auditability: ${rows.length} canonical audit row(s) for ${tenant} across ${actions.length} distinct actions — every row carries actor, tenant, action, timestamp, entity and reason.`,
      entityIds: actions,
      facts: {
        auditRows: rows.length,
        distinctActions: actions.length,
        requiredActionsPresent: requiredActions.length,
        incompleteRows: incomplete.length,
      },
    };
  });


  /* 22 — ERROR & RECOVERY ------------------------------------------------ */
  await stage('error_recovery', async () => {
    const checks: Record<string, boolean> = {};

    // 1. Compliance missing → blocked → corrected (proven in stage 4).
    checks.complianceBlockedThenCorrected =
      gateBlockedSubmissionReason === 'COMPLIANCE_GATE_BLOCKED';

    // 2. An INVALID catalogue submission is rejected, then corrected.
    const broken = { ...demoProduct(), commodityCode: '' } as unknown as Record<string, unknown>;
    const rejected = await submitCatalogProduct(tenant, broken, catalogueActor);
    checks.invalidSubmissionRejected =
      !rejected.ok && String(rejected.error).includes('INCOMPLETE_PRODUCT');
    const corrected = await submitCatalogProduct(
      tenant,
      demoProduct() as unknown as Record<string, unknown>,
      catalogueActor
    );
    checks.invalidSubmissionCorrected = corrected.ok;

    // 3. Delayed shipment → recovery on the canonical shipment record.
    const shipment = demoShipments.find((s) => s.id === shipId);
    if (!shipment) throw new Error('the demo shipment is missing');
    amendShipment(shipId, { status: 'uk_customs_cleared' });
    shipment.delayed = true;
    const delayed = demoShipments.find((s) => s.id === shipId);
    checks.delayedShipmentRecorded =
      delayed?.delayed === true && delayed.status === 'uk_customs_cleared';
    amendShipment(shipId, { status: 'mercenta_hub' });
    shipment.delayed = false;
    const recoveredShipment = demoShipments.find((s) => s.id === shipId);
    checks.delayedShipmentRecovered =
      recoveredShipment?.delayed === false && recoveredShipment.status === 'mercenta_hub';

    // 4. Payout settlement failure → retry → success (the real payout seam,
    //    proven with a failing transfer client and then the mock client).
    const failingClient = {
      mode: 'mock' as const,
      async createTransfer() {
        return { ok: false, error: 'simulated_provider_declined' };
      },
    };
    let markedPaidOnFailure = false;
    const failedSettlement = await settleCommission(
      {
        id: 'comm-investor-demo-retry-proof',
        brandId: tenant,
        poValue: 1000,
        commissionRate: 12,
        status: 'accrued',
      },
      {
        fulfillmentTrack: 'direct_fulfillment',
        destinationAccountId: 'acct_simulation',
        client: failingClient,
        markPaid: async () => {
          markedPaidOnFailure = true;
        },
      }
    );
    checks.payoutFailureRefused = !failedSettlement.ok && !markedPaidOnFailure;
    let markedPaidOnRetry = false;
    const recoveredSettlement = await settleCommission(
      {
        id: 'comm-investor-demo-retry-proof',
        brandId: tenant,
        poValue: 1000,
        commissionRate: 12,
        status: 'accrued',
      },
      {
        fulfillmentTrack: 'direct_fulfillment',
        destinationAccountId: 'acct_simulation',
        client: new MockStripePayoutClient(),
        markPaid: async () => {
          markedPaidOnRetry = true;
        },
      }
    );
    checks.payoutRetrySucceeded =
      recoveredSettlement.ok === true && markedPaidOnRetry && !!recoveredSettlement.transferId;

    // 5. Simulated integration failure → recovery (HMRC filing outage). The
    //    outage flag makes the NEXT filing fail once, then it is consumed — so
    //    the retry is the deterministic recovery path.
    const hmrcMode = getMode('hmrc');
    if (!isProviderSimulationSafe(hmrcMode)) {
      throw new Error(`HMRC resolved "${hmrcMode}" — the failure drill requires simulation`);
    }
    simulateHmrcOutage(true);
    const duringOutage = await fileHmrcReturn(
      tenant,
      { period: 'Q3 2026', totalSalesGbp: 48250, vatDueGbp: 9320 },
      { getMode, actorId }
    );
    checks.integrationFailureObserved =
      duringOutage.status === 'error' && duringOutage.ok === false;
    const afterRecovery = await fileHmrcReturn(
      tenant,
      { period: 'Q3 2026', totalSalesGbp: 48250, vatDueGbp: 9320 },
      { getMode, actorId }
    );
    checks.integrationRecovered = afterRecovery.ok === true;

    // 6. Unauthorised action + tenant mismatch are refused (proven in stage 20).
    const brandResolveAgain = resolveCommerceDispute(DEMO_DEDUCTION_ID, 'won', commerceActor);
    checks.unauthorisedActionRefused = !brandResolveAgain.ok;
    const mismatchedRead = listAllCommerceExceptions(commerceActor);
    checks.tenantMismatchRefused = !mismatchedRead.ok;

    const failed = Object.entries(checks)
      .filter(([, ok]) => !ok)
      .map(([k]) => k);
    if (failed.length > 0) {
      throw new Error(`error/recovery scenario(s) not satisfied: ${failed.join(', ')}`);
    }
    return {
      detail: `Error & recovery: compliance blocked→corrected, invalid submission rejected→corrected, shipment delayed→recovered, payout declined→retried→settled, integration outage→recovered, unauthorised action and tenant mismatch refused (${Object.keys(checks).length} checks).`,
      entityIds: [shipId, DEMO_DEDUCTION_ID],
      facts: checks,
    };
  });

  return buildRun(runId, seed, tenant, onboarding, stages, startedAt);
}


/* ── Digest + run assembly ───────────────────────────────────────────────── */

/**
 * Stable digest over DETERMINISTIC facts only: stage identity, status and
 * `facts`. Entity ids are deliberately excluded (some ids are legitimately
 * generated by the seams, e.g. the shipment id), and no wall-clock value is
 * ever included — so `reset → run` reproduces the same digest exactly.
 */
export function computeInvestorDemoDigest(
  run: Pick<InvestorDemoRun, 'runId' | 'tenantId' | 'stages'>
): string {
  const body = run.stages
    .map((s) => {
      const facts = Object.keys(s.facts)
        .sort()
        .map((k) => `${k}=${String(s.facts[k])}`)
        .join(';');
      return `${s.id}|${s.status}|${facts}`;
    })
    .join('\n');
  return stableHash(`${run.runId}\n${run.tenantId}\n${body}`);
}

function buildRun(
  runId: string,
  seed: number,
  tenantId: string,
  onboardingId: string,
  stages: InvestorDemoStage[],
  startedAt: string
): InvestorDemoRun {
  const auditRows = auditRowsForTenant(tenantId);
  const summary: InvestorDemoSummary = {
    total: stages.length,
    ok: stages.filter((s) => s.status === 'ok').length,
    blocked: stages.filter((s) => s.status === 'blocked').length,
    error: stages.filter((s) => s.status === 'error').length,
  };
  const run: InvestorDemoRun = {
    runId,
    seed,
    mode: 'simulation',
    deterministic: true,
    tenantId,
    brandName: INVESTOR_DEMO_BRAND_NAME,
    applicationId: INVESTOR_DEMO_APPLICATION_ID,
    onboardingId,
    startedAt,
    finishedAt: new Date().toISOString(),
    stages,
    summary,
    digest: '',
    networkCalls: 0,
    auditRows: auditRows.length,
    auditActions: [...new Set(auditRows.map((r) => r.action))].sort(),
  };
  run.digest = computeInvestorDemoDigest(run);
  return run;
}
