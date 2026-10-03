/**
 * §Sprint — CANONICAL WORK / TASK + NOTIFICATION-DEADLINE LAYER.
 *
 * The single deterministic operating layer that turns EXISTING canonical state
 * into actionable work, and that owns the lifecycle of that work:
 *
 *   canonical record → work item (event) → task → notification → calendar
 *                    → action → resolution → activity/audit
 *
 * Non-negotiable rules implemented here:
 * - DERIVED items are pure projections of real records (`src/data/demoStore`,
 *   `prospectStore`, `returnsTracking`). Nothing is invented.
 * - §SSOT S2 — FOR DERIVED WORK THE RECORD OWNS BOTH EXISTENCE AND STATUS. A
 *   derived item's status is COMPUTED (`open`, or an operator annotation of
 *   `in_progress` / `blocked`) and can never be `done`: it disappears only when
 *   the owning platform action changes the record (`WORK_SOURCE_CLOSING`).
 *   `resolveWorkItem` therefore REFUSES a derived item, and the refusal is
 *   attributed and audited. (At S1 the work layer held a second, independent
 *   `resolvedDerived` status; that map is gone.)
 * - IDs are deterministic (`work-<source>-<entityId>`), never time- or
 *   random-derived, so the same reset produces the same scenario.
 * - Deadlines come from the record's own dates plus DECLARED terms. No random
 *   prices, no random dates.
 * - Doing the owning action REMOVES the item from the attention set, so
 *   reminders stop. This is enforced in one place (`getWorkItems`).
 * - Every mutation is attributed and audited (`demoAuditLog`) and emits a
 *   canonical platform event.
 */
import type {
  WorkActivityEntry,
  WorkEntityRef,
  WorkItem,
  WorkOperatorAnnotation,
  WorkPriority,
  WorkScope,
  WorkSource,
  WorkStatus,
} from './types';
import {
  demoAuditLog,
  demoBrands,
  demoCommerceInvoices,
  demoComplianceDocs,
  demoContracts,
  demoDeductions,
  demoPurchaseOrders,
  demoShipments,
  getAllCommercePayments,
} from '@/data/demoStore';
import { getProspects, ensureProspectStore } from '@/data/prospectStore';
import { getOnboardings } from '@/data/acquisitionStore';
import { allCommercialReadinessRecords } from '@/data/commercialReadinessStore';
import { COMMERCIAL_WORK_BY_ROUTE } from '@/config/commercialReadiness';
import { ONBOARDING_STEP_ORDER } from '@/lib/onboarding/onboardingLifecycle';
import { getAllReturnTracking } from '@/lib/warehouse/returnsTracking';
import { emitEvent } from '@/lib/events/eventFeed';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';
import { buildCommandCentre } from '@/lib/commandCentre/commandCentre';
import { loadIntegrationsSync } from '@/integrations/connections';
import { addDays, daysBetween } from '@/lib/dates';
import { invoiceDueDate, invoiceIsOutstanding, invoiceTermDays } from '@/lib/commerce/invoiceTerms';
import { PO_ACKNOWLEDGEMENT_HOURS } from '@/config/purchaseOrders';
import { DEDUCTION_DISPUTE_WINDOW } from '@/config/deductions';
/**
 * §P13 / S3 — THE RULE'S OWNER. The work layer ASKS the acknowledgement-window
 * owner whether a PO is still actionable instead of deriving that itself, so
 * "is this acknowledgement work?" has exactly ONE answer in the platform.
 */
import {
  poAcknowledgementDeadline,
  poAcknowledgementWindow,
} from '@/lib/commerce/poAcknowledgementWindow';

/* ── DECLARED deterministic terms (single source of truth) ─────────────────── */

/**
 * Vendor-Central rule: an unacknowledged PO is at risk after 24 hours.
 *
 * §P13 — REPOINTED (not re-declared). The number is owned by
 * `src/config/purchaseOrders.ts`, beside the rest of the acknowledgement rules
 * and their provenance, and re-exported here so this module's public surface is
 * unchanged and there is exactly ONE copy of the number in the platform.
 */
export { PO_ACKNOWLEDGEMENT_HOURS };
/**
 * §P7 — REPOINTED (not re-declared). The DECLARED default payment terms used to
 * be declared here as `INVOICE_TERM_DAYS = 30`. They are now owned by
 * `src/lib/commerce/invoiceTerms.ts` (which also owns the 14/30/60 choice and
 * every derived due date), and re-exported here so this module's public surface
 * is unchanged. An invoice's terms are read from THE INVOICE, never from this
 * constant — it is only the default applied to a legacy row.
 */
export { INVOICE_TERM_DAYS } from '@/lib/commerce/invoiceTerms';
/**
 * §BATCH 2a — REPOINTED (not re-declared). This used to be a bare `14`, which
 * read as a retail-channel deadline; no channel source states a deduction-dispute
 * window (register `AV-019b`). The NUMBER and its ATTRIBUTION are now owned by
 * `src/config/deductions.ts` — Mercenta's own service standard — and re-exported
 * here so this module's public surface is unchanged.
 */
export const DEDUCTION_DISPUTE_WINDOW_DAYS = DEDUCTION_DISPUTE_WINDOW.days;
/** Days a warehouse return may sit in an actionable stage. Declared. */
export const RETURN_ACTION_WINDOW_DAYS = 3;
/** Outreach follow-up cadence for a contacted prospect. Declared. */
export const OUTREACH_FOLLOW_UP_DAYS = 7;
/** How many days ahead a document/renewal is surfaced as work. Declared. */
export const EXPIRY_HORIZON_DAYS = 60;
/**
 * §Sprint 2 — declared SLA window for ONE onboarding step. The current step's
 * deadline is `initiatedAt + (stepIndex + 1) × this`. Declared, never random, so
 * the same onboarding always yields the same deadline.
 */
export const ONBOARDING_STEP_SLA_DAYS = 7;

/**
 * §P3 — DECLARED CROSS-SCOPE ACTION-VIEW TRANSLATION.
 *
 * The work layer is ONE layer shared by the admin and brand shells, but the two
 * shells address the same destination with different view ids (admin
 * `purchase_orders_admin` vs brand `purchase_orders`). A derived item therefore
 * stores a NEUTRAL key and `getWorkItems` resolves it for the scope that is
 * reading — otherwise the hand-off button in the admin list would navigate to a
 * brand view id that does not exist there (a dead end).
 *
 * `brand: null` means the destination is Super-Admin/Admin only; such items are
 * only ever derived with `tenantId: null`, so a brand session never receives one.
 * `scripts/validate-command-centre.mjs` asserts EVERY resolved id is a real view
 * id of the shell it is resolved for, so this table cannot silently rot.
 */
