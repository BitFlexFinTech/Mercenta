/**
 * §Phase B — Brand Intelligence lifecycle engine.
 *
 * Orchestrates discovery runs over the canonical prospect store:
 *   · deterministic re-scoring through the existing BrandIntelligenceClient
 *   · candidate intake (the future real data source seam) with canonical dedupe
 *   · change classification (created / updated / disqualified / unchanged)
 *   · sticky manual disqualification (a re-scan never silently re-activates)
 *   · run history + per-prospect change events + weekly score snapshots
 *
 * Simulation contract: with no candidate input and no live providers, a run
 * is a deterministic re-check ("scanned 12 · unchanged 12"). "New discoveries"
 * are recorded ONLY when the universe actually contains a brand that was not
 * previously tracked — discoveries are never fabricated.
 */
import { createBrandIntelligenceClient } from './brandIntelligenceClient';
import { normalizeBrandKey } from './prospectPipeline';
import { checkDisq } from './scoringEngine';
import {
  describeMarketAccessTag,
  normaliseMarketAccessTag,
  type MarketAccessTag,
} from './acquisitionStrategy';
import * as store from '@/data/prospectStore';
import type {
  BrandProspect,
  DistributorStatus,
  IntelligencePipelineStatus,
  IntelligenceRun,
  IntelligenceRunTrigger,
  IntelligenceSnapshot,
  OutreachStatus,
  ProspectChangeEvent,
} from '@/types';

/** How many days after a run the next automated re-check is due. */
export const NEXT_CHECK_DAYS = 7;

export interface RunDiscoveryOptions {
  trigger?: IntelligenceRunTrigger;
  /** Refreshed observations / newly surfaced brands from a real data source. */
  candidates?: readonly Partial<BrandProspect>[];
  maxBrands?: number;
}

export interface RunDiscoveryResult {
  run: IntelligenceRun;
  events: ProspectChangeEvent[];
}

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

function distributorStatusOf(p: BrandProspect): DistributorStatus {
  if (p.distributors.some((d) => d.exclusive)) return 'EXCLUSIVE_DISTRIBUTOR';
  if (p.distributors.length > 0) return 'DISTRIBUTOR_IDENTIFIED';
  return 'NONE_FOUND';
}

function toSnapshot(p: BrandProspect, run: IntelligenceRun): IntelligenceSnapshot {
  return {
    snapshotDate: run.completedAt.slice(0, 10),
    brandId: p.id,
    brand: p.brand,
    category: p.category,
    score: p.score,
    totalAsins: p.asins.length,
    estimatedMonthlyRevenue: p.asins.reduce((s, a) => s + (a.estimatedRevenue ?? 0), 0),
    distributorStatus: distributorStatusOf(p),
    outreachStatus: p.outreachStatus,
  };
}

/** Drop undefined/null keys so a sparse candidate never wipes existing data. */
function stripUndefined<T extends object>(o: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out as Partial<T>;
}

/**
 * Apply the canonical business rules after re-scoring:
 *   - engine hard disqualification (checkDisq) always applies;
 *   - a manual/operator disqualification is STICKY — re-scoring may not
 *     silently re-activate a prospect that was disqualified by a human;
 *   - requalification is an explicit operator action (requalifyProspect).
 */
function mergeScores(prev: BrandProspect | undefined, scored: BrandProspect): BrandProspect {
  const disq = checkDisq(scored.asins, scored.restrictions);
  const effectiveDisq = disq.dq || (prev?.disqualified ?? false);
  const reason =
    !disq.dq && prev?.disqualified
      ? (prev.disqualificationReason ?? 'Previously disqualified by operator')
      : disq.reason;
  return {
    ...scored,
    disqualified: effectiveDisq,
    disqualificationReason: effectiveDisq ? reason : undefined,
    outreachStatus:
      !disq.dq && prev?.disqualified ? prev.outreachStatus : scored.outreachStatus,
  };
}

/**
 * Run the Brand Intelligence discovery engine over the canonical universe and
 * record the run + all change events + score snapshots. Deterministic.
 */
