/**
 * §Batch-13 — Helpdesk ticket store.
 *
 * Tickets are the escalation layer on top of the existing messages table.
 * A conversation becomes a ticket when escalated by staff or flagged by the
 * system. Live chat messages flow through the same `messages` table (reusing
 * the existing `logMessage` pipeline) — tickets group those messages into
 * support threads.
 */
import type {
  CaseAdminDecision,
  CaseCategory,
  CaseEscalationState,
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketSource,
  HelpdeskMetrics,
} from '@/types';
import { demoAuditLog, demoBrands, demoMessages } from '@/data/demoStore';
import {
  createCaseProviderClient,
  type CaseProviderClient,
} from '@/lib/helpdesk/amazonCaseClient';
import type { ProviderResolutionMode } from '@/integrations/types';

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* ── Seed tickets ─────────────────────────────────────────────────── */

export const demoTickets: Ticket[] = [
  {
    id: 'tkt-001', brandId: 'brand-astonish',
    // §Phase 4 — canonical message ids (msg-<brandId>-N from DEMO_MESSAGES).
    // The old fake-brand seed ids (msg-015/016/017) were removed with the
    // canonical 20-brand universe; the thread now resolves real Astonish mail.
    messageIds: ['msg-brand-astonish-1', 'msg-brand-astonish-2'],
    lastMessagePreview: 'When will my latest PO be dispatched?',
    lastMessageAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: 'open', priority: 'high', source: 'live_chat',
    subject: 'Astonish — PO dispatch query',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    seenByStaff: true, brandOnline: true, category: 'fulfillment',
  },
  {
    id: 'tkt-002', brandId: 'brand-seep',
    messageIds: ['msg-brand-seep-1'],
    lastMessagePreview: 'Submitted HMRC docs, what is the timeline?',
    lastMessageAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    status: 'open', priority: 'medium',
    assignedToStaffId: 'staff-003', source: 'email',
    subject: 'Seep — compliance timeline',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    seenByStaff: false, category: 'compliance',
  },
  {
    id: 'tkt-003', brandId: 'brand-clipper',
    messageIds: ['msg-brand-clipper-1'],
    lastMessagePreview: 'PO-9045 wrong unit pricing — can you correct?',
    lastMessageAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    status: 'pending', priority: 'urgent',
    assignedToStaffId: 'staff-001', source: 'email',
    subject: 'Clipper — PO-9045 pricing discrepancy',
    createdAt: new Date(Date.now() - 72 * 3600000).toISOString(),
    slaDeadline: new Date(Date.now() + 24 * 3600000).toISOString(),
    seenByStaff: true, category: 'pricing',
  },
  {
    id: 'tkt-004', brandId: 'brand-regatta',
    messageIds: ['msg-brand-regatta-1'],
    lastMessagePreview: 'When is next shipment for PO-9002 scheduled?',
    lastMessageAt: new Date(Date.now() - 96 * 3600000).toISOString(),
    status: 'open', priority: 'low',
    assignedToStaffId: 'staff-002', source: 'live_chat',
    subject: 'Regatta — shipment schedule',
    createdAt: new Date(Date.now() - 120 * 3600000).toISOString(),
    seenByStaff: true, brandOnline: false, category: 'logistics',
  },
  {
    id: 'tkt-005', brandId: 'brand-tapatio',
    messageIds: ['msg-brand-tapatio-1'],
    lastMessagePreview: 'Please update our bank sort code per attached letter.',
    lastMessageAt: new Date(Date.now() - 192 * 3600000).toISOString(),
    status: 'resolved', priority: 'medium',
    assignedToStaffId: 'staff-001', source: 'email',
    subject: 'Tapatío — bank details update',
    createdAt: new Date(Date.now() - 240 * 3600000).toISOString(),
    seenByStaff: true, category: 'banking',
  },
];
/* ── CRUD operations ──────────────────────────────────────────────── */

