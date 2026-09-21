/**
 * §PHASE 1 — CANONICAL PRE-AUDIT (Explore UK Market Fit) STORE.
 *
 * Single runtime source of truth for pre-audit assessment records. Mirrors the
 * contract every other domain store in this codebase follows (`prospectStore`,
 * `acquisitionStore`) — there is no second persistence mechanism and no second
 * database:
 *
 *   - the in-memory array is the deterministic working set (ZERO network),
 *   - every mutation is mirrored through the SAME domain persistence port
 *     (`src/data/domainRepository.ts → preaudit_assessments`),
 *   - with no Supabase configured the active adapter is memory and the reported
 *     status is honestly `memory-only` (nothing is claimed to be persisted),
 *   - a full page reload re-boots deterministically; durable state is overlaid
 *     by `hydratePreAuditFromPersistence()`.
 *
 * OWNERSHIP IS EXPLICIT AND IS THE ONLY THING SCOPING TRUSTS
 * ---------------------------------------------------------
 * Every record carries a `PreAuditOwner`:
 *
 *   { kind: 'public_session', sessionId }  a public visitor's own assessment
 *   { kind: 'ops', tenantId }              Mercenta operations owns it
 *   { kind: 'brand', tenantId }            handed to a brand tenant
 *
 * `assessmentsForScope()` is the ONE place that decides visibility:
 *   - a public session sees ONLY its own assessments,
 *   - a brand tenant sees ONLY records owned by that tenant,
 *   - ops sees everything (Mercenta owns pre-onboarding prospect research).
 * A visitor can never read another visitor's assessment, and a brand can never
 * read another brand's — both are asserted by the validator.
 *
 * AUDIT + EVENTS: every mutation is attributed and written to the canonical
 * platform audit registry (`demoAuditLog`) and emits a canonical platform event
 * through the EXISTING event feed. No second event system.
 */
import type { PreAuditAssessment, PreAuditInput, PreAuditOwner } from '@/types';
import { demoAuditLog } from './demoStore';
import {
  MERCENTA_OPS_TENANT,
  createPersistenceMirror,
  getDomainRepository,
  type PersistenceStatus,
  type TenantScope,
} from './domainRepository';
import { emitEvent } from '@/lib/events/eventFeed';
import { demoToday } from '@/lib/work/workStore';
import type { UkMarketFitAssessmentResult } from '@/lib/preaudit/ukMarketFitEngine';
import { EXPLORE_UK_MARKET_FIT_CTA } from '@/config/ukMarketFit';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';

/**
 * The demo public session id. A real deployment would use a server-issued
 * session; this build has no server session, so the public surface uses ONE
 * declared demo session and the store's scoping is exercised directly by the
 * validator with distinct session ids.
 */
export const PRE_AUDIT_DEMO_PUBLIC_SESSION = 'public-session-demo';

/** The scope a reader is asking from — the input to the ONE visibility rule. */
export type PreAuditScope =
  | { kind: 'public_session'; sessionId: string }
  | { kind: 'ops' }
  | { kind: 'brand'; tenantId: string };

let assessments: PreAuditAssessment[] = [];
/** Per-brand run counter — deterministic ids, never time- or random-derived. */
let runSequence: Record<string, number> = {};
let version = 0;
const listeners = new Set<() => void>();

const persistenceMirror = createPersistenceMirror();
const mirror = persistenceMirror.write;

export function getPreAuditPersistenceStatus(): PersistenceStatus {
  return persistenceMirror.status();
}

export async function flushPreAuditPersistence(): Promise<void> {
  await persistenceMirror.flush();
}

/** Subscribe to store changes (the surface re-renders from canonical state). */
export function subscribePreAuditStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function preAuditVersion(): number {
  return version;
}

function notify(): void {
  version += 1;
  for (const l of listeners) l();
}

/** The owning tenant id for the persistence port (public → the ops tenant). */
export function tenantIdFor(owner: PreAuditOwner): string {
  return owner.kind === 'public_session' ? MERCENTA_OPS_TENANT : owner.tenantId;
}

/* ── The ONE visibility rule ─────────────────────────────────────────────── */

export function ownerMatchesScope(owner: PreAuditOwner, scope: PreAuditScope): boolean {
  if (scope.kind === 'ops') return true;
  if (scope.kind === 'public_session') {
    return owner.kind === 'public_session' && owner.sessionId === scope.sessionId;
  }
  return owner.kind === 'brand' && owner.tenantId === scope.tenantId;
}

export function assessmentsForScope(scope: PreAuditScope): PreAuditAssessment[] {
  return assessments.filter((a) => ownerMatchesScope(a.owner, scope));
}

/** ALL records, including every tenant's. Ops/validator use only — never a brand. */
export function allPreAuditAssessments(): PreAuditAssessment[] {
  return [...assessments];
}

export function getPreAuditAssessment(id: string): PreAuditAssessment | undefined {
  return assessments.find((a) => a.id === id);
}