export async function runBrandIntelligence(
  opts: RunDiscoveryOptions = {}
): Promise<RunDiscoveryResult> {
  const client = createBrandIntelligenceClient();
  const existing = store.getProspects();
  const trigger = opts.trigger ?? 'manual';

  // ── 1. Baseline (previous) state by id and by normalized brand key ──
  const byId = new Map<string, BrandProspect>();
  const byKey = new Map<string, BrandProspect>();
  for (const p of existing) {
    byId.set(p.id, p);
    byKey.set(normalizeBrandKey(p.brand), p);
  }

  // ── 2. Candidate intake — merged/deduped by canonical brand key ──
  const candidateByKey = new Map<string, Partial<BrandProspect>>();
  for (const c of opts.candidates ?? []) {
    const key = normalizeBrandKey(c.brand ?? '');
    if (!key) continue;
    const prior = candidateByKey.get(key);
    candidateByKey.set(key, prior ? ({ ...prior, ...c } as Partial<BrandProspect>) : c);
  }

  const nextUniverse: BrandProspect[] = [...existing];
  const matchedCandidateIds = new Set<string>();
  const reportedCandidates = new Set<string>();
  const now = new Date().toISOString();
  const runId = `run-${Date.now()}`;
  const nextCheck = isoDaysFromNow(NEXT_CHECK_DAYS);

  for (const [key, cand] of candidateByKey) {
    const matched = byKey.get(key);
    if (matched) {
      // Re-discovery of an already-canonical brand → refresh the SAME record.
      matchedCandidateIds.add(matched.id);
      reportedCandidates.add(matched.brand);
      const mergedSource = { ...matched, ...stripUndefined(cand), id: matched.id, brand: matched.brand };
      const rescored = mergeScores(matched, client.scoreProspect(mergedSource));
      byKey.set(key, rescored);
      const idx = nextUniverse.findIndex((p) => p.id === matched.id);
      if (idx >= 0) nextUniverse[idx] = rescored;
    } else {
      // Genuinely new brand surfaced by the data source.
      const brand = cand.brand ?? '';
      const scored = client.scoreProspect({
        ...cand,
        id: cand.id ?? `p-${key}`,
        brand,
      });
      byKey.set(key, scored);
      nextUniverse.push(scored);
      reportedCandidates.add(brand);
    }
  }

  // ── 3. Re-check EVERY prospect (not just candidates) and classify ──
  const finalUniverse: BrandProspect[] = [];
  const events: ProspectChangeEvent[] = [];
  let newCount = 0;
  let updatedCount = 0;
  let disqCount = 0;
  let reqlCount = 0;
  let unchangedCount = 0;
  const changedProspectIds: string[] = [];

  for (const src of nextUniverse) {
    const prev = byId.get(src.id);
    const scored = mergeScores(prev, client.scoreProspect(src));
    const stamped = { ...scored, lastChecked: now, nextCheck };
    finalUniverse.push(stamped);

    if (!prev) {
      newCount += 1;
      changedProspectIds.push(stamped.id);
      events.push({
        id: `evt-${Date.now()}-${events.length}`,
        runId,
        prospectId: stamped.id,
        brand: stamped.brand,
        changeType: 'created',
        timestamp: now,
        field: 'discovery',
        summary: `New discovery — "${stamped.brand}" surfaced (category ${stamped.category}, score ${stamped.score.total}/100).`,
      });
      continue;
    }

    if (prev.disqualified !== stamped.disqualified) {
      if (stamped.disqualified) {
        disqCount += 1;
        events.push({
          id: `evt-${Date.now()}-${events.length}`,
          runId,
          prospectId: stamped.id,
          brand: stamped.brand,
          changeType: 'disqualified',
          timestamp: now,
          field: 'disqualified',
          before: 'active',
          after: 'disqualified',
          summary: `Disqualified during run: ${stamped.disqualificationReason ?? 'hard restriction'}.`,
        });
      } else {
        reqlCount += 1;
        events.push({
          id: `evt-${Date.now()}-${events.length}`,
          runId,
          prospectId: stamped.id,
          brand: stamped.brand,
          changeType: 'requalified',
          timestamp: now,
          field: 'disqualified',
          before: 'disqualified',
          after: 'active',
          summary: 'Re-qualified by the discovery run (no active disqualifier).',
        });
      }
      changedProspectIds.push(stamped.id);
      continue;
    }

    const dataChanged =
      stamped.score.total !== prev.score.total ||
      stamped.evidence.length !== prev.evidence.length ||
      stamped.asins.length !== prev.asins.length ||
      stamped.distributors.length !== prev.distributors.length;

    if (dataChanged || matchedCandidateIds.has(stamped.id)) {
      updatedCount += 1;
      changedProspectIds.push(stamped.id);
      const candidateRefresh = matchedCandidateIds.has(stamped.id);
      const scoreDelta =
        stamped.score.total !== prev.score.total
          ? ` score ${prev.score.total}→${stamped.score.total}`
          : '';
      events.push({
        id: `evt-${Date.now()}-${events.length}`,
        runId,
        prospectId: stamped.id,
        brand: stamped.brand,
        changeType: 'updated',
        timestamp: now,
        field: candidateRefresh ? 'discovery' : 'score',
        before: candidateRefresh ? undefined : String(prev.score.total),
        after: candidateRefresh ? undefined : String(stamped.score.total),
        summary: candidateRefresh
          ? `Re-discovered — canonical record refreshed with new observations.${scoreDelta}`
          : `Score changed while re-checking.${scoreDelta}`,
      });
      continue;
    }

    unchangedCount += 1;
  }

  // ── 4. Snapshot accumulation (one row per prospect per run) ──
  const snapshots: IntelligenceSnapshot[] = finalUniverse.map((p) =>
    toSnapshot(p, runDetailsForSnapshot(runId, now, finalUniverse.length))
  );

  // ── 5. Persist ──
  const run: IntelligenceRun = {
    runId,
    startedAt: now,
    completedAt: now,
    status: 'completed',
    trigger,
    mode: 'mock',
    scannedCount: finalUniverse.length,
    newCount,
    updatedCount,
    disqualifiedCount: disqCount,
    unchangedCount,
    changedProspectIds,
    candidatesCount: reportedCandidates.size,
    errorCount: 0,
    summary: `Scanned ${finalUniverse.length}${reportedCandidates.size ? ` (${reportedCandidates.size} candidate intake)` : ''}. New ${newCount}. Updated ${updatedCount}. Disqualified ${disqCount}. Unchanged ${unchangedCount}.`,
  };
  store.applyRunResult(finalUniverse, run, events, snapshots);
  void reqlCount;
  return { run, events };
}