export function createTicket(brandId: string, subject: string, source: TicketSource, priority: TicketPriority = 'medium', category?: string): Ticket {
  const t: Ticket = {
    id: uid('tkt'), brandId, messageIds: [], lastMessagePreview: '',
    lastMessageAt: new Date().toISOString(), status: 'open', priority,
    assignedToStaffId: undefined, source, subject,
    createdAt: new Date().toISOString(), seenByStaff: false, category,
  };
  demoTickets.unshift(t);
  writeTicketAudit('ticket_created', t.id, brandId, `Ticket created via ${source}: ${subject}`);
  return t;
}

export function updateTicketStatus(ticketId: string, status: TicketStatus, actorStaffId?: string): Ticket | null {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return null;
  const prev = t.status;
  t.status = status;
  if (status === 'resolved') t.seenByStaff = true;
  writeTicketAudit('ticket_status_changed', ticketId, t.brandId, `${prev} → ${status}`, actorStaffId);
  return t;
}

export function assignTicket(ticketId: string, staffId: string, actorStaffId?: string): Ticket | null {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return null;
  t.assignedToStaffId = staffId;
  writeTicketAudit('ticket_assigned', ticketId, t.brandId, `Assigned to ${staffId}`, actorStaffId);
  return t;
}

export function setTicketPriority(ticketId: string, priority: TicketPriority, actorStaffId?: string): Ticket | null {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return null;
  t.priority = priority;
  writeTicketAudit('ticket_priority_changed', ticketId, t.brandId, `Priority: ${priority}`, actorStaffId);
  return t;
}

export function markTicketSeen(ticketId: string): Ticket | null {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return null;
  t.seenByStaff = true;
  return t;
}

export function linkMessageToTicket(ticketId: string, messageId: string): Ticket | null {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return null;
  if (!t.messageIds.includes(messageId)) t.messageIds.push(messageId);
  const msg = demoMessages.find((m) => m.id === messageId);
  if (msg) { t.lastMessagePreview = msg.body.slice(0, 100); t.lastMessageAt = msg.createdAt; }
  return t;
}

/**
 * Find an open ticket for a brand, or create one if none exists.
 * Used by LiveChatWidget to auto-create tickets from chat messages.
 */
export function findOrCreateTicketForBrand(
  brandId: string,
  subject: string,
  source: TicketSource,
  category?: string
): Ticket {
  // Reuse open ticket if one exists for this brand
  const existing = demoTickets.find(
    (t) => t.brandId === brandId && t.status !== 'resolved'
  );
  if (existing) return existing;
  // Create new ticket
  return createTicket(brandId, subject, source, 'medium', category);
}

/** Append a message ID to a ticket and update its preview. */
export function appendMessageToTicket(ticketId: string, messageId: string): Ticket | null {
  return linkMessageToTicket(ticketId, messageId);
}

/* ── Queries ──────────────────────────────────────────────────────── */

export function getTicketsForBrand(brandId: string): Ticket[] { return demoTickets.filter((t) => t.brandId === brandId); }
export function getTicketById(ticketId: string): Ticket | null { return demoTickets.find((t) => t.id === ticketId) ?? null; }
export function getTicketsByStatus(status: TicketStatus): Ticket[] { return demoTickets.filter((t) => t.status === status); }
export function getUnassignedTickets(): Ticket[] { return demoTickets.filter((t) => t.status !== 'resolved' && !t.assignedToStaffId); }

export function computeHelpdeskMetrics(): HelpdeskMetrics {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const open = demoTickets.filter((t) => t.status === 'open');
  const pending = demoTickets.filter((t) => t.status === 'pending');
  const resolvedToday = demoTickets.filter((t) => t.status === 'resolved' && t.createdAt.startsWith(today));
  const overdue = demoTickets.filter((t) => t.slaDeadline && new Date(t.slaDeadline) < now && t.status !== 'resolved');
  const unassigned = demoTickets.filter((t) => t.status !== 'resolved' && !t.assignedToStaffId);
  return { openCount: open.length, pendingCount: pending.length, resolvedToday: resolvedToday.length, overdueSla: overdue.length, avgResolutionTimeMinutes: 180, unassignedCount: unassigned.length };
}

