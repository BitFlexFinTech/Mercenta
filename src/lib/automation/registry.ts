/**
 * §Founder OS — CANONICAL AUTOMATION REGISTRY + SCHEDULER SEAM.
 *
 * Mercenta is an automated business operating system: automation is NOT optional,
 * but neither AI nor any external workflow platform is required for it. This
 * module is the ONE place that declares what automation exists, what it does,
 * when it last ran, whether it succeeded, what it affected, whether it is
 * disabled and why, and how it can be safely retried.
 *
 * NON-NEGOTIABLE RULES IMPLEMENTED HERE
 * ------------------------------------
 * - NO TIMER IS THE SOURCE OF TRUTH. Nothing in this file calls
 *   `setInterval`/`setTimeout`; automation is EXPLICITLY INVOKED (by the operator
 *   today, by the declared scheduler seam later). Business state never depends on
 *   whether a browser tab happened to be open.
 * - DETERMINISTIC. Run ids are `run-<automationId>-<sequence>`; the run date is
 *   the PINNED DEMO CLOCK (`demoToday()`); the input fingerprint is a pure hash
 *   of the canonical records the automation reads. No `Math.random()`, no
 *   `Date.now()`-derived identifiers.
 * - IDEMPOTENT. A run key is `<automationId>|<date>|<inputDigest>`. A repeat run
 *   with unchanged canonical state does NOT execute the implementation again and
 *   is reported as `duplicate_suppressed`, so no duplicate work, notification or
 *   event can be produced. A FAILED run is never suppressed — that is what makes
 *   retry meaningful.
 * - OBSERVABLE FAILURE, NEVER FAKE SUCCESS. A run that throws is recorded as
 *   `failed` with the real error, emits a canonical `automation_run_failed`
 *   event and can be retried. `simulateAutomationFailure` exists so failure and
 *   recovery are demonstrable deterministically — it is explicitly labelled as
 *   simulation and audited.
 * - APPROVAL GATE. An automation that reaches a consequential decision stops at
 *   `blocked_approval`, records the pending approval and never executes the
 *   irreversible action. Only a human decision (attributed + audited) clears it.
 * - TENANT SAFETY. Implementations read through the canonical tenant-filtered
 *   accessors (`getWorkItems(scope, tenantId)`); the registry never invents a
 *   second filter, and the platform-wide automations run in admin scope only.
 * - AI IS OPTIONAL. `requiresAi` is declared per automation; an AI-assisted
 *   automation degrades to a truthful `degraded` outcome when no AI provider is
 *   available and never blocks a deterministic automation.
 */
import type { WorkItem, WorkScope } from '@/lib/work/types';
import {
  DEDUCTION_DISPUTE_WINDOW_DAYS,
  EXPIRY_HORIZON_DAYS,
  INVOICE_TERM_DAYS,
  OUTREACH_FOLLOW_UP_DAYS,
  addDays,
  daysBetween,
  demoToday,
  getWorkItems,
  overdueWorkItems,
} from '@/lib/work/workStore';
import { runReminderSweep } from '@/lib/work/reminderRunner';
import { allCommercialReadinessRecords } from '@/data/commercialReadinessStore';
import { commercialViabilityInputFromRecord } from '@/lib/commercial/commercialReadinessRecorder';
import { evaluateCommercialViability } from '@/lib/commercial/commercialGate';
import { COMMERCIAL_WORK_BY_ROUTE } from '@/config/commercialReadiness';
import { getWorkItem, workItemId } from '@/lib/work/workStore';
import { AUTO_APPROVE_THRESHOLD_GBP, shouldAutoApproveCommission } from './autoApprove';
import {
  demoAuditLog,
  demoCommerceInvoices,
  demoComplianceDocs,
  demoDeductions,
  demoPurchaseOrders,
  getCommercePaymentsForInvoice,
} from '@/data/demoStore';
import { ensureProspectStore, getProspects } from '@/data/prospectStore';
import { emitEvent } from '@/lib/events/eventFeed';
import { defaultIntegrationMode } from '@/integrations/registry';
import { isProviderSimulationSafe, type ProviderResolutionMode } from '@/integrations/types';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';

/* ── Declared catalogue ────────────────────────────────────────────────────── */

export type AutomationDomain = 'operations' | 'finance' | 'compliance' | 'acquisition' | 'intelligence';

export type AutomationId =
  | 'work_projection'
  | 'reminder_sweep'
  | 'overdue_escalation'
  | 'compliance_gate_monitor'
  | 'finance_overdue_monitor'
  | 'acquisition_followup_monitor'
  | 'commission_review'
  // §Phase 2 — the commercial readiness monitor: consistency-checks every stored
  // commercial route against the deterministic gate, escalates the items that
  // genuinely need a human, and never mutates a commercial decision itself.
  | 'commercial_readiness_monitor'
  | 'founder_brief';

export interface AutomationDefinition {
  id: AutomationId;
  name: string;
  description: string;
  domain: AutomationDomain;
  /** Declared cadence — what the scheduler seam would invoke, and what "next run" means. */
  cadence: string;
  cadenceDays: number;
  /** The single callable entry point (what a scheduler needs to know). */
  entryPoint: string;
  /** Which side of the platform the automation runs in. */
  scope: WorkScope;
  deterministic: boolean;
  /** True when the automation is genuinely improved (never required) by AI. */
  requiresAi: boolean;
  /** External providers this automation would need if it were live. */
  externalProviders: string[];
  /** Deterministic idempotency key shape. */
  idempotencyKey: string;
  /** True when a consequential decision must be approved by a human first. */
  approvalRequired: boolean;
  /** True when the automation reads tenant-scoped records. */
  tenantScoped: boolean;
  /** Why this automation is FREE (the free-first decision, recorded). */
  costNote: string;
}

export const AUTOMATION_ORDER: readonly AutomationId[] = [
  'work_projection',
  'reminder_sweep',
  'overdue_escalation',
  'compliance_gate_monitor',
  'finance_overdue_monitor',
  'acquisition_followup_monitor',
  'commission_review',
  'commercial_readiness_monitor',
  'founder_brief',
] as const;