export const WORK_ACTION_VIEWS: Record<string, { admin: string; brand: string | null }> = {
  purchase_orders: { admin: 'purchase_orders_admin', brand: 'purchase_orders' },
  returns_tracking: { admin: 'returns_tracking', brand: 'returns' },
  onboarding: { admin: 'onboarding_pipeline', brand: 'onboarding' },
  logistics: { admin: 'logistics', brand: 'logistics' },
  compliance: { admin: 'compliance', brand: 'compliance' },
  contracts: { admin: 'contracts_admin', brand: 'contracts' },
  /**
   * Deductions: the admin works them in Billing; a brand sees them in Statements
   * & Account (`documents`). The retired `deductions` id existed in NEITHER shell
   * — a dead hand-off this table now prevents.
   */
  deductions: { admin: 'billing', brand: 'documents' },
  /**
   * Invoices/receivables: Mercenta settles from Super Admin → Accounting; a brand
   * sees its own position in Statements & Account. The retired `accounting` id is
   * not a shell view id either.
   */
  accounting: { admin: 'super_admin', brand: 'documents' },
  /**
   * A commercial-readiness decision is Mercenta's (Control Centre); the brand's
   * own remediation is worked on its Commercial Readiness surface.
   */
  control_centre: { admin: 'control_centre', brand: 'commercial_readiness' },
  integrations: { admin: 'integrations', brand: null },
  crm: { admin: 'crm', brand: null },
};

/** Resolve a neutral action view for the scope that is reading. */
export function resolveWorkActionView(view: string, scope: WorkScope): string {
  const entry = WORK_ACTION_VIEWS[view];
  if (!entry) return view;
  if (scope === 'admin') return entry.admin;
  return entry.brand ?? entry.admin;
}

export const WORK_SOURCE_LABELS: Record<WorkSource, string> = {
  po_acknowledgement: 'PO acknowledgement',
  po_window: 'Fulfilment window',
  compliance_expiry: 'Compliance expiry',
  invoice_due: 'Invoice due',
  deduction_dispute: 'Deduction dispute',
  shipment_exception: 'Shipment exception',
  return_action: 'Returns action',
  outreach_followup: 'Outreach follow-up',
  contract_renewal: 'Contract renewal',
  onboarding_step: 'Onboarding step',
  commercial_remediation: 'Commercial information needed',
  commercial_review: 'Commercial review',
  // §P3 — the founder-console categories (Super-Admin only).
  founder_compliance: 'Founder · company compliance',
  founder_setup: 'Founder · platform setup',
  founder_application: 'Founder · brand application',
  founder_integration: 'Founder · integration health',
  founder_opportunity: 'Founder · opportunity',
  founder_funding: 'Founder · funding route',
  founder_finance: 'Founder · finance',
  founder_ai_cost: 'Founder · AI cost',
  manual: 'Manual task',
};

/**
 * §DEFECT FIXED AT SOURCE (owner-reported, 2026-09-30) — EVERY CATEGORY IS COLOUR-CODED.
 *
 * The work list coloured the PRIORITY (critical · high · normal) and rendered the
 * CATEGORY as plain grey text. The owner's point is exactly right: the category is what
 * tells an operator what kind of problem they are looking at — a fulfilment window, a
 * purchase-order acknowledgement, a commercial review, a compliance expiry — and it was
 * the one thing with no visual signal at all.
 *
 * The tone is declared ONCE here, beside the labels, in the platform's EXISTING status
 * vocabulary (the same tones every other badge uses), and it is grouped by what each
 * category actually threatens, so the colours mean something:
 *
 *   danger   — a hard external deadline or a blocked gate: miss it and the record
 *              itself fails (a channel acknowledgement limit, a compliance expiry, a
 *              shipment that has gone wrong).
 *   warning  — a clock that costs money or stock if it runs out (a fulfilment window,
 *              an invoice due, a contract renewal).
 *   info     — a decision or a claim is owed by someone else (a dispute, a return, a
 *              commercial-information request).
 *   brass    — a MERCENTA decision (the commercial review) — the platform's own
 *              "we must decide" colour.
 *   neutral  — nothing is at risk; a routine or self-created item.
 *
 * A module-load guard fails the build if a category is ever added without a declared
 * tone, so no surface has to invent one.
 */
export const WORK_SOURCE_TONES: Record<
  WorkSource,
  'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brass'
> = {
  po_acknowledgement: 'danger',
  po_window: 'warning',
  compliance_expiry: 'danger',
  invoice_due: 'warning',
  deduction_dispute: 'info',
  shipment_exception: 'danger',
  return_action: 'info',
  outreach_followup: 'neutral',
  contract_renewal: 'warning',
  onboarding_step: 'neutral',
  commercial_remediation: 'info',
  commercial_review: 'brass',
  founder_compliance: 'brass',
  founder_setup: 'brass',
  founder_application: 'brass',
  founder_integration: 'brass',
  founder_opportunity: 'brass',
  founder_funding: 'brass',
  founder_finance: 'brass',
  founder_ai_cost: 'brass',
  manual: 'neutral',
};

for (const source of Object.keys(WORK_SOURCE_LABELS) as WorkSource[]) {
  if (!WORK_SOURCE_TONES[source]) {
    throw new Error(
      `[work] the work category "${source}" has no declared tone. Every category must be colour-coded once, ` +
        `here, beside its label, so no surface invents a colour.`
    );
  }
}

/**
 * §SSOT — EVERY DERIVED SOURCE DECLARES HOW IT CLOSES.
 *
 * A derived work item exists because a canonical RECORD qualifies. It must
 * therefore be closable BY THE PLATFORM ACTION THAT CHANGES THAT RECORD — never by
 * marking the task done, which would leave the record and the work list
 * disagreeing (two sources of truth for one fact).
 *
 *   `via`    — the action a human performs.
 *   `owner`  — the module that owns the record whose state closes the item.
 *   `writer` — the canonical writer that performs it, or `null` where the platform
 *              currently has NO closing path. A `null` is a DECLARED GAP: it is
 *              counted and reported, and `scripts/validate-work-layer.mjs` fails if
 *              a WorkSource can exist without appearing here at all.
 *
 * The single-source-of-truth programme closed `shipment_exception` first (three
 * writers → one, plus a real closing path). The `null` entries are the discovered
 * remainder, reported rather than hidden.
 */
export interface WorkSourceClosing {
  via: string;
  owner: string;
  writer: string | null;
}

