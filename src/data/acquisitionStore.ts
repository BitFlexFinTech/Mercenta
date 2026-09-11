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
 * Persistence contract (documented, same as prospectStore/demoStore):
 * in-memory for the session; a full page reload re-boots empty (no acquisition
 * has happened yet in the new session) while the BI universe re-boots from its
 * authoritative seeds. Supabase dual-write remains the future live seam.
 */
import type {
  AcquisitionEvent,
  AcquisitionPipelineSummary,
  AcquisitionRelationship,
  Opportunity,
  OutreachResponse,
  ProspectOutreachRecord,
} from '@/types';
import { demoAuditLog, demoMessages } from './demoStore';
import { getProspect, notifyCanonicalStoreChange } from './prospectStore';

let outreach: ProspectOutreachRecord[] = [];
let responses: OutreachResponse[] = [];
let opportunities: Opportunity[] = [];
let events: AcquisitionEvent[] = [];

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

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
  responses = [...responses, response];
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
  opportunities = [...opportunities, opportunity];
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
  notifyCanonicalStoreChange();
  return opportunities[idx];
}

/* ── Events + platform audit ───────────────────────────────────────────── */

export function getAcquisitionEvents(prospectId?: string): AcquisitionEvent[] {
  return prospectId ? events.filter((e) => e.prospectId === prospectId) : events;
}

export function recordAcquisitionEvent(event: AcquisitionEvent): AcquisitionEvent {
  events = [...events, event];
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
  notifyCanonicalStoreChange();
}