/** A run-shaped scratch value for snapshot building (never persisted). */
function runDetailsForSnapshot(runId: string, now: string, scanned: number): IntelligenceRun {
  return {
    runId,
    startedAt: now,
    completedAt: now,
    status: 'completed',
    trigger: 'manual',
    mode: 'mock',
    scannedCount: scanned,
    newCount: 0,
    updatedCount: 0,
    disqualifiedCount: 0,
    unchangedCount: scanned,
    changedProspectIds: [],
    candidatesCount: 0,
    errorCount: 0,
    summary: '',
  };
}

/**
 * Operator disqualification — sticks across future runs until requalified.
 * The reason is audited in the prospect timeline.
 */
export function disqualifyProspect(
  prospectId: string,
  reason: string,
  by?: string
): ProspectChangeEvent | null {
  const p = store.getProspect(prospectId);
  if (!p || p.disqualified) return null;
  const now = new Date().toISOString();
  const updated: BrandProspect = {
    ...p,
    disqualified: true,
    disqualificationReason: (reason ?? '').trim() || 'Disqualified by operator',
    lastResearched: now,
  };
  store.updateProspect(updated);
  const event: ProspectChangeEvent = {
    id: `evt-${Date.now()}-dq`,
    runId: 'manual',
    prospectId,
    brand: p.brand,
    changeType: 'disqualified',
    timestamp: now,
    field: 'disqualified',
    before: 'active',
    after: 'disqualified',
    summary: `${by ? `${by} disqualified` : 'Disqualified'}: ${updated.disqualificationReason}.`,
  };
  store.recordLifecycleEvent(event);
  return event;
}