/** The canonical record for one brand, if it has been assessed. */
export function getPreAuditAssessmentForBrandKey(brandKey: string): PreAuditAssessment | undefined {
  return assessments.find((a) => a.brandOpportunity.dedupeKey === brandKey);
}

/* ── Audit + events (the canonical registries, never a second one) ────────── */

function audit(action: string, assessmentId: string, reason: string, actor: string, brandId?: string): void {
  demoAuditLog.push({
    id: `audit-${action}-${assessmentId}-${demoAuditLog.length}`,
    createdAt: demoToday(),
    actorId: actor,
    action,
    entityType: 'pre_audit',
    entityId: assessmentId,
    brandId: brandId ?? assessmentId,
    reason,
  });
  notifyCanonicalStoreChange();
}

/** Explicit audit entry for an action taken from the founder surface. */
export function recordPreAuditAudit(
  action: string,
  assessmentId: string,
  reason: string,
  actorStaffId: string,
  brandId?: string
): void {
  audit(action, assessmentId, reason, actorStaffId, brandId);
}

/* ── Mutations ───────────────────────────────────────────────────────────── */

/**
 * Start an assessment. Deterministic id: `preaudit-<brandKey>-<n>`, where `n` is
 * this brand's run number in the session — no clock, no randomness. Emits
 * `assessment_started` and records the audit entry.
 */
export function startAssessment(owner: PreAuditOwner, input: PreAuditInput): PreAuditAssessment {
  const brandKey = input.brandName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '') || 'unnamed';
  runSequence[brandKey] = (runSequence[brandKey] ?? 0) + 1;
  const id = `preaudit-${brandKey}-${runSequence[brandKey]}`;
  const now = demoToday();
  const record: PreAuditAssessment = {
    id,
    owner,
    status: 'started',
    input,
    brandOpportunity: {
      id: `brand-opportunity-${brandKey}`,
      dedupeKey: brandKey,
      brand: input.brandName,
      website: input.website,
      sourceMarket: input.country,
      category: input.category,
      researchStatus: 'not_started',
      ukMarketStatus: 'unknown',
      opportunityEvidence: [],
      qualification: 'unqualified',
      nextAction: 'Run the research step.',
      owner: 'staff:mercenta-ops',
      createdAt: now,
      updatedAt: now,
      evidenceRefs: [],
    },
    productOpportunities: [],
    supplyProfile: {
      id: `supply-profile-${id}`,
      assessmentId: id,
      origin: input.origin ?? null,
      shipFrom: input.origin ?? null,
      productionLeadTimeDays: typeof input.leadTimeDays === 'number' ? input.leadTimeDays : null,
      exportLeadTimeDays: null,
      freightMode: 'unknown',
      transitEstimateDays: null,
      customsRequired: Boolean(input.origin && input.origin.toLowerCase() !== 'united kingdom'),
      ukFinalMile: true,
      safetyBufferDays: null,
      planningLeadTimeDays: null,
      variability: 'unknown',
      moq: input.moq ?? null,
      casePack: input.casePack ?? null,
      unknowns: ['Research has not run yet.'],
      evidence: [],
    },
    snapshot: null,
    researchUnavailableReason: null,
    fedProspectId: null,
    createdAt: now,
    updatedAt: now,
  };
  assessments = [...assessments, record];
  mirror('preaudit_assessments', id, () =>
    getDomainRepository().persistPreAuditAssessment(record, tenantIdFor(owner))
  );
  audit('pre_audit_started', id, `${EXPLORE_UK_MARKET_FIT_CTA} started for ${input.brandName}.`, 'visitor:public');
  emitEvent({
    type: 'assessment_started',
    severity: 'informational',
    title: 'UK Market Fit assessment started',
    description: `${input.brandName} started a ${EXPLORE_UK_MARKET_FIT_CTA} assessment (${id}).`,
    entityId: id,
    metadata: { assessmentId: id, ownerKind: owner.kind, simulated: true },
  });
  notify();
  return record;
}


