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
 *   `prospectStore`, `returnsTracking`). Nothing is invented; a derived item can
 *   be RESOLVED without rewriting the record it points at, because resolving a
 *   task is not the same act as changing the record.
 * - IDs are deterministic (`work-<source>-<entityId>`), never time- or
 *   random-derived, so the same reset produces the same scenario.
 * - Deadlines come from the record's own dates plus DECLARED terms. No random
 *   prices, no random dates.
 * - Resolving the underlying action REMOVES the item from the attention set, so
 *   reminders stop. This is enforced in one place (`getWorkItems`).
 * - Every mutation is attributed and audited (`demoAuditLog`) and emits a
 *   canonical platform event.
 */
import type { WorkActivityEntry, WorkEntityRef, WorkItem, WorkPriority, WorkScope, WorkSource, WorkStatus } from './types';
import {
  demoAuditLog,
  demoBrands,
  demoComplianceDocs,
  demoContracts,
  demoDeductions,
  demoPurchaseOrders,
  demoShipments,
} from '@/data/demoStore';
import { getProspects, ensureProspectStore } from '@/data/prospectStore';
import { getAllReturnTracking } from '@/lib/warehouse/returnsTracking';
import { emitEvent } from '@/lib/events/eventFeed';

/* ── DECLARED deterministic terms (single source of truth) ─────────────────── */

/** Vendor-Central rule: an unacknowledged PO is at risk after 24 hours. */
export const PO_ACKNOWLEDGEMENT_HOURS = 24;
/** Simulated payment terms on a commerce invoice. Declared, not random. */
export const INVOICE_TERM_DAYS = 30;
/** Simulated window to dispute a posted deduction. Declared, not random. */
export const DEDUCTION_DISPUTE_WINDOW_DAYS = 14;
/** Days a warehouse return may sit in an actionable stage. Declared. */
export const RETURN_ACTION_WINDOW_DAYS = 3;
/** Outreach follow-up cadence for a contacted prospect. Declared. */
export const OUTREACH_FOLLOW_UP_DAYS = 7;
/** How many days ahead a document/renewal is surfaced as work. Declared. */
export const EXPIRY_HORIZON_DAYS = 60;

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
  manual: 'Manual task',
};

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

const DAY_MS = 86_400_000;

export function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / DAY_MS);
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return daysBetween(demoToday(), iso);
}

/* ── Store state ───────────────────────────────────────────────────────────── */

/** Derived items the operator has explicitly resolved (deterministic key → record). */
const resolvedDerived = new Map<string, { at: string; actor: string; reason: string }>();
/** Derived items the operator has explicitly progressed / blocked. */
const derivedStatus = new Map<string, WorkStatus>();
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

function make(source: WorkSource, entity: WorkEntityRef, input: DeriveInput): WorkItem {
  const id = workItemId(source, entity.id);
  const status = derivedStatus.get(id) ?? 'open';
  const resolution = resolvedDerived.get(id);
  return {
    id,
    title: input.title,
    detail: input.detail,
    source,
    priority: input.priority,
    status: resolution ? 'done' : status,
    owner: input.owner ?? (input.tenantId ? `brand:${input.tenantId}` : 'staff:mercenta-ops'),
    dueDate: input.dueDate,
    tenantId: input.tenantId,
    entity,
    actionView: input.actionView,
    derived: true,
    activity: [
      ...(derivedActivity.get(id) ?? []),
      ...(resolution
        ? [{ id: activityId(id, 0), at: resolution.at, actor: resolution.actor, action: 'resolved', detail: resolution.reason }]
        : []),
    ],
    createdAt: input.createdAt,
    completedAt: resolution?.at,
  };
}

/**
 * Project every open unit of work out of the canonical stores. Pure: calling it
 * twice with unchanged state returns identical ids, deadlines and priorities.
 */
export function deriveWorkItems(): WorkItem[] {
  const out: WorkItem[] = [];
  const today = demoToday();

  /* 1. Retail-channel PO acknowledgement (24h rule) — always critical, because
        an unacknowledged PO is at risk of forced cancellation. */
  for (const po of demoPurchaseOrders) {
    if (po.status === 'rejected' || po.status === 'delivered') continue;
    if (!po.acknowledgedAt) {
      out.push(
        make('po_acknowledgement', { type: 'purchase_order', id: po.id, label: po.poNumber }, {
          title: `Acknowledge ${po.poNumber}`,
          detail: `${brandLabel(po.brandId)} · £${po.poValue.toLocaleString('en-GB')} · unacknowledged POs are at risk of cancellation after ${PO_ACKNOWLEDGEMENT_HOURS}h`,
          priority: 'critical',
          dueDate: addDays(po.orderDate, 1),
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
        detail: `${brandLabel(d.brandId)} · £${d.amountGbp.toFixed(2)} · ${d.reason}`,
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
 * Resolve a work item. For a DERIVED item this records an explicit resolution
 * against the deterministic key — the canonical record is untouched (resolving a
 * task is not the same act as changing the record). Either way the item leaves
 * the attention set, so its reminders stop.
 */
export function resolveWorkItem(id: string, actor: string, reason = 'Action completed'): WorkItem | null {
  const item = getWorkItem(id);
  if (!item) return null;
  if (item.status === 'done') return item;
  const at = new Date().toISOString();
  if (item.derived) {
    resolvedDerived.set(id, { at, actor, reason });
    appendDerivedActivity(id, { at, actor, action: 'resolved', detail: reason });
  } else {
    const m = manualItems.find((x) => x.id === id);
    if (m) {
      m.status = 'done';
      m.completedAt = at;
      m.activity.push({ id: activityId(id, m.activity.length + 1), at, actor, action: 'resolved', detail: reason });
    }
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
  return getWorkItem(id);
}

export function reopenWorkItem(id: string, actor: string, reason = 'Reopened'): WorkItem | null {
  const item = getWorkItem(id);
  if (!item) return null;
  const at = new Date().toISOString();
  if (item.derived) {
    resolvedDerived.delete(id);
    derivedStatus.set(id, 'open');
    appendDerivedActivity(id, { at, actor, action: 'reopened', detail: reason });
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
  return getWorkItem(id);
}

export function setWorkItemStatus(id: string, status: WorkStatus, actor: string): WorkItem | null {
  const item = getWorkItem(id);
  if (!item) return null;
  if (status === 'done') return resolveWorkItem(id, actor, 'Marked done');
  const at = new Date().toISOString();
  if (item.derived) {
    resolvedDerived.delete(id);
    derivedStatus.set(id, status);
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
  return getWorkItem(id);
}

/* ── Queries ───────────────────────────────────────────────────────────────── */

function allItems(): WorkItem[] {
  return [...deriveWorkItems(), ...manualItems];
}

/**
 * Scope + tenant filter — the ONE place work is filtered, so a brand can never
 * see another tenant's work and admin sees the platform.
 */
export function getWorkItems(
  scope: WorkScope,
  tenantId?: string | null,
  opts?: { includeResolved?: boolean }
): WorkItem[] {
  const rows = allItems();
  const scoped = scope === 'brand' ? rows.filter((r) => r.tenantId === (tenantId ?? null)) : rows;
  const visible = opts?.includeResolved ? scoped : scoped.filter((r) => r.status !== 'done');
  const rank = { critical: 0, high: 1, normal: 2 } as const;
  return visible.sort((a, b) => {
    if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
    const ad = a.dueDate ?? '9999-12-31';
    const bd = b.dueDate ?? '9999-12-31';
    return ad.localeCompare(bd);
  });
}

export function getWorkItem(id: string): WorkItem | null {
  return allItems().find((w) => w.id === id) ?? null;
}

/** Attention count for nav badges / notification centre — resolved work excluded. */
export function workAttentionCount(scope: WorkScope, tenantId?: string | null): number {
  return getWorkItems(scope, tenantId).filter((w) => w.priority === 'critical' || w.priority === 'high').length;
}

/** Overdue items only — used by the proactive reminder automation. */
export function overdueWorkItems(scope: WorkScope, tenantId?: string | null): WorkItem[] {
  const today = demoToday();
  return getWorkItems(scope, tenantId).filter((w) => w.dueDate !== null && w.dueDate < today);
}

export function dueSoonWorkItems(scope: WorkScope, tenantId?: string | null, withinDays = 7): WorkItem[] {
  const today = demoToday();
  return getWorkItems(scope, tenantId).filter((w) => {
    if (!w.dueDate) return false;
    const d = daysBetween(today, w.dueDate);
    return d >= 0 && d <= withinDays;
  });
}

/** Group counts for the kanban board — one source for both views. */
export function workByStatus(scope: WorkScope, tenantId?: string | null): Record<WorkStatus, WorkItem[]> {
  const rows = getWorkItems(scope, tenantId);
  return {
    open: rows.filter((r) => r.status === 'open'),
    in_progress: rows.filter((r) => r.status === 'in_progress'),
    blocked: rows.filter((r) => r.status === 'blocked'),
    done: rows.filter((r) => r.status === 'done'),
  };
}

/* ── Deterministic reset (investor demo) ───────────────────────────────────── */

export interface WorkResetResult {
  derivedResolutionsCleared: number;
  manualItemsCleared: number;
  clockUnpinned: boolean;
}

export function resetWorkStore(): WorkResetResult {
  const result: WorkResetResult = {
    derivedResolutionsCleared: resolvedDerived.size,
    manualItemsCleared: manualItems.length,
    clockUnpinned: pinnedToday !== null,
  };
  resolvedDerived.clear();
  derivedStatus.clear();
  derivedActivity.clear();
  manualItems.length = 0;
  manualSeq = 0;
  pinnedToday = null;
  notify();
  return result;
}



