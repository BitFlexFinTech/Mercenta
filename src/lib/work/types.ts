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
  // §Phase 2 — the two declared commercial-readiness sources. A product whose
  // commercial route is `remediation` needs the BRAND to supply information; a
  // route of `blocked`/`human_review` needs a MERCENTA decision. Both are
  // DERIVED from the canonical readiness record, never invented.
  | 'commercial_remediation'
  | 'commercial_review'
  /**
   * §P3 (2026-09-22) — THE FOUNDER CONSOLE, MOVED INTO THE SINGLE ACTION LIST.
   *
   * The Founder's decision is **"Control Centre = ONE action list, founder-only
   * controls; the work/attention lists leave it; Work Management is the single
   * action list"** (three action lists → one). The retired Command Centre panel
   * was the third list: it is no longer rendered, and its founder-only
   * derivations are projected into THIS list instead, one source per founder
   * category, so nothing it showed is lost — it is now found in the place the
   * Founder works.
   *
   * Every one of these is DERIVED from a canonical store (company compliance
   * register, Google setup tasks, launch-platform records, brand applications,
   * the integrations state, the funding pipeline, the opportunity ranking and the
   * cost-protection state). None is invented, and each is **Super-Admin only** —
   * `WorkItem.superAdminOnly` is enforced in `getWorkItems`, which fails CLOSED.
   */
  | 'founder_compliance'
  | 'founder_setup'
  | 'founder_application'
  | 'founder_integration'
  | 'founder_opportunity'
  | 'founder_funding'
  | 'founder_finance'
  | 'founder_ai_cost'
  | 'manual';

/** The canonical record this work item is about. */
export interface WorkEntityRef {
  type: 'purchase_order' | 'compliance_document' | 'invoice' | 'deduction'
      | 'shipment' | 'return' | 'prospect' | 'contract' | 'application'
      | 'onboarding' | 'commercial_readiness'
      /** §P3 — a founder-console action (company register, funding route, …). */
      | 'founder_action'
      | 'none';
  id: string;
  /** Human reference (PO number, document type, brand name). */
  label: string;
}

/**
 * §P3 — the auditable WHY behind a founder-console item's rank.
 *
 * Ported unchanged from the retired Command Centre so the founder sees the SAME
 * declared arithmetic in the single action list: each factor records the value
 * it was actually observed from, and the score is the sum of those points. No
 * model call, nothing invented.
 */
export interface WorkWhyFactor {
  id: string;
  label: string;
  observed: string;
  points: number;
}

export interface WorkWhy {
  factors: WorkWhyFactor[];
  score: number;
}

/** One immutable line of the item's own history. */
export interface WorkActivityEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
}

/**
 * §SSOT S2 — AN OPERATOR'S OWN PROGRESS ANNOTATION ON A DERIVED ITEM.
 *
 * The canonical record owns a derived item's EXISTENCE and its RESOLUTION, so a
 * derived item is never `done` and `status` is computed (`open` unless the
 * operator has annotated it). This describes the operator's own progress only —
 * `in_progress` or `blocked`, never `done` — which is why it can never hide
 * record-qualified work from the attention set.
 */
export interface WorkOperatorAnnotation {
  status: 'in_progress' | 'blocked';
  at: string;
  actor: string;
}

export interface WorkItem {
  /** Deterministic: derived items are `work-<source>-<entityId>`; manual items
   *  take the next sequence number. Never time- or random-derived. */
  id: string;
  title: string;
  detail: string;
  source: WorkSource;
  priority: WorkPriority;
  /**
   * §SSOT S2 — for a DERIVED item this is COMPUTED, never stored: the record
   * owns resolution, so a derived item can only be `open` / `in_progress` /
   * `blocked` and NEVER `done`. It disappears by performing the owning action
   * (`WORK_SOURCE_CLOSING`), which changes the record. A manual item keeps the
   * full lifecycle including `done`.
   */
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
  /**
   * §P3 — the Super-Admin TAB the destination must open (the retired Command
   * Centre's "no hunting through five screens" guarantee), carried on the item
   * so the single action list keeps it.
   */
  navTab?: string;
  /**
   * §P3 — founder-console rank and WHY, ported from the retired Command Centre.
   * Present only on founder-console items; absence means "not a ranked item".
   */
  rank?: number;
  why?: WorkWhy;
  /**
   * §P3 — TRUE for founder-console items (company register, funding routes,
   * applications, integrations, cost protection …). These describe Super-Admin
   * surfaces, so `getWorkItems` EXCLUDES them unless the caller positively
   * declares a Super-Admin session: the work list can never leak a founder-only
   * record to an ordinary admin session.
   */
  superAdminOnly?: boolean;
  /**
   * §SSOT S2 — TRUE when the item is a projection of a canonical record. Such an
   * item is closed ONLY by the owning platform action that changes that record;
   * the work layer cannot resolve it (`resolveWorkItem` refuses it).
   */
  derived: boolean;
  /** §SSOT S2 — the operator's own progress annotation on a derived item. */
  annotation?: WorkOperatorAnnotation;
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

/* ── §Sprint 2 — PROACTIVE REMINDER RUNNER shapes ───────────────────────────
 *
 * A reminder is the ESCALATION of an existing work item past a declared
 * deadline boundary. It is never a second task system and never invents a
 * record: it points at the work item (`workItemId`) which points at the
 * canonical record.
 *
 * Reminders are raised by an EXPLICIT, deterministic sweep
 * (`runReminderSweep`) — never by a timer — so the investor demo can invoke
 * the exact same call the future scheduler will, and get the identical result.
 */

/**
 * Which declared deadline boundary the reminder crossed. Derived from the work
 * item's own `dueDate` compared against the pinned demo clock.
 */
export type ReminderBucket = 'overdue' | 'due_today' | 'due_soon';

/** One raised reminder. Deterministic id: `rem-<workItemId>-<bucket>`. */
export interface Reminder {
  id: string;
  /** The work item this reminder escalates (never disconnected state). */
  workItemId: string;
  bucket: ReminderBucket;
  /** The deadline the reminder is about — the work item's own due date. */
  dueDate: string;
  priority: WorkPriority;
  title: string;
  detail: string;
  tenantId: string | null;
  source: WorkSource;
  actionView: string;
  /** Idempotency key — `"<workItemId>|<bucket>"`. A key already raised is never
   *  raised a second time, however many times the sweep runs. */
  key: string;
  /** Deterministic: the demo clock date the sweep ran on. */
  raisedAt: string;
  /** 1-based order within the sweep that raised it (deterministic). */
  sequence: number;
}

/** The result of ONE sweep. Pure report — no side effects beyond the ledger. */
export interface ReminderSweepResult {
  /** The demo-clock date the sweep was evaluated against. */
  sweptAt: string;
  /** Work items examined in scope. */
  evaluated: number;
  /** Reminders raised by THIS sweep (empty on a repeat sweep — idempotent). */
  raised: Reminder[];
  /** Boundaries already raised in an earlier sweep and therefore suppressed. */
  duplicatesSuppressed: number;
  /** Boundaries belonging to work items that are already resolved. */
  suppressedResolved: number;
  /** Total reminders currently active (raised, not dismissed, item not resolved). */
  active: number;
}