export const AUTOMATION_REGISTRY: Record<AutomationId, AutomationDefinition> = {
  work_projection: {
    id: 'work_projection',
    name: 'Work projection',
    description:
      'Projects every open unit of work out of the canonical records (PO acknowledgement windows, compliance gates, invoice terms, deduction windows, carrier exceptions, returns, outreach follow-ups, onboarding steps, contract renewals) with deterministic ids and declared deadlines.',
    domain: 'operations',
    cadence: 'every invocation / on canonical state change',
    cadenceDays: 1,
    entryPoint: "runAutomation('work_projection')",
    scope: 'admin',
    deterministic: true,
    requiresAi: false,
    externalProviders: [],
    idempotencyKey: '<automationId>|<demoDate>|<work-set fingerprint>',
    approvalRequired: false,
    tenantScoped: true,
    costNote: 'Pure in-process projection over stores already loaded — $0, no provider, no scheduler.',
  },
  reminder_sweep: {
    id: 'reminder_sweep',
    name: 'Proactive reminder sweep',
    description:
      'Escalates a work item past a declared deadline boundary (overdue / due today / due soon) into a reminder, emits the canonical reminder event and stops reminding the moment the underlying item is resolved.',
    domain: 'operations',
    cadence: 'daily (morning) + on demand',
    cadenceDays: 1,
    entryPoint: "runAutomation('reminder_sweep')",
    scope: 'admin',
    deterministic: true,
    requiresAi: false,
    externalProviders: [],
    idempotencyKey: '<automationId>|<demoDate>|<deadline fingerprint>',
    approvalRequired: false,
    tenantScoped: true,
    costNote: 'Deterministic sweep over the canonical work set — $0.',
  },
  overdue_escalation: {
    id: 'overdue_escalation',
    name: 'Overdue escalation',
    description:
      'Escalates critical and high-priority work that is past its deadline to the founder with a canonical event and an audit record — once per item per day, never repeatedly.',
    domain: 'operations',
    cadence: 'daily',
    cadenceDays: 1,
    entryPoint: "runAutomation('overdue_escalation')",
    scope: 'admin',
    deterministic: true,
    requiresAi: false,
    externalProviders: [],
    idempotencyKey: '<automationId>|<demoDate>|<overdue fingerprint>',
    approvalRequired: false,
    tenantScoped: true,
    costNote: 'Threshold arithmetic over the work layer — $0. No AI is used to decide what is overdue.',
  },
  compliance_gate_monitor: {
    id: 'compliance_gate_monitor',
    name: 'Compliance gate monitor',
    description:
      'Evaluates the canonical compliance documents and reports every blocking state (missing / rejected) and every approaching expiry inside the declared horizon. The compliance gate itself is never bypassed by automation.',
    domain: 'compliance',
    cadence: 'daily',
    cadenceDays: 1,
    entryPoint: "runAutomation('compliance_gate_monitor')",
    scope: 'admin',
    deterministic: true,
    requiresAi: false,
    externalProviders: [],
    idempotencyKey: '<automationId>|<demoDate>|<compliance fingerprint>',
    approvalRequired: false,
    tenantScoped: true,
    costNote: 'Category-aware rule evaluation already implemented in src/lib/compliance — $0.',
  },
  finance_overdue_monitor: {
    id: 'finance_overdue_monitor',
    name: 'Finance overdue monitor',
    description:
      'Evaluates issued invoices with no settled payment against the declared payment terms, and open deductions against the declared dispute window, and reports what is genuinely overdue.',
    domain: 'finance',
    cadence: 'daily',
    cadenceDays: 1,
    entryPoint: "runAutomation('finance_overdue_monitor')",
    scope: 'admin',
    deterministic: true,
    requiresAi: false,
    externalProviders: [],
    idempotencyKey: '<automationId>|<demoDate>|<finance fingerprint>',
    approvalRequired: false,
    tenantScoped: true,
    costNote: 'Deterministic date arithmetic over the canonical invoice/payment/deduction records — $0.',
  },
  acquisition_followup_monitor: {
    id: 'acquisition_followup_monitor',
    name: 'Acquisition follow-up monitor',
    description:
      'Evaluates the canonical prospect pipeline and reports every contacted prospect whose declared follow-up cadence has elapsed, with the owner and the next action. Prospects are NEVER silently converted into brands.',
    domain: 'acquisition',
    cadence: 'daily',
    cadenceDays: 1,
    entryPoint: "runAutomation('acquisition_followup_monitor')",
    scope: 'admin',
    deterministic: true,
    requiresAi: false,
    externalProviders: [],
    idempotencyKey: '<automationId>|<demoDate>|<prospect fingerprint>',
    approvalRequired: false,
    tenantScoped: false,
    costNote: 'Cadence arithmetic over the canonical prospect store — $0 (no enrichment or AI call).',
  },
  commission_review: {
    id: 'commission_review',
    name: 'Commission review',
    description:
      'Evaluates each accrued commission against the declared auto-approve threshold. A commission above the threshold STOPS at a founder approval gate — the automation never releases money, and no payout can leave Mercenta without explicit human approval.',
    domain: 'finance',
    cadence: 'daily',
    cadenceDays: 1,
    entryPoint: "runAutomation('commission_review')",
    scope: 'admin',
    deterministic: true,
    requiresAi: false,
    externalProviders: [],
    idempotencyKey: '<automationId>|<demoDate>|<commission fingerprint>',
    approvalRequired: true,
    tenantScoped: true,
    costNote: 'Reuses the canonical auto-approve threshold rule (src/lib/automation/autoApprove) — $0.',
  },
  founder_brief: {
    id: 'founder_brief',
    name: 'Founder brief',
    description:
      'Composes the founder briefing from canonical state: what changed, what needs attention, what is overdue, financial signals, acquisition movement and automation failures — with the underlying record references. AI may add a narrative on top; the FACTS never come from AI.',
    domain: 'intelligence',
    cadence: 'daily (morning)',
    cadenceDays: 1,
    entryPoint: "runAutomation('founder_brief')",
    scope: 'admin',
    deterministic: true,
    requiresAi: false,
    externalProviders: [],
    idempotencyKey: '<automationId>|<demoDate>|<brief fingerprint>',
    approvalRequired: false,
    tenantScoped: false,
    costNote: 'Deterministic-first: every fact is computed locally. AI narrative is optional and refused when no free model is available.',
  },
  commercial_readiness_monitor: {
    id: 'commercial_readiness_monitor',
    name: 'Commercial readiness monitor',
    description:
      'Verifies every stored commercial readiness record against the deterministic commercial gate (a drift check, never a re-decision), reports the products needing brand information and the products needing a Mercenta decision, and escalates the critical ones through the EXISTING overdue-escalation mechanism. The monitor never changes a commercial route and never invents a threshold.',
    domain: 'operations',
    cadence: 'daily',
    cadenceDays: 1,
    entryPoint: "runAutomation('commercial_readiness_monitor')",
    scope: 'admin',
    deterministic: true,
    requiresAi: false,
    externalProviders: [],
    idempotencyKey: '<automationId>|<demoDate>|<commercial readiness fingerprint>',
    approvalRequired: false,
    tenantScoped: true,
    costNote: 'Pure re-evaluation of the declared condition catalogue over records already in memory — $0, no provider, no AI.',
  },
};