function writeTicketAudit(action: string, ticketId: string, brandId: string, reason: string, actorStaffId?: string) {
  demoAuditLog.push({
    id: uid('audit'), createdAt: new Date().toISOString(), actorId: actorStaffId ?? 'system',
    action, entityType: 'helpdesk_ticket', entityId: ticketId, brandId, reason,
  });
}

/* ══════════════════════════════════════════════════════════════════════════
 * §Canonical model §15 — CANONICAL BRAND CASE WORKFLOW
 *
 *   brand opens case → Mercenta review → approve/request-info/reject
 *     → (approved) escalate to Amazon → Amazon response → resolve → close
 *
 * The hard rule: a brand case CANNOT reach Amazon without an explicit Mercenta
 * Admin review decision. There is no shortcut. Every transition is audited.
 * ══════════════════════════════════════════════════════════════════════════ */

/** Human-readable escalation-state words (never colour-only). */
export const CASE_ESCALATION_LABELS: Record<CaseEscalationState, string> = {
  brand_submitted: 'Awaiting Mercenta review',
  under_mercenta_review: 'Under Mercenta review',
  awaiting_brand_info: 'Information requested from brand',
  approved_for_escalation: 'Reviewed — ready to escalate',
  escalated_to_provider: 'Escalated to the retail channel',
  provider_responded: 'Retail channel responded',
  resolved: 'Resolved by Mercenta',
  closed: 'Closed',
};

/** Open work is anything not resolved/closed. */
export function isCaseOpen(t: Ticket): boolean {
  const st = t.escalationState;
  if (!st) return t.status !== 'resolved';
  return st !== 'resolved' && st !== 'closed';
}

let caseSeq = 0;

/** Reset the deterministic case-reference counter (tests / investor demo). */
export function resetCaseSequence(next = 0): void {
  caseSeq = next;
}

export interface CreateCaseInput {
  brandId: string;
  subject: string;
  /** The brand's own description. Admin may correct it before escalation. */
  description: string;
  caseCategory: CaseCategory;
  source?: TicketSource;
  priority?: TicketPriority;
  relatedPoNumber?: string;
  relatedShipmentId?: string;
  relatedDeductionId?: string;
  relatedPaymentId?: string;
  relatedComplianceDocId?: string;
  /** Deterministic id + reference (tests / investor demo replay). */
  id?: string;
  caseRef?: string;
}

/**
 * A brand opens a case. It is created in `brand_submitted` state — it does NOT
 * go to Amazon; it enters the Mercenta review queue.
 */
export function createCase(input: CreateCaseInput): Ticket {
  caseSeq += 1;
  const now = new Date().toISOString();
  const t: Ticket = {
    id: input.id ?? uid('case'),
    brandId: input.brandId,
    messageIds: [],
    lastMessagePreview: input.description.slice(0, 100),
    lastMessageAt: now,
    status: 'open',
    priority: input.priority ?? 'medium',
    source: input.source ?? 'in_app',
    subject: input.subject,
    createdAt: now,
    seenByStaff: false,
    category: input.caseCategory,
    caseRef: input.caseRef ?? `MC-${String(caseSeq).padStart(4, '0')}`,
    caseCategory: input.caseCategory,
    escalationState: 'brand_submitted',
    relatedPoNumber: input.relatedPoNumber,
    relatedShipmentId: input.relatedShipmentId,
    relatedDeductionId: input.relatedDeductionId,
    relatedPaymentId: input.relatedPaymentId,
    relatedComplianceDocId: input.relatedComplianceDocId,
    updatedAt: now,
  };
  demoTickets.unshift(t);
  writeTicketAudit(
    'case_created',
    t.id,
    t.brandId,
    `Case ${t.caseRef} opened (${input.caseCategory}) — awaiting Mercenta review. Not yet sent to the retail channel.`
  );
  return t;
}

export interface CaseActionResult {
  ok: boolean;
  error?: string;
  ticket?: Ticket;
}

