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
import { normalizeBrandKey } from '@/lib/intelligence/prospectPipeline';
import type {
  BrandProspect,
  IntelligenceRun,
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

/** Replace a prospect record (used by lifecycle mutations). */
export function updateProspect(prospect: BrandProspect): void {
  boot();
  prospects = prospects.map((p) => (p.id === prospect.id ? prospect : p));
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
}

/** Record a lifecycle event outside a run (disqualify/requalify audit). */
export function recordLifecycleEvent(event: ProspectChangeEvent): void {
  boot();
  changes = [...changes, event];
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