export const WORK_SOURCE_CLOSING: Record<WorkSource, WorkSourceClosing> = {
  po_acknowledgement: {
    via: "Acknowledge the purchase order (the brand's decision; Mercenta may act on its behalf inside the closing window)",
    owner: 'src/lib/commerce/poAcknowledgementWindow.ts',
    writer: 'acknowledgePurchaseOrder',
  },
  po_window: {
    via: 'Ship the purchase order — creating the consignment moves it out of the accepted/ready-to-fulfil window state',
    owner: 'src/data/demoStore.ts',
    writer: 'createShipmentForPO',
  },
  compliance_expiry: {
    via: 'Submit or approve the compliance document',
    owner: 'src/data/demoStore.ts',
    writer: 'setComplianceDocStatus',
  },
  invoice_due: {
    via: 'Settle the invoice payment',
    owner: 'src/data/demoStore.ts',
    writer: 'recordCommercePayment',
  },
  deduction_dispute: {
    via: 'Resolve or accept the deduction',
    owner: 'src/data/demoStore.ts',
    writer: 'recordDisputeOutcome / setDeductionStatus',
  },
  /** The closing path this programme added first. */
  shipment_exception: {
    via: 'Advance the consignment to a resolved milestone, or clear the in-transit exception explicitly',
    owner: 'src/data/demoStore.ts',
    writer: 'setShipmentMilestone / clearShipmentException',
  },
  return_action: {
    via: 'Confirm the forwarded return was received',
    owner: 'src/lib/warehouse/returnsTracking.ts',
    writer: 'recordBrandConfirmation',
  },
  outreach_followup: {
    via: 'Progress or disqualify the prospect in CRM',
    owner: 'src/data/prospectStore.ts',
    writer: 'updateProspect',
  },
  /**
   * §SSOT S7 — CLOSED (2026-10-03). `demoContracts` now HAS writers
   * (`renewContract` / `terminateContract`), and the panel's drafts live in the
   * canonical store (`saveContractDraft`), not in local component state. The
   * renewal item therefore clears BY DOING THE WORK: renewing advances the term
   * (the renewalDate leaves the horizon) or terminating excludes the contract from
   * the derivation. (Before S7 this was a declared gap with `writer: null`.)
   */
  contract_renewal: {
    via: 'Renew the contract (advance its term) or terminate it',
    owner: 'src/data/demoStore.ts',
    writer: 'renewContract / terminateContract',
  },
  onboarding_step: {
    via: 'Complete the onboarding step',
    owner: 'src/lib/onboarding/onboardingLifecycle.ts',
    writer: 'completeOnboardingStep',
  },
  commercial_remediation: {
    via: 'Reassess the product once the brand supplies the missing commercial information',
    owner: 'src/data/commercialReadinessStore.ts',
    writer: 'upsertCommercialReadinessRecord',
  },
  commercial_review: {
    via: "Record Mercenta's commercial decision and reassess the product",
    owner: 'src/data/commercialReadinessStore.ts',
    writer: 'upsertCommercialReadinessRecord',
  },
  founder_compliance: {
    via: 'Complete the company-register check in the founder console',
    owner: 'src/lib/commandCentre/commandCentre.ts',
    writer: null,
  },
  founder_setup: {
    via: 'Complete the platform setup item (Google / launch)',
    owner: 'src/lib/commandCentre/commandCentre.ts',
    writer: null,
  },
  founder_application: {
    via: 'Decide the brand application',
    owner: 'src/data/applicationStore.ts',
    writer: 'updateApplicationStatus',
  },
  founder_integration: {
    via: 'Clear the provider error — repair or reconnect the integration',
    owner: 'src/integrations/connections.ts',
    writer: null,
  },
  founder_opportunity: {
    via: 'Progress the prospect / opportunity in CRM',
    owner: 'src/data/prospectStore.ts',
    writer: 'updateProspect',
  },
  founder_funding: {
    via: 'Progress the funding route or relationship',
    owner: 'src/lib/commandCentre/commandCentre.ts',
    writer: null,
  },
  founder_finance: {
    via: 'Record the finance/contribution decision',
    owner: 'src/lib/commandCentre/commandCentre.ts',
    writer: null,
  },
  founder_ai_cost: {
    via: 'Resolve the AI cost-protection action',
    owner: 'src/lib/commandCentre/commandCentre.ts',
    writer: null,
  },
  manual: {
    via: 'The work layer itself — a manual task has no canonical record, so the work layer IS its single source of truth',
    owner: 'src/lib/work/workStore.ts',
    writer: 'resolveWorkItem',
  },
};

/** The DECLARED GAPS — sources with no closing path in the platform today. */
export const WORK_SOURCE_CLOSING_GAPS: readonly WorkSource[] = (
  Object.keys(WORK_SOURCE_CLOSING) as WorkSource[]
).filter((s) => WORK_SOURCE_CLOSING[s].writer === null);

/** The declared closing path for a source (every source is declared above). */
export function closingForSource(source: WorkSource): WorkSourceClosing {
  return WORK_SOURCE_CLOSING[source];
}

/* ── §SSOT S2 — "the record owns it": refusal + the named owning action ─────── */

/**
 * The error NAME carried by a refused derived resolution. A caller can branch on
 * `isDerivedResolutionRefusal(err)` without importing a class (keeps the seam
 * usable from plain JS validators as well as TS components).
 */
export const DERIVED_RESOLUTION_REFUSED = 'DERIVED_RESOLUTION_REFUSED';

/** Is this the work layer's refusal to resolve a record-owned item? */
export function isDerivedResolutionRefusal(err: unknown): boolean {
  return err instanceof Error && err.name === DERIVED_RESOLUTION_REFUSED;
}

/**
 * §SSOT S2 — the sentence a surface shows INSTEAD of a Resolve button for a
 * derived item: which platform action closes it, who owns that action, and
 * whether the platform has a closing path at all yet.
 */
export function describeWorkClosing(source: WorkSource): string {
  const closing = WORK_SOURCE_CLOSING[source];
  const writer = closing.writer ? `via ${closing.writer}` : 'and the platform has NO closing path for it yet (a declared gap)';
  return `${closing.via} — ${writer} · owned by ${closing.owner}`;
}

/**
 * §SSOT S2 — can the WORK LAYER itself mark this item done?
 *
 * TRUE only for a manual item, which has no canonical record and whose single
 * source of truth IS this store. A derived item is always FALSE: its resolution
 * is owned by the record, so resolving the task would leave the record and the
 * work list disagreeing — the defect this stage removes.
 */
export function canResolveFromWorkLayer(item: Pick<WorkItem, 'derived'>): boolean {
  return item.derived !== true;
}

/**
 * §SSOT S2 — the refusal message, NAMING the owning action (§S2 requires the
 * refusal to name it, not merely to fail).
 */
function derivedResolutionRefusalMessage(item: WorkItem): string {
  return (
    `[work] ${item.id} is DERIVED from a canonical record (${WORK_SOURCE_LABELS[item.source]}), ` +
    `so the work layer cannot resolve it. Close it by the owning action: ${describeWorkClosing(item.source)}. ` +
    'Resolving the task while the record still qualifies would give ONE fact two sources of truth.'
  );
}


/**
 * §P3 — the declared action-id → work-source map for the founder console.
 *
 * Declared ONCE so the projection, the filters and the validators cannot drift,
 * and deliberately explicit (never a fuzzy match): an action id that is not in
 * this map is NOT projected, which is how the console's PO/shipment actions stay
 * owned by the work layer's own derivations.
 */
export const FOUNDER_SOURCE_BY_ACTION_PREFIX: readonly { prefix: string; source: WorkSource }[] = [
  { prefix: 'company-', source: 'founder_compliance' },
  { prefix: 'google-', source: 'founder_setup' },
  { prefix: 'launch-', source: 'founder_setup' },
  { prefix: 'application-', source: 'founder_application' },
  { prefix: 'prospect-', source: 'founder_opportunity' },
  { prefix: 'partner-', source: 'founder_funding' },
  { prefix: 'relationship-embassy', source: 'founder_funding' },
  { prefix: 'relationship-trade-programme', source: 'founder_funding' },
  { prefix: 'founder-investor-route', source: 'founder_funding' },
  { prefix: 'funding-route-', source: 'founder_funding' },
  { prefix: 'fundraising-summary', source: 'founder_funding' },
  { prefix: 'finance-contribution', source: 'founder_finance' },
  { prefix: 'ai-cost-protection', source: 'founder_ai_cost' },
  { prefix: 'ai-cost-summary', source: 'founder_ai_cost' },
];

export function FOUNDER_SOURCE_BY_ACTION_ID(actionId: string): WorkSource | null {
  for (const { prefix, source } of FOUNDER_SOURCE_BY_ACTION_PREFIX) {
    if (actionId.startsWith(prefix)) return source;
  }
  return null;
}