/** Move a case into active review (idempotent). */
export function beginCaseReview(ticketId: string, actorStaffId: string): CaseActionResult {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return { ok: false, error: `Unknown case: ${ticketId}` };
  if (t.escalationState !== 'brand_submitted' && t.escalationState !== 'awaiting_brand_info') {
    return { ok: false, error: `Case ${t.caseRef ?? t.id} is not awaiting review.` };
  }
  t.escalationState = 'under_mercenta_review';
  t.adminOwnerStaffId = actorStaffId;
  t.seenByStaff = true;
  t.updatedAt = new Date().toISOString();
  writeTicketAudit('case_review_started', t.id, t.brandId, 'Mercenta review started.', actorStaffId);
  return { ok: true, ticket: t };
}

/**
 * Mercenta Admin's review decision. ONLY `approve_escalation` unlocks Amazon
 * escalation; `request_info` sends it back to the brand; `reject` closes it.
 */
export function reviewCase(
  ticketId: string,
  actorStaffId: string,
  decision: CaseAdminDecision,
  note?: string
): CaseActionResult {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return { ok: false, error: `Unknown case: ${ticketId}` };
  if (t.escalationState !== 'brand_submitted' && t.escalationState !== 'under_mercenta_review') {
    return { ok: false, error: `Case ${t.caseRef ?? t.id} has already been reviewed.` };
  }
  if (decision === 'request_info' && !note?.trim()) {
    return { ok: false, error: 'Requesting more information requires a note explaining what is needed.' };
  }

  const now = new Date().toISOString();
  t.adminReview = { reviewedByStaffId: actorStaffId, reviewedAt: now, decision, note };
  t.adminOwnerStaffId = actorStaffId;
  t.seenByStaff = true;
  t.updatedAt = now;

  if (decision === 'approve_escalation') t.escalationState = 'approved_for_escalation';
  else if (decision === 'request_info') t.escalationState = 'awaiting_brand_info';
  else {
    t.escalationState = 'closed';
    t.status = 'resolved';
  }

  writeTicketAudit(
    'case_reviewed',
    t.id,
    t.brandId,
    `Mercenta review: ${decision}${note ? ` — ${note}` : ''} (→ ${CASE_ESCALATION_LABELS[t.escalationState]})`,
    actorStaffId
  );
  return { ok: true, ticket: t };
}

export interface CaseEscalationResult extends CaseActionResult {
  caseReferenceId?: string;
}

/**
 * Escalate an APPROVED case to the retail-channel (Amazon) case integration.
 *
 * Hard guards:
 *   - the case must be `approved_for_escalation` (Admin reviewed it);
 *   - the provider must POSITIVELY resolve to simulation (or a configured live
 *     connection) — unknown/disabled/live-without-credentials NEVER simulate;
 *   - idempotent: a case that already has a provider case returns it as-is.
 */
export async function escalateCaseToProvider(
  ticketId: string,
  actorStaffId: string,
  resolvedMode: ProviderResolutionMode,
  client?: CaseProviderClient
): Promise<CaseEscalationResult> {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return { ok: false, error: `Unknown case: ${ticketId}` };

  // Idempotent replay — never open a second provider case.
  if (t.amazonCase) return { ok: true, ticket: t, caseReferenceId: t.amazonCase.referenceId };

  if (t.escalationState !== 'approved_for_escalation') {
    return {
      ok: false,
      error: `Case ${t.caseRef ?? t.id} must be reviewed and approved by Mercenta before it can be escalated to the retail channel (current state: ${t.escalationState ? CASE_ESCALATION_LABELS[t.escalationState] : 'unreviewed'}).`,
    };
  }

  const provider = client ?? createCaseProviderClient(resolvedMode);
  const requestKey = `case_${t.id}`;
  const result = await provider.openCase({
    idempotencyKey: requestKey,
    subject: `[Mercenta ${t.caseRef ?? t.id}] ${t.subject}`,
    body: `${t.lastMessagePreview}${t.adminReview?.note ? `\n\nMercenta review note: ${t.adminReview.note}` : ''}`,
    relatedRef: t.relatedPoNumber,
  });

  if (!result.ok || !result.caseReferenceId) {
    writeTicketAudit(
      'case_escalation_failed',
      t.id,
      t.brandId,
      `Escalation to the retail channel failed: ${result.error ?? 'unknown error'}. No provider case was created — retry is safe.`,
      actorStaffId
    );
    return { ok: false, error: result.error ?? 'Retail-channel case submission failed.', ticket: t };
  }

  const now = new Date().toISOString();
  t.amazonCase = {
    referenceId: result.caseReferenceId,
    openedAt: now,
    mode: result.simulated ? 'simulation' : 'live',
    simulated: !!result.simulated,
    requestKey,
  };
  t.escalationState = 'escalated_to_provider';
  t.updatedAt = now;
  writeTicketAudit(
    'case_escalated_to_provider',
    t.id,
    t.brandId,
    `${result.simulated ? 'SIMULATED ' : ''}Retail-channel case ${result.caseReferenceId} opened for ${t.caseRef ?? t.id} by Mercenta (${actorStaffId}).`,
    actorStaffId
  );
  return { ok: true, ticket: t, caseReferenceId: result.caseReferenceId };
}