export function automationDefinition(id: AutomationId): AutomationDefinition {
  return AUTOMATION_REGISTRY[id];
}

/* ── Run model ─────────────────────────────────────────────────────────────── */

export type AutomationRunStatus =
  | 'succeeded'
  | 'failed'
  | 'duplicate_suppressed'
  | 'blocked_approval'
  | 'skipped_disabled'
  | 'skipped_halted'
  | 'degraded';

export const AUTOMATION_RUN_STATUS_LABELS: Record<AutomationRunStatus, string> = {
  succeeded: 'Succeeded',
  failed: 'Failed',
  duplicate_suppressed: 'Duplicate suppressed',
  blocked_approval: 'Awaiting approval',
  skipped_disabled: 'Disabled',
  skipped_halted: 'Halted',
  degraded: 'Degraded',
};

export interface AutomationOutcome {
  /** How many canonical records the automation read. */
  evaluated: number;
  /** How many NEW things it raised (work items, reminders, escalations). */
  raised: number;
  /** How many attention items it reports (may overlap `affected`). */
  escalated: number;
  /** Deterministic ids of the records the run touched/reported. */
  affected: string[];
  /** Human-readable, factual lines (never invented). */
  notes: string[];
  /** Set when the automation could not run at full fidelity (AI/provider). */
  degradedReason?: string;
  /** Consequential decisions awaiting a human approval decision. */
  approvals?: { key: string; entityId: string; reason: string }[];
}

export interface AutomationRun {
  /** Deterministic: `run-<automationId>-<sequence>`. */
  id: string;
  automationId: AutomationId;
  status: AutomationRunStatus;
  /** The PINNED DEMO CLOCK date the run was executed against. */
  at: string;
  /** Monotonic execution sequence — deterministic ordering, never a timestamp. */
  sequence: number;
  /** 1 for a first execution; incremented by an explicit retry. */
  attempt: number;
  /** When this run is a retry, the failed run it retried. */
  retryOf?: string;
  actor: string;
  evaluated: number;
  raised: number;
  escalated: number;
  affected: string[];
  notes: string[];
  /** The real error message when status is `failed`. */
  error?: string;
  degradedReason?: string;
  approvals: { key: string; entityId: string; reason: string }[];
  /** The input fingerprint that decides idempotency. */
  inputDigest: string;
  /** True when this run was produced with a simulated failure injected. */
  simulatedFailure: boolean;
}

export interface PendingApproval {
  key: string;
  automationId: AutomationId;
  entityId: string;
  reason: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  decidedAt?: string;
  decidedBy?: string;
  decisionReason?: string;
}

interface AutomationState {
  enabled: boolean;
  reason: string;
  actor: string;
  at: string;
}

/**
 * §FOUNDATION — THE GLOBAL AUTOMATION HALT (the kill switch).
 *
 * Per-automation disable already exists, but an emergency stop must be ONE act,
 * not eight, and it must be enforced in the DOMAIN (here) rather than by hiding
 * a button. When halted, `runAutomation` returns `skipped_halted` BEFORE it
 * reads anything, so NO implementation runs, no event is emitted, no work item
 * is raised, no escalation is recorded and no approval is created. Only the halt
 * decision itself is audited, with an actor and a reason.
 */
export interface AutomationHaltState {
  halted: boolean;
  reason: string;
  actor: string;
  at: string;
}

const DEFAULT_HALT: AutomationHaltState = {
  halted: false,
  reason: 'Automation is running normally.',
  actor: 'system',
  at: 'declared',
};

let haltState: AutomationHaltState = { ...DEFAULT_HALT };

/* ── Store state (the ONLY mutable state) ──────────────────────────────────── */

const state = new Map<AutomationId, AutomationState>();
const runs: AutomationRun[] = [];
const lastRunByAutomation = new Map<AutomationId, AutomationRun>();
/** Idempotency: run key → the run that already covered it. */
const runKeys = new Map<string, AutomationRun>();
/** Escalation ledger: `<entityId>|<demoDate>` — an item escalates once per day. */
const escalationKeys = new Set<string>();
/** Pending human approvals keyed by the approval key. */
const approvals = new Map<string, PendingApproval>();
/** Simulated external failures (explicitly labelled, audited, clearable). */
const injectedFailures = new Map<AutomationId, string>();

let sequence = 0;
let mutationStamp = 0;
const listeners = new Set<() => void>();

const MAX_RUN_HISTORY = 200;

export function automationVersion(): number {
  return mutationStamp;
}

