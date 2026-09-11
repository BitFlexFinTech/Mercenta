/**
 * §Phase C — acquisition / outreach lifecycle engine.
 *
 * The downstream half of the canonical funnel:
 *
 *   Brand Intelligence prospect (canonical, real brands)
 *     → ICP enrolment (same prospect id, same evidence)
 *     → contact/targeting (BI contacts + channel selection)
 *     → outreach preparation (BI evidence drives the copy — "why we are
 *       contacting this brand" is answerable from the BI record)
 *     → human approval: MODIFY / APPROVE / REJECT (real state transitions)
 *     → send through the transport seam (simulation when no credentials;
 *       the connected provider client when there is one)
 *     → response (intent-classified by the canonical classifyInboundReply)
 *     → Opportunity
 *     → CRM relationship context (BI record + outreach + response +
 *       opportunity + the ONE canonical message thread)
 *
 * Non-negotiable rules implemented here:
 * - ONE canonical prospect identity: every artefact is keyed by `prospect.id`.
 * - No fabricated prospects, no mock replacement brands, no second lead array.
 * - Simulation performs ZERO network calls (see the simulation transport).
 * - Every mutation requires an authorised actor (RBAC) and is audited twice:
 *   on the BI prospect timeline and in the platform audit log.
 */
import type {
  AcquisitionEvent,
  AcquisitionEventType,
  AcquisitionPipelineSummary,
  AcquisitionRelationship,
  BrandProspect,
  Lead,
  LeadRegion,
  Message,
  Opportunity,
  OpportunityStage,
  OutreachResponse,
  OutreachStatus,
  ProspectOutreachRecord,
} from '@/types';
import { generateEmail, generateLinkedInMessage, generateOutreachSummary } from '@/lib/intelligence/outreachGenerator';
import { classifyInboundReply } from '@/lib/marketing';
import {
  acquisitionLeadId,
  buildAcquisitionLead,
  deriveIcpOriginRegion,
  leadStageForOutreachStatus,
  outreachStatusForLeadStage,
} from '@/lib/intelligence/prospectPipeline';
import { setProspectOutreachStatus } from '@/lib/intelligence/prospectLifecycle';
import * as store from '@/data/acquisitionStore';
import { getProspect, getProspects } from '@/data/prospectStore';
import { logMessage } from '@/data/api';
import { simulationOutreachTransport, type OutreachTransport } from './outreachSender';

/** The operator performing an acquisition action, with its RBAC verdict. */
export interface AcquisitionActor {
  staffId: string;
  /** true only for an active, full-permission staff account (staffCanMutate). */
  canMutate: boolean;
}

export type AcquisitionResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const FORBIDDEN = 'FORBIDDEN — the acting staff account is view-only.';
const NO_PROSPECT = 'NOT_FOUND — no canonical prospect with that id.';

function nowIso(): string {
  return new Date().toISOString();
}

function forbidden<T>(): AcquisitionResult<T> {
  return { ok: false, error: FORBIDDEN };
}