/** Record the provider's response so the brand sees the real outcome. */
export function recordProviderCaseResponse(
  ticketId: string,
  actorStaffId: string,
  response: { outcome: 'accepted' | 'rejected' | 'info_required' | 'closed'; response: string }
): CaseActionResult {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return { ok: false, error: `Unknown case: ${ticketId}` };
  if (!t.amazonCase) return { ok: false, error: 'This case has not been escalated to the retail channel.' };
  if (t.providerResponse) return { ok: true, ticket: t }; // idempotent

  const now = new Date().toISOString();
  t.providerResponse = { respondedAt: now, ...response };
  t.escalationState = 'provider_responded';
  t.updatedAt = now;
  writeTicketAudit(
    'case_provider_responded',
    t.id,
    t.brandId,
    `Retail channel responded (${response.outcome}): ${response.response}`,
    actorStaffId
  );
  return { ok: true, ticket: t };
}

/** Mercenta resolves the case (the brand then sees the resolution). */
export function resolveCase(ticketId: string, actorStaffId: string, note: string): CaseActionResult {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return { ok: false, error: `Unknown case: ${ticketId}` };
  if (!note.trim()) return { ok: false, error: 'A resolution requires a note the brand can read.' };

  const now = new Date().toISOString();
  t.resolution = { resolvedByStaffId: actorStaffId, resolvedAt: now, note };
  t.escalationState = 'resolved';
  t.status = 'resolved';
  t.seenByStaff = true;
  t.updatedAt = now;
  writeTicketAudit('case_resolved', t.id, t.brandId, `Resolved: ${note}`, actorStaffId);
  return { ok: true, ticket: t };
}

/** Close a case without a resolution (rejected, or no further action). */
export function closeCase(ticketId: string, actorStaffId: string, note: string): CaseActionResult {
  const t = demoTickets.find((x) => x.id === ticketId);
  if (!t) return { ok: false, error: `Unknown case: ${ticketId}` };
  t.escalationState = 'closed';
  t.status = 'resolved';
  t.seenByStaff = true;
  t.updatedAt = new Date().toISOString();
  writeTicketAudit('case_closed', t.id, t.brandId, note ? `Closed: ${note}` : 'Closed.', actorStaffId);
  return { ok: true, ticket: t };
}

/* ── Canonical case read models (tenant scoping enforced) ─────────────── */

/** Brand-scoped: a brand sees ONLY its own canonical cases. */
export function listCasesForBrand(brandId: string): Ticket[] {
  return demoTickets.filter((t) => t.brandId === brandId && !!t.escalationState);
}

/** Operator view: every case across tenants (RBAC-gated at the caller). */
export function listAllCases(): Ticket[] {
  return demoTickets.filter((t) => !!t.escalationState);
}

/** Cases awaiting a Mercenta review decision. */
export function listCasesAwaitingReview(): Ticket[] {
  return listAllCases().filter(
    (t) => t.escalationState === 'brand_submitted' || t.escalationState === 'under_mercenta_review'
  );
}