export function subscribeAutomations(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyAutomation(): void {
  mutationStamp += 1;
  for (const l of listeners) l();
}

/** Deterministic run id — never time- or random-derived. */
export function automationRunId(automationId: AutomationId, n: number): string {
  return `run-${automationId}-${String(n).padStart(4, '0')}`;
}

function pushAudit(
  action: string,
  entityType: string,
  entityId: string,
  reason: string,
  actor: string,
  metadata?: Record<string, unknown>
): void {
  demoAuditLog.push({
    id: `audit-automation-${entityType}-${entityId}-${demoAuditLog.length}`,
    createdAt: new Date().toISOString(),
    actorId: actor,
    action,
    entityType,
    entityId,
    reason,
    metadata,
  });
  notifyCanonicalStoreChange();
}

/**
 * Deterministic 32-bit fingerprint (djb2). Used ONLY to decide idempotency, so
 * the same canonical input always produces the same digest and a different input
 * always produces a different one.
 */
function fingerprint(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i += 1) h = ((h * 33) ^ input.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

/* ── Pure input fingerprints (what the automation actually reads) ──────────── */

function workFingerprint(includeResolved: boolean): string {
  const rows = getWorkItems('admin', null, { includeResolved });
  return fingerprint(rows.map((w) => `${w.id}:${w.status}:${w.dueDate ?? '-'}`).join('|'));
}

function complianceFingerprint(): string {
  return fingerprint(
    demoComplianceDocs.map((d) => `${d.id}:${d.brandId}:${d.status}:${d.expiryDate ?? '-'}`).join('|')
  );
}

function financeFingerprint(): string {
  const invoices = demoCommerceInvoices
    .map((i) => `${i.id}:${i.status}:${getCommercePaymentsForInvoice(i.id).length}`)
    .join('|');
  const deductions = demoDeductions.map((d) => `${d.id}:${d.status}:${d.amountGbp}`).join('|');
  return fingerprint(`${invoices}#${deductions}`);
}

function acquisitionFingerprint(): string {
  ensureProspectStore();
  return fingerprint(
    getProspects()
      .map((p) => `${p.id}:${p.outreachStatus}:${p.lastResearched}:${p.disqualified ? 'dq' : 'ok'}`)
      .join('|')
  );
}

function commissionFingerprint(): string {
  return fingerprint(demoPurchaseOrders.map((po) => `${po.id}:${po.status}:${po.commissionAmount}`).join('|'));
}

/** §Phase 2 — what the commercial readiness monitor actually reads. */
function commercialReadinessFingerprint(): string {
  return fingerprint(
    allCommercialReadinessRecords()
      .map((r) => `${r.id}:${r.route}:${r.routingDecisionId}:${r.terms.length}`)
      .join('|')
  );
}

const DIGEST_FUNCTIONS: Record<AutomationId, () => string> = {
  work_projection: () => workFingerprint(true),
  reminder_sweep: () => workFingerprint(false),
  overdue_escalation: () => workFingerprint(false),
  compliance_gate_monitor: complianceFingerprint,
  finance_overdue_monitor: financeFingerprint,
  acquisition_followup_monitor: acquisitionFingerprint,
  commission_review: commissionFingerprint,
  commercial_readiness_monitor: commercialReadinessFingerprint,
  founder_brief: () =>
    fingerprint(
      [
        workFingerprint(false),
        complianceFingerprint(),
        financeFingerprint(),
        acquisitionFingerprint(),
        commissionFingerprint(),
        commercialReadinessFingerprint(),
      ].join('#')
    ),
};

export function automationInputDigest(id: AutomationId): string {
  return DIGEST_FUNCTIONS[id]();
}

/* ── Deterministic implementations ─────────────────────────────────────────── */

/** Escalate ONE overdue item — at most once per item per day (deterministic). */
function escalate(item: WorkItem, actor: string, note: string): boolean {
  const key = `${item.id}|${demoToday()}`;
  if (escalationKeys.has(key)) return false;
  escalationKeys.add(key);
  emitEvent({
    type: 'work_escalated',
    severity: item.priority === 'critical' ? 'critical' : 'important',
    title: `Escalated: ${item.title}`,
    description: `${note} · due ${item.dueDate ?? 'no deadline'} · owner ${item.owner}`,
    entityId: item.tenantId ?? undefined,
    metadata: { workItemId: item.id, priority: item.priority, source: item.source, simulated: true },
  });
  pushAudit('work_escalated', 'work_item', item.id, note, actor, {
    workItemId: item.id,
    source: item.source,
  });
  return true;
}

const IMPLEMENTATIONS: Record<AutomationId, (actor: string) => AutomationOutcome> = {
  work_projection: () => {
    const rows = getWorkItems('admin', null, { includeResolved: true });
    const open = rows.filter((r) => r.status !== 'done');
    const bySource = new Map<string, number>();
    for (const r of open) bySource.set(r.source, (bySource.get(r.source) ?? 0) + 1);
    return {
      evaluated: rows.length,
      raised: 0,
      escalated: 0,
      affected: open.map((r) => r.id),
      notes: [
        `${open.length} open item(s) projected from ${rows.length} canonical record(s).`,
        ...[...bySource.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([src, n]) => `${src.replace(/_/g, ' ')}: ${n}`),
      ],
    };
  },

  reminder_sweep: (actor) => {
    const result = runReminderSweep('admin', null, actor);
    return {
      evaluated: result.evaluated,
      raised: result.raised.length,
      escalated: result.raised.filter((r) => r.bucket === 'overdue').length,
      affected: result.raised.map((r) => r.workItemId),
      notes: [
        `${result.raised.length} reminder(s) raised at ${result.sweptAt}; ${result.duplicatesSuppressed} boundary(ies) already raised (suppressed).`,
        `${result.suppressedResolved} boundary(ies) suppressed because the work item is resolved.`,
        `${result.active} reminder(s) currently active.`,
      ],
    };
  },

  overdue_escalation: (actor) => {
    const overdue = overdueWorkItems('admin');
    const material = overdue.filter((w) => w.priority === 'critical' || w.priority === 'high');
    let raised = 0;
    for (const item of material) {
      const days = item.dueDate ? Math.abs(daysBetween(demoToday(), item.dueDate)) : 0;
      if (escalate(item, actor, `Overdue by ${days} day(s) at ${item.priority} priority`)) raised += 1;
    }
    return {
      evaluated: overdue.length,
      raised,
      escalated: material.length,
      affected: material.map((w) => w.id),
      notes: [
        `${overdue.length} item(s) past their deadline; ${material.length} at critical/high priority.`,
        `${raised} newly escalated (an item escalates at most once per day).`,
      ],
    };
  },

  compliance_gate_monitor: () => {
    const today = demoToday();
    const blocking = demoComplianceDocs.filter((d) => d.status === 'missing' || d.status === 'rejected');
    const expiring = demoComplianceDocs.filter((d) => {
      if (!d.expiryDate) return false;
      const left = daysBetween(today, d.expiryDate);
      return left >= 0 && left <= EXPIRY_HORIZON_DAYS;
    });
    const expired = demoComplianceDocs.filter((d) => d.expiryDate !== undefined && d.expiryDate < today);
    return {
      evaluated: demoComplianceDocs.length,
      raised: 0,
      escalated: blocking.length + expired.length,
      affected: [...new Set([...blocking, ...expiring, ...expired].map((d) => d.id))],
      notes: [
        `${blocking.length} document(s) blocking the compliance gate (missing/rejected).`,
        `${expiring.length} expiring inside the ${EXPIRY_HORIZON_DAYS}-day horizon; ${expired.length} already expired.`,
        'The gate is never bypassed by automation — only a verified approval clears a document.',
      ],
    };
  },

  finance_overdue_monitor: () => {
    const today = demoToday();
    const overdueInvoices = demoCommerceInvoices.filter((inv) => {
      if (inv.status === 'paid') return false;
      if (getCommercePaymentsForInvoice(inv.id).length > 0) return false;
      return addDays(inv.issuedAt.slice(0, 10), INVOICE_TERM_DAYS) < today;
    });
    const overdueDeductions = demoDeductions.filter((d) => {
      if (d.status === 'resolved' || d.status === 'accepted') return false;
      return addDays(d.date, DEDUCTION_DISPUTE_WINDOW_DAYS) < today;
    });
    return {
      evaluated: demoCommerceInvoices.length + demoDeductions.length,
      raised: 0,
      escalated: overdueInvoices.length + overdueDeductions.length,
      affected: [...overdueInvoices.map((i) => i.id), ...overdueDeductions.map((d) => d.id)],
      notes: [
        `${overdueInvoices.length} invoice(s) past the declared ${INVOICE_TERM_DAYS}-day terms with no settled payment.`,
        `${overdueDeductions.length} deduction(s) past the declared ${DEDUCTION_DISPUTE_WINDOW_DAYS}-day dispute window.`,
      ],
    };
  },

  acquisition_followup_monitor: () => {
    ensureProspectStore();
    const today = demoToday();
    const FOLLOW_UP_STATUSES = ['contacted', 'opened', 'replied', 'interested', 'meeting_scheduled', 'negotiating'];
    const rows = getProspects().filter((p) => !p.disqualified && FOLLOW_UP_STATUSES.includes(p.outreachStatus));
    const due = rows
      .map((p) => ({ p, dueDate: addDays(p.lastResearched, OUTREACH_FOLLOW_UP_DAYS) }))
      .filter((r) => r.dueDate <= today);
    const overdue = due.filter((r) => r.dueDate < today);
    return {
      evaluated: getProspects().length,
      raised: 0,
      escalated: overdue.length,
      affected: due.map((r) => r.p.id),
      notes: [
        `${rows.length} prospect(s) in an active outreach state; ${due.length} past the declared ${OUTREACH_FOLLOW_UP_DAYS}-day follow-up cadence (${overdue.length} overdue).`,
        ...due
          .slice(0, 5)
          .map(
            (r) =>
              `${r.p.brand} — ${r.p.outreachStatus.replace(/_/g, ' ')} · due ${r.dueDate} · owner ${r.p.owner ?? 'unassigned'}`
          ),
        'A prospect is never converted into a brand by automation — onboarding is a separate, gated workflow.',
      ],
    };
  },

  commercial_readiness_monitor: (actor) => {
    const rows = allCommercialReadinessRecords();
    const byRoute = { ready: 0, remediation: 0, blocked: 0, human_review: 0 };
    const drift: string[] = [];
    const needsDecision: string[] = [];
    let escalated = 0;

    for (const r of rows) {
      byRoute[r.route] += 1;
      // DRIFT CHECK ONLY — the gate is re-evaluated to prove the stored route
      // still matches the deterministic answer. Nothing is written and no route
      // is changed by automation.
      const recomputed = evaluateCommercialViability(commercialViabilityInputFromRecord(r, actor));
      if (recomputed.decision.id !== r.routingDecisionId) {
        drift.push(`${r.productLabel ?? r.id}: stored ${r.route}, gate now computes ${recomputed.record.route}`);
      }
      if (r.route === 'blocked' || r.route === 'human_review') {
        needsDecision.push(`${r.productLabel ?? r.id} (${r.route.replace('_', ' ')})`);
        const item = getWorkItem(workItemId(COMMERCIAL_WORK_BY_ROUTE[r.route].source!, r.id));
        if (item && escalate(item, actor, `Commercial route ${r.route} requires a Mercenta decision`)) escalated += 1;
      }
    }

    return {
      evaluated: rows.length,
      raised: 0,
      escalated,
      affected: rows.filter((r) => r.route !== 'ready').map((r) => r.id),
      notes: [
        `${rows.length} commercial readiness record(s): ${byRoute.ready} ready, ${byRoute.remediation} remediation, ${byRoute.blocked} blocked, ${byRoute.human_review} human review.`,
        `${byRoute.remediation} product(s) need the BRAND to supply information; ${needsDecision.length} need a MERCENTA decision.`,
        drift.length === 0
          ? 'No route drift: every stored route still matches the deterministic gate.'
          : `ROUTE DRIFT detected in ${drift.length} record(s): ${drift.join('; ')}`,
        'The monitor never changes a commercial route and never invents a threshold — a commercial decision stays with the gate and a human.',
      ],
    };
  },

  commission_review: () => {
    const candidates = demoPurchaseOrders.filter((po) => po.status !== 'rejected' && (po.commissionAmount ?? 0) > 0);
    const held = candidates.filter((po) => !shouldAutoApproveCommission(po.commissionAmount).autoApproved);
    const pending: { key: string; entityId: string; reason: string }[] = [];
    for (const po of held) {
      const key = `approval-${po.id}`;
      const existing = approvals.get(key);
      if (existing && existing.status !== 'pending') continue; // a human already decided
      if (!existing) {
        approvals.set(key, {
          key,
          automationId: 'commission_review',
          entityId: po.id,
          reason: `Commission £${po.commissionAmount.toLocaleString('en-GB')} is at or above the declared £${AUTO_APPROVE_THRESHOLD_GBP.toLocaleString('en-GB')} auto-approve threshold.`,
          requestedAt: demoToday(),
          status: 'pending',
        });
      }
      pending.push({ key, entityId: po.id, reason: approvals.get(key)!.reason });
    }
    return {
      evaluated: candidates.length,
      raised: 0,
      escalated: pending.length,
      affected: [...candidates.map((po) => po.id), ...pending.map((p) => p.key)],
      approvals: pending,
      notes: [
        `${candidates.length} accrued commission(s) evaluated against the declared £${AUTO_APPROVE_THRESHOLD_GBP.toLocaleString('en-GB')} threshold.`,
        `${candidates.length - pending.length} within the threshold; ${pending.length} awaiting founder approval.`,
        'No money moves in this automation: the money chain still requires explicit human approval before any payout leaves Mercenta.',
      ],
    };
  },

  founder_brief: () => {
    const attention = getWorkItems('admin', null);
    const overdue = overdueWorkItems('admin');
    const critical = attention.filter((w) => w.priority === 'critical');
    return {
      evaluated: attention.length,
      raised: 0,
      escalated: 0,
      affected: attention.slice(0, 20).map((w) => w.id),
      notes: [
        `${attention.length} open item(s); ${critical.length} critical; ${overdue.length} past deadline.`,
        'The brief is composed by src/lib/founder/briefFacts.ts — deterministic facts first, optional AI narrative on top.',
      ],
    };
  },
};


/* ── Execution ─────────────────────────────────────────────────────────────── */

export interface RunAutomationOptions {
  actor?: string;
  /** Force execution even when an identical run already succeeded. */
  force?: boolean;
  /** Marks this run as a retry of a previous failed run. */
  retryOf?: string;
  attempt?: number;
}

function recordRun(run: AutomationRun): AutomationRun {
  runs.push(run);
  if (runs.length > MAX_RUN_HISTORY) runs.splice(0, runs.length - MAX_RUN_HISTORY);
  lastRunByAutomation.set(run.automationId, run);
  notifyAutomation();
  notifyCanonicalStoreChange();
  return run;
}

/**
 * Execute ONE automation. Idempotent, observable and tenant-safe:
 * - disabled            → `skipped_disabled`, zero side effects
 * - identical succeeded → `duplicate_suppressed`, zero side effects
 * - throws              → `failed`, real error + canonical event, retryable
 * - approvals pending   → `blocked_approval`, the irreversible action is NOT taken
 * - AI unavailable      → `degraded`, deterministic work still completed
 */
export function runAutomation(id: AutomationId, options: RunAutomationOptions = {}): AutomationRun {
  const definition = AUTOMATION_REGISTRY[id];
  const actor = options.actor ?? `automation:${id}`;
  const at = demoToday();

  sequence += 1;

  // §FOUNDATION — the global halt is checked FIRST, BEFORE the input fingerprint
  // is computed: a fingerprint computation is a READ of canonical state (and for
  // some automations it initialises a store), so an emergency stop must not do
  // even that. Nothing is read, nothing runs, nothing is emitted.
  if (haltState.halted) {
    return recordRun({
      automationId: id,
      at,
      sequence,
      actor,
      inputDigest: 'halted',
      retryOf: options.retryOf,
      attempt: options.attempt ?? 1,
      approvals: [],
      id: automationRunId(id, sequence),
      status: 'skipped_halted',
      evaluated: 0,
      raised: 0,
      escalated: 0,
      affected: [],
      notes: [
        `Halted: ${haltState.reason} (by ${haltState.actor}). No implementation ran, no canonical record was read and no side effect was produced.`,
      ],
      simulatedFailure: false,
    });
  }

  const digest = automationInputDigest(id);
  const runKey = `${id}|${at}|${digest}`;
  const base = {
    automationId: id,
    at,
    sequence,
    actor,
    inputDigest: digest,
    retryOf: options.retryOf,
    attempt: options.attempt ?? 1,
    approvals: [] as AutomationRun['approvals'],
  };

  const stateRow = state.get(id);

  if (stateRow && !stateRow.enabled) {
    return recordRun({
      ...base,
      id: automationRunId(id, sequence),
      status: 'skipped_disabled',
      evaluated: 0,
      raised: 0,
      escalated: 0,
      affected: [],
      notes: [`Disabled: ${stateRow.reason} (by ${stateRow.actor}). No side effects were produced.`],
      simulatedFailure: false,
    });
  }

  const previous = runKeys.get(runKey);
  if (previous && previous.status !== 'failed' && !options.force) {
    return recordRun({
      ...base,
      id: automationRunId(id, sequence),
      status: 'duplicate_suppressed',
      evaluated: previous.evaluated,
      raised: 0,
      escalated: previous.escalated,
      affected: previous.affected,
      notes: [
        `Identical canonical input (fingerprint ${digest}) already processed by ${previous.id} — no duplicate work, event or notification was produced.`,
        ...previous.notes.slice(0, 3),
      ],
      simulatedFailure: false,
    });
  }

  const injected = injectedFailures.get(id);
  if (injected) {
    const run: AutomationRun = {
      ...base,
      id: automationRunId(id, sequence),
      status: 'failed',
      evaluated: 0,
      raised: 0,
      escalated: 0,
      affected: [],
      notes: ['Simulated external failure injected for deterministic degradation testing.'],
      error: injected,
      simulatedFailure: true,
    };
    emitEvent({
      type: 'automation_run_failed',
      severity: 'important',
      title: `${definition.name} failed`,
      description: injected,
      metadata: { automationId: id, runId: run.id, simulated: true },
    });
    pushAudit('automation_run_failed', 'automation', id, injected, actor, { runId: run.id, simulated: true });
    return recordRun(run);
  }

  let outcome: AutomationOutcome;
  try {
    outcome = IMPLEMENTATIONS[id](actor);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const run: AutomationRun = {
      ...base,
      id: automationRunId(id, sequence),
      status: 'failed',
      evaluated: 0,
      raised: 0,
      escalated: 0,
      affected: [],
      notes: ['The automation threw — the failure is recorded honestly and can be retried.'],
      error: message,
      simulatedFailure: false,
    };
    emitEvent({
      type: 'automation_run_failed',
      severity: 'important',
      title: `${definition.name} failed`,
      description: message,
      metadata: { automationId: id, runId: run.id },
    });
    pushAudit('automation_run_failed', 'automation', id, message, actor, { runId: run.id });
    return recordRun(run);
  }

  const pendingApprovals = outcome.approvals ?? [];
  const status: AutomationRunStatus =
    pendingApprovals.length > 0 ? 'blocked_approval' : outcome.degradedReason ? 'degraded' : 'succeeded';

  const run: AutomationRun = {
    ...base,
    id: automationRunId(id, sequence),
    status,
    evaluated: outcome.evaluated,
    raised: outcome.raised,
    escalated: outcome.escalated,
    affected: outcome.affected,
    notes: outcome.notes,
    degradedReason: outcome.degradedReason,
    approvals: pendingApprovals,
    simulatedFailure: false,
  };

  runKeys.set(runKey, run);

  if (status === 'blocked_approval') {
    for (const approval of pendingApprovals) {
      emitEvent({
        type: 'automation_approval_required',
        severity: 'important',
        title: `Approval required: ${definition.name}`,
        description: approval.reason,
        metadata: { automationId: id, runId: run.id, entityId: approval.entityId, approvalKey: approval.key },
      });
      pushAudit('automation_approval_required', 'automation_approval', approval.key, approval.reason, actor, {
        automationId: id,
        entityId: approval.entityId,
      });
    }
  }
  pushAudit(
    'automation_run',
    'automation',
    id,
    `${AUTOMATION_RUN_STATUS_LABELS[status]} — ${outcome.notes[0] ?? ''}`,
    actor,
    { runId: run.id, evaluated: outcome.evaluated, raised: outcome.raised, escalated: outcome.escalated }
  );

  return recordRun(run);
}

/** Run every automation in declared order. Returns one run per automation. */
export function runAllAutomations(actor = 'automation:all'): AutomationRun[] {
  return AUTOMATION_ORDER.map((id) => runAutomation(id, { actor }));
}

/** Retry a FAILED run. Refuses anything that did not fail (no fake retries). */
export function retryAutomation(runId: string, actor = 'staff:founder'): AutomationRun | null {
  const failed = runs.find((r) => r.id === runId);
  if (!failed || failed.status !== 'failed') return null;
  injectedFailures.delete(failed.automationId);
  return runAutomation(failed.automationId, {
    actor,
    force: true,
    retryOf: failed.id,
    attempt: failed.attempt + 1,
  });
}

/* ── Global halt (the kill switch) ─────────────────────────────────────────── */

/** The current halt state. Never mutates anything. */
export function automationHalt(): AutomationHaltState {
  return { ...haltState };
}

/** True when the global halt is engaged. */
export function isAutomationHalted(): boolean {
  return haltState.halted;
}

/**
 * Engage or clear the GLOBAL halt. Requires an actor and a NON-EMPTY reason
 * (exactly like a per-automation state change), and is audited either way.
 * Clearing restores normal operation immediately — the halt is not sticky.
 */
export function setAutomationHalt(halted: boolean, actor: string, reason: string): AutomationHaltState {
  if (!reason.trim()) throw new Error('[automation] a reason is required to halt or resume automation');
  haltState = { halted, reason, actor, at: demoToday() };
  pushAudit(halted ? 'automation_halted' : 'automation_resumed', 'automation_halt', 'global', reason, actor, {
    halted,
  });
  notifyAutomation();
  return { ...haltState };
}

/* ── Enable / disable (attributed + audited) ───────────────────────────────── */

export function automationState(id: AutomationId): AutomationState {
  return (
    state.get(id) ?? {
      enabled: true,
      reason: 'Enabled by default — declared automation.',
      actor: 'system',
      at: 'declared',
    }
  );
}

export function setAutomationEnabled(
  id: AutomationId,
  enabled: boolean,
  actor: string,
  reason: string
): AutomationState {
  if (!reason.trim()) throw new Error('[automation] a reason is required to change automation state');
  const row: AutomationState = { enabled, reason, actor, at: demoToday() };
  state.set(id, row);
  pushAudit(enabled ? 'automation_enabled' : 'automation_disabled', 'automation', id, reason, actor);
  notifyAutomation();
  return row;
}

/* ── Failure simulation (deterministic, labelled, audited) ─────────────────── */

export function simulateAutomationFailure(id: AutomationId, reason: string, actor = 'staff:founder'): void {
  injectedFailures.set(id, reason);
  pushAudit('automation_failure_simulated', 'automation', id, reason, actor, { simulated: true });
  notifyAutomation();
}

export function clearSimulatedFailure(id: AutomationId, actor = 'staff:founder'): void {
  if (!injectedFailures.has(id)) return;
  injectedFailures.delete(id);
  pushAudit('automation_failure_cleared', 'automation', id, 'Simulated failure cleared', actor, { simulated: true });
  notifyAutomation();
}

export function simulatedFailures(): { automationId: AutomationId; reason: string }[] {
  return [...injectedFailures.entries()].map(([automationId, reason]) => ({ automationId, reason }));
}

/* ── Approvals ─────────────────────────────────────────────────────────────── */

export function pendingApprovals(): PendingApproval[] {
  return [...approvals.values()].filter((a) => a.status === 'pending');
}

export function allApprovals(): PendingApproval[] {
  return [...approvals.values()];
}

/** A human decision on a consequential automation step. Attributed and audited. */
export function decideAutomationApproval(
  key: string,
  decision: 'approved' | 'rejected',
  actor: string,
  reason: string
): PendingApproval | null {
  const row = approvals.get(key);
  if (!row) return null;
  row.status = decision;
  row.decidedAt = demoToday();
  row.decidedBy = actor;
  row.decisionReason = reason;
  pushAudit(`automation_approval_${decision}`, 'automation_approval', key, reason, actor, {
    automationId: row.automationId,
    entityId: row.entityId,
  });
  notifyAutomation();
  notifyCanonicalStoreChange();
  return row;
}

/* ── Read models ───────────────────────────────────────────────────────────── */

export function automationRuns(id?: AutomationId): AutomationRun[] {
  const rows = id ? runs.filter((r) => r.automationId === id) : runs;
  return [...rows].sort((a, b) => b.sequence - a.sequence);
}

export function lastRun(id: AutomationId): AutomationRun | null {
  return lastRunByAutomation.get(id) ?? null;
}

/** Deterministic next-run date from the last run + the declared cadence. */
export function nextRunAt(id: AutomationId): string {
  const last = lastRun(id);
  if (!last) return demoToday();
  return addDays(last.at, AUTOMATION_REGISTRY[id].cadenceDays);
}



/* ── Health + summary (what the Control Centre renders) ────────────────────── */

export interface AutomationHealth {
  id: AutomationId;
  name: string;
  domain: AutomationDomain;
  enabled: boolean;
  enabledReason: string;
  cadence: string;
  lastRun: AutomationRun | null;
  nextRunAt: string;
  status: AutomationRunStatus | 'never_run';
  failureCount: number;
  retryable: boolean;
  approvalsPending: number;
  requiresAi: boolean;
  degraded: boolean;
  /** True when the automation depends on an optional external provider. */
  optionalDependency: boolean;
}

export function automationHealth(): AutomationHealth[] {
  return AUTOMATION_ORDER.map((id) => {
    const definition = AUTOMATION_REGISTRY[id];
    const stateRow = automationState(id);
    const last = lastRun(id);
    const idRuns = runs.filter((r) => r.automationId === id);
    return {
      id,
      name: definition.name,
      domain: definition.domain,
      enabled: stateRow.enabled,
      enabledReason: stateRow.reason,
      cadence: definition.cadence,
      lastRun: last,
      nextRunAt: nextRunAt(id),
      status: last?.status ?? 'never_run',
      failureCount: idRuns.filter((r) => r.status === 'failed').length,
      retryable: last?.status === 'failed',
      approvalsPending: pendingApprovals().filter((a) => a.automationId === id).length,
      requiresAi: definition.requiresAi,
      degraded: last?.status === 'degraded',
      optionalDependency: definition.externalProviders.length > 0 || definition.requiresAi,
    };
  });
}

export interface AutomationSummary {
  declared: number;
  enabled: number;
  disabled: number;
  neverRun: number;
  succeeded: number;
  failed: number;
  degraded: number;
  awaitingApproval: number;
  totalRuns: number;
  retryableFailures: number;
}

export function automationSummary(): AutomationSummary {
  const health = automationHealth();
  return {
    declared: health.length,
    enabled: health.filter((h) => h.enabled).length,
    disabled: health.filter((h) => !h.enabled).length,
    neverRun: health.filter((h) => h.status === 'never_run').length,
    succeeded: health.filter((h) => h.status === 'succeeded').length,
    failed: health.filter((h) => h.status === 'failed').length,
    degraded: health.filter((h) => h.status === 'degraded').length,
    awaitingApproval: pendingApprovals().length,
    totalRuns: runs.length,
    retryableFailures: health.filter((h) => h.retryable).length,
  };
}



/* ── Scheduler seam + dependency degradation ───────────────────────────────── */

/**
 * The FREE-FIRST automation decision, recorded once so a future session cannot
 * quietly introduce a paid workflow platform. The chosen mechanism is explicit
 * invocation with a declared cadence: no new dependency, no timer as state, $0.
 */
export function describeAutomationScheduler(): {
  chosen: string;
  mechanism: string;
  costUsd: number;
  newDependencies: string[];
  usesTimer: boolean;
  deterministic: boolean;
  evaluatedAlternatives: { option: string; cost: string; verdict: string }[];
  entryPoint: string;
} {
  return {
    chosen: 'Explicit invocation + declared cadence (scheduler seam)',
    mechanism:
      'Automation is invoked explicitly (operator "Run" control today; a cron/edge-function trigger on the declared cadence later). The run ledger, idempotency keys and failure states are canonical, so the trigger can be swapped without touching business logic.',
    costUsd: 0,
    newDependencies: [],
    usesTimer: false,
    deterministic: true,
    evaluatedAlternatives: [
      {
        option: 'setInterval inside the SPA',
        cost: '$0',
        verdict: 'REJECTED — business state would depend on a tab being open, and it is neither testable nor auditable.',
      },
      {
        option: 'n8n (self-hosted or cloud)',
        cost: 'self-host adds a service to run and upgrade; cloud adds a paid tier',
        verdict:
          'REJECTED as a global dependency — it would make an optional external workflow platform the single point of failure for core operations.',
      },
      {
        option: 'Cloudflare Workers cron',
        cost: '$0 on the free tier',
        verdict:
          'DEFERRED — a legitimate free trigger, but it is an infrastructure migration (Cloudflare/Supabase migration is parked) and not required while explicit invocation is sufficient.',
      },
      {
        option: 'GitHub Actions scheduled workflow',
        cost: '$0 on the free tier',
        verdict: 'DEFERRED — a viable free trigger for a future hosted run; it would call these same entry points.',
      },
      {
        option: 'Database/edge-function cron (Supabase pg_cron)',
        cost: '$0 (already-provisioned infrastructure)',
        verdict:
          'PREFERRED FUTURE TRIGGER — reuses infrastructure Mercenta already has; a wiring change only, because the seam is declared here.',
      },
    ],
    entryPoint: 'runAutomation(id) / runAllAutomations(actor)',
  };
}

export interface AutomationDependency {
  providerId: string;
  label: string;
  mode: ProviderResolutionMode;
  /** True ONLY when the provider positively resolves to simulation. */
  simulationSafe: boolean;
  /** Never true for an optional provider — core operations must not depend on it. */
  requiredForCoreOperations: false;
  requiredBy: AutomationId[];
  degradation: string;
}

const OPTIONAL_DEPENDENCIES: {
  providerId: string;
  label: string;
  requiredBy: AutomationId[];
  degradation: string;
}[] = [
  {
    providerId: 'openrouter',
    label: 'AI provider (OpenRouter)',
    requiredBy: ['founder_brief'],
    degradation:
      'No AI: every deterministic automation, dashboard, work item, finance and compliance view continues unchanged; the AI-assisted narrative is refused and the surface states it truthfully.',
  },
  {
    providerId: 'firecrawl',
    label: 'Web research (Firecrawl)',
    requiredBy: [],
    degradation:
      'No web research: prospect research stays on canonical/seed evidence; nothing is invented to fill the gap and the acquisition pipeline keeps working.',
  },
  {
    providerId: 'email',
    label: 'Transactional email (Postmark/SendGrid)',
    requiredBy: [],
    degradation:
      'No email provider: outreach sends are refused with a truthful error (never a fake "sent"), and every queued action stays observable and retryable.',
  },
  {
    providerId: 'instantly',
    label: 'Outreach sequencing (Instantly)',
    requiredBy: [],
    degradation:
      'No sequencing provider: the acquisition pipeline still records stage, owner and next action; sends degrade to a labelled simulation or a refusal.',
  },
  {
    providerId: 'companies_house',
    label: 'Company register (Companies House)',
    requiredBy: [],
    degradation:
      'No register lookup: enrichment is skipped, not faked; the prospect keeps its canonical evidence and is flagged as unenriched.',
  },
];

export function automationDependencies(): AutomationDependency[] {
  return OPTIONAL_DEPENDENCIES.map((dep) => {
    const mode = defaultIntegrationMode(dep.providerId);
    return {
      providerId: dep.providerId,
      label: dep.label,
      mode,
      simulationSafe: isProviderSimulationSafe(mode),
      requiredForCoreOperations: false,
      requiredBy: dep.requiredBy,
      degradation: dep.degradation,
    };
  });
}

/** True when an optional dependency is in a state that could make a run degrade. */
export function hasUnsafeOptionalDependency(): boolean {
  return automationDependencies().some((d) => !d.simulationSafe && d.mode !== 'live');
}

/* ── Deterministic reset (demo/repeatability) ──────────────────────────────── */

export interface AutomationResetResult {
  runsCleared: number;
  keysCleared: number;
  escalationsCleared: number;
  approvalsCleared: number;
  statesCleared: number;
  simulatedFailuresCleared: number;
  /** True when the deterministic reset also cleared an engaged global halt. */
  haltCleared: boolean;
}

export function resetAutomationStore(): AutomationResetResult {
  const result: AutomationResetResult = {
    runsCleared: runs.length,
    keysCleared: runKeys.size,
    escalationsCleared: escalationKeys.size,
    approvalsCleared: approvals.size,
    statesCleared: state.size,
    simulatedFailuresCleared: injectedFailures.size,
    haltCleared: haltState.halted,
  };
  runs.length = 0;
  runKeys.clear();
  escalationKeys.clear();
  approvals.clear();
  state.clear();
  injectedFailures.clear();
  lastRunByAutomation.clear();
  haltState = { ...DEFAULT_HALT };
  sequence = 0;
  notifyAutomation();
  return result;
}