export const WORK_PRIORITY_LABELS: Record<WorkPriority, string> = {
  critical: 'Critical',
  high: 'High',
  normal: 'Normal',
};

export const WORK_STATUS_LABELS: Record<WorkStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
};

/* ── Deterministic demo clock ──────────────────────────────────────────────── */

let pinnedToday: string | null = null;

/**
 * The date work/calendar arithmetic is evaluated against. Defaults to the real
 * date; a test or demo reset can PIN it so the same seed always produces the
 * same overdue / due-soon buckets.
 */
export function demoToday(): string {
  return pinnedToday ?? new Date().toISOString().slice(0, 10);
}

export function setDemoClock(iso: string | null): void {
  pinnedToday = iso ? iso.slice(0, 10) : null;
}

export function isDemoClockPinned(): boolean {
  return pinnedToday !== null;
}

/* ── Date helpers (pure, deterministic) ────────────────────────────────────── */

/**
 * §P7 — REPOINTED (not re-declared). `addDays` / `daysBetween` used to be
 * declared here. Their DECLARATION now lives in `src/lib/dates.ts`, because the
 * invoice-terms owner needs them and importing the work layer from it would be a
 * cycle. They are re-exported unchanged, so every consumer of the work layer's
 * date helpers is unaffected and there is still exactly ONE implementation.
 */
export { addDays, daysBetween } from '@/lib/dates';

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return daysBetween(demoToday(), iso);
}

/* ── Store state ───────────────────────────────────────────────────────────── */

/**
 * §SSOT S2 — OPERATOR PROGRESS ANNOTATIONS ON DERIVED ITEMS (deterministic key →
 * annotation).
 *
 * This replaced `resolvedDerived` + `derivedStatus`, which let an operator mark a
 * derived item `done` (or `blocked`) independently of the record it projected.
 * What remains can hold ONLY `in_progress` / `blocked` — a description of the
 * operator's own progress — so it can never hide record-qualified work.
 */
const derivedAnnotations = new Map<string, WorkOperatorAnnotation>();
/** Operator-created items. */
const manualItems: WorkItem[] = [];
/** Per-derived-item activity history (resolution / reopen lines). */
const derivedActivity = new Map<string, WorkActivityEntry[]>();
let manualSeq = 0;
let mutationStamp = 0;
const listeners = new Set<() => void>();

export function workVersion(): number {
  return mutationStamp;
}

export function subscribeWork(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  mutationStamp += 1;
  for (const l of listeners) l();
}

