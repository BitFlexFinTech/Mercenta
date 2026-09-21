/**
 * §Phase 2 — CANONICAL COMMERCIAL READINESS STORE.
 *
 * Single runtime source of truth for product-level commercial readiness. It
 * mirrors the contract every other domain store in this codebase follows
 * (`preAuditStore`, `routingStore`, `acquisitionStore`) — there is no second
 * persistence mechanism, no second database and no second event system:
 *
 *   - the in-memory array is the deterministic working set (ZERO network),
 *   - every mutation is mirrored through the SAME domain persistence port
 *     (`src/data/domainRepository.ts → commercial_readiness_records`),
 *   - audit goes to the canonical registry (`demoAuditLog`),
 *   - events go to the EXISTING canonical feed (`src/lib/events/eventFeed.ts`),
 *   - with no Supabase configured the active adapter is memory and the reported
 *     status is honestly `memory-only`.
 *
 * A REASSESSMENT IS NOT A SECOND RECORD
 * ------------------------------------
 * The record id is `commercial-readiness-<assessmentId>` and the routing
 * decision id is a deterministic function of the gateway inputs, so:
 *
 *   - identical inputs  → identical decision id → the write is SUPPRESSED and
 *     reported (`duplicateSuppressed: true`) — no second row, audit or event,
 *   - changed inputs    → a new decision id → the SAME record row is revised
 *     (`revision: true`) and the previous route is retained on the event.
 *
 * That is what makes a repeated sweep, a double-click, a retry or a replayed
 * brand submission safe.
 *
 * VISIBILITY IS THE EXISTING RULE
 * -------------------------------
 * `ownerMatchesReadinessScope` IS `ownerMatchesRoutingScope` — the one three-way
 * ownership rule the pre-audit and routing stores already established is reused
 * rather than re-declared, so the two can never drift apart. A brand can never
 * read another brand's commercial data; ops sees everything.
 */
import type { CommercialReadinessRecord, CommercialTermValue, RoutingOwner } from '@/types';
import {
  COMMERCIAL_READINESS_EVENT_TYPES,
  COMMERCIAL_TERM_FIELDS,
} from '@/config/commercialReadiness';
import { emitEvent } from '@/lib/events/eventFeed';
import { demoToday } from '@/lib/work/workStore';
import { demoAuditLog } from './demoStore';
import {
  createPersistenceMirror,
  getDomainRepository,
  MERCENTA_OPS_TENANT,
  type PersistenceStatus,
  type TenantScope,
} from './domainRepository';
import { ownerMatchesRoutingScope, type RoutingScope } from './routingStore';
import { buildCommercialReadinessDemoInputs } from './commercialReadinessSeed';
import { runCommercialAssessment } from '@/lib/commercial/commercialAssessment';
import { notifyCanonicalStoreChange } from '@/lib/domain/canonicalSignal';

/** The scope a reader is asking from — the SAME three-way ownership rule. */
export type CommercialReadinessScope = RoutingScope;

/** Reused verbatim: ONE visibility rule, declared in the routing store. */
export const ownerMatchesReadinessScope = ownerMatchesRoutingScope;

let records: CommercialReadinessRecord[] = [];
let booted = false;
let assessmentCount = 0;
let revisionCount = 0;
let duplicatesSuppressed = 0;
let version = 0;
const listeners = new Set<() => void>();

const persistenceMirror = createPersistenceMirror();
const mirror = persistenceMirror.write;

export function getCommercialReadinessPersistenceStatus(): PersistenceStatus {
  return persistenceMirror.status();
}

export async function flushCommercialReadinessPersistence(): Promise<void> {
  await persistenceMirror.flush();
}

