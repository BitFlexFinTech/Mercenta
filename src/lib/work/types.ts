/**
 * §Sprint — CANONICAL WORK LAYER types.
 *
 * ONE shape for every unit of operational work on the platform, whatever raised
 * it: a PO acknowledgement deadline, a compliance expiry, an unpaid invoice, a
 * shipment exception, a returns action, an outreach follow-up, a contract
 * renewal, or a task an operator created by hand.
 *
 * This is deliberately NOT a second task-management product. It is the shared
 * operating layer the sprint requires:
 *
 *   EVENTS → WORKFLOWS → TASKS → NOTIFICATIONS → CALENDAR → ACTIVITY/AUDIT
 *
 * Deterministic business state stays the source of truth: a work item never
 * invents a fact, it POINTS AT an existing canonical record (`entity`) and
 * carries the deadline that record already implies.
 */

/** Urgency, derived from the canonical record — never a random or invented score. */
export type WorkPriority = 'critical' | 'high' | 'normal';

export type WorkStatus = 'open' | 'in_progress' | 'blocked' | 'done';

/**
 * Where the item came from. `manual` is the only source a human creates;
 * everything else is DERIVED from an existing canonical record, which is why
 * resolving a derived item never rewrites the record itself.
 */
export type WorkSource =
  | 'po_acknowledgement'
  | 'po_window'
  | 'compliance_expiry'
  | 'invoice_due'
  | 'deduction_dispute'
  | 'shipment_exception'
  | 'return_action'
  | 'outreach_followup'
  | 'contract_renewal'
  | 'onboarding_step'
  | 'manual';

/** The canonical record this work item is about. */
export interface WorkEntityRef {
  type: 'purchase_order' | 'compliance_document' | 'invoice' | 'deduction'
      | 'shipment' | 'return' | 'prospect' | 'contract' | 'application' | 'none';
  id: string;
  /** Human reference (PO number, document type, brand name). */
  label: string;
}

/** One immutable line of the item's own history. */
export interface WorkActivityEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
}

export interface WorkItem {
  /** Deterministic: derived items are `work-<source>-<entityId>`; manual items
   *  take the next sequence number. Never time- or random-derived. */
  id: string;
  title: string;
  detail: string;
  source: WorkSource;
  priority: WorkPriority;
  status: WorkStatus;
  /** Owner identity — a staff id for admin work, `brand:<tenantId>` for brand work. */
  owner: string;
  /** ISO date (YYYY-MM-DD) the action is due, or null when no deadline applies. */
  dueDate: string | null;
  /** Owning tenant. `null` = platform-wide (Super Admin scope only). */
  tenantId: string | null;
  entity: WorkEntityRef;
  /** Existing destination view the operator acts in (never a new screen). */
  actionView: string;
  /** Derived items are resolved by override; manual items are edited directly. */
  derived: boolean;
  activity: WorkActivityEntry[];
  createdAt: string;
  completedAt?: string;
}

/** Which side of the platform is asking. */
export type WorkScope = 'admin' | 'brand';

/** Calendar granularity for the derived deadline calendar. */
export interface CalendarEntry {
  /** Deterministic: `cal-<workItemId>`. */
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  kind: WorkSource;
  priority: WorkPriority;
  tenantId: string | null;
  entity: WorkEntityRef;
  actionView: string;
  /** The work item this entry came from (calendar is never disconnected state). */
  workItemId: string;
  /** True once the underlying work item is resolved — the entry stays visible
   *  in history but no longer demands attention. */
  resolved: boolean;
}
