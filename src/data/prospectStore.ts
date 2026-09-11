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
}

/** Ensure the canonical universe exists (idempotent). */
export function ensureProspectStore(): void {
  boot();
}

/* ── §Phase C — canonical change signal ─────────────────────────────────────
 * ONE signal for the canonical BI universe AND the downstream acquisition
 * artefacts keyed to it, so every panel that reads them (BI panel, ICP
 * acquisition pipeline, CRM acquisition relationships, the ICP lead list)
 * re-renders from the SAME truth instead of holding duplicated copies.
 * Same in-memory module-level listener pattern the homepage live-version uses.
 * ────────────────────────────────────────────────────────────────────────── */

let canonicalTick = 0;
const canonicalListeners = new Set<() => void>();

export function getCanonicalStoreVersion(): number {
  return canonicalTick;
}

export function subscribeCanonicalStore(listener: () => void): () => void {
  canonicalListeners.add(listener);
  return () => {
    canonicalListeners.delete(listener);
  };
}

/** Notify subscribers that canonical state changed (called by store mutators). */
export function notifyCanonicalStoreChange(): void {
  canonicalTick += 1;
  for (const listener of canonicalListeners) listener();
}

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

/** Replace a prospect record (used by lifecycle mutations). */
export function updateProspect(prospect: BrandProspect): void {
  boot();
  prospects = prospects.map((p) => (p.id === prospect.id ? prospect : p));
  notifyCanonicalStoreChange();
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
  notifyCanonicalStoreChange();
}

/** Record a lifecycle event outside a run (disqualify/requalify audit). */
export function recordLifecycleEvent(event: ProspectChangeEvent): void {
  boot();
  changes = [...changes, event];
  notifyCanonicalStoreChange();
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
}