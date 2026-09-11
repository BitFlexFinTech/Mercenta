/**
 * §Phase C — canonical acquisition store.
 *
 * Single runtime source of truth for the acquisition artefacts that sit
 * downstream of Brand Intelligence:
 *
 *   BI canonical prospect  →  ICP lead  →  outreach recommendation
 *     →  human approval (approve / reject / modify)  →  simulated or live send
 *     →  response  →  Opportunity  →  CRM relationship context
 *
 * Rules this module enforces:
 * - Every record is keyed by the CANONICAL prospect id (`prospect.id`).
 *   Nothing is duplicated or re-derived; the relationship context is composed
 *   from the BI store + this store + the ONE canonical message store.
 * - Nothing here invents prospects: records exist only for canonical BI
 *   prospects that an operator actually moved through the workflow.
 * - Every mutation appends an AcquisitionEvent (relationship timeline) AND a
 *   platform audit-log entry (the existing `demoAuditLog` registry).
 *
 * Persistence contract (§Phase D4):
 * the in-memory arrays remain the deterministic working set (simulation is
 * unchanged and performs ZERO network calls), and EVERY mutation is mirrored
 * through the domain persistence port (`src/data/domainRepository.ts`).
 *
 * - With no Supabase configured (the demo environment) the active adapter is
 *   the memory adapter: writes are honest non-durable acknowledgements and the
 *   status reported here is `memory-only` — nothing is claimed to be persisted.
 * - With Supabase configured the durable adapter upserts each artefact by its
 *   CANONICAL id (idempotent — a replayed operation cannot duplicate a row) and
 *   the status becomes `durable` / `failed` (a failure is never a silent success).
 *
 * A full page reload re-boots the arrays from durable state via
 * `hydrateAcquisitionFromPersistence()` (a no-op load when nothing is durable),
 * while the BI universe re-boots from its authoritative seeds.
 */
import type {
  AcquisitionEvent,
  AcquisitionPipelineSummary,
  AcquisitionRelationship,
  BrandOnboarding,
  Opportunity,
  OutreachResponse,
  ProspectOutreachRecord,
} from '@/types';
import { demoAuditLog, demoMessages } from './demoStore';
import { getProspect, notifyCanonicalStoreChange } from './prospectStore';
import {
  getDomainRepository,
  MERCENTA_OPS_TENANT,
  createPersistenceMirror,
  DOMAIN_TABLES,
  type HydratedDomainState,
  type TenantScope,
  type PersistenceStatus,
} from './domainRepository';

let outreach: ProspectOutreachRecord[] = [];
let responses: OutreachResponse[] = [];
let opportunities: Opportunity[] = [];
let events: AcquisitionEvent[] = [];
/** §Phase E1 — canonical onboarding records for handed-off opportunities. */
let onboardings: BrandOnboarding[] = [];

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* ── §Phase D4 — persistence boundary ──────────────────────────────────── */

export type { PersistenceState, PersistenceStatus } from './domainRepository';

/**
 * Status-tracked mirror over the active port. Persistence semantics are defined
 * ONCE (`createPersistenceMirror` in domainRepository.ts) and shared by the BI
 * and acquisition stores.
 */
const persistenceMirror = createPersistenceMirror();
const mirror = persistenceMirror.write;

/** The current honest persistence status (UI + validators). */
export function getPersistenceStatus(): PersistenceStatus {
  return persistenceMirror.status();
}

/** Await every in-flight persistence write (tests + the async send path). */
export async function flushAcquisitionPersistence(): Promise<void> {
  await persistenceMirror.flush();
}

/**
 * RELOAD SEMANTICS — rebuild the in-memory working set from durable state.
 * Called only as the boot/hydrate step; with nothing durable it loads an empty
 * state (an honest reload, never a fabrication).
 */
export async function hydrateAcquisitionFromPersistence(
  scope: TenantScope
): Promise<HydratedDomainState> {
  const hydrated = await getDomainRepository().hydrate(scope);
  outreach = hydrated.outreach;
  responses = hydrated.responses;
  opportunities = hydrated.opportunities;
  events = hydrated.events;
  // Defensive: a partial/older adapter contract yields an empty list, never undefined.
  onboardings = hydrated.brandOnboarding ?? [];
  notifyCanonicalStoreChange();
  return hydrated;
}

/** Stable relationship id = the canonical prospect id (no second identity). */
export function relationshipIdFor(prospectId: string): string {
  return prospectId;
}

/* ── Outreach records ──────────────────────────────────────────────────── */

/** Every outreach revision, oldest first. */
export function getOutreachRecords(): ProspectOutreachRecord[] {
  return outreach;
}

