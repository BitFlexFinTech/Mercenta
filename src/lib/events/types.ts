/**
 * Event feed types — canonical event shapes for the real-time event feed.
 * Used by both the internal digest system and the external Personal Assistant bot.
 */

export type EventSeverity = 'critical' | 'important' | 'informational';

export type EventType =
  | 'new_po_above_threshold'
  | 'compliance_doc_expiring'
  | 'deduction_posted'
  | 'contract_signed'
  | 'contract_expired'
  | 'brand_onboarding_complete'
  | 'security_alert'
  | 'test_suite_failure'
  // §Priority-1 — shipment/provider milestone + compliance verification events.
  | 'shipment_milestone'
  | 'provider_failure'
  | 'company_verified'
  | 'hmrc_filing'
  // §22–§25 (M13 Phase 9) — a statutory company-filing deadline (confirmation
  // statement / accounts) detected from the register.
  | 'company_filing_due'
  // §Sprint — the canonical work/task layer. A work item raised from a real
  // record, and its resolution (which is what stops its reminders).
  | 'work_item_raised'
  | 'work_item_resolved'
  // §Sprint 2 — the deterministic proactive reminder runner escalated an
  // existing work item past a declared deadline boundary. Never a timer, never
  // a random trigger: the sweep is explicitly invoked and idempotent.
  | 'reminder_raised'
  // §Founder OS — the automation registry. A failed run must be OBSERVABLE
  // (never a fake success), an escalation is a real operational act, and an
  // automation that reaches a consequential decision stops at a human gate.
  | 'automation_run_failed'
  | 'automation_approval_required'
  | 'work_escalated'
  // §Phase 1 — the pre-audit (Explore UK Market Fit) lifecycle. These are the
  // canonical events the assessment emits so a future automation can consume
  // them; no external automation platform is a dependency and there is no
  // second event system.
  | 'assessment_started'
  | 'assessment_completed'
  | 'opportunity_created'
  | 'opportunity_qualified'
  | 'research_required'
  | 'outreach_ready'
  // §Phase 2 — the explicit routing/gateway layer. A routing decision is an
  // auditable fact, so it is a canonical event like any other: `route_refused`
  // makes a refusal OBSERVABLE rather than silent, `route_branch_failed` keeps a
  // failed branch visible even when a sibling branch succeeded, and the join
  // events make fan-in completion (or its absence) explicit. Still ONE event
  // system — these are added to the existing union, not a second feed.
  | 'routing_decision_recorded'
  | 'route_refused'
  | 'route_branch_failed'
  | 'route_join_satisfied'
  | 'route_join_incomplete'
  | 'commercial_route_selected'
  // §Phase 2 — the commercial readiness lifecycle. An assessment produced a
  // route, a reassessment CHANGED it, and a brand supplied the missing
  // commercial information. Added to the EXISTING union — no second feed.
  | 'commercial_readiness_assessed'
  | 'commercial_readiness_reassessed'
  | 'commercial_readiness_terms_submitted'
  // §P6 — the PO document pack was generated automatically on acceptance
  // (programme decision 9). The pack is the Logistics Hub's core deliverable, so
  // its availability is a canonical event like any other — added to the EXISTING
  // union, never a second feed.
  | 'po_documents_ready'
  // §P13 / S5 — the acknowledgement notification fan-out. The declared schedule
  // (12/6/2h remaining) reached a brand's purchase order on a channel (in-app,
  // email, or the instant-message seam), or a channel REFUSED it with its stated
  // reason. Added to the EXISTING union — one event system, never a second feed.
  | 'po_acknowledgement_notification';

export interface PlatformEvent {
  id: string;
  type: EventType;
  severity: EventSeverity;
  title: string;
  description: string;
  actionUrl?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  acknowledged: boolean;
  /**
   * §Phase 2 — the owning tenant, when the event is tenant-scoped. Additive and
   * optional, so every existing emitter is unaffected; `null` means the event is
   * platform-wide (Super-Admin scope), which is the honest value for the many
   * operational events that are not brand-specific.
   */
  tenantId?: string | null;
  /**
   * §Phase 2 — the idempotency key of the operation that produced the event, so a
   * repeated operation can be recognised as a duplicate rather than emitting a
   * second event. Optional: emitters that are not idempotent omitting it is
   * honest, not a claim of idempotence.
   */
  idempotencyKey?: string;
  /** §Phase 2 — the routing decision this event belongs to, when it belongs to one. */
  routeId?: string;
  /** §Phase 2 — correlates the branches of ONE fan-out. */
  correlationId?: string;
  /** §Phase 2 — the per-branch outcomes this event reports, when it reports branches. */
  branchOutcomes?: { routeId: string; outcome: string }[];
}

export interface EventFeedQuery {
  since?: string;
  severity?: EventSeverity;
  type?: EventType;
  limit?: number;
  acknowledged?: boolean;
}

export const EVENT_SEVERITY_MAP: Record<EventType, EventSeverity> = {
  new_po_above_threshold: 'critical',
  compliance_doc_expiring: 'important',
  deduction_posted: 'important',
  contract_signed: 'critical',
  contract_expired: 'important',
  brand_onboarding_complete: 'informational',
  security_alert: 'critical',
  test_suite_failure: 'important',
  shipment_milestone: 'informational',
  provider_failure: 'important',
  company_verified: 'informational',
  hmrc_filing: 'important',
  company_filing_due: 'critical',
  work_item_raised: 'important',
  work_item_resolved: 'informational',
  reminder_raised: 'important',
  automation_run_failed: 'important',
  automation_approval_required: 'important',
  work_escalated: 'important',
  // §Phase 1 — pre-audit events.
  assessment_started: 'informational',
  assessment_completed: 'important',
  opportunity_created: 'important',
  opportunity_qualified: 'important',
  research_required: 'informational',
  outreach_ready: 'important',
  // §Phase 2 — routing events. A refusal and a failed branch are IMPORTANT: they
  // must be visible to an operator, never buried as informational noise.
  routing_decision_recorded: 'informational',
  route_refused: 'important',
  route_branch_failed: 'important',
  route_join_satisfied: 'informational',
  route_join_incomplete: 'important',
  commercial_route_selected: 'important',
  // §Phase 2 — commercial readiness lifecycle.
  commercial_readiness_assessed: 'important',
  commercial_readiness_reassessed: 'important',
  commercial_readiness_terms_submitted: 'informational',
  // §P6 — the document pack exists and there is something to download and print.
  // Informational: it is a readiness notice, not an exception.
  po_documents_ready: 'informational',
  /** §P13 / S5 — a brand's acknowledgement reminder (or a refused channel). */
  po_acknowledgement_notification: 'important',
};