/**
 * §Phase B — Canonical Brand Intelligence prospect store.
 *
 * Single runtime source of truth for the BI universe plus its lifecycle
 * history (discovery runs, prospect change events, score snapshots).
 * Seeded ONCE per session from the authoritative seed modules. Downstream
 * consumers — Admin Brand Intelligence, Brand "Market Intel", Marketing/ICP
 * identity bridge — MUST read THIS module rather than importing the seed
 * arrays directly, so there is exactly one universe at runtime.
 *
 * Persistence contract (documented): in-memory demo store. Survives view
 * navigation within a session; a full page reload re-boots deterministically
 * from the seeds (same contract as demoStore). Optional Supabase dual-write
 * remains the future live-persistence seam.
 *
 * Provenance decision (2026-09-10): the 12 seeded prospects (10 active) are
 * the authoritative canonical prospect universe — `source: 'mock'` records
 * only that no live provider produced them. History is tracked by
 * IntelligenceRun + ProspectChangeEvent + IntelligenceSnapshot below.
 */
import { SEED_PROSPECTS } from './brandProspectSeed';
import { EXTRA_PROSPECTS } from './brandExtraSeed';
import { createBrandIntelligenceClient } from '@/lib/intelligence/brandIntelligenceClient';
import { buildAcquisitionLead, normalizeBrandKey } from '@/lib/intelligence/prospectPipeline';
import {
  createPersistenceMirror,
  getDomainRepository,
  DOMAIN_TABLES,
  MERCENTA_OPS_TENANT,
  type HydratedDomainState,
  type PersistenceStatus,
  type TenantScope,
} from './domainRepository';
import type {
  BrandProspect,
  IntelligenceRun,
  Lead,
  ProspectChangeEvent,
  IntelligenceSnapshot,
} from '@/types';

const client = createBrandIntelligenceClient();

let prospects: BrandProspect[] = [];
let runs: IntelligenceRun[] = [];
let changes: ProspectChangeEvent[] = [];
let snapshots: IntelligenceSnapshot[] = [];
let initialized = false;

/* ── §Phase D4 — persistence boundary (BI lifecycle state) ─────────────── */
const persistenceMirror = createPersistenceMirror();
const mirror = persistenceMirror.write;

/** The current honest persistence status of BI lifecycle state. */
export function getProspectPersistenceStatus(): PersistenceStatus {
  return persistenceMirror.status();
}

/** Await every in-flight BI persistence write. */
export async function flushProspectPersistence(): Promise<void> {
  await persistenceMirror.flush();
}

/**
 * Boot the canonical universe ONCE per session:
 * score every seed through the real engine, preserve seed disqualifications,
 * and record the seed run + one 'created' event per prospect so history has
 * a complete origin (previous searches never disappear).
 */
function boot(): void {
  if (initialized) return;
  initialized = true;
  const stamp = new Date().toISOString();
  const runId = 'run-seed-baseline';
  prospects = [...SEED_PROSPECTS, ...EXTRA_PROSPECTS].map((p) => client.scoreProspect(p));
  changes = prospects.map((p, i) => ({
    id: `evt-seed-${i}-${normalizeBrandKey(p.brand)}`,
    runId,
    prospectId: p.id,
    brand: p.brand,
    changeType: 'created' as const,
    timestamp: stamp,
    summary: `Canonical prospect "${p.brand}" loaded into the authoritative universe (category ${p.category}${p.disqualified ? ` · ${p.disqualificationReason ?? 'disqualified'}` : ''}).`,
  }));
  runs = [
    {
      runId,
      startedAt: stamp,
      completedAt: stamp,
      status: 'completed',
      trigger: 'seed',
      mode: 'mock',
      scannedCount: prospects.length,
      newCount: prospects.length,
      updatedCount: 0,
      disqualifiedCount: prospects.filter((p) => p.disqualified).length,
      unchangedCount: 0,
      changedProspectIds: prospects.map((p) => p.id),
      candidatesCount: 0,
      errorCount: 0,
      summary: `Seed baseline — ${prospects.length} canonical prospects loaded (${prospects.filter((p) => !p.disqualified).length} active, ${prospects.filter((p) => p.disqualified).length} disqualified).`,
    },
  ];
  notifyCanonicalStoreChange();
}

/** Ensure the canonical universe exists (idempotent). */
export function ensureProspectStore(): void {
  boot();
}

/* ── §Phase C / §CANONICAL SIGNAL — canonical change signal ─────────────────
 * §CANONICAL CHANGE SIGNAL — REPOINTED (2026-09-21). The signal's IMPLEMENTATION
 * now lives in `src/lib/domain/canonicalSignal.ts`, because it is consumed by
 * every projection (logistics list and inspector, dashboards, work layer) and fired by
 * every mutation path — not only by the Brand-Intelligence universe this module
 * happens to own. These re-exports keep every existing import path working while
 * there is exactly ONE counter and ONE notification list in the process.
 * ────────────────────────────────────────────────────────────────────────── */

import {
  getCanonicalStoreVersion,
  notifyCanonicalStoreChange,
  subscribeCanonicalStore,
} from '@/lib/domain/canonicalSignal';

/**
 * Re-exported so every existing import path keeps working. NOTE: these are
 * imported (local bindings) as well as re-exported, because this module's own
 * mutators call `notifyCanonicalStoreChange()` directly — an `export … from`
 * would create no local binding and the call would fail at runtime.
 */
export { getCanonicalStoreVersion, notifyCanonicalStoreChange, subscribeCanonicalStore };

/** All canonical prospects (including disqualified — history is preserved). */
export function getProspects(): BrandProspect[] {
  boot();
  return prospects;
}

export function getProspect(prospectId: string): BrandProspect | undefined {
  boot();
  return prospects.find((p) => p.id === prospectId);
}

/** All recorded discovery runs, oldest first. */
export function getRuns(): IntelligenceRun[] {
  boot();
  return runs;
}

/** All recorded prospect change events, oldest first. */
export function getChanges(): ProspectChangeEvent[] {
  boot();
  return changes;
}

/** Per-prospect auditable change history, oldest first. */
export function getProspectTimeline(prospectId: string): ProspectChangeEvent[] {
  boot();
  return changes.filter((c) => c.prospectId === prospectId);
}

/** All recorded score snapshots, oldest first. */
export function getSnapshots(): IntelligenceSnapshot[] {
  boot();
  return snapshots;
}

/**
 * §Phase C — the ICP acquisition universe, DERIVED from the canonical BI
 * prospects: every active (non-disqualified) prospect that has a derivable ICP
 * origin region, projected into an ICP lead carrying its canonical
 * `prospectId`. This replaced the seeded `INITIAL_LEADS` array as the ACTIVE
 * acquisition source; the fixture itself is retained in bootstrap.ts (it is a
 * validation fixture, not the pipeline's universe).
 */
export function getAcquisitionLeads(): Lead[] {
  return getProspects()
    .filter((p) => !p.disqualified)
    .map((p) => buildAcquisitionLead(p))
    .filter((l): l is Lead => l !== null);
}

/**
 * §Phase 1 — ADD a canonical prospect to the universe.
 *
 * Deliberately ADDITIVE and deliberately NOT called at boot: the seeded universe
 * is unchanged unless a founder explicitly feeds a qualified pre-audit into
 * acquisition. The caller (the pre-audit → acquisition bridge) is responsible
 * for deduplication on `normalizeBrandKey`, so this function never decides
 * whether a prospect is a duplicate — it only records what it is given.
 *
 * Persisted through the SAME domain port and emits the SAME canonical store
 * change notification as every other BI mutation, so there is still exactly one
 * universe at runtime.
 */
export function addProspect(prospect: BrandProspect): BrandProspect {
  boot();
  prospects = [...prospects, prospect];
  mirror(DOMAIN_TABLES.prospects, prospect.id, () =>
    getDomainRepository().persistProspect(prospect, MERCENTA_OPS_TENANT)
  );
  notifyCanonicalStoreChange();
  return prospect;
}

/** Replace a prospect record (used by lifecycle mutations). */
export function updateProspect(prospect: BrandProspect): void {
  boot();
  prospects = prospects.map((p) => (p.id === prospect.id ? prospect : p));
  mirror(DOMAIN_TABLES.prospects, prospect.id, () =>
    getDomainRepository().persistProspect(prospect, MERCENTA_OPS_TENANT)
  );
}

/** Record a completed discovery run + its change events + snapshots. */
export function applyRunResult(
  nextUniverse: BrandProspect[],
  run: IntelligenceRun,
  events: ProspectChangeEvent[],
  snap: IntelligenceSnapshot[]
): void {
  boot();
  prospects = nextUniverse;
  runs = [...runs, run];
  changes = [...changes, ...events];
  snapshots = [...snapshots, ...snap];
  mirror(DOMAIN_TABLES.runs, run.runId, () =>
    getDomainRepository().persistRun(run, MERCENTA_OPS_TENANT)
  );
  for (const e of events) {
    mirror(DOMAIN_TABLES.changes, e.id, () =>
      getDomainRepository().persistChange(e, MERCENTA_OPS_TENANT)
    );
  }
  for (const s of snap) {
    mirror(DOMAIN_TABLES.snapshots, `${s.brandId}-${s.snapshotDate}`, () =>
      getDomainRepository().persistSnapshot(s, MERCENTA_OPS_TENANT)
    );
  notifyCanonicalStoreChange();
  }
}

/** Record a lifecycle event outside a run (disqualify/requalify audit). */
export function recordLifecycleEvent(event: ProspectChangeEvent): void {
  boot();
  changes = [...changes, event];
  mirror(DOMAIN_TABLES.changes, event.id, () =>
    getDomainRepository().persistChange(event, MERCENTA_OPS_TENANT)
  );
  notifyCanonicalStoreChange();
}

/**
 * RELOAD SEMANTICS — overlay durable BI lifecycle state onto the deterministic
 * seed universe. Seeds remain the baseline; a persisted prospect record
 * overrides by canonical id, and persisted runs/changes/snapshots are appended
 * (deduped by id/snapshot key). With nothing durable this is an honest no-op.
 */
export async function hydrateProspectStoreFromPersistence(
  scope: TenantScope
): Promise<HydratedDomainState> {
  boot();
  const h = await getDomainRepository().hydrate(scope);
  if (h.prospects.length) {
    const byId = new Map(prospects.map((p) => [p.id, p] as const));
    for (const p of h.prospects) byId.set(p.id, p);
    prospects = [...byId.values()];
  }
  const runIds = new Set(runs.map((r) => r.runId));
  for (const r of h.runs) {
    if (!runIds.has(r.runId)) {
      runs = [...runs, r];
      runIds.add(r.runId);
    }
  }
  const changeIds = new Set(changes.map((c) => c.id));
  for (const c of h.changes) {
    if (!changeIds.has(c.id)) {
      changes = [...changes, c];
      changeIds.add(c.id);
    }
  }
  const snapKeys = new Set(snapshots.map((s) => `${s.brandId}-${s.snapshotDate}`));
  for (const s of h.snapshots) {
    const k = `${s.brandId}-${s.snapshotDate}`;
    if (!snapKeys.has(k)) {
      snapshots = [...snapshots, s];
      snapKeys.add(k);
    }
  }
  notifyCanonicalStoreChange();
  return h;
}

/**
 * Determinism/test helper — wipes the store so the next access re-boots from
 * seeds. Never called by product code.
 */
export function resetProspectStore(): void {
  prospects = [];
  runs = [];
  changes = [];
  snapshots = [];
  initialized = false;
  persistenceMirror.reset();
  notifyCanonicalStoreChange();
}