export function getOutreachForProspect(prospectId: string): ProspectOutreachRecord[] {
  return outreach.filter((o) => o.prospectId === prospectId);
}

export function getOutreachById(outreachId: string): ProspectOutreachRecord | undefined {
  return outreach.find((o) => o.id === outreachId);
}

/** The current recommendation for a prospect (latest revision). */
export function getCurrentOutreach(prospectId: string): ProspectOutreachRecord | null {
  const mine = getOutreachForProspect(prospectId);
  return mine.length ? mine[mine.length - 1] : null;
}

export function saveOutreach(record: ProspectOutreachRecord): ProspectOutreachRecord {
  const existing = outreach.findIndex((o) => o.id === record.id);
  if (existing >= 0) outreach[existing] = record;
  else outreach = [...outreach, record];
  mirror(DOMAIN_TABLES.outreach, record.id, () =>
    getDomainRepository().persistOutreach(record, MERCENTA_OPS_TENANT)
  );
  notifyCanonicalStoreChange();
  return record;
}

export function updateOutreach(
  outreachId: string,
  patch: Partial<ProspectOutreachRecord>
): ProspectOutreachRecord | null {
  const idx = outreach.findIndex((o) => o.id === outreachId);
  if (idx < 0) return null;
  outreach[idx] = { ...outreach[idx], ...patch };
  mirror(DOMAIN_TABLES.outreach, outreachId, () =>
    getDomainRepository().persistOutreach(outreach[idx], MERCENTA_OPS_TENANT)
  );
  notifyCanonicalStoreChange();
  return outreach[idx];
}

/* ── Responses ─────────────────────────────────────────────────────────── */

export function getResponses(): OutreachResponse[] {
  return responses;
}

export function getResponsesForProspect(prospectId: string): OutreachResponse[] {
  return responses.filter((r) => r.prospectId === prospectId);
}

export function addResponse(response: OutreachResponse): OutreachResponse {
  // §Phase D4 — idempotent by CANONICAL id: a replayed response is upserted,
  // never duplicated (mirrors the persistence adapter's upsert semantics).
  const existing = responses.findIndex((r) => r.id === response.id);
  if (existing >= 0) responses[existing] = response;
  else responses = [...responses, response];
  mirror(DOMAIN_TABLES.responses, response.id, () =>
    getDomainRepository().persistResponse(response, MERCENTA_OPS_TENANT)
  );
  notifyCanonicalStoreChange();
  return response;
}

/* ── Opportunities ─────────────────────────────────────────────────────── */

export function getOpportunities(): Opportunity[] {
  return opportunities;
}

export function getOpportunityForProspect(prospectId: string): Opportunity | null {
  return opportunities.find((o) => o.prospectId === prospectId) ?? null;
}

export function addOpportunity(opportunity: Opportunity): Opportunity {
  // §Phase D4 — idempotent by CANONICAL id (one opportunity per prospect).
  const existing = opportunities.findIndex((o) => o.id === opportunity.id);
  if (existing >= 0) opportunities[existing] = opportunity;
  else opportunities = [...opportunities, opportunity];
  mirror(DOMAIN_TABLES.opportunities, opportunity.id, () =>
    getDomainRepository().persistOpportunity(
      opportunity,
      MERCENTA_OPS_TENANT,
      opportunity.brandId
    )
  );
  notifyCanonicalStoreChange();
  return opportunity;
}

export function updateOpportunity(
  opportunityId: string,
  patch: Partial<Opportunity>
): Opportunity | null {
  const idx = opportunities.findIndex((o) => o.id === opportunityId);
  if (idx < 0) return null;
  opportunities[idx] = { ...opportunities[idx], ...patch };
  mirror(DOMAIN_TABLES.opportunities, opportunityId, () =>
    getDomainRepository().persistOpportunity(
      opportunities[idx],
      MERCENTA_OPS_TENANT,
      opportunities[idx].brandId
    )
  );
  notifyCanonicalStoreChange();
  return opportunities[idx];
}

/* ── §Phase E1 — brand onboarding (opportunity → operational tenant) ────── */

export function getOnboardings(): BrandOnboarding[] {
  return onboardings;
}

/** The canonical onboarding record for a prospect, if the hand-off happened. */
export function getOnboardingForProspect(prospectId: string): BrandOnboarding | null {
  return onboardings.find((o) => o.prospectId === prospectId) ?? null;
}

export function getOnboardingForOpportunity(opportunityId: string): BrandOnboarding | null {
  return onboardings.find((o) => o.opportunityId === opportunityId) ?? null;
}

export function getOnboardingById(onboardingId: string): BrandOnboarding | undefined {
  return onboardings.find((o) => o.id === onboardingId);
}

/** A tenant id already claimed by another onboarding (tenant-collision guard). */
export function isTenantIdClaimed(brandId: string, exceptProspectId?: string): boolean {
  return onboardings.some((o) => o.brandId === brandId && o.prospectId !== exceptProspectId);
}

/**
 * §Phase E1 — idempotent by CANONICAL id (`onb-<prospectId>`): replaying the
 * hand-off upserts the same record, so it can never create a second onboarding
 * for one opportunity (mirrors the persistence adapter's upsert semantics).
 */
export function saveOnboarding(record: BrandOnboarding): BrandOnboarding {
  const existing = onboardings.findIndex((o) => o.id === record.id);
  if (existing >= 0) onboardings[existing] = record;
  else onboardings = [...onboardings, record];
  mirror(DOMAIN_TABLES.brandOnboarding, record.id, () =>
    getDomainRepository().persistBrandOnboarding(record, MERCENTA_OPS_TENANT)
  );
  notifyCanonicalStoreChange();
  return record;
}

export function updateOnboarding(
  onboardingId: string,
  patch: Partial<BrandOnboarding>
): BrandOnboarding | null {
  const idx = onboardings.findIndex((o) => o.id === onboardingId);
  if (idx < 0) return null;
  onboardings[idx] = { ...onboardings[idx], ...patch };
  mirror(DOMAIN_TABLES.brandOnboarding, onboardingId, () =>
    getDomainRepository().persistBrandOnboarding(onboardings[idx], MERCENTA_OPS_TENANT)
  );
  notifyCanonicalStoreChange();
  return onboardings[idx];
}

/* ── Events + platform audit ───────────────────────────────────────────── */

export function getAcquisitionEvents(prospectId?: string): AcquisitionEvent[] {
  return prospectId ? events.filter((e) => e.prospectId === prospectId) : events;
}

export function recordAcquisitionEvent(event: AcquisitionEvent): AcquisitionEvent {
  events = [...events, event];
  mirror(DOMAIN_TABLES.events, event.id, () =>
    getDomainRepository().persistEvent(event, MERCENTA_OPS_TENANT)
  );
  notifyCanonicalStoreChange();
  return event;
}

/** Platform-wide audit registry (single source — never a second audit log). */
export function recordAcquisitionAudit(
  action: string,
  prospectId: string,
  reason: string,
  actorStaffId: string
): void {
  demoAuditLog.push({
    id: uid('audit'),
    createdAt: new Date().toISOString(),
    actorId: actorStaffId,
    action,
    entityType: 'acquisition',
    entityId: prospectId,
    brandId: prospectId,
    reason,
  });
}

/* ── Derived relationship context ──────────────────────────────────────── */

/**
 * The canonical relationship context for one prospect: BI record + every
 * outreach revision + responses + opportunity + events + the messages logged
 * against the same identity in the ONE canonical message store.
 */
export function getRelationship(prospectId: string): AcquisitionRelationship | null {
  const prospect = getProspect(prospectId);
  if (!prospect) return null;
  const mine = getOutreachForProspect(prospectId);
  return {
    prospect,
    outreach: mine,
    current: mine.length ? mine[mine.length - 1] : null,
    responses: getResponsesForProspect(prospectId),
    opportunity: getOpportunityForProspect(prospectId),
    events: getAcquisitionEvents(prospectId),
    messages: demoMessages.filter((m) => m.brandId === relationshipIdFor(prospectId)),
  };
}

/** Derived pipeline counts for the admin UI/validators. */
export function getSummary(): AcquisitionPipelineSummary {
  let awaitingApproval = 0;
  let approved = 0;
  let sent = 0;
  const touched = new Set<string>();
  for (const o of outreach) {
    touched.add(o.prospectId);
    if (getCurrentOutreach(o.prospectId)?.id !== o.id) continue; // revision history
    if (o.status === 'pending_approval') awaitingApproval += 1;
    if (o.status === 'approved') approved += 1;
    if (o.status === 'sent' || o.status === 'opened' || o.status === 'replied') sent += 1;
  }
  return {
    prospects: touched.size,
    enrolled: touched.size,
    awaitingApproval,
    approved,
    sent,
    responded: new Set(responses.map((r) => r.prospectId)).size,
    opportunities: opportunities.length,
  };
}

/**
 * Determinism/test helper — wipes acquisition state so the next workflow starts
 * clean. Never called by product code.
 */
export function resetAcquisitionStore(): void {
  outreach = [];
  responses = [];
  opportunities = [];
  events = [];
  onboardings = [];
  persistenceMirror.reset();
  notifyCanonicalStoreChange();
}
