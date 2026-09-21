import type {
  BrandCrmMeta,
  CrmLifecycleStage,
  CrmNote,
  CrmTask,
} from '@/types';
import {
  demoAuditLog,
  demoComplianceDocs,
  demoContracts,
  demoMessages,
  demoPurchaseOrders,
  demoDeductions,
  demoBrands,
} from '@/data/demoStore';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';

/**
 * §Stage-25 — Brand CRM depth store.
 * Tasks, internal notes and per-brand relationship metadata (tags, lifecycle
 * stage, account owner) plus THE unified chronological timeline builder that
 * merges messages, calls, notes, tasks AND derived system events (POs,
 * contracts, compliance docs, deductions) into one feed per brand.
 * Every mutating action appends to the platform-wide admin audit log.
 */

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function pushAudit(action: string, brandId: string, reason: string, actorStaffId: string) {
  demoAuditLog.push({
    id: uid('audit'),
    createdAt: new Date().toISOString(),
    actorId: actorStaffId,
    action,
    entityType: 'brand_crm',
    entityId: brandId,
    brandId,
    reason,
  });
  notifyCanonicalStoreChange();
}

/* ── Relationship metadata ─────────────────────────────────────────────────── */

export const crmBrandMeta: BrandCrmMeta[] = demoBrands.map((b) => ({
  brandId: b.id,
  tags: [],
  lifecycleStage: 'active' as CrmLifecycleStage,
  accountOwnerStaffId: null,
}));

export function getCrmMeta(brandId: string): BrandCrmMeta {
  let m = crmBrandMeta.find((x) => x.brandId === brandId);
  if (!m) {
    m = { brandId, tags: [], lifecycleStage: 'active', accountOwnerStaffId: null };
    crmBrandMeta.push(m);
  }
  return m;
}

export function setBrandTags(brandId: string, tags: string[], actorStaffId: string): BrandCrmMeta {
  const m = getCrmMeta(brandId);
  m.tags = [...new Set(tags.map((t) => t.trim()).filter(Boolean))];
  pushAudit('crm_tags_updated', brandId, `Tags set: ${m.tags.join(', ') || '(none)'}`, actorStaffId);
  return m;
}

export function setBrandLifecycle(
  brandId: string,
  stage: CrmLifecycleStage,
  actorStaffId: string
): BrandCrmMeta {
  const m = getCrmMeta(brandId);
  const prev = m.lifecycleStage;
  m.lifecycleStage = stage;
  pushAudit('crm_lifecycle_changed', brandId, `${prev} → ${stage}`, actorStaffId);
  return m;
}

export function setBrandAccountOwner(
  brandId: string,
  staffId: string | null,
  actorStaffId: string
): BrandCrmMeta {
  const m = getCrmMeta(brandId);
  m.accountOwnerStaffId = staffId;
  pushAudit('crm_owner_assigned', brandId, `Account owner: ${staffId ?? '(unassigned)'}`, actorStaffId);
  return m;
}

/* ── Follow-up tasks ───────────────────────────────────────────────────────── */

export const crmTasks: CrmTask[] = [];

export function addCrmTask(
  input: Omit<CrmTask, 'id' | 'createdAt' | 'status'>,
  actorStaffId: string
): CrmTask {
  if (!input.title.trim()) throw new Error('[crm] task title required');
  if (!input.dueDate) throw new Error('[crm] task due date required');
  const t: CrmTask = {
    ...input,
    id: uid('task'),
    status: 'open',
    createdAt: new Date().toISOString(),
  };
  crmTasks.unshift(t);
  pushAudit('crm_task_created', input.brandId, `${input.title} (due ${input.dueDate})`, actorStaffId);
  return t;
}

export function setCrmTaskStatus(
  taskId: string,
  status: CrmTask['status'],
  actorStaffId: string
): CrmTask | null {
  const t = crmTasks.find((x) => x.id === taskId);
  if (!t) return null;
  t.status = status;
  pushAudit(`crm_task_${status}`, t.brandId, t.title, actorStaffId);
  notifyCanonicalStoreChange();
  return t;
}

/* ── Internal notes ────────────────────────────────────────────────────────── */

export const crmNotes: CrmNote[] = [];

export function addCrmNote(
  brandId: string,
  body: string,
  authorStaffId: string
): CrmNote {
  if (!body.trim()) throw new Error('[crm] note body required');
  const n: CrmNote = {
    id: uid('note'),
    brandId,
    body: body.trim(),
    authorStaffId,
    createdAt: new Date().toISOString(),
  };
  crmNotes.unshift(n);
  pushAudit('crm_note_added', brandId, body.slice(0, 80), authorStaffId);
  return n;
}

/* ── Unified chronological timeline ─────────────────────────────────────────── */

export type TimelineKind =
  | 'message'
  | 'call'
  | 'note'
  | 'task'
  | 'system_po'
  | 'system_contract'
  | 'system_compliance'
  | 'system_deduction';

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  at: string; // ISO timestamp
  label: string;
  detail: string;
  ref?: string; // PO number / doc id / etc.
}

/**
 * Build ONE chronological feed for a brand: logged messages + calls (from
 * the shared messaging store), internal notes, created/updated tasks, and
 * system events derived from real entity state (POs, contracts, compliance
 * docs, deductions). Newest first.
 */
export function buildBrandTimeline(brandId: string): TimelineEntry[] {
  const out: TimelineEntry[] = [];

  for (const m of demoMessages.filter((x) => x.brandId === brandId)) {
    out.push({
      id: m.id,
      kind: m.channel === 'call' ? 'call' : 'message',
      at: m.createdAt,
      label: m.channel === 'call' ? 'Call logged' : `Message (${m.channel})`,
      detail: `${m.subject}: ${m.body}`.slice(0, 240),
      ref: m.poRef,
    });
  }

  for (const n of crmNotes.filter((x) => x.brandId === brandId)) {
    out.push({
      id: n.id,
      kind: 'note',
      at: n.createdAt,
      label: 'Internal note',
      detail: n.body.slice(0, 240),
    });
  }

  for (const t of crmTasks.filter((x) => x.brandId === brandId)) {
    out.push({
      id: t.id,
      kind: 'task',
      at: t.createdAt,
      label: `Task ${t.status === 'open' ? 'opened' : 'completed'}`,
      detail: `${t.title} — due ${t.dueDate}`,
    });
  }

  for (const po of demoPurchaseOrders.filter((p) => p.brandId === brandId)) {
    out.push({
      id: `sys-po-${po.id}`,
      kind: 'system_po',
      at: po.orderDate,
      label: `PO ${po.poNumber} · ${po.status.replace(/_/g, ' ')}`,
      detail: `Value £${po.poValue.toLocaleString()} — ${po.lineItems.length} line items`,
      ref: po.poNumber,
    });
  }

  for (const c of demoContracts.filter((c) => c.brandId === brandId)) {
    out.push({
      id: `sys-con-${c.id}`,
      kind: 'system_contract',
      at: c.renewalDate,
      label: `Contract v${c.version} renews`,
      detail: `Type ${c.type.replace(/_/g, ' ')} — status ${c.status}`,
    });
  }

  for (const d of demoComplianceDocs.filter((d) => d.brandId === brandId)) {
    out.push({
      id: `sys-comp-${d.id}`,
      kind: 'system_compliance',
      at: d.expiryDate ?? new Date().toISOString(),
      label: `Compliance doc ${d.type.replace(/_/g, ' ')}`,
      detail: `Status ${d.status.replace(/_/g, ' ')}`,
    });
  }

  for (const ded of demoDeductions.filter((d) => d.brandId === brandId)) {
    out.push({
      id: `sys-ded-${ded.id}`,
      kind: 'system_deduction',
      at: ded.date,
      label: `Deduction posted (£${ded.amountGbp.toFixed(2)})`,
      detail: `${ded.type.replace(/_/g, ' ')} — ${ded.reason}`,
      ref: ded.purchaseOrderId,
    });
  }

  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}