/** Persist a completed assessment's result onto the record (idempotent by id). */
export function attachAssessmentResult(id: string, result: UkMarketFitAssessmentResult): PreAuditAssessment | null {
  const existing = getPreAuditAssessment(id);
  if (!existing) return null;
  const updated: PreAuditAssessment = {
    ...existing,
    status: result.researchUnavailableReason ? 'research_unavailable' : 'assessed',
    brandOpportunity: result.brandOpportunity,
    productOpportunities: result.productOpportunities,
    supplyProfile: result.supplyProfile,
    snapshot: result.snapshot,
    researchUnavailableReason: result.researchUnavailableReason,
    updatedAt: demoToday(),
  };
  assessments = assessments.map((a) => (a.id === id ? updated : a));
  mirror('preaudit_assessments', id, () =>
    getDomainRepository().persistPreAuditAssessment(updated, tenantIdFor(updated.owner))
  );
  audit(
    'pre_audit_completed',
    id,
    `Assessment completed: ${result.snapshot.qualificationLabel}. ${result.snapshot.headline}`,
    'visitor:public'
  );
  emitEvent({
    type: 'assessment_completed',
    severity: 'important',
    title: 'UK Market Fit assessment completed',
    description: `${updated.input.brandName}: ${result.snapshot.qualificationLabel}. Presence ${result.snapshot.presenceLabel}.`,
    entityId: id,
    metadata: {
      assessmentId: id,
      qualification: result.snapshot.qualification,
      simulated: result.snapshot.researchMode === 'simulated',
    },
  });
  emitEvent({
    type: 'opportunity_created',
    severity: 'important',
    title: 'Brand opportunity recorded',
    description: `${updated.input.brandName} produced a canonical brand opportunity record from the assessment.`,
    entityId: updated.brandOpportunity.id,
    metadata: { assessmentId: id, brandKey: updated.brandOpportunity.dedupeKey },
  });
  if (result.snapshot.qualification === 'qualified') {
    emitEvent({
      type: 'opportunity_qualified',
      severity: 'important',
      title: 'Opportunity qualified for review',
      description: `${updated.input.brandName} qualified for a Mercenta review on the available evidence. It is NOT a brand tenant.`,
      entityId: id,
      metadata: { assessmentId: id },
    });
  } else {
    emitEvent({
      type: 'research_required',
      severity: 'informational',
      title: 'More information required',
      description: `${updated.input.brandName} needs the open questions answered before a view can be formed.`,
      entityId: id,
      metadata: { assessmentId: id, openQuestions: result.snapshot.openQuestions.length },
    });
  }
  notify();
  return updated;
}

/** Record that the assessment was fed into the canonical acquisition pipeline. */
export function markAssessmentFed(id: string, prospectId: string, actorStaffId: string): PreAuditAssessment | null {
  const existing = getPreAuditAssessment(id);
  if (!existing) return null;
  const updated: PreAuditAssessment = { ...existing, fedProspectId: prospectId, updatedAt: demoToday() };
  assessments = assessments.map((a) => (a.id === id ? updated : a));
  mirror('preaudit_assessments', id, () =>
    getDomainRepository().persistPreAuditAssessment(updated, tenantIdFor(updated.owner))
  );
  audit(
    'pre_audit_fed_to_acquisition',
    id,
    `Assessment fed into the canonical acquisition pipeline as prospect ${prospectId}. The prospect is not a brand tenant.`,
    actorStaffId,
    prospectId
  );
  notify();
  return updated;
}

/**
 * Record that the brand asked Mercenta to review the assessment. This is the
 * ONLY action that makes a prospect outreach-ready: qualification alone is a
 * statement about evidence, not a request for contact.
 */
export function requestMercentaReview(
  id: string,
  contact: { name?: string; email?: string }
): PreAuditAssessment | null {
  const existing = getPreAuditAssessment(id);
  if (!existing) return null;
  const updated: PreAuditAssessment = {
    ...existing,
    input: {
      ...existing.input,
      contactName: contact.name ?? existing.input.contactName,
      contactEmail: contact.email ?? existing.input.contactEmail,
    },
    updatedAt: demoToday(),
  };
  assessments = assessments.map((a) => (a.id === id ? updated : a));
  mirror('preaudit_assessments', id, () =>
    getDomainRepository().persistPreAuditAssessment(updated, tenantIdFor(updated.owner))
  );
  audit(
    'pre_audit_review_requested',
    id,
    `${updated.input.brandName} asked Mercenta to review the assessment${contact.email ? ` (contact supplied)` : ' (no contact supplied)'}.`,
    'visitor:public'
  );
  if (updated.snapshot?.qualification === 'qualified') {
    emitEvent({
      type: 'outreach_ready',
      severity: 'important',
      title: 'Outreach-ready prospect',
      description: `${updated.input.brandName} requested a Mercenta review and is outreach-ready. A founder decision is required to feed the canonical acquisition pipeline.`,
      entityId: id,
      metadata: { assessmentId: id, hasContact: Boolean(contact.email) },
    });
  }
  notify();
  return updated;
}

/**
 * RELOAD SEMANTICS — overlay durable records onto the in-memory set, deduped by
 * canonical id. With nothing durable this is an honest no-op.
 */
export async function hydratePreAuditFromPersistence(scope: TenantScope): Promise<PreAuditAssessment[]> {
  const h = await getDomainRepository().hydrate(scope);
  const byId = new Map(assessments.map((a) => [a.id, a] as const));
  for (const a of h.preAuditAssessments) byId.set(a.id, a);
  assessments = [...byId.values()];
  notify();
  return h.preAuditAssessments;
}

/** Determinism/test helper — wipes state so the next run starts clean. */
export function resetPreAuditStore(): void {
  assessments = [];
  runSequence = {};
  version = 0;
  persistenceMirror.reset();
  notify();
}