/** Append the relationship-timeline event (relationship audit). */
function pushEvent(
  type: AcquisitionEventType,
  prospect: BrandProspect,
  actor: AcquisitionActor,
  summary: string,
  detail?: string
): AcquisitionEvent {
  return store.recordAcquisitionEvent({
    id: `acq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    prospectId: prospect.id,
    brand: prospect.brand,
    type,
    at: nowIso(),
    actor: actor.staffId,
    summary,
    detail,
  });
}

/** Move the canonical BI prospect forward, audited on its own timeline. */
function transitionProspect(
  prospectId: string,
  next: OutreachStatus,
  actor: AcquisitionActor,
  note: string
): void {
  setProspectOutreachStatus(prospectId, next, note, actor.staffId);
}

/**
 * Deterministic outreach destination. Real contact emails are used when the BI
 * record has one; otherwise a clearly-fake `.example` address (reserved TLD) is
 * derived from the brand — unmistakably a placeholder, never a plausible
 * real-world address.
 */
export function outreachDestination(prospect: BrandProspect): string {
  const real = (prospect.contacts[0]?.email ?? '').trim();
  if (real) return real;
  const slug = prospect.brand.toLowerCase().replace(/[^a-z0-9]/g, '') || 'brand';
  return `hello@${slug}.example`;
}

/* ── Read models ───────────────────────────────────────────────────────── */

export interface AcquisitionProspectRow {
  prospect: BrandProspect;
  /** The ICP record for the SAME canonical identity (null when region unknown). */
  lead: Lead | null;
  region: LeadRegion | null;
  current: ProspectOutreachRecord | null;
  opportunity: Opportunity | null;
  responseCount: number;
  stage: string;
}

/** Human-readable acquisition stage for a prospect (display + assertions). */
export function acquisitionStageLabel(prospectId: string): string {
  const opportunity = store.getOpportunityForProspect(prospectId);
  if (opportunity) return opportunity.stage.replace(/_/g, ' ');
  if (store.getResponsesForProspect(prospectId).length > 0) return 'responded';
  const current = store.getCurrentOutreach(prospectId);
  if (current) {
    switch (current.status) {
      case 'pending_approval': return 'awaiting approval';
      case 'approved': return 'approved';
      case 'sent':
      case 'opened':
      case 'replied': return 'sent';
      case 'rejected': return 'rejected';
      default: return 'draft';
    }
  }
  const prospect = getProspect(prospectId);
  if (prospect && (prospect.outreachStatus === 'ready_to_contact' || prospect.outreachStatus === 'researching')) {
    return 'enrolled';
  }
  return 'not enrolled';
}

/**
 * Every ACTIVE canonical BI prospect available to the acquisition workflow.
 * Disqualified prospects are excluded (not targetable) but stay tracked in the
 * BI store.
 */
export function listAcquisitionProspects(): AcquisitionProspectRow[] {
  return getProspects()
    .filter((p) => !p.disqualified)
    .map((prospect) => ({
      prospect,
      lead: buildAcquisitionLead(prospect),
      region: deriveIcpOriginRegion(prospect),
      current: store.getCurrentOutreach(prospect.id),
      opportunity: store.getOpportunityForProspect(prospect.id),
      responseCount: store.getResponsesForProspect(prospect.id).length,
      stage: acquisitionStageLabel(prospect.id),
    }));
}

/** The canonical relationship context for one prospect (CRM-facing read). */
export function getRelationshipContext(prospectId: string): AcquisitionRelationship | null {
  return store.getRelationship(prospectId);
}

export function getAcquisitionSummary(): AcquisitionPipelineSummary {
  return store.getSummary();
}

/**
 * Reconcile an ICP lead row with its canonical BI prospect, so the ICP list
 * always DISPLAYS the canonical state (the BI prospect owns the outreach
 * status; the lead row is a projection of it). Leads without a `prospectId`
 * (CSV imports of unknown brands) are returned untouched.
 */
export function reconcileLeadWithProspect(lead: Lead): Lead {
  if (!lead.prospectId) return lead;
  const prospect = getProspect(lead.prospectId);
  if (!prospect) return lead;
  return {
    ...lead,
    id: acquisitionLeadId(prospect.id),
    company: prospect.brand,
    segment: lead.segment && lead.segment !== 'Uncategorized' ? lead.segment : prospect.category,
    region: deriveIcpOriginRegion(prospect) ?? lead.region,
    outreachStatus: leadStageForOutreachStatus(prospect.outreachStatus),
  };
}

/** Reverse projection: a lead-stage change moves the canonical prospect. */
export function applyLeadStageToProspect(
  prospectId: string,
  stage: Lead['outreachStatus'],
  actor: AcquisitionActor
): void {
  transitionProspect(prospectId, outreachStatusForLeadStage(stage), actor, `ICP stage set to ${stage}`);
}

/* ── 1. ICP enrolment ──────────────────────────────────────────────────── */

export interface EnrolmentResult {
  prospect: BrandProspect;
  lead: Lead;
  region: LeadRegion;
}

/**
 * Move a canonical prospect into the ICP/acquisition pipeline. Requires a
 * derivable origin region (never invented) and an authorised actor.
 */
export function enrollProspect(
  prospectId: string,
  actor: AcquisitionActor
): AcquisitionResult<EnrolmentResult> {
  if (!actor.canMutate) return forbidden();
  const prospect = getProspect(prospectId);
  if (!prospect) return { ok: false, error: NO_PROSPECT };
  if (prospect.disqualified) return { ok: false, error: 'DISQUALIFIED — not targetable.' };
  const region = deriveIcpOriginRegion(prospect);
  const lead = buildAcquisitionLead(prospect);
  if (!region || !lead) return { ok: false, error: 'NO_ICP_REGION — origin region not derivable.' };

  const already = prospect.outreachStatus === 'ready_to_contact';
  transitionProspect(prospectId, 'ready_to_contact', actor, 'Enrolled into the ICP acquisition pipeline');
  if (!already) {
    pushEvent('enrolled', prospect, actor, `${prospect.brand} enrolled into the ICP acquisition pipeline`, `region ${region} · lead ${lead.id}`);
    store.recordAcquisitionAudit(
      'acquisition_prospect_enrolled',
      prospectId,
      `Enrolled from Brand Intelligence (region ${region})`,
      actor.staffId
    );
  }
  return { ok: true, value: { prospect: getProspect(prospectId) ?? prospect, lead, region } };
}

/* ── 2. Outreach preparation (BI evidence drives the copy) ─────────────── */

export interface PreparedOutreach {
  record: ProspectOutreachRecord;
  /** WHY this brand is being contacted — BI evidence summary. */
  whyContact: string;
}

/**
 * Prepare the outreach recommendation for a canonical prospect. The copy comes
 * from the existing BI outreach generator (which reads ASINs, scores, contacts
 * and distributor position), and the BI evidence summary is stored ON the
 * record so "why are we contacting this brand?" is answerable at any time.
 *
 * Enrols the prospect first when it has not been enrolled yet — the operator
 * should not have to perform two steps to prepare a recommendation.
 */
export function prepareOutreach(
  prospectId: string,
  actor: AcquisitionActor,
  channel: 'email' | 'linkedin' = 'email'
): AcquisitionResult<PreparedOutreach> {
  if (!actor.canMutate) return forbidden();
  const prospect = getProspect(prospectId);
  if (!prospect) return { ok: false, error: NO_PROSPECT };
  if (prospect.disqualified) return { ok: false, error: 'DISQUALIFIED — not targetable.' };
  if (!deriveIcpOriginRegion(prospect)) {
    return { ok: false, error: 'NO_ICP_REGION — origin region not derivable.' };
  }

  // Ensure the prospect is in the pipeline (ICP enrolment) first.
  if (prospect.outreachStatus === 'uncontacted') {
    const enrolled = enrollProspect(prospectId, actor);
    if (!enrolled.ok) return enrolled;
  }

  const fresh = getProspect(prospectId) ?? prospect;
  const previous = store.getOutreachForProspect(prospectId);
  const generated =
    channel === 'linkedin' ? generateLinkedInMessage(fresh) : generateEmail(fresh);
  const whyContact = generateOutreachSummary(fresh);

  const record: ProspectOutreachRecord = {
    ...generated,
    status: 'pending_approval',
    revision: previous.length + 1,
    leadId: acquisitionLeadId(prospectId),
    evidenceSummary: whyContact,
  };
  store.saveOutreach(record);
  pushEvent(
    'outreach_prepared',
    fresh,
    actor,
    `Outreach recommendation prepared for ${fresh.brand} (${channel}, revision ${record.revision})`,
    whyContact.split('\n')[0]
  );
  store.recordAcquisitionAudit(
    'acquisition_outreach_prepared',
    prospectId,
    `Recommendation prepared (${channel}, revision ${record.revision}) — awaiting human approval`,
    actor.staffId
  );
  return { ok: true, value: { record, whyContact } };
}

/* ── 3. Human approval: MODIFY / APPROVE / REJECT ──────────────────────── */

/** Operator edits the recommendation before approving (revision is audited). */
export function modifyOutreach(
  outreachId: string,
  patch: { subject?: string; body?: string },
  actor: AcquisitionActor
): AcquisitionResult<ProspectOutreachRecord> {
  if (!actor.canMutate) return forbidden();
  const current = store.getOutreachById(outreachId);
  if (!current) return { ok: false, error: 'NOT_FOUND — no such outreach record.' };
  if (current.status !== 'pending_approval') {
    return { ok: false, error: `INVALID_STATE — only a pending recommendation can be modified (status ${current.status}).` };
  }
  const body = patch.body ?? current.body;
  if (!body.trim()) return { ok: false, error: 'INVALID_INPUT — the message body cannot be empty.' };

  const updated = store.updateOutreach(outreachId, {
    subject: patch.subject ?? current.subject,
    body,
    revision: (current.revision ?? 1) + 1,
    modifiedBy: actor.staffId,
    modifiedAt: nowIso(),
  });
  if (!updated) return { ok: false, error: 'NOT_FOUND — no such outreach record.' };
  const prospect = getProspect(current.prospectId);
  if (prospect) {
    pushEvent(
      'outreach_modified',
      prospect,
      actor,
      `Recommendation modified by ${actor.staffId} (revision ${updated.revision})`,
      updated.subject ?? '(no subject)'
    );
    store.recordAcquisitionAudit('acquisition_outreach_modified', current.prospectId, `Recommendation edited (revision ${updated.revision})`, actor.staffId);
  }
  return { ok: true, value: updated };
}

/** Approve the recommendation — the required human-in-the-loop decision. */
export function approveOutreach(
  outreachId: string,
  actor: AcquisitionActor,
  note?: string
): AcquisitionResult<ProspectOutreachRecord> {
  if (!actor.canMutate) return forbidden();
  const current = store.getOutreachById(outreachId);
  if (!current) return { ok: false, error: 'NOT_FOUND — no such outreach record.' };
  if (current.status !== 'pending_approval') {
    return { ok: false, error: `INVALID_STATE — only a pending recommendation can be approved (status ${current.status}).` };
  }
  const updated = store.updateOutreach(outreachId, {
    status: 'approved',
    approvedBy: actor.staffId,
    approvedAt: nowIso(),
    approvalNote: note,
  });
  if (!updated) return { ok: false, error: 'NOT_FOUND — no such outreach record.' };
  const prospect = getProspect(current.prospectId);
  if (prospect) {
    pushEvent('outreach_approved', prospect, actor, `Recommendation APPROVED by ${actor.staffId}`, note);
    store.recordAcquisitionAudit('acquisition_outreach_approved', current.prospectId, note ?? 'Approved by operator', actor.staffId);
  }
  return { ok: true, value: updated };
}

/** Reject the recommendation — distinct, audited terminal state for that revision. */
export function rejectOutreach(
  outreachId: string,
  reason: string,
  actor: AcquisitionActor
): AcquisitionResult<ProspectOutreachRecord> {
  if (!actor.canMutate) return forbidden();
  const current = store.getOutreachById(outreachId);
  if (!current) return { ok: false, error: 'NOT_FOUND — no such outreach record.' };
  if (current.status !== 'pending_approval') {
    return { ok: false, error: `INVALID_STATE — only a pending recommendation can be rejected (status ${current.status}).` };
  }
  const updated = store.updateOutreach(outreachId, {
    status: 'rejected',
    rejectedBy: actor.staffId,
    rejectedAt: nowIso(),
    approvalNote: (reason ?? '').trim() || 'Rejected by operator',
  });
  if (!updated) return { ok: false, error: 'NOT_FOUND — no such outreach record.' };
  const prospect = getProspect(current.prospectId);
  if (prospect) {
    pushEvent('outreach_rejected', prospect, actor, `Recommendation REJECTED by ${actor.staffId}`, updated.approvalNote);
    store.recordAcquisitionAudit('acquisition_outreach_rejected', current.prospectId, updated.approvalNote ?? 'Rejected by operator', actor.staffId);
  }
  return { ok: true, value: updated };
}

/* ── 4. Send: simulation by default, live provider when connected ──────── */

export interface SendOutreachResult {
  record: ProspectOutreachRecord;
  message: Message;
  transport: 'simulation' | 'live';
  destination: string;
}

/**
 * Execute an APPROVED recommendation through the transport seam.
 *
 * The transport is the simulation transport unless a connected provider client
 * is supplied — the workflow itself never changes. Whatever the transport
 * outcome, the message is logged to the ONE canonical message store
 * (the always-log rule), keyed by the canonical prospect identity.
 */
export async function sendOutreach(
  outreachId: string,
  actor: AcquisitionActor,
  transport: OutreachTransport = simulationOutreachTransport
): Promise<AcquisitionResult<SendOutreachResult>> {
  if (!actor.canMutate) return forbidden();
  const current = store.getOutreachById(outreachId);
  if (!current) return { ok: false, error: 'NOT_FOUND — no such outreach record.' };
  if (current.status !== 'approved') {
    return { ok: false, error: `INVALID_STATE — only an approved recommendation can be sent (status ${current.status}).` };
  }
  const prospect = getProspect(current.prospectId);
  if (!prospect) return { ok: false, error: NO_PROSPECT };

  const destination = outreachDestination(prospect);
  const subject = current.subject ?? `Mercenta × ${prospect.brand}`;
  const outcome = await transport.send({ to: destination, subject, body: current.body });

  const effectiveTransport: 'simulation' | 'live' =
    transport.mode === 'simulation' || outcome.sandbox ? 'simulation' : 'live';
  const simulated = effectiveTransport === 'simulation';

  // ALWAYS-LOG RULE — the message lands in the canonical store either way.
  const message = await logMessage({
    brandId: store.relationshipIdFor(prospect.id),
    leadId: current.leadId,
    channel: 'email',
    direction: 'outbound',
    subject,
    body: outcome.ok
      ? `${simulated ? '[SIMULATED SEND — no live provider connected] ' : ''}${current.body}`
      : `[SEND FAILED — ${outcome.error}] ${current.body}`,
    sentBy: 'staff',
    requiresHuman: false,
  });

  if (!outcome.ok) {
    store.recordAcquisitionAudit('acquisition_outreach_send_failed', prospect.id, `Send failed: ${outcome.error}`, actor.staffId);
    return { ok: false, error: `SEND_FAILED — ${outcome.error ?? 'unknown transport error'}` };
  }

  const record = store.updateOutreach(outreachId, {
    status: 'sent',
    sentAt: nowIso(),
    transport: effectiveTransport,
  });
  if (!record) return { ok: false, error: 'NOT_FOUND — no such outreach record.' };

  transitionProspect(prospect.id, 'contacted', actor, 'Outreach sent to the brand');
  pushEvent(
    'outreach_sent',
    prospect,
    actor,
    `${simulated ? 'SIMULATED send' : 'Send'} to ${prospect.brand} (${destination})`,
    `transport ${effectiveTransport} · message ${message.id}`
  );
  store.recordAcquisitionAudit(
    'acquisition_outreach_sent',
    prospect.id,
    `${simulated ? 'Simulated' : 'Live'} send to ${destination} — message ${message.id}`,
    actor.staffId
  );
  return { ok: true, value: { record, message, transport: effectiveTransport, destination } };
}

/* ── 5. Response handling ──────────────────────────────────────────────── */

export interface ResponseInput {
  body: string;
  from?: string;
  channel?: string;
  outreachId?: string;
}

/**
 * Route an inbound reply into the canonical workflow. This is the SINGLE
 * response path: a deterministic simulated reply and a genuine inbound reply
 * both land here, so intent classification, the prospect transition, the
 * canonical message and the relationship event can never diverge between them.
 */
export async function recordResponse(
  prospectId: string,
  input: ResponseInput,
  actor: AcquisitionActor,
  opts: { simulated?: boolean } = {}
): Promise<AcquisitionResult<OutreachResponse>> {
  if (!actor.canMutate) return forbidden();
  const prospect = getProspect(prospectId);
  if (!prospect) return { ok: false, error: NO_PROSPECT };
  const body = (input.body ?? '').trim();
  if (!body) return { ok: false, error: 'INVALID_INPUT — a response body is required.' };

  const current = store.getCurrentOutreach(prospectId);
  const from = input.from ?? outreachDestination(prospect);
  const channel = input.channel ?? 'email';
  const simulated = opts.simulated === true;
  // Canonical intent detection — the previously uncalled contract, now wired.
  const classification = classifyInboundReply(body);

  const response: OutreachResponse = {
    id: `resp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    prospectId,
    outreachId: input.outreachId ?? current?.id,
    receivedAt: nowIso(),
    channel,
    from,
    body,
    wantsHuman: classification.wantsHuman,
    classificationReason: classification.reason,
    simulated,
    handledBy: actor.staffId,
  };
  store.addResponse(response);

  await logMessage({
    brandId: store.relationshipIdFor(prospectId),
    leadId: current?.leadId,
    channel: channel === 'linkedin' ? 'in_app' : 'email',
    direction: 'inbound',
    subject: `Re: Mercenta × ${prospect.brand}`,
    body: `${simulated ? '[SIMULATED INBOUND — no live provider connected] ' : ''}${body}`,
    sentBy: 'automation',
    requiresHuman: classification.wantsHuman,
  });

  if (current) store.updateOutreach(current.id, { status: 'replied' });
  transitionProspect(
    prospectId,
    classification.wantsHuman ? 'interested' : 'replied',
    actor,
    classification.wantsHuman ? 'Brand replied with buying intent' : 'Brand replied'
  );
  pushEvent(
    'response_received',
    prospect,
    actor,
    `${simulated ? 'Simulated' : 'Live'} response received from ${prospect.brand}`,
    classification.wantsHuman ? `escalation: ${classification.reason}` : 'no escalation intent'
  );
  store.recordAcquisitionAudit(
    'acquisition_response_received',
    prospectId,
    classification.wantsHuman ? `Hot reply — ${classification.reason}` : 'Reply received',
    actor.staffId
  );
  return { ok: true, value: response };
}

/**
 * Deterministic simulated inbound reply. There is no live inbound provider, so
 * the simulation produces a clearly-labelled reply containing buying intent —
 * downstream (classification → opportunity) behaves exactly as it will with a
 * genuine reply.
 */
export async function simulateResponse(
  prospectId: string,
  actor: AcquisitionActor
): Promise<AcquisitionResult<OutreachResponse>> {
  if (!actor.canMutate) return forbidden();
  const prospect = getProspect(prospectId);
  if (!prospect) return { ok: false, error: NO_PROSPECT };
  const current = store.getCurrentOutreach(prospectId);
  if (!current || current.status !== 'sent') {
    return { ok: false, error: 'NO_SENT_OUTREACH — send the approved outreach first.' };
  }
  const body = `[SIMULATED REPLY — no live provider connected] Thanks for reaching out about ${prospect.brand}. Could you share pricing and next steps?`;
  return recordResponse(
    prospectId,
    { body, from: outreachDestination(prospect), channel: 'email', outreachId: current.id },
    actor,
    { simulated: true }
  );
}

/* ── 6. Opportunity (qualified interaction → commercial record) ────────── */

/** Legal opportunity stage transitions — an illegal jump is refused. */
export const OPPORTUNITY_TRANSITIONS: Readonly<Record<OpportunityStage, readonly OpportunityStage[]>> = {
  new: ['contacted', 'responded', 'qualified', 'lost'],
  contacted: ['responded', 'qualified', 'lost'],
  responded: ['qualified', 'won', 'lost'],
  qualified: ['won', 'lost'],
  won: [],
  lost: [],
};

/**
 * Turn a qualified interaction into an Opportunity. The BI score/tier and the
 * BI evidence summary are SNAPSHOTTED onto the opportunity, so the CRM
 * relationship records what Brand Intelligence knew when the brand was
 * qualified — it is never re-derived downstream.
 */
export function createOpportunityFromResponse(
  prospectId: string,
  actor: AcquisitionActor,
  opts: { ownerStaffId?: string } = {}
): AcquisitionResult<Opportunity> {
  if (!actor.canMutate) return forbidden();
  const prospect = getProspect(prospectId);
  if (!prospect) return { ok: false, error: NO_PROSPECT };
  const responses = store.getResponsesForProspect(prospectId);
  if (responses.length === 0) return { ok: false, error: 'NO_RESPONSE — a response is required before an opportunity.' };
  const latest = responses[responses.length - 1];
  const current = store.getCurrentOutreach(prospectId);
  const contact = prospect.contacts[0];
  const evidenceSummary = generateOutreachSummary(prospect);

  const existing = store.getOpportunityForProspect(prospectId);
  if (existing) {
    // Only a non-terminal opportunity can still be qualified by a hot reply;
    // terminal stages (won/lost) are never moved backwards.
    const advanceable: readonly OpportunityStage[] = ['new', 'contacted', 'responded'];
    if (latest.wantsHuman && advanceable.includes(existing.stage)) {
      return setOpportunityStage(existing.id, 'qualified', actor);
    }
    return { ok: true, value: existing };
  }

  const now = nowIso();
  const opportunity: Opportunity = {
    id: `opp-${prospectId}`,
    prospectId,
    brand: prospect.brand,
    category: prospect.category,
    stage: latest.wantsHuman ? 'qualified' : 'responded',
    biScore: prospect.score.total,
    biTier: prospect.score.tier,
    evidenceSummary,
    contactName: contact ? `${contact.name}${contact.jobTitle ? `, ${contact.jobTitle}` : ''}` : undefined,
    contactEmail: contact?.email,
    leadId: store.relationshipIdFor(prospectId) ? acquisitionLeadId(prospectId) : undefined,
    outreachId: current?.id,
    responseId: latest.id,
    ownerStaffId: opts.ownerStaffId ?? actor.staffId,
    createdAt: now,
    updatedAt: now,
  };
  store.addOpportunity(opportunity);
  transitionProspect(
    prospectId,
    opportunity.stage === 'qualified' ? 'meeting_scheduled' : 'interested',
    actor,
    `Opportunity created from brand response (${opportunity.stage})`
  );
  pushEvent(
    'opportunity_created',
    prospect,
    actor,
    `Opportunity created for ${prospect.brand} — stage ${opportunity.stage}`,
    `BI score ${opportunity.biScore}/100 (${opportunity.biTier}) · owner ${opportunity.ownerStaffId}`
  );
  store.recordAcquisitionAudit(
    'acquisition_opportunity_created',
    prospectId,
    `Opportunity ${opportunity.id} created (stage ${opportunity.stage}, BI score ${opportunity.biScore}/100)`,
    actor.staffId
  );
  return { ok: true, value: opportunity };
}

/** Move an opportunity stage — validated against OPPORTUNITY_TRANSITIONS. */
export function setOpportunityStage(
  opportunityId: string,
  stage: OpportunityStage,
  actor: AcquisitionActor
): AcquisitionResult<Opportunity> {
  if (!actor.canMutate) return forbidden();
  const opportunity = store.getOpportunities().find((o) => o.id === opportunityId);
  if (!opportunity) return { ok: false, error: 'NOT_FOUND — no such opportunity.' };
  if (opportunity.stage === stage) return { ok: true, value: opportunity };
  if (!OPPORTUNITY_TRANSITIONS[opportunity.stage].includes(stage)) {
    return { ok: false, error: `ILLEGAL_TRANSITION — ${opportunity.stage} → ${stage} is not allowed.` };
  }
  const updated = store.updateOpportunity(opportunityId, { stage, updatedAt: nowIso() });
  if (!updated) return { ok: false, error: 'NOT_FOUND — no such opportunity.' };
  const prospect = getProspect(updated.prospectId);
  if (prospect) {
    pushEvent(
      'opportunity_stage_changed',
      prospect,
      actor,
      `Opportunity stage ${opportunity.stage} → ${stage}`,
      `opportunity ${opportunityId}`
    );
    store.recordAcquisitionAudit(
      'acquisition_opportunity_stage_changed',
      updated.prospectId,
      `${opportunity.stage} → ${stage}`,
      actor.staffId
    );
  }
  return { ok: true, value: updated };
}