export function subscribeCommercialReadiness(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function commercialReadinessVersion(): number {
  return version;
}

function notify(): void {
  version += 1;
  for (const l of listeners) l();
}

/** The owning tenant id for the persistence port (public → the ops tenant). */
export function tenantIdForReadiness(owner: RoutingOwner): string {
  return owner.kind === 'public_session' ? MERCENTA_OPS_TENANT : owner.tenantId;
}

/* ── Audit (the canonical registry — never a second one) ──────────────────── */

function audit(action: string, recordId: string, reason: string, actor: string, brandId?: string): void {
  demoAuditLog.push({
    id: `audit-${action}-${recordId}-${demoAuditLog.length}`,
    createdAt: demoToday(),
    actorId: actor,
    action,
    entityType: 'commercial_readiness',
    entityId: recordId,
    brandId: brandId ?? recordId,
    reason,
  });
  notifyCanonicalStoreChange();
}

/* ── Demo boot (the declared deterministic cases) ─────────────────────────── */

/* ── The write ────────────────────────────────────────────────────────────── */

export interface ReadinessWriteResult {
  record: CommercialReadinessRecord;
  /** True when this is the FIRST record for the assessment. */
  created: boolean;
  /** True when an existing record was revised (a genuine reassessment). */
  revision: boolean;
  /** True when nothing was written because the inputs were identical. */
  duplicateSuppressed: boolean;
  /** The route the previous revision carried, when this is a revision. */
  previousRoute: CommercialReadinessRecord['route'] | null;
  eventsEmitted: number;
  persistence: PersistenceStatus;
}

/**
 * Record ONE commercial readiness assessment. A repeat of identical inputs is
 * SUPPRESSED (and reported) rather than written a second time.
 */
export function upsertCommercialReadinessRecord(
  record: CommercialReadinessRecord,
  actor: string = 'system:commercial-readiness'
): ReadinessWriteResult {
  ensureCommercialReadinessDemo();
  const existing = records.find((r) => r.id === record.id);

  if (existing && existing.routingDecisionId === record.routingDecisionId) {
    duplicatesSuppressed += 1;
    return {
      record: existing,
      created: false,
      revision: false,
      duplicateSuppressed: true,
      previousRoute: existing.route,
      eventsEmitted: 0,
      persistence: getCommercialReadinessPersistenceStatus(),
    };
  }

  const next: CommercialReadinessRecord = existing
    ? { ...record, createdAt: existing.createdAt, updatedAt: record.updatedAt }
    : record;

  if (existing) {
    records = records.map((r) => (r.id === next.id ? next : r));
    revisionCount += 1;
  } else {
    records = [...records, next];
    assessmentCount += 1;
  }

  mirror('commercial_readiness_records', next.id, () =>
    getDomainRepository().persistCommercialReadinessRecord(next, tenantIdForReadiness(next.owner))
  );

  const eventType = existing
    ? COMMERCIAL_READINESS_EVENT_TYPES[1] /* commercial_readiness_reassessed */
    : COMMERCIAL_READINESS_EVENT_TYPES[0] /* commercial_readiness_assessed */;

  const unmet = next.conditions.filter((c) => !c.met).map((c) => c.id);

  audit(
    eventType,
    next.id,
    existing
      ? `Reassessed ${next.productLabel ?? next.id}: route ${existing.route} → ${next.route} (unmet: ${
          unmet.join(', ') || 'none'
        }).`
      : `Assessed ${next.productLabel ?? next.id}: route ${next.route}; ${next.missingInputs.length} missing input(s), ${next.openQuestions.length} open question(s).`,
    actor,
    next.productRef ?? undefined
  );

  emitEvent({
    type: eventType,
    severity: 'important',
    title:
      next.route === 'ready'
        ? `Commercially ready: ${next.productLabel ?? next.id}`
        : `Commercial ${next.route.replace('_', ' ')}: ${next.productLabel ?? next.id}`,
    description:
      next.route === 'ready'
        ? `Every declared commercial condition is satisfied. Next step: ${next.nextStep}`
        : `Route ${next.route}. ${next.missingInputs.length} missing input(s). Next step: ${next.nextStep}`,
    entityId: next.productRef ?? undefined,
    tenantId: next.owner.kind === 'brand' ? next.owner.tenantId : null,
    idempotencyKey: next.routingDecisionId,
    metadata: {
      recordId: next.id,
      assessmentId: next.assessmentId,
      productRef: next.productRef,
      route: next.route,
      previousRoute: existing?.route ?? null,
      missingInputs: next.missingInputs,
      simulated: true,
    },
  });

  notify();
  return {
    record: next,
    created: existing === undefined,
    revision: existing !== undefined,
    duplicateSuppressed: false,
    previousRoute: existing?.route ?? null,
    eventsEmitted: 1,
    persistence: getCommercialReadinessPersistenceStatus(),
  };
}

/* ── Demo boot (the declared deterministic cases) ─────────────────────────── */

/**
 * Seed the four declared demo cases through the REAL Phase 1 store + the REAL
 * commercial gate. Runs at most once per session; the guard matters because
 * `startAssessment` allocates the next per-brand run number. Re-entrant calls
 * from `upsertCommercialReadinessRecord` return immediately.
 */
export function ensureCommercialReadinessDemo(): void {
  if (booted) return;
  booted = true;
  for (const input of buildCommercialReadinessDemoInputs()) {
    // The SAME two deterministic steps the recorder performs, so a seeded case
    // carries the identical auditable routing decision a live assessment would.
    const { evaluation } = runCommercialAssessment(input);
    upsertCommercialReadinessRecord(evaluation.record, input.actor);
  }
}

/* ── Reads (scoped through the ONE visibility rule) ───────────────────────── */

export function readinessRecordsForScope(scope: CommercialReadinessScope): CommercialReadinessRecord[] {
  ensureCommercialReadinessDemo();
  return records.filter((r) => ownerMatchesReadinessScope(r.owner, scope));
}

/** ALL records, including every tenant's. Ops/validator use only — never a brand. */
export function allCommercialReadinessRecords(): CommercialReadinessRecord[] {
  ensureCommercialReadinessDemo();
  return [...records];
}

export function getCommercialReadinessRecord(id: string): CommercialReadinessRecord | undefined {
  ensureCommercialReadinessDemo();
  return records.find((r) => r.id === id);
}

/** The latest readiness for one canonical product ref. */
export function readinessForProduct(productRef: string): CommercialReadinessRecord | undefined {
  ensureCommercialReadinessDemo();
  const matches = records.filter((r) => r.productRef === productRef);
  return matches.length ? matches[matches.length - 1] : undefined;
}

export function commercialReadinessCounts(): {
  total: number;
  byRoute: Record<CommercialReadinessRecord['route'], number>;
  duplicatesSuppressed: number;
  revisions: number;
} {
  ensureCommercialReadinessDemo();
  const byRoute = { ready: 0, remediation: 0, blocked: 0, human_review: 0 };
  for (const r of records) byRoute[r.route] += 1;
  return {
    total: records.length,
    byRoute,
    duplicatesSuppressed,
    revisions: revisionCount,
  };
}

/** Assessments performed this session — telemetry, not business state. */
export function commercialReadinessAssessmentCount(): number {
  return assessmentCount;
}

/* ── Brand action: supply the missing commercial information ──────────────── */

/**
 * Merge brand-supplied term values into ONE record and report what changed.
 *
 * Rules:
 *   - ONLY fields declared in `COMMERCIAL_TERM_FIELDS` are accepted (fail closed),
 *   - the label/unit are taken from the SSOT, never from the caller,
 *   - the basis is taken from the caller (a brand must state whether a figure is
 *     actual, estimated or observed) and `assumed`/`unknown` are REFUSED, because
 *     supplying information is the point of the action,
 *   - the record is NOT re-gated here: the caller reassesses through the ONE gate
 *     (`src/lib/commercial/commercialReadinessRecorder.ts`), so the store never
 *     becomes a second evaluator.
 */
export interface TermSubmissionResult {
  ok: boolean;
  record: CommercialReadinessRecord | null;
  accepted: string[];
  refused: { field: string; reason: string }[];
  /** Values IDENTICAL to what is already recorded — a duplicate, not progress. */
  ignored: { field: string; reason: string }[];
  reason: string;
}

/** A commercial term value a caller may SUPPLY (source/note are optional). */
export type CommercialTermSubmission = Pick<CommercialTermValue, 'field' | 'value' | 'basis'> &
  Partial<Pick<CommercialTermValue, 'source' | 'note'>>;

export function submitCommercialTerms(
  recordId: string,
  values: readonly CommercialTermSubmission[],
  actor: string
): TermSubmissionResult {
  ensureCommercialReadinessDemo();
  const existing = records.find((r) => r.id === recordId);
  if (!existing) {
    return { ok: false, record: null, accepted: [], refused: [], ignored: [], reason: `No readiness record ${recordId}.` };
  }

  const accepted: string[] = [];
  const refused: { field: string; reason: string }[] = [];
  const ignored: { field: string; reason: string }[] = [];
  const merged: CommercialTermValue[] = [...existing.terms];

  for (const v of values) {
    const def = COMMERCIAL_TERM_FIELDS.find((f) => f.id === v.field);
    if (!def) {
      refused.push({ field: String(v.field), reason: 'Not a declared commercial term.' });
      continue;
    }
    if (v.basis === 'assumed' || v.basis === 'unknown') {
      refused.push({
        field: def.id,
        reason: `A supplied value must state a usable basis; "${v.basis}" is not accepted.`,
      });
      continue;
    }
    if (v.value === null || v.value === '') {
      refused.push({ field: def.id, reason: 'No value supplied.' });
      continue;
    }
    const current = existing.terms.find((t) => t.field === def.id);
    if (current && String(current.value) === String(v.value) && current.basis === v.basis) {
      // A duplicate submission is NOT progress: nothing is written, nothing is
      // emitted and no reassessment is run.
      ignored.push({ field: def.id, reason: 'Already recorded with the same value and basis.' });
      continue;
    }
    const next: CommercialTermValue = {
      field: def.id,
      label: def.label,
      value: v.value,
      unit: def.unit,
      basis: v.basis,
      source: v.source ?? `brand submission (${actor})`,
      observedAt: demoToday(),
      confidence: v.basis === 'actual' ? 'high' : v.basis === 'observed' ? 'medium' : 'low',
      note: v.note ?? null,
    };
    const idx = merged.findIndex((t) => t.field === def.id);
    if (idx >= 0) merged[idx] = next;
    else merged.push(next);
    accepted.push(def.id);
  }

  if (accepted.length === 0) {
    notify();
    return {
      ok: false,
      record: existing,
      accepted,
      refused,
      ignored,
      reason:
        refused.length > 0
          ? `Nothing was accepted: ${refused.map((r) => `${r.field} (${r.reason})`).join('; ')}`
          : `Nothing changed: ${ignored.map((r) => r.field).join(', ')} ${
              ignored.length === 1 ? 'is' : 'are'
            } already recorded with the same value and basis.`,
    };
  }

  const updated: CommercialReadinessRecord = { ...existing, terms: merged };
  records = records.map((r) => (r.id === updated.id ? updated : r));
  mirror('commercial_readiness_records', updated.id, () =>
    getDomainRepository().persistCommercialReadinessRecord(updated, tenantIdForReadiness(updated.owner))
  );

  audit(
    COMMERCIAL_READINESS_EVENT_TYPES[2] /* commercial_readiness_terms_submitted */,
    updated.id,
    `Commercial information supplied for ${updated.productLabel ?? updated.id}: ${accepted.join(', ')}${
      refused.length ? `; refused: ${refused.map((r) => r.field).join(', ')}` : ''
    }.`,
    actor,
    updated.productRef ?? undefined
  );

  emitEvent({
    type: COMMERCIAL_READINESS_EVENT_TYPES[2],
    severity: 'informational',
    title: `Commercial information supplied: ${updated.productLabel ?? updated.id}`,
    description: `${actor} supplied ${accepted.join(', ')}. The record is reassessed by the commercial gate.`,
    entityId: updated.productRef ?? undefined,
    tenantId: updated.owner.kind === 'brand' ? updated.owner.tenantId : null,
    metadata: { recordId: updated.id, accepted, refused, simulated: true },
  });

  notify();
  return {
    ok: true,
    record: updated,
    accepted,
    refused,
    ignored,
    reason: `Recorded ${accepted.length} commercial term(s); ${refused.length} refused, ${ignored.length} unchanged.`,
  };
}

/* ── Reload semantics ─────────────────────────────────────────────────────── */

/** Overlay durable records onto the in-memory set, deduped by canonical id. */
export async function hydrateCommercialReadinessFromPersistence(
  scope: TenantScope
): Promise<CommercialReadinessRecord[]> {
  const h = await getDomainRepository().hydrate(scope);
  const byId = new Map(records.map((r) => [r.id, r] as const));
  for (const r of h.commercialReadinessRecords) byId.set(r.id, r);
  records = [...byId.values()];
  booted = true;
  notify();
  return h.commercialReadinessRecords;
}

/** Determinism/test helper — wipes state so the next run starts clean. */
export function resetCommercialReadinessStore(): void {
  records = [];
  booted = false;
  assessmentCount = 0;
  revisionCount = 0;
  duplicatesSuppressed = 0;
  version = 0;
  persistenceMirror.reset();
  notify();
}