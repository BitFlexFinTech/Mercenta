/**
 * §Phase E1 — brand onboarding lifecycle (the opportunity → tenant hand-off).
 *
 * THE missing link in the platform funnel. Before E1 the chain stopped at an
 * acquisition Opportunity and `Opportunity.brandId` was never set, so an
 * accepted/qualified brand had no canonical onboarding record and no tenant
 * identity. This module owns that transition:
 *
 *   BI prospect → ICP → outreach → response → Opportunity
 *     → [ qualified/won ] → BEGIN onboarding  → brand tenant identity
 *     → step-by-step onboarding → COMPLETE → brand is operational
 *
 * Rules this module enforces (mirroring `src/lib/acquisition/outreachLifecycle.ts`):
 * - ONE canonical identity: the onboarding record carries the SAME `prospectId`
 *   and `opportunityId`. Acquisition history is never lost and no second brand
 *   identity system is created; the tenant id is DERIVED deterministically
 *   (`brand-<normalizeBrandKey>`), never hand-invented.
 * - RBAC IS IN THE DOMAIN: every mutator takes an `AcquisitionActor` and refuses
 *   a view-only account. Hiding a button is never the authorisation.
 * - Deterministic + idempotent: ids are workflow-owned (`onb-<prospectId>`), so
 *   replaying a hand-off cannot duplicate a record.
 * - Every mutation is audited twice: on the acquisition relationship timeline
 *   (`AcquisitionEvent`) and in the platform audit log.
 * - ZERO network calls. Persistence mirrors through the existing domain port.
 *
 * The onboarding `track` starts `unassigned` — the fulfillment track is decided
 * by the brand during onboarding, so it is deliberately NOT invented here.
 */
import type {
  AcquisitionEvent,
  BrandOnboarding,
  BrandRegion,
  FulfillmentTrack,
  LeadRegion,
  OnboardingStep,
  OnboardingStepId,
  Opportunity,
  OpportunityStage,
} from '@/types';
import { deriveIcpOriginRegion, normalizeBrandKey } from '@/lib/intelligence/prospectPipeline';
import { PO_ACK_WINDOW_RULE_TEXT } from '@/config/purchaseOrders';
import { getProspect } from '@/data/prospectStore';
import * as store from '@/data/acquisitionStore';
import { getApplicationById } from '@/data/applicationStore';
import type { AcquisitionActor } from '@/lib/acquisition/outreachLifecycle';

export type OnboardingResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

/**
 * §Phase E2 — the actor performing an onboarding action. It extends the
 * acquisition actor with an OPTIONAL tenant pin: a BRAND session carries its
 * `tenantId`, and the domain then REFUSES any action on another tenant's
 * onboarding record. Tenant isolation is enforced here, never by hiding UI.
 */
export interface OnboardingActor extends AcquisitionActor {
  tenantId?: string;
}

/** Tenant isolation guard — a pinned actor may act ONLY on its own record. */
function crossTenant(actor: OnboardingActor, brandId: string): boolean {
  return !!actor.tenantId && actor.tenantId !== brandId;
}

/** Canonical ICP origin region → the brand-portal region model (one mapping). */
const BRAND_REGION_BY_ICP: Readonly<Record<LeadRegion, BrandRegion>> = {
  us: 'north_america',
  canada: 'north_america',
  eu: 'europe',
  uk: 'europe',
  africa: 'africa',
};

const FORBIDDEN = 'FORBIDDEN — the acting staff account is view-only.';
const NO_OPPORTUNITY = 'NOT_FOUND — no such opportunity.';

/** Only an accepted/qualified opportunity may start onboarding. */
export const ONBOARDING_ELIGIBLE_STAGES: readonly OpportunityStage[] = ['qualified', 'won'];

/** The canonical steps, completed strictly in order. */
export const ONBOARDING_STEP_ORDER: readonly OnboardingStepId[] = [
  'profile',
  'legal_agreements',
  'banking',
  'carriers',
  'compliance',
];

const STEP_LABELS: Readonly<Record<OnboardingStepId, string>> = {
  profile: 'Brand profile',
  legal_agreements: 'Legal agreements (§4.1 / §4.2)',
  banking: 'Banking & payout details',
  carriers: 'Carrier connections',
  compliance: 'Compliance documents',
};

function nowIso(): string {
  return new Date().toISOString();
}

function forbidden<T>(): OnboardingResult<T> {
  return { ok: false, error: FORBIDDEN };
}

/** Deterministic onboarding id — one canonical record per prospect. */
export function onboardingIdFor(prospectId: string): string {
  return `onb-${prospectId}`;
}

/**
 * Deterministic brand TENANT id for a brand name. Derived from the SAME
 * canonical `normalizeBrandKey` the rest of BI/ICP/acquisition uses, so the
 * tenant identity and the acquisition identity can never disagree on the name.
 */
export function tenantIdForBrand(brandName: string): string {
  return `brand-${normalizeBrandKey(brandName) || 'unnamed'}`;
}

/** The fresh step set: step 1 is in progress, the rest are pending. */
function initialSteps(): OnboardingStep[] {
  return ONBOARDING_STEP_ORDER.map((id, i) => ({
    id,
    label: STEP_LABELS[id],
    status: i === 0 ? 'in_progress' : 'pending',
  }));
}

function pushEvent(
  type:
    | 'onboarding_started'
    | 'onboarding_accepted'
    | 'onboarding_step_completed'
    | 'onboarding_po_rules_acknowledged'
    | 'onboarding_completed',
  prospectId: string,
  brand: string,
  actor: AcquisitionActor,
  summary: string,
  detail?: string
): AcquisitionEvent {
  return store.recordAcquisitionEvent({
    id: `acq-onb-${prospectId}-${type}-${Date.now()}`,
    prospectId,
    brand,
    type,
    at: nowIso(),
    actor: actor.staffId,
    summary,
    detail,
  });
}

/** Whether this opportunity is allowed to start onboarding at all. */
export function isOnboardingEligible(opportunity: Opportunity | null): boolean {
  return !!opportunity && ONBOARDING_ELIGIBLE_STAGES.includes(opportunity.stage);
}

/** The canonical onboarding record for a prospect (null before the hand-off). */
export function getOnboardingForProspect(prospectId: string): BrandOnboarding | null {
  return store.getOnboardingForProspect(prospectId);
}

/**
 * BEGIN onboarding: the acquisition Opportunity becomes the brand TENANT.
 *
 * Idempotent — a second call for the same opportunity returns the existing
 * record instead of creating a duplicate identity. A hand-off below `qualified`
 * is refused (an unqualified prospect is never turned into a tenant).
 */
export function beginBrandOnboarding(
  opportunityId: string,
  actor: OnboardingActor
): OnboardingResult<BrandOnboarding> {
  if (!actor.canMutate) return forbidden();
  // A brand can never initiate its own onboarding — that is an operator act.
  if (actor.tenantId) {
    return { ok: false, error: 'FORBIDDEN — onboarding is initiated by Mercenta operations, not by the brand.' };
  }

  const opportunity = store.getOpportunities().find((o) => o.id === opportunityId);
  if (!opportunity) return { ok: false, error: NO_OPPORTUNITY };

  // Idempotent by canonical identity (opportunity first, then prospect).
  const existing =
    store.getOnboardingForOpportunity(opportunityId) ??
    store.getOnboardingForProspect(opportunity.prospectId);
  if (existing) return { ok: true, value: existing };

  if (!ONBOARDING_ELIGIBLE_STAGES.includes(opportunity.stage)) {
    return {
      ok: false,
      error: `ILLEGAL_TRANSITION — an opportunity must be qualified or won before onboarding (currently ${opportunity.stage}).`,
    };
  }

  const prospect = getProspect(opportunity.prospectId);
  if (!prospect) return { ok: false, error: 'NOT_FOUND — no canonical prospect with that id.' };

  const brandId = tenantIdForBrand(opportunity.brand);
  // A tenant identity is never silently merged into an existing tenant.
  if (store.isTenantIdClaimed(brandId, opportunity.prospectId)) {
    return { ok: false, error: `TENANT_CONFLICT — tenant id ${brandId} is already claimed by another brand.` };
  }

  const now = nowIso();
  const onboarding: BrandOnboarding = {
    id: onboardingIdFor(opportunity.prospectId),
    prospectId: opportunity.prospectId,
    opportunityId: opportunity.id,
    brandId,
    businessName: opportunity.brand,
    category: opportunity.category,
    // Decided by the brand during onboarding — never invented at hand-off.
    track: 'unassigned',
    status: 'initiated',
    steps: initialSteps(),
    origin: 'acquisition_opportunity',
    biScore: opportunity.biScore,
    biTier: opportunity.biTier,
    initiatedAt: now,
    initiatedBy: actor.staffId,
  };
  store.saveOnboarding(onboarding);

  // The hand-off completes the wiring D4 left open: the opportunity now names
  // the tenant it onboarded into, and persists against that brand scope.
  store.updateOpportunity(opportunity.id, { brandId, updatedAt: now });

  pushEvent(
    'onboarding_started',
    prospect.id,
    prospect.brand,
    actor,
    `Onboarding started for ${prospect.brand} → tenant ${brandId}`,
    `opportunity ${opportunity.id} · BI ${opportunity.biScore}/100 (${opportunity.biTier})`
  );
  store.recordOnboardingAudit(
    'acquisition_onboarding_started',
    onboarding.id,
    `Onboarding ${onboarding.id} started (tenant ${brandId}, opportunity ${opportunity.id})`,
    actor.staffId,
    brandId
  );

  return { ok: true, value: onboarding };
}

/**
 * Complete ONE onboarding step. Steps are strictly ordered — a later step cannot
 * be completed before its predecessors, so the record can never claim progress
 * it did not make.
 */
export function completeOnboardingStep(
  onboardingId: string,
  stepId: OnboardingStepId,
  actor: OnboardingActor,
  note?: string
): OnboardingResult<BrandOnboarding> {
  if (!actor.canMutate) return forbidden();

  const onboarding = store.getOnboardingById(onboardingId);
  if (!onboarding) return { ok: false, error: 'NOT_FOUND — no such onboarding record.' };
  if (crossTenant(actor, onboarding.brandId)) {
    return { ok: false, error: `CROSS_TENANT — this session is pinned to another brand tenant.` };
  }
  if (onboarding.status === 'completed') {
    return { ok: false, error: 'ILLEGAL_TRANSITION — onboarding is already complete.' };
  }

  const targetIndex = ONBOARDING_STEP_ORDER.indexOf(stepId);
  const target = onboarding.steps[targetIndex];
  if (!target) return { ok: false, error: `NOT_FOUND — unknown onboarding step ${stepId}.` };
  if (target.status === 'done') return { ok: true, value: onboarding };

  const incompleteEarlier = onboarding.steps.slice(0, targetIndex).some((s) => s.status !== 'done');
  if (incompleteEarlier) {
    return {
      ok: false,
      error: `ILLEGAL_TRANSITION — earlier onboarding steps must be completed first (${stepId}).`,
    };
  }

  const now = nowIso();
  const steps: OnboardingStep[] = onboarding.steps.map((s, i) => {
    if (i === targetIndex) return { ...s, status: 'done', completedAt: now, completedBy: actor.staffId, note };
    if (i === targetIndex + 1) return { ...s, status: 'in_progress' };
    return s;
  });

  // A step alone never completes onboarding — that is a distinct, explicit act.
  const updated = store.updateOnboarding(onboardingId, { steps, status: 'in_progress' });
  if (!updated) return { ok: false, error: 'NOT_FOUND — no such onboarding record.' };

  if (updated.prospectId) {
    pushEvent(
      'onboarding_step_completed',
      updated.prospectId,
      updated.businessName,
      actor,
      `Onboarding step completed: ${STEP_LABELS[stepId]}`,
      `tenant ${updated.brandId}${note ? ` · ${note}` : ''}`
    );
  }
  store.recordOnboardingAudit(
    'acquisition_onboarding_step_completed',
    updated.id,
    `Step ${stepId} completed for ${updated.brandId}`,
    actor.staffId,
    updated.brandId
  );

  return { ok: true, value: updated };
}

/**
 * COMPLETE onboarding: every step must be done. The brand then becomes
 * operational and the originating acquisition relationship is retained on the
 * record (`prospectId` + `opportunityId`), so history is never lost.
 */
export function finishBrandOnboarding(
  onboardingId: string,
  actor: OnboardingActor
): OnboardingResult<BrandOnboarding> {
  if (!actor.canMutate) return forbidden();

  const onboarding = store.getOnboardingById(onboardingId);
  if (!onboarding) return { ok: false, error: 'NOT_FOUND — no such onboarding record.' };
  if (crossTenant(actor, onboarding.brandId)) {
    return { ok: false, error: `CROSS_TENANT — this session is pinned to another brand tenant.` };
  }
  if (onboarding.status === 'completed') return { ok: true, value: onboarding };

  const outstanding = onboarding.steps.filter((s) => s.status !== 'done').map((s) => s.id);
  if (outstanding.length > 0) {
    return {
      ok: false,
      error: `INCOMPLETE_STEPS — ${outstanding.length} step(s) outstanding: ${outstanding.join(', ')}.`,
    };
  }

  const now = nowIso();
  const updated = store.updateOnboarding(onboardingId, {
    status: 'completed',
    completedAt: now,
    completedBy: actor.staffId,
  });
  if (!updated) return { ok: false, error: 'NOT_FOUND — no such onboarding record.' };

  // Keep the opportunity ↔ tenant link authoritative for the operational view.
  const linkedOpportunity = updated.opportunityId
    ? store.getOpportunities().find((o) => o.id === updated.opportunityId) ?? null
    : null;
  if (linkedOpportunity) {
    store.updateOpportunity(updated.opportunityId as string, { brandId: updated.brandId, updatedAt: now });
  }

  if (updated.prospectId) {
    pushEvent(
      'onboarding_completed',
      updated.prospectId,
      updated.businessName,
      actor,
      `${updated.businessName} onboarding completed — tenant ${updated.brandId} is operational`,
      `acquisition history retained (prospect ${updated.prospectId}, opportunity ${updated.opportunityId})`
    );
  }
  store.recordOnboardingAudit(
    'acquisition_onboarding_completed',
    updated.id,
    `Onboarding ${updated.id} completed (tenant ${updated.brandId})`,
    actor.staffId,
    updated.brandId
  );

  return { ok: true, value: updated };
}

/* ── §Phase E2 — brand acceptance, tenant lookup, pipeline read model ────── */

/**
 * §Phase E2 — BRAND ACCEPTANCE. The brand session accepts the onboarding it was
 * invited into (the brand portal's wizard submission calls this). This is a
 * distinct, audited act from Mercenta initiating the process, and it is
 * idempotent: a repeated submission returns the existing record unchanged.
 * Tenant-pinned: a brand session can only accept its OWN onboarding.
 */
export function acceptOnboarding(
  onboardingId: string,
  actor: OnboardingActor,
  note?: string
): OnboardingResult<BrandOnboarding> {
  if (!actor.canMutate) return forbidden();

  const onboarding = store.getOnboardingById(onboardingId);
  if (!onboarding) return { ok: false, error: 'NOT_FOUND — no such onboarding record.' };
  if (crossTenant(actor, onboarding.brandId)) {
    return { ok: false, error: `CROSS_TENANT — this session is pinned to another brand tenant.` };
  }
  if (onboarding.status === 'completed') {
    return { ok: false, error: 'ILLEGAL_TRANSITION — onboarding is already complete.' };
  }
  if (onboarding.acceptedAt) return { ok: true, value: onboarding };

  const now = nowIso();
  const updated = store.updateOnboarding(onboardingId, {
    status: onboarding.status === 'initiated' ? 'accepted' : onboarding.status,
    acceptedAt: now,
    acceptedBy: actor.staffId,
  });
  if (!updated) return { ok: false, error: 'NOT_FOUND — no such onboarding record.' };

  if (updated.prospectId) {
    pushEvent(
      'onboarding_accepted',
      updated.prospectId,
      updated.businessName,
      actor,
      `${updated.businessName} accepted onboarding (tenant ${updated.brandId})`,
      note
    );
  }
  store.recordOnboardingAudit(
    'acquisition_onboarding_accepted',
    updated.id,
    `Onboarding ${updated.id} accepted${note ? ` · ${note}` : ''}`,
    actor.staffId,
    updated.brandId
  );

  return { ok: true, value: updated };
}

/** §Phase E2 — the canonical onboarding record owning a brand TENANT id. */
export function getOnboardingForTenant(brandId: string): BrandOnboarding | null {
  return store.getOnboardingForBrand(brandId);
}

/* ── §P13 / S8 — THE LINK TO THE PO ACKNOWLEDGEMENT OBLIGATION ─────────────── */

/** The canonical audit action for the acknowledgement (declared once). */
export const PO_RULES_ACKNOWLEDGEMENT_ACTION = 'onboarding_po_rules_acknowledged';

/**
 * §P13 / S8 — THE BRAND ACKNOWLEDGES THE CHANNEL'S PURCHASE-ORDER RULE.
 *
 * WHY THIS EXISTS: the onboarding wizard's operational-guidance step already made the
 * brand acknowledge the rule (`BrandGuidance` with `requireAck`), but the tick was
 * LOCAL COMPONENT STATE — nothing on the canonical onboarding record said the brand
 * had ever been shown the rule, so the onboarding was not actually LINKED to the
 * purchase-order obligation it creates. This is that link.
 *
 * WHAT IS RECORDED, and why the wording is stored: the rule's OWN text
 * (`PO_ACK_WINDOW_RULE_TEXT`, the one config owner) is written onto the record, so
 * the record proves what the brand was shown and cannot be silently re-interpreted
 * by a later revision of the rule. The writer never composes rule wording itself.
 *
 * INVARIANTS (identical to every other mutator in this module):
 *   · RBAC IN THE DOMAIN — a view-only account is refused, never merely hidden.
 *   · TENANT ISOLATION — a brand-pinned session may only acknowledge its OWN record.
 *   · IDEMPOTENT — a repeated acknowledgement returns the existing record unchanged,
 *     so the audit trail cannot fill with duplicates.
 *   · AUDITED TWICE — the acquisition timeline (when the record has a prospect) and
 *     the platform audit log, with the real tenant id.
 */
export function acknowledgePurchaseOrderRules(
  onboardingId: string,
  actor: OnboardingActor,
  note?: string
): OnboardingResult<BrandOnboarding> {
  if (!actor.canMutate) return forbidden();

  const onboarding = store.getOnboardingById(onboardingId);
  if (!onboarding) return { ok: false, error: 'NOT_FOUND — no such onboarding record.' };
  if (crossTenant(actor, onboarding.brandId)) {
    return { ok: false, error: `CROSS_TENANT — this session is pinned to another brand tenant.` };
  }
  if (onboarding.poRulesAcknowledgedAt) return { ok: true, value: onboarding };

  const now = nowIso();
  const updated = store.updateOnboarding(onboardingId, {
    poRulesAcknowledgedAt: now,
    poRulesAcknowledgedBy: actor.staffId,
    // The rule's own config-owned wording — never a copy written here.
    poRulesRuleText: PO_ACK_WINDOW_RULE_TEXT,
  });
  if (!updated) return { ok: false, error: 'NOT_FOUND — no such onboarding record.' };

  if (updated.prospectId) {
    pushEvent(
      'onboarding_po_rules_acknowledged',
      updated.prospectId,
      updated.businessName,
      actor,
      `${updated.businessName} acknowledged the purchase-order acknowledgement rule (tenant ${updated.brandId})`,
      note ?? PO_ACK_WINDOW_RULE_TEXT
    );
  }
  store.recordOnboardingAudit(
    PO_RULES_ACKNOWLEDGEMENT_ACTION,
    updated.id,
    `Purchase-order acknowledgement rule acknowledged${note ? ` · ${note}` : ''}`,
    actor.staffId,
    updated.brandId
  );

  return { ok: true, value: updated };
}

/**
 * §Phase E2 — the brand-portal region for an onboarding tenant, DERIVED from the
 * canonical prospect's own declared countries via the EXISTING
 * `deriveIcpOriginRegion` (no new country map, no invented region). Returns null
 * when nothing can be honestly derived — the brand then picks it in the wizard.
 */
export function deriveBrandRegionForOnboarding(onboarding: BrandOnboarding): BrandRegion | null {
  if (!onboarding.prospectId) return null;
  const prospect = getProspect(onboarding.prospectId);
  if (!prospect) return null;
  const icp = deriveIcpOriginRegion(prospect);
  return icp ? BRAND_REGION_BY_ICP[icp] ?? null : null;
}

/** One admin-pipeline row: the record plus its REAL originating entity. */
export interface OnboardingPipelineRow {
  onboarding: BrandOnboarding;
  opportunity: Opportunity | null;
  prospectBrand: string | null;
  stepsDone: number;
  stepsTotal: number;
}

/** §Phase E2 — the admin onboarding pipeline read model (derived, never seeded). */
export function listOnboardingPipeline(): OnboardingPipelineRow[] {
  const opportunities = store.getOpportunities();
  return store.listOnboardings().map((onboarding) => ({
    onboarding,
    opportunity: onboarding.opportunityId
      ? opportunities.find((o) => o.id === onboarding.opportunityId) ?? null
      : null,
    prospectBrand: onboarding.prospectId ? getProspect(onboarding.prospectId)?.brand ?? null : null,
    stepsDone: onboarding.steps.filter((s) => s.status === 'done').length,
    stepsTotal: onboarding.steps.length,
  }));
}

/* ── §Phase E2 — the other real entry points into the same canonical record ─ */

/** Deterministic TENANT id for an approved partner application. */
export function tenantIdForApplication(applicationId: string): string {
  return `brand-app-${applicationId}`;
}

/**
 * §Phase E2 — APPLICATION ENTRY POINT. An approved partner application now
 * creates the SAME canonical onboarding record the acquisition hand-off does,
 * with its own deterministic identity (`onb-app-<applicationId>`) and the tenant
 * id the login card uses (`tenantIdForApplication`) — one identity, so the card
 * and the record can never disagree. Idempotent by application id.
 */
export function beginOnboardingFromApplication(
  applicationId: string,
  actor: OnboardingActor
): OnboardingResult<BrandOnboarding> {
  if (!actor.canMutate) return forbidden();
  if (actor.tenantId) {
    return { ok: false, error: 'FORBIDDEN — onboarding is initiated by Mercenta operations.' };
  }

  const application = getApplicationById(applicationId);
  if (!application) return { ok: false, error: 'NOT_FOUND — no such brand application.' };

  const existing = store.listOnboardings().find((o) => o.applicationId === applicationId);
  if (existing) return { ok: true, value: existing };

  const brandId = tenantIdForApplication(applicationId);
  if (store.isTenantIdClaimed(brandId)) {
    return { ok: false, error: `TENANT_CONFLICT — tenant id ${brandId} is already claimed.` };
  }

  const now = nowIso();
  const onboarding: BrandOnboarding = {
    id: `onb-app-${applicationId}`,
    applicationId,
    brandId,
    businessName: application.companyName,
    category: application.category,
    track: 'unassigned',
    status: 'initiated',
    steps: initialSteps(),
    origin: 'partner_application',
    initiatedAt: now,
    initiatedBy: actor.staffId,
  };
  store.saveOnboarding(onboarding);
  store.recordOnboardingAudit(
    'onboarding_started_from_application',
    onboarding.id,
    `Onboarding ${onboarding.id} started from application ${applicationId} (tenant ${brandId})`,
    actor.staffId,
    brandId
  );

  return { ok: true, value: onboarding };
}

/** §Phase E2 — the operator-supplied fields for a manually created brand. */
export interface ManualBrandInput {
  name: string;
  category: string;
  country: string;
  email: string;
  signatory: string;
  track: FulfillmentTrack;
}

/**
 * §Phase E2 — MANUAL ENTRY POINT. An operator-created brand gets the same
 * canonical record, with a tenant id DERIVED from the brand name. The previous
 * manual path generated a `Date.now()`+random id, which was non-deterministic and
 * could not be replayed or reconciled; it is replaced by this deterministic id.
 * Idempotent by tenant id; a collision is refused, never merged.
 */
export function beginOnboardingForManualBrand(
  input: ManualBrandInput,
  actor: OnboardingActor
): OnboardingResult<BrandOnboarding> {
  if (!actor.canMutate) return forbidden();
  if (actor.tenantId) {
    return { ok: false, error: 'FORBIDDEN — onboarding is initiated by Mercenta operations.' };
  }
  const name = (input.name ?? '').trim();
  if (!name) return { ok: false, error: 'INVALID — a brand name is required.' };

  const brandId = tenantIdForBrand(name);
  const existing = store.getOnboardingForBrand(brandId);
  if (existing) return { ok: true, value: existing };
  if (store.isTenantIdClaimed(brandId)) {
    return { ok: false, error: `TENANT_CONFLICT — tenant id ${brandId} is already claimed.` };
  }

  const now = nowIso();
  const onboarding: BrandOnboarding = {
    id: `onb-manual-${normalizeBrandKey(name) || 'brand'}`,
    brandId,
    businessName: name,
    category: input.category,
    // The operator explicitly chose the track in the creation form — real input.
    track: input.track,
    status: 'initiated',
    steps: initialSteps(),
    origin: 'manual_creation',
    initiatedAt: now,
    initiatedBy: actor.staffId,
  };
  store.saveOnboarding(onboarding);
  store.recordOnboardingAudit(
    'onboarding_started_manually',
    onboarding.id,
    `Onboarding ${onboarding.id} created manually for ${name} (tenant ${brandId}, ${input.country})`,
    actor.staffId,
    brandId
  );

  return { ok: true, value: onboarding };
}