/** Deterministic id — never time- or random-derived. */
export function workItemId(source: WorkSource, entityId: string): string {
  return `work-${source}-${entityId}`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function activityId(itemId: string, n: number): string {
  return `${itemId}-act-${n}`;
}

export function brandLabel(tenantId: string | null): string {
  if (!tenantId) return 'Mercenta';
  return demoBrands.find((b) => b.id === tenantId)?.profile.businessName ?? tenantId;
}

/**
 * Attribution identity for a mutation. Brand sessions are pinned to their own
 * tenant; admin/super-admin sessions are attributed to their staff role. Used by
 * the work surfaces so every create/resolve carries a real actor.
 */
export function workActor(session: { tier?: string; tenantId?: string; role?: string } | null): string {
  if (!session) return 'staff:unknown';
  if (session.tier === 'brand') return `brand:${session.tenantId ?? 'unknown'}`;
  return `staff:${session.role ?? 'admin'}`;
}

function pushAudit(
  action: string,
  entityType: string,
  entityId: string,
  tenantId: string | null,
  reason: string,
  actor: string
): void {
  demoAuditLog.push({
    id: `audit-work-${entityType}-${entityId}-${mutationStamp}-${demoAuditLog.length}`,
    createdAt: new Date().toISOString(),
    actorId: actor,
    action,
    entityType,
    entityId,
    brandId: tenantId ?? undefined,
    reason,
  });
  notifyCanonicalStoreChange();
}

/* ── Derivation ────────────────────────────────────────────────────────────── */

interface DeriveInput {
  title: string;
  detail: string;
  priority: WorkPriority;
  dueDate: string | null;
  tenantId: string | null;
  actionView: string;
  owner?: string;
  createdAt: string;
}

/**
 * §SSOT S2 — PROJECT A RECORD-QUALIFIED ITEM. Status is COMPUTED here:
 *
 *   open                      — the record qualifies and the operator has said nothing
 *   in_progress / blocked     — the operator's own ANNOTATION (progress, not resolution)
 *   done                      — IMPOSSIBLE. No input can produce it.
 *
 * The item therefore exists for exactly as long as its record qualifies, and the
 * ONLY way to remove it from the attention set is the owning action that changes
 * the record (`WORK_SOURCE_CLOSING`). That is what makes ONE fact have ONE source
 * of truth.
 */
function make(source: WorkSource, entity: WorkEntityRef, input: DeriveInput): WorkItem {
  const id = workItemId(source, entity.id);
  const annotation = derivedAnnotations.get(id);
  return {
    id,
    title: input.title,
    detail: input.detail,
    source,
    priority: input.priority,
    status: annotation?.status ?? 'open',
    owner: input.owner ?? (input.tenantId ? `brand:${input.tenantId}` : 'staff:mercenta-ops'),
    dueDate: input.dueDate,
    tenantId: input.tenantId,
    entity,
    actionView: input.actionView,
    derived: true,
    annotation: annotation ? { ...annotation } : undefined,
    activity: [...(derivedActivity.get(id) ?? [])],
    createdAt: input.createdAt,
  };
}

/**
 * Project every open unit of work out of the canonical stores. Pure: calling it
 * twice with unchanged state returns identical ids, deadlines and priorities.
 *
 * §P13 / S3 — THE CLOCK SEAM. The acknowledgement window is an
 * INSTANT-resolution rule (`orderDate + 24h`), so it is judged against `now` —
 * the same default instant `src/data/api.ts` enforces it with — and NOT against
 * `demoToday()`, which is a DATE-resolution convenience that tests pin for the
 * overdue / due-soon buckets. Judging the window on a pinned demo DATE would let
 * this queue advertise work the writer REFUSES, or hide work the writer
 * performs — exactly the class of disagreement S3 removes. `now` is a parameter
 * so a gate can pin it, following the caller-clock seam S2 added to
 * `acknowledgePurchaseOrder`.
 */
export function deriveWorkItems(now: Date | string | number = new Date()): WorkItem[] {
  const out: WorkItem[] = [];
  const today = demoToday();

  /* 1. Retail-channel PO acknowledgement — the queue is the RULE OWNER's, so this
        layer can no longer invent acknowledgement work. Always critical: an
        unacknowledged PO inside its window is at risk of the channel's forced
        cancellation.

        §P13 / S3 — REPOINTED (the founder-reported defect, removed at source).
        The predicate used to be hand-rolled here (`status !== rejected/delivered`
        + `!acknowledgedAt`), which is why PO-9201 / PO-9211 — shipped, 41 days past
        their deadline — still produced "Acknowledge PO-…" items. The owner now
        decides (`inQueue` = Amazon's `New` set INSIDE the 24-hour window): a PO
        whose window has closed, that the channel has closed, that already carries
        an acknowledgement, or that owes no acknowledgement, derives NO
        acknowledgement work. The row's wording IS the owner's own `reason` and its
        deadline IS the owner's own deadline, so the queue row and the PO surface
        cannot state different window states. (`PO_ACKNOWLEDGEMENT_HOURS` is still
        imported for the re-export this module's public surface promises.) */
  for (const po of demoPurchaseOrders) {
    const ackWindow = poAcknowledgementWindow(po, now);
    if (ackWindow.inQueue) {
      /** The DATE of the owner's deadline; in the queue it is always readable. */
      const deadline = poAcknowledgementDeadline(po);
      out.push(
        make('po_acknowledgement', { type: 'purchase_order', id: po.id, label: po.poNumber }, {
          title: `Acknowledge ${po.poNumber}`,
          detail: `${brandLabel(po.brandId)} · £${po.poValue.toLocaleString('en-GB')} · ${ackWindow.reason}`,
          priority: 'critical',
          dueDate: deadline ? deadline.slice(0, 10) : null,
          tenantId: po.brandId,
          actionView: 'purchase_orders',
          createdAt: po.orderDate,
        })
      );
    }

    /* 2. Fulfilment window closing (freight term decides which window applies). */
    const windowEnd = po.freightTerm === 'prepaid' ? po.deliveryWindowEnd : po.shipWindowEnd;
    if (windowEnd && (po.status === 'accepted' || po.status === 'ready_to_fulfil')) {
      const left = daysBetween(today, windowEnd);
      if (left <= 7) {
        out.push(
          make('po_window', { type: 'purchase_order', id: po.id, label: po.poNumber }, {
            title: `${po.freightTerm === 'prepaid' ? 'Delivery' : 'Ship'} window for ${po.poNumber}`,
            detail: `${brandLabel(po.brandId)} · window closes ${windowEnd}`,
            priority: left < 0 ? 'critical' : left <= 2 ? 'high' : 'normal',
            dueDate: windowEnd,
            tenantId: po.brandId,
            actionView: 'purchase_orders',
            createdAt: po.orderDate,
          })
        );
      }
    }
  }

  /* 3. Compliance documents — missing/rejected block the catalogue gate; an
        approaching expiry is an important operational item. */
  for (const doc of demoComplianceDocs) {
    const blocking = doc.status === 'missing' || doc.status === 'rejected';
    const expiry = doc.expiryDate ? daysBetween(today, doc.expiryDate) : null;
    const expiring = expiry !== null && expiry <= EXPIRY_HORIZON_DAYS;
    if (!blocking && !expiring) continue;
    out.push(
      make('compliance_expiry', { type: 'compliance_document', id: doc.id, label: doc.type.replace(/_/g, ' ') }, {
        title: blocking
          ? `${doc.type.replace(/_/g, ' ')} ${doc.status} — ${brandLabel(doc.brandId)}`
          : `${doc.type.replace(/_/g, ' ')} expires in ${expiry} day(s)`,
        detail: blocking
          ? `${brandLabel(doc.brandId)} cannot clear the compliance gate until this document is approved`
          : `${brandLabel(doc.brandId)} · expiry ${doc.expiryDate}`,
        priority: blocking ? 'critical' : expiry !== null && expiry <= 14 ? 'high' : 'normal',
        dueDate: doc.expiryDate ?? null,
        tenantId: doc.brandId,
        actionView: 'compliance',
        createdAt: doc.expiryDate ?? today,
      })
    );
  }

  /* 4. Contracts approaching renewal. */
  for (const c of demoContracts) {
    if (c.status === 'terminated') continue;
    const left = daysBetween(today, c.renewalDate);
    if (left > EXPIRY_HORIZON_DAYS) continue;
    out.push(
      make('contract_renewal', { type: 'contract', id: c.id, label: c.type.replace(/_/g, ' ') }, {
        title: `Renew ${c.type.replace(/_/g, ' ')} — ${brandLabel(c.brandId)}`,
        detail: `${brandLabel(c.brandId)} · renewal ${c.renewalDate} · status ${c.status}`,
        priority: left < 0 ? 'critical' : left <= 14 ? 'high' : 'normal',
        dueDate: c.renewalDate,
        tenantId: c.brandId,
        actionView: 'contracts',
        createdAt: c.effectiveDate,
      })
    );
  }

  /* 5. Open / disputed deductions — the brand is owed a decision inside the
        declared dispute window. */
  for (const d of demoDeductions) {
    if (d.status === 'resolved' || d.status === 'accepted') continue;
    out.push(
      make('deduction_dispute', { type: 'deduction', id: d.id, label: d.purchaseOrderId }, {
        title: `Deduction ${d.status} — ${d.purchaseOrderId}`,
        /**
         * §P2 (2026-09-22) — provenance travels with the record. This item is the
         * canonical owner of the deduction attention the brand overview used to
         * carry, so it carries the SAME truthful marker that row did: the
         * canonical `Deduction.simulated` flag decides it, never the wording.
         */
        detail: `${brandLabel(d.brandId)} · £${d.amountGbp.toFixed(2)} · ${d.reason}${d.simulated ? ' · (sim)' : ''}`,
        priority: d.status === 'disputed' ? 'high' : 'normal',
        dueDate: addDays(d.date, DEDUCTION_DISPUTE_WINDOW_DAYS),
        tenantId: d.brandId,
        actionView: 'deductions',
        createdAt: d.date,
      })
    );
  }

  /* 6. Shipment exceptions and delays — the carrier seam already flags them. */
  for (const s of demoShipments) {
    if (!s.exception && !s.delayed) continue;
    out.push(
      make('shipment_exception', { type: 'shipment', id: s.id, label: s.reference }, {
        title: `${s.exception ? 'Exception' : 'Delay'} — ${s.reference}`,
        detail: `${brandLabel(s.brandId)} · ${s.carrier} · ${s.origin} → ${s.destination}`,
        priority: s.exception ? 'critical' : 'high',
        dueDate: null,
        tenantId: s.brandId,
        actionView: 'logistics',
        createdAt: today,
      })
    );
  }

  /* 7. Returns sitting in an actionable warehouse stage. */
  for (const rt of getAllReturnTracking()) {
    if (rt.status === 'confirmed_by_brand') continue;
    const base = rt.qualityCheckedAt ?? rt.receivedAtWarehouse;
    out.push(
      make('return_action', { type: 'return', id: rt.id, label: rt.returnId }, {
        title: `Returns ${rt.status.replace(/_/g, ' ')} — ${rt.returnId}`,
        detail: `${brandLabel(rt.brandId)} · inbound ${rt.inboundCarrier} ${rt.inboundTrackingNumber}`,
        priority: rt.status === 'quality_checked' ? 'high' : 'normal',
        dueDate: addDays(base, RETURN_ACTION_WINDOW_DAYS),
        tenantId: rt.brandId,
        actionView: 'returns_tracking',
        createdAt: base,
      })
    );
  }

  /* 8. Outreach follow-up — a contacted prospect with no reply needs the next
        action inside the declared cadence. */
  ensureProspectStore();
  for (const p of getProspects()) {
    if (p.disqualified) continue;
    if (!['contacted', 'opened', 'replied', 'interested', 'meeting_scheduled', 'negotiating'].includes(p.outreachStatus)) continue;
    const due = addDays(p.lastResearched, OUTREACH_FOLLOW_UP_DAYS);
    out.push(
      make('outreach_followup', { type: 'prospect', id: p.id, label: p.brand }, {
        title: `Follow up ${p.brand}`,
        detail: `${p.category} · outreach status ${p.outreachStatus.replace(/_/g, ' ')} · last research ${p.lastResearched}`,
        priority: daysBetween(today, due) < 0 ? 'high' : 'normal',
        dueDate: due,
        tenantId: null,
        actionView: 'crm',
        owner: p.owner ? `staff:${p.owner}` : 'staff:mercenta-ops',
        createdAt: p.lastResearched,
      })
    );
  }

  /* 9. §Sprint 2 — commerce INVOICE DUE. Derived from the canonical simulated
        invoice/payment pair (E4): an issued invoice with no settled payment is
        due on its OWN derived due date (§P7 — the invoice's own issue date plus
        ITS OWN terms, via `invoiceTerms.ts`; a cancelled invoice is never a
        receivable). Settling the payment removes the item from the attention
        set, so its reminder stops. */
  const paymentsForInvoiceDue = getAllCommercePayments();
  for (const inv of demoCommerceInvoices) {
    if (!invoiceIsOutstanding(inv, paymentsForInvoiceDue)) continue;
    const issued = inv.issuedAt.slice(0, 10);
    const due = invoiceDueDate(inv);
    const terms = invoiceTermDays(inv);
    const left = daysBetween(today, due);
    out.push(
      make('invoice_due', { type: 'invoice', id: inv.id, label: inv.number }, {
        title: `Invoice ${inv.number} due`,
        detail: `${brandLabel(inv.brandId)} · £${inv.subtotalGbp.toFixed(2)} · ${inv.mode} · ${terms}-day terms from issue ${issued}`,
        priority: left < 0 ? 'critical' : left <= 7 ? 'high' : 'normal',
        dueDate: due,
        tenantId: inv.brandId,
        actionView: 'accounting',
        createdAt: issued,
      })
    );
  }

  /* 10. §Sprint 2 — ONBOARDING STEP. Derived from the real canonical onboarding
         record: the FIRST incomplete step in the declared canonical order. The
         deadline is the record's own `initiatedAt` plus the declared per-step
         SLA, so it is deterministic and never invented. Completing the step
         advances the derivation to the next step; completing the onboarding
         removes the item entirely. */
  for (const onb of getOnboardings()) {
    if (onb.status === 'completed' || onb.completedAt) continue;
    const step = onb.steps.find((s) => s.status !== 'done');
    if (!step) continue;
    const stepIndex = Math.max(0, ONBOARDING_STEP_ORDER.indexOf(step.id));
    const initiated = onb.initiatedAt.slice(0, 10);
    const due = addDays(initiated, (stepIndex + 1) * ONBOARDING_STEP_SLA_DAYS);
    out.push(
      make('onboarding_step', { type: 'onboarding', id: `${onb.id}-${step.id}`, label: onb.businessName }, {
        title: `Onboarding — ${step.label}`,
        detail: `${onb.businessName} · ${onb.origin.replace(/_/g, ' ')} · track ${onb.track} · step ${stepIndex + 1} of ${ONBOARDING_STEP_ORDER.length} (${step.status})`,
        priority: step.id === 'legal_agreements' || step.id === 'banking' ? 'high' : 'normal',
        dueDate: due,
        tenantId: onb.brandId,
        actionView: 'onboarding',
        createdAt: initiated,
      })
    );
  }

  /* 10. §Phase 2 — COMMERCIAL READINESS. A product whose commercial route is
        `remediation` needs the BRAND to supply information; `blocked` /
        `human_review` need a MERCENTA decision. The item is DERIVED from the
        canonical readiness record, so resolving the underlying commercial issue
        (the brand supplies the information and the record is REASSESSED to a
        different route) removes the item from the attention set automatically —
        and a repeated assessment can never create duplicate work. */
  for (const cr of allCommercialReadinessRecords()) {
    const def = COMMERCIAL_WORK_BY_ROUTE[cr.route];
    if (!def.source || def.slaDays === null) continue;
    const tenantId = cr.owner.kind === 'brand' ? cr.owner.tenantId : null;
    const due = addDays(cr.createdAt.slice(0, 10), def.slaDays);
    out.push(
      make(def.source, { type: 'commercial_readiness', id: cr.id, label: cr.productLabel ?? cr.id }, {
        title: `${WORK_SOURCE_LABELS[def.source]} — ${cr.productLabel ?? cr.id}`,
        detail: `Route ${cr.route.replace('_', ' ')} · ${cr.missingInputs.length} missing input(s), ${
          cr.openQuestions.length
        } open question(s) · ${def.actionLabel}`,
        priority: def.priority,
        dueDate: due,
        tenantId,
        owner: def.owner === 'brand' ? (tenantId ? `brand:${tenantId}` : 'staff:mercenta-ops') : 'staff:mercenta-ops',
        actionView: 'control_centre',
        createdAt: cr.createdAt.slice(0, 10),
      })
    );
  }

  /**
   * 11. §P3 — THE FOUNDER CONSOLE (the retired Command Centre), PROJECTED INTO
   *     THIS SINGLE ACTION LIST.
   *
   * The Founder's decision: "Control Centre = ONE action list, founder-only
   * controls; the work/attention lists leave it; Work Management is the single
   * action list" (three action lists → one). The founder console's derivations
   * are therefore projected here — one item per derived action, carrying the SAME
   * rank and the SAME auditable WHY the console showed — instead of being
   * rendered as a second list on the Control Centre.
   *
   * OWNERSHIP: the console no longer derives PO-at-risk or shipment-exception
   * actions; those are the work layer's own items (1a/1b/6 above), so the two
   * cannot drift and a PO never appears twice.
   *
   * SCOPE: every item here is `superAdminOnly` and `tenantId: null` (platform
   * scope), and `getWorkItems` EXCLUDES them unless the caller positively
   * declares a Super-Admin session — so an ordinary admin session can never see a
   * founder-only record (company register, funding routes, applications).
   */
  for (const action of buildCommandCentre().queue) {
    const source = FOUNDER_SOURCE_BY_ACTION_ID(action.id);
    if (!source) continue;
    const priority: WorkPriority =
      action.priority === 'urgent' ? 'critical' : action.priority === 'high' ? 'high' : 'normal';
    const item = make(
      source,
      { type: 'founder_action', id: action.id, label: action.title },
      {
        title: action.title,
        detail: action.detail,
        priority,
        dueDate: action.dueDate ?? null,
        tenantId: null,
        owner: 'staff:founder',
        actionView: action.navView,
        createdAt: today,
      }
    );
    /* The console's rank + WHY travel WITH the item (never recomputed here). */
    item.rank = action.rank;
    item.why = action.why
      ? {
          factors: action.why.factors.map((f) => ({
            id: f.id,
            label: f.label,
            observed: f.observed,
            points: f.points,
          })),
          score: action.why.score,
        }
      : undefined;
    item.navTab = action.navTab;
    item.superAdminOnly = true;
    out.push(item);
  }

  /**
   * 12. §P3 — INTEGRATION HEALTH (founder console, Super-Admin only).
   *
   * Derived from the CANONICAL connection mirror the domain factories read
   * (`connections.ts → loadIntegrationsSync`), never from a React context — so this
   * derivation is pure and deterministic like every other one. A provider that is
   * reporting an error AND is not deliberately disabled raises ONE item; when no
   * provider state exists yet (`null` mirror) nothing is invented.
   */
  const connectionMap = loadIntegrationsSync();
  for (const [providerId, state] of Object.entries(connectionMap ?? {})) {
    if (!state?.error || state.disabled) continue;
    const label = providerId.replace(/_/g, ' ');
    const item = make(
      'founder_integration',
      { type: 'founder_action', id: providerId, label },
      {
        title: `${label} reported an error`,
        detail: `${String(state.error)} · connection ${String(state.status)}${
          state.sandbox ? ' · sandbox' : ''
        } · mode is declared per provider in Integration Settings (an UNKNOWN mode is never treated as simulation).`,
        priority: 'critical',
        dueDate: null,
        tenantId: null,
        owner: 'staff:founder',
        actionView: 'integrations',
        createdAt: today,
      }
    );
    item.superAdminOnly = true;
    out.push(item);
  }

  return out;
}

/* ── Manual items ──────────────────────────────────────────────────────────── */

export interface CreateWorkItemInput {
  title: string;
  detail?: string;
  priority?: WorkPriority;
  dueDate?: string | null;
  tenantId?: string | null;
  owner?: string;
  actionView?: string;
}

export function createWorkItem(input: CreateWorkItemInput, actor: string): WorkItem {
  if (!input.title.trim()) throw new Error('[work] title required');
  manualSeq += 1;
  const id = `work-manual-${String(manualSeq).padStart(4, '0')}`;
  const now = new Date().toISOString();
  const item: WorkItem = {
    id,
    title: input.title.trim(),
    detail: input.detail?.trim() ?? '',
    source: 'manual',
    priority: input.priority ?? 'normal',
    status: 'open',
    owner: input.owner ?? (input.tenantId ? `brand:${input.tenantId}` : `staff:${actor}`),
    dueDate: input.dueDate ?? null,
    tenantId: input.tenantId ?? null,
    entity: { type: 'none', id, label: 'Manual task' },
    actionView: input.actionView ?? 'work',
    derived: false,
    activity: [{ id: activityId(id, 1), at: now, actor, action: 'created', detail: 'Task created' }],
    createdAt: now,
  };
  manualItems.unshift(item);
  pushAudit('work_item_created', 'work_item', id, item.tenantId, item.title, actor);
  emitEvent({
    type: 'work_item_raised',
    severity: item.priority === 'critical' ? 'critical' : 'important',
    title: item.title,
    description: item.detail || `Manual task created by ${actor}`,
    actionUrl: undefined,
    entityId: item.tenantId ?? undefined,
    metadata: { workItemId: id, source: 'manual' },
  });
  notify();
  return item;
}

/* ── Lifecycle ─────────────────────────────────────────────────────────────── */

function appendDerivedActivity(itemId: string, entry: Omit<WorkActivityEntry, 'id'>): void {
  const list = derivedActivity.get(itemId) ?? [];
  list.push({ ...entry, id: activityId(itemId, list.length + 1) });
  derivedActivity.set(itemId, list);
}

/**
 * §SSOT S2 — RESOLVE A MANUAL ITEM. Derived work is REFUSED.
 *
 * A manual task has no canonical record, so this store IS its single source of
 * truth and resolving it here is correct. A DERIVED item is a projection of a
 * record the platform owns: resolving the TASK would leave the record (still
 * qualifying) and the work list (resolved) disagreeing — one fact, two sources of
 * truth — so the call is refused, the attempt is ATTRIBUTED AND AUDITED, and the
 * error names the owning action from `WORK_SOURCE_CLOSING`.
 *
 * @throws an Error whose `name` is `DERIVED_RESOLUTION_REFUSED`.
 */
export function resolveWorkItem(id: string, actor: string, reason = 'Action completed'): WorkItem | null {
  const item = getWorkItem(id);
  if (!item) return null;

  if (!canResolveFromWorkLayer(item)) {
    const closing = WORK_SOURCE_CLOSING[item.source];
    /** The refusal is a business event: who tried to hide record-qualified work,
     *  and by which action the record is actually closed. */
    pushAudit(
      'work_item_resolution_refused',
      'work_item',
      id,
      item.tenantId,
      `${item.title} — ${reason} · closes only via ${closing.writer ?? 'NO CLOSING PATH (declared gap)'} (${closing.owner})`,
      actor
    );
    const refusal = new Error(derivedResolutionRefusalMessage(item));
    refusal.name = DERIVED_RESOLUTION_REFUSED;
    throw refusal;
  }

  if (item.status === 'done') return item;
  const at = new Date().toISOString();
  const m = manualItems.find((x) => x.id === id);
  if (m) {
    m.status = 'done';
    m.completedAt = at;
    m.activity.push({ id: activityId(id, m.activity.length + 1), at, actor, action: 'resolved', detail: reason });
  }
  pushAudit('work_item_resolved', 'work_item', id, item.tenantId, `${item.title} — ${reason}`, actor);
  emitEvent({
    type: 'work_item_resolved',
    severity: 'informational',
    title: `Resolved: ${item.title}`,
    description: `${actor} resolved ${WORK_SOURCE_LABELS[item.source]} — ${reason}`,
    entityId: item.tenantId ?? undefined,
    metadata: { workItemId: id, source: item.source },
  });
  notify();
  notifyCanonicalStoreChange();
  return getWorkItem(id);
}

/**
 * §SSOT S2 — a derived item is NEVER `done`, so there is nothing to reopen: what
 * an operator can clear is their OWN ANNOTATION (progress back to open). The
 * record decides whether the item exists at all, so this can neither create nor
 * destroy work. A manual item keeps the full reopen lifecycle.
 */
export function reopenWorkItem(id: string, actor: string, reason = 'Reopened'): WorkItem | null {
  const item = getWorkItem(id);
  if (!item) return null;
  const at = new Date().toISOString();
  if (item.derived) {
    if (!item.annotation) return item;
    derivedAnnotations.delete(id);
    appendDerivedActivity(id, { at, actor, action: 'annotation_cleared', detail: reason });
  } else {
    const m = manualItems.find((x) => x.id === id);
    if (m) {
      m.status = 'open';
      m.completedAt = undefined;
      m.activity.push({ id: activityId(id, m.activity.length + 1), at, actor, action: 'reopened', detail: reason });
    }
  }
  pushAudit('work_item_reopened', 'work_item', id, item.tenantId, `${item.title} — ${reason}`, actor);
  notify();
  notifyCanonicalStoreChange();
  return getWorkItem(id);
}

/**
 * §SSOT S2 — set an operator's own state.
 *
 * For a DERIVED item this can only ANNOTATE (`in_progress` / `blocked`, or back to
 * `open`); a request for `done` is routed to `resolveWorkItem`, which REFUSES it.
 * A derived item therefore never leaves the attention set by an operator action —
 * only by the owning action on the record.
 */
export function setWorkItemStatus(id: string, status: WorkStatus, actor: string): WorkItem | null {
  const item = getWorkItem(id);
  if (!item) return null;
  if (status === 'done') return resolveWorkItem(id, actor, 'Marked done');
  const at = new Date().toISOString();
  if (item.derived) {
    if (status === 'open') derivedAnnotations.delete(id);
    else derivedAnnotations.set(id, { status, at, actor });
    appendDerivedActivity(id, { at, actor, action: `status_${status}`, detail: `Status → ${WORK_STATUS_LABELS[status]}` });
  } else {
    const m = manualItems.find((x) => x.id === id);
    if (m) {
      m.status = status;
      m.completedAt = undefined;
      m.activity.push({ id: activityId(id, m.activity.length + 1), at, actor, action: `status_${status}`, detail: `Status → ${WORK_STATUS_LABELS[status]}` });
    }
  }
  pushAudit('work_item_status_changed', 'work_item', id, item.tenantId, `${item.title} — ${WORK_STATUS_LABELS[status]}`, actor);
  notify();
  notifyCanonicalStoreChange();
  return getWorkItem(id);
}

/* ── Queries ───────────────────────────────────────────────────────────────── */

function allItems(): WorkItem[] {
  return [...deriveWorkItems(), ...manualItems];
}

/**
 * Scope + tenant filter — the ONE place work is filtered, so a brand can never
 * see another tenant's work and admin sees the platform.
 *
 * §P3 — `opts.superAdmin` gates the founder-console items (`superAdminOnly`).
 * It FAILS CLOSED: unless the caller positively declares a Super-Admin session,
 * founder-only records (company register, funding routes, applications,
 * integrations, cost protection) are excluded — including from the calendar,
 * the badges and the reminder sweep, which all read through this function.
 */
export function getWorkItems(
  scope: WorkScope,
  tenantId?: string | null,
  opts?: { includeResolved?: boolean; superAdmin?: boolean }
): WorkItem[] {
  const rows = allItems();
  const scoped = scope === 'brand' ? rows.filter((r) => r.tenantId === (tenantId ?? null)) : rows;
  const authorised = opts?.superAdmin ? scoped : scoped.filter((r) => r.superAdminOnly !== true);
  const visible = opts?.includeResolved ? authorised : authorised.filter((r) => r.status !== 'done');
  const rank = { critical: 0, high: 1, normal: 2 } as const;
  return (
    visible
      /**
       * §P3 — every read resolves the hand-off destination for ITS shell, so the
       * action list can never send an operator to a view id that does not exist
       * there (the dead-end class of defect).
       */
      .map((r) => ({ ...r, actionView: resolveWorkActionView(r.actionView, scope) }))
      .sort((a, b) => {
        if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
        const ad = a.dueDate ?? '9999-12-31';
        const bd = b.dueDate ?? '9999-12-31';
        return ad.localeCompare(bd);
      })
  );
}

export function getWorkItem(id: string): WorkItem | null {
  return allItems().find((w) => w.id === id) ?? null;
}

/**
 * §SSOT S5 — ONE NUMBER, ONE OWNER.
 *
 * The founder-facing defect this stage removes: the nav badge counted one set
 * (`workAttentionCount` — critical + high) while the Work Management list
 * rendered a DIFFERENT set (every unresolved item), and NEITHER surface said
 * which set its number was, so a rendered 47 against a badged 41 read as a
 * contradiction. Both were numerically correct.
 *
 * There are now TWO DECLARED SETS, each carrying the label that must travel
 * with its number. `workCounts` is the ONLY function in the platform that
 * counts work: the rail badge, the calendar badge, the workspace tiles and the
 * founder oversight all read their number here, so no surface can re-invent a
 * third filter and drift again.
 */
export const WORK_COUNT_SETS = {
  attention: {
    id: 'attention',
    /** The phrase rendered WITH the number — never omitted. */
    label: 'Needs attention',
    definition: 'Unresolved critical + high priority work in scope',
  },
  open: {
    id: 'open',
    label: 'All open work',
    definition: 'Every unresolved item in scope, any priority',
  },
  overdue: {
    id: 'overdue',
    label: 'Overdue work',
    definition: 'Unresolved items whose deadline has already passed',
  },
} as const satisfies Record<string, { id: string; label: string; definition: string }>;

export type WorkCountSetId = keyof typeof WORK_COUNT_SETS;

export interface WorkCounts {
  /** §SSOT S5 — the DECLARED `attention` set. This is what a badge counts. */
  attention: number;
  /** §SSOT S5 — the DECLARED `open` set. This is what the work list renders. */
  open: number;
  /** Deadline already passed — a declared subset of `open`. */
  overdue: number;
}

/**
 * §SSOT S5 — the SINGLE counting owner. Resolved work is excluded by
 * `getWorkItems` (the one read), so every number below shares one existence rule.
 */
export function workCounts(
  scope: WorkScope,
  tenantId?: string | null,
  opts?: { superAdmin?: boolean }
): WorkCounts {
  const rows = getWorkItems(scope, tenantId, opts);
  const today = demoToday();
  return {
    attention: rows.filter((w) => w.priority !== 'normal').length,
    open: rows.length,
    overdue: rows.filter((w) => w.dueDate !== null && w.dueDate < today).length,
  };
}

/**
 * §SSOT S5 — DELETED, DELIBERATELY: `workAttentionCount(scope, tenantId, opts)`.
 *
 * REPOINTED CONTRACT (recorded here, NOT weakened): this function returned the
 * critical+high count and was the SECOND counting path behind the badge/list
 * disagreement. It had no caller after the surfaces were repointed, so it is
 * REMOVED rather than kept as a compatibility alias — a name that counts work
 * and is not `workCounts` is exactly the drift the stage removes. `workCounts`
 * is now the ONLY counting function in the platform, and
 * `scripts/validate-work-layer.mjs` §20 asserts this name no longer exists.
 */

/** Overdue items only — used by the proactive reminder automation. */
export function overdueWorkItems(
  scope: WorkScope,
  tenantId?: string | null,
  opts?: { superAdmin?: boolean }
): WorkItem[] {
  const today = demoToday();
  return getWorkItems(scope, tenantId, opts).filter((w) => w.dueDate !== null && w.dueDate < today);
}

export function dueSoonWorkItems(
  scope: WorkScope,
  tenantId?: string | null,
  withinDays = 7,
  opts?: { superAdmin?: boolean }
): WorkItem[] {
  const today = demoToday();
  return getWorkItems(scope, tenantId, opts).filter((w) => {
    if (!w.dueDate) return false;
    const d = daysBetween(today, w.dueDate);
    return d >= 0 && d <= withinDays;
  });
}

/** Group counts for the kanban board — one source for both views. */
export function workByStatus(
  scope: WorkScope,
  tenantId?: string | null,
  opts?: { superAdmin?: boolean }
): Record<WorkStatus, WorkItem[]> {
  const rows = getWorkItems(scope, tenantId, opts);
  return {
    open: rows.filter((r) => r.status === 'open'),
    in_progress: rows.filter((r) => r.status === 'in_progress'),
    blocked: rows.filter((r) => r.status === 'blocked'),
    done: rows.filter((r) => r.status === 'done'),
  };
}

/* ── Deterministic reset (investor demo) ───────────────────────────────────── */

export interface WorkResetResult {
  /** §SSOT S2 — operator annotations cleared (there is no derived resolution to clear any more). */
  derivedAnnotationsCleared: number;
  manualItemsCleared: number;
  clockUnpinned: boolean;
}

export function resetWorkStore(): WorkResetResult {
  const result: WorkResetResult = {
    derivedAnnotationsCleared: derivedAnnotations.size,
    manualItemsCleared: manualItems.length,
    clockUnpinned: pinnedToday !== null,
  };
  derivedAnnotations.clear();
  derivedActivity.clear();
  manualItems.length = 0;
  manualSeq = 0;
  pinnedToday = null;
  notify();
  return result;
}