/** Operator re-qualification — restores an active scope and audits the action. */
export function requalifyProspect(prospectId: string, by?: string): ProspectChangeEvent | null {
  const p = store.getProspect(prospectId);
  if (!p || !p.disqualified) return null;
  const now = new Date().toISOString();
  const updated: BrandProspect = {
    ...p,
    disqualified: false,
    disqualificationReason: undefined,
    outreachStatus: p.outreachStatus === 'disqualified' ? 'uncontacted' : p.outreachStatus,
    lastResearched: now,
  };
  store.updateProspect(updated);
  const event: ProspectChangeEvent = {
    id: `evt-${Date.now()}-rq`,
    runId: 'manual',
    prospectId,
    brand: p.brand,
    changeType: 'requalified',
    timestamp: now,
    field: 'disqualified',
    before: 'disqualified',
    after: 'active',
    summary: `${by ? `${by} requalified` : 'Requalified'}: prospect restored to the active universe.`,
  };
  store.recordLifecycleEvent(event);
  return event;
}

/**
 * §Phase C — record a downstream acquisition/ICP-driven outreach-status
 * transition on the canonical prospect, audited in the prospect timeline.
 * This is the ONLY way downstream stages (ICP enrolment, outreach send,
 * response) may move the BI record forward — the BI lifecycle stays canonical
 * and auditable even when the later stages drive the change.
 */
export function setProspectOutreachStatus(
  prospectId: string,
  next: OutreachStatus,
  note: string,
  by?: string
): ProspectChangeEvent | null {
  const p = store.getProspect(prospectId);
  if (!p || p.outreachStatus === next) return null;
  const now = new Date().toISOString();
  const before = p.outreachStatus;
  store.updateProspect({ ...p, outreachStatus: next, lastResearched: now });
  const event: ProspectChangeEvent = {
    id: `evt-${Date.now()}-os`,
    runId: 'acquisition',
    prospectId,
    brand: p.brand,
    changeType: 'updated',
    timestamp: now,
    field: 'outreachStatus',
    before,
    after: next,
    summary: `${by ? `${by}: ` : ''}${note} (${before} → ${next}).`,
  };
  store.recordLifecycleEvent(event);
  return event;
}

/**
 * §16/M12 — tag a prospect with the MARKET-ACCESS ROUTE it came through (source
 * country, trade programme, referral source, campaign). This is how the founder
 * measures brands discovered → contacted → qualified → onboarded → revenue per
 * programme. It records a lifecycle event, so the tag is auditable, and it never
 * implies a partnership exists — the programme registry declares every route
 * PROSPECTIVE (see `acquisitionStrategy.ts`).
 */
export function setProspectMarketAccess(
  prospectId: string,
  tag: MarketAccessTag,
  by?: string
): ProspectChangeEvent | null {
  const p = store.getProspect(prospectId);
  if (!p) return null;
  const next = normaliseMarketAccessTag(tag);
  const before = describeMarketAccessTag(p.marketAccess);
  const after = describeMarketAccessTag(next);
  if (before === after) return null;
  const now = new Date().toISOString();
  store.updateProspect({ ...p, marketAccess: next, lastResearched: now });
  const event: ProspectChangeEvent = {
    id: `evt-${Date.now()}-ma`,
    runId: 'acquisition',
    prospectId,
    brand: p.brand,
    changeType: 'updated',
    timestamp: now,
    field: 'marketAccess',
    before,
    after,
    summary: `${by ? `${by}: ` : ''}market-access route set (${before} → ${after}).`,
  };
  store.recordLifecycleEvent(event);
  return event;
}

/** Derived, live pipeline status for the lifecycle UI + validators. */
export function getPipelineStatus(): IntelligencePipelineStatus {
  const all = store.getProspects();
  const allRuns = store.getRuns();
  const active = all.filter((p) => !p.disqualified);
  const checked = all.filter((p) => p.lastChecked).map((p) => p.lastChecked as string).sort();
  const nextChecks = all.map((p) => p.nextCheck).filter((s) => !!s).sort() as string[];
  return {
    totalTracked: all.length,
    activeCount: active.length,
    disqualifiedCount: all.length - active.length,
    runCount: allRuns.length,
    lastRun: allRuns[allRuns.length - 1],
    lastCheckedAt: checked.length ? checked[checked.length - 1] : undefined,
    nextScheduledCheck: nextChecks[0],
  };
}