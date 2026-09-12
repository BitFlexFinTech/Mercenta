/**
 * §Phase D4 — DOMAIN PERSISTENCE PORT.
 *
 * THE seam between domain state and the platform's persistence architecture.
 * Deliberately the SMALLEST architecture consistent with the existing repository
 * pattern (`src/data/api.ts`): one port, two adapters, one factory.
 *
 *   DomainRepository (port)
 *     ├── MemoryDomainRepository   — deterministic, ZERO network, NOT durable.
 *     │                              The documented demo/simulation default.
 *     └── SupabaseDomainRepository — the existing `supabase` client, idempotent
 *                                    upserts by canonical id, tenant-scoped,
 *                                    explicit failures (never a silent success).
 *
 * Rules this module enforces:
 * - NO second database, no SQLite, no IndexedDB, no localStorage, no new ORM.
 *   The durable adapter is the existing Supabase client the whole platform
 *   already uses (`src/lib/supabase.ts` + `supabase/migrations/`).
 * - SIMULATION IS PRESERVED: with no Supabase configuration the memory adapter
 *   is selected and performs ZERO network calls; the domain workflow is
 *   unchanged and the store reports `durable: false` honestly.
 * - IDEMPOTENCE: every write upserts on the artefact's CANONICAL id, so a
 *   replayed domain operation cannot create a duplicate row.
 * - TENANT ISOLATION: every row carries an owning tenant; `hydrate()` returns
 *   only rows visible to the requested scope (a brand scope can never see
 *   another tenant's prospect-derived acquisition data).
 * - FAILURES ARE EXPLICIT: a failed write returns `{ ok: false, error }` and is
 *   never reported as persisted.
 *
 * Honest state in this demo environment: browser Supabase credentials
 * (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`) are NOT configured, so
 * `isSupabaseConfigured` is false and the memory adapter is active. The domain
 * keeps operating deterministically and nothing is claimed to be persisted.
 */
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type {
  AcquisitionEvent,
  BrandOnboarding,
  BrandProspect,
  IntelligenceRun,
  IntelligenceSnapshot,
  Opportunity,
  OutreachResponse,
  ProductSubmission,
  ProspectChangeEvent,
  ProspectOutreachRecord,
} from '@/types';

/** Which persistence backend produced a result. */
export type PersistenceBackend = 'supabase' | 'memory';

/**
 * The owning tenant of a persisted domain row.
 * `ops`   = the Mercenta operations tenant (pre-onboarding acquisition belongs
 *           to Mercenta — a prospect is not a tenant yet).
 * `brand` = a brand tenant that may see only its own brand-linked rows.
 */
export type TenantScope = { kind: 'ops' } | { kind: 'brand'; tenantId: string };

/**
 * The operations tenant id. Acquisition artefacts for a prospect that has not
 * onboarded belong to Mercenta operations. Single source of truth.
 */
export const MERCENTA_OPS_TENANT = 'mercenta-ops';

/** The canonical table names (one per persisted domain artefact). */
export const DOMAIN_TABLES = {
  outreach: 'acquisition_outreach',
  responses: 'acquisition_responses',
  opportunities: 'acquisition_opportunities',
  events: 'acquisition_events',
  prospects: 'bi_prospects',
  runs: 'bi_intelligence_runs',
  changes: 'bi_prospect_changes',
  snapshots: 'bi_snapshots',
  /** §Phase E1 — the opportunity → brand onboarding hand-off. */
  brandOnboarding: 'brand_onboarding',
  /**
   * §Phase E3 — the catalog submission record.
   *
   * This is the artefact that carries the E3 lifecycle state (submitted →
   * under review → live/rejected). `src/data/api.ts` already referenced a
   * `catalog_submissions` table that no migration ever created; E3 makes the
   * reference real, through THIS port, rather than adding a second mechanism.
   */
  catalogSubmissions: 'catalog_submissions',
} as const;

export type DomainTable = (typeof DOMAIN_TABLES)[keyof typeof DOMAIN_TABLES];

export interface PersistOk {
  ok: true;
  backend: PersistenceBackend;
  /** true ONLY when the write is durable across a process restart. */
  durable: boolean;
  table: DomainTable;
  id: string;
}

export interface PersistFail {
  ok: false;
  backend: PersistenceBackend;
  durable: false;
  table: DomainTable;
  id: string;
  error: string;
}

/** The explicit outcome of a persistence write — never an implicit success. */
export type PersistResult = PersistOk | PersistFail;

/** Everything the port can reload. Empty arrays mean "nothing durable here". */
export interface HydratedDomainState {
  outreach: ProspectOutreachRecord[];
  responses: OutreachResponse[];
  opportunities: Opportunity[];
  events: AcquisitionEvent[];
  prospects: BrandProspect[];
  runs: IntelligenceRun[];
  changes: ProspectChangeEvent[];
  snapshots: IntelligenceSnapshot[];
  /** §Phase E1 — canonical onboarding records (opportunity → tenant). */
  brandOnboarding: BrandOnboarding[];
  /** §Phase E3 — canonical catalog submission records. */
  catalogSubmissions: ProductSubmission[];
}

export function emptyHydratedState(): HydratedDomainState {
  return {
    outreach: [],
    responses: [],
    opportunities: [],
    events: [],
    prospects: [],
    runs: [],
    changes: [],
    snapshots: [],
    brandOnboarding: [],
    catalogSubmissions: [],
  };
}

/**
 * THE persistence port. Adapters implement exactly this interface, so the
 * domain never knows or cares which backend is active.
 */
export interface DomainRepository {
  readonly backend: PersistenceBackend;
  /** true only when writes survive a process restart (only Supabase is). */
  readonly durable: boolean;
  persistOutreach(record: ProspectOutreachRecord, tenantId: string): Promise<PersistResult>;
  persistResponse(response: OutreachResponse, tenantId: string): Promise<PersistResult>;
  persistOpportunity(
    opportunity: Opportunity,
    tenantId: string,
    brandId?: string
  ): Promise<PersistResult>;
  persistEvent(event: AcquisitionEvent, tenantId: string): Promise<PersistResult>;
  persistProspect(prospect: BrandProspect, tenantId: string): Promise<PersistResult>;
  persistRun(run: IntelligenceRun, tenantId: string): Promise<PersistResult>;
  persistChange(change: ProspectChangeEvent, tenantId: string): Promise<PersistResult>;
  persistSnapshot(snapshot: IntelligenceSnapshot, tenantId: string): Promise<PersistResult>;
  persistBrandOnboarding(onboarding: BrandOnboarding, tenantId: string): Promise<PersistResult>;
  /**
   * §Phase E3 — persist a catalog submission. The submission is the artefact
   * that owns the product's resulting catalog state, so persisting it (and only
   * it) keeps ONE source of truth for that state.
   */
  persistCatalogSubmission(submission: ProductSubmission, tenantId: string): Promise<PersistResult>;
  /** Load persisted state for a scope. A brand scope NEVER sees ops rows. */
  hydrate(scope: TenantScope): Promise<HydratedDomainState>;
  /** Await any in-flight writes (tests + the async send path). */
  flush(): Promise<void>;
}

/** Deterministic primary key for a weekly score snapshot. */
export function snapshotId(snapshot: IntelligenceSnapshot): string {
  return `snap-${snapshot.brandId}-${snapshot.snapshotDate}`;
}


/* ── Memory adapter — the deterministic, non-durable default ─────────────── */

/**
 * No Supabase configured → this adapter is active. It performs ZERO network
 * calls and is deliberately NOT durable: it retains nothing across a reload, so
 * the platform can never accidentally claim persistence it does not have.
 */
export class MemoryDomainRepository implements DomainRepository {
  readonly backend: PersistenceBackend = 'memory';
  readonly durable = false;

  private ok(table: DomainTable, id: string): PersistResult {
    return { ok: true, backend: 'memory', durable: false, table, id };
  }

  persistOutreach(record: ProspectOutreachRecord): Promise<PersistResult> {
    return Promise.resolve(this.ok(DOMAIN_TABLES.outreach, record.id));
  }
  persistResponse(response: OutreachResponse): Promise<PersistResult> {
    return Promise.resolve(this.ok(DOMAIN_TABLES.responses, response.id));
  }
  persistOpportunity(opportunity: Opportunity): Promise<PersistResult> {
    return Promise.resolve(this.ok(DOMAIN_TABLES.opportunities, opportunity.id));
  }
  persistEvent(event: AcquisitionEvent): Promise<PersistResult> {
    return Promise.resolve(this.ok(DOMAIN_TABLES.events, event.id));
  }
  persistProspect(prospect: BrandProspect): Promise<PersistResult> {
    return Promise.resolve(this.ok(DOMAIN_TABLES.prospects, prospect.id));
  }
  persistRun(run: IntelligenceRun): Promise<PersistResult> {
    return Promise.resolve(this.ok(DOMAIN_TABLES.runs, run.runId));
  }
  persistChange(change: ProspectChangeEvent): Promise<PersistResult> {
    return Promise.resolve(this.ok(DOMAIN_TABLES.changes, change.id));
  }
  persistSnapshot(snapshot: IntelligenceSnapshot): Promise<PersistResult> {
    return Promise.resolve(this.ok(DOMAIN_TABLES.snapshots, snapshotId(snapshot)));
  }
  persistBrandOnboarding(onboarding: BrandOnboarding): Promise<PersistResult> {
    return Promise.resolve(this.ok(DOMAIN_TABLES.brandOnboarding, onboarding.id));
  }
  persistCatalogSubmission(submission: ProductSubmission): Promise<PersistResult> {
    return Promise.resolve(this.ok(DOMAIN_TABLES.catalogSubmissions, submission.id));
  }
  hydrate(): Promise<HydratedDomainState> {
    // Nothing is durable here — an honest empty state, never a fabrication.
    return Promise.resolve(emptyHydratedState());
  }
  flush(): Promise<void> {
    return Promise.resolve();
  }
}


/* ── Supabase adapter — the durable implementation ───────────────────────── */

function rowFor(
  id: string,
  tenantId: string,
  payload: unknown,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id,
    tenant_id: tenantId,
    payload,
    ...extra,
    updated_at: new Date().toISOString(),
  };
}

/**
 * The durable adapter. Uses ONLY the existing `@supabase/supabase-js` client
 * (the same one `src/data/api.ts` uses). Every write is an idempotent upsert on
 * the canonical `id`; a failure is returned, never swallowed.
 *
 * Schema note (documented choice): each row stores the canonical typed key
 * columns (prospect_id/status/tenant_id/…) that RLS and queries need, plus the
 * full domain artefact in a `payload jsonb` column. That keeps the migration
 * small and robust to additive domain-type evolution while still enforcing
 * tenant isolation in the database — it is NOT a new storage mechanism.
 */
export class SupabaseDomainRepository implements DomainRepository {
  readonly backend: PersistenceBackend = 'supabase';
  readonly durable = true;

  private inFlight = new Set<Promise<unknown>>();

  private track<T>(p: Promise<T>): Promise<T> {
    this.inFlight.add(p);
    void p.finally(() => this.inFlight.delete(p));
    return p;
  }

  private async upsert(
    table: DomainTable,
    row: Record<string, unknown>
  ): Promise<PersistResult> {
    const id = String(row.id);
    if (!supabase) {
      return {
        ok: false, backend: 'supabase', durable: false, table, id,
        error: 'SUPABASE_UNAVAILABLE',
      };
    }
    const { error } = await supabase.from(table).upsert(row, { onConflict: 'id' });
    if (error) {
      return { ok: false, backend: 'supabase', durable: false, table, id, error: error.message };
    }
    return { ok: true, backend: 'supabase', durable: true, table, id };
  }

  private async select(
    table: DomainTable,
    scope: TenantScope
  ): Promise<Record<string, unknown>[]> {
    if (!supabase) return [];
    let q = supabase.from(table).select('payload, tenant_id, brand_id');
    if (scope.kind === 'brand') {
      // A brand scope sees ONLY rows linked to that tenant. Ops-owned rows that
      // name the brand as their tenant (a handed-off opportunity, and the
      // onboarding record that created the tenant) are visible to that brand —
      // matching the brand-isolation RLS policy on those two tables.
      const brandLinked =
        table === DOMAIN_TABLES.opportunities || table === DOMAIN_TABLES.brandOnboarding;
      q = brandLinked
        ? q.or(`tenant_id.eq.${scope.tenantId},brand_id.eq.${scope.tenantId}`)
        : q.eq('tenant_id', scope.tenantId);
    }
    const { data, error } = await q;
    if (error) return [];
    return (data ?? []) as Record<string, unknown>[];
  }


  persistOutreach(record: ProspectOutreachRecord, tenantId: string): Promise<PersistResult> {
    return this.track(
      this.upsert(
        DOMAIN_TABLES.outreach,
        rowFor(record.id, tenantId, record, {
          prospect_id: record.prospectId,
          status: record.status,
          channel: record.channel,
          revision: record.revision ?? 1,
          transport: record.transport ?? null,
        })
      )
    );
  }

  persistResponse(response: OutreachResponse, tenantId: string): Promise<PersistResult> {
    return this.track(
      this.upsert(
        DOMAIN_TABLES.responses,
        rowFor(response.id, tenantId, response, {
          prospect_id: response.prospectId,
          outreach_id: response.outreachId ?? null,
          wants_human: response.wantsHuman,
          simulated: response.simulated,
        })
      )
    );
  }

  persistOpportunity(
    opportunity: Opportunity,
    tenantId: string,
    brandId?: string
  ): Promise<PersistResult> {
    return this.track(
      this.upsert(
        DOMAIN_TABLES.opportunities,
        rowFor(opportunity.id, tenantId, opportunity, {
          prospect_id: opportunity.prospectId,
          brand_id: brandId ?? opportunity.brandId ?? null,
          stage: opportunity.stage,
        })
      )
    );
  }

  persistEvent(event: AcquisitionEvent, tenantId: string): Promise<PersistResult> {
    return this.track(
      this.upsert(
        DOMAIN_TABLES.events,
        rowFor(event.id, tenantId, event, {
          prospect_id: event.prospectId,
          type: event.type,
          actor: event.actor,
        })
      )
    );
  }

  persistProspect(prospect: BrandProspect, tenantId: string): Promise<PersistResult> {
    return this.track(
      this.upsert(
        DOMAIN_TABLES.prospects,
        rowFor(prospect.id, tenantId, prospect, {
          brand: prospect.brand,
          category: prospect.category,
          disqualified: prospect.disqualified,
        })
      )
    );
  }

  persistRun(run: IntelligenceRun, tenantId: string): Promise<PersistResult> {
    return this.track(
      this.upsert(
        DOMAIN_TABLES.runs,
        rowFor(run.runId, tenantId, run, {
          trigger: run.trigger,
          mode: run.mode,
          started_at: run.startedAt,
          completed_at: run.completedAt,
        })
      )
    );
  }

  persistChange(change: ProspectChangeEvent, tenantId: string): Promise<PersistResult> {
    return this.track(
      this.upsert(
        DOMAIN_TABLES.changes,
        rowFor(change.id, tenantId, change, {
          run_id: change.runId,
          prospect_id: change.prospectId,
          change_type: change.changeType,
        })
      )
    );
  }

  persistSnapshot(snapshot: IntelligenceSnapshot, tenantId: string): Promise<PersistResult> {
    return this.track(
      this.upsert(
        DOMAIN_TABLES.snapshots,
        rowFor(snapshotId(snapshot), tenantId, snapshot, {
          brand_id: snapshot.brandId,
          snapshot_date: snapshot.snapshotDate,
        })
      )
    );
  }

  /** §Phase E1 — the onboarding row is scoped to the brand tenant it creates. */
  persistBrandOnboarding(onboarding: BrandOnboarding, tenantId: string): Promise<PersistResult> {
    return this.track(
      this.upsert(
        DOMAIN_TABLES.brandOnboarding,
        rowFor(onboarding.id, tenantId, onboarding, {
          prospect_id: onboarding.prospectId,
          opportunity_id: onboarding.opportunityId,
          brand_id: onboarding.brandId,
          status: onboarding.status,
          origin: onboarding.origin,
        })
      )
    );
  }

  /** §Phase E3 — a submission row is scoped to the brand tenant that owns it. */
  persistCatalogSubmission(submission: ProductSubmission, tenantId: string): Promise<PersistResult> {
    return this.track(
      this.upsert(
        DOMAIN_TABLES.catalogSubmissions,
        rowFor(submission.id, tenantId, submission, {
          brand_id: submission.brandId,
          sku: submission.sku,
          product_id: submission.productId,
          status: submission.status,
          submission_id: submission.submissionId,
          simulated: submission.simulated,
        })
      )
    );
  }

  async hydrate(scope: TenantScope): Promise<HydratedDomainState> {
    if (!supabase) return emptyHydratedState();
    const [outreach, responses, opportunities, events, prospects, runs, changes, snapshots, brandOnboarding, catalogSubmissions] =
      await Promise.all([
        this.select(DOMAIN_TABLES.outreach, scope),
        this.select(DOMAIN_TABLES.responses, scope),
        this.select(DOMAIN_TABLES.opportunities, scope),
        this.select(DOMAIN_TABLES.events, scope),
        this.select(DOMAIN_TABLES.prospects, scope),
        this.select(DOMAIN_TABLES.runs, scope),
        this.select(DOMAIN_TABLES.changes, scope),
        this.select(DOMAIN_TABLES.snapshots, scope),
        this.select(DOMAIN_TABLES.brandOnboarding, scope),
        this.select(DOMAIN_TABLES.catalogSubmissions, scope),
      ]);
    const payloads = <T>(rows: Record<string, unknown>[]): T[] =>
      rows.map((r) => r.payload as T).filter(Boolean);
    return {
      outreach: payloads<ProspectOutreachRecord>(outreach),
      responses: payloads<OutreachResponse>(responses),
      opportunities: payloads<Opportunity>(opportunities),
      events: payloads<AcquisitionEvent>(events),
      prospects: payloads<BrandProspect>(prospects),
      runs: payloads<IntelligenceRun>(runs),
      changes: payloads<ProspectChangeEvent>(changes),
      snapshots: payloads<IntelligenceSnapshot>(snapshots),
      brandOnboarding: payloads<BrandOnboarding>(brandOnboarding),
      catalogSubmissions: payloads<ProductSubmission>(catalogSubmissions),
    };
  }

  async flush(): Promise<void> {
    await Promise.allSettled([...this.inFlight]);
  }
}


/* ── Factory + injectable singleton ──────────────────────────────────────── */

/**
 * Select the active repository from the canonical configuration signal.
 * Supabase credentials configured → durable adapter; otherwise the memory
 * adapter (zero-network, simulation preserved).
 */
export function createDomainRepository(): DomainRepository {
  return isSupabaseConfigured && supabase
    ? new SupabaseDomainRepository()
    : new MemoryDomainRepository();
}

let active: DomainRepository = createDomainRepository();

/** The active repository. Never null. */
export function getDomainRepository(): DomainRepository {
  return active;
}

/**
 * Replace the active repository. Used by the D4 conformance validator to prove
 * the port contract (write → reload → idempotence → isolation) INDEPENDENTLY of
 * a live Supabase project, and by nothing else in product code.
 */
export function setDomainRepository(repo: DomainRepository): void {
  active = repo;
}

/** Restore the factory-selected repository. */
export function resetDomainRepository(): void {
  active = createDomainRepository();
}


/* ── Shared persistence-status mirror (single source for both stores) ────── */

/** Honest persistence state of a domain store. */
export type PersistenceState = 'memory-only' | 'pending' | 'durable' | 'failed';

export interface PersistenceStatus {
  state: PersistenceState;
  backend: PersistenceBackend;
  durable: boolean;
  /** The most recent artefact write this session. */
  lastWrite?: { table: DomainTable; id: string; at: string };
  /** Present when the most recent write FAILED — never hidden. */
  error?: string;
  /** Total artefact writes mirrored this session. */
  writes: number;
}

export interface PersistenceMirror {
  /** The current honest status. */
  status(): PersistenceStatus;
  /** Mirror one mutation through the port (never throws; failures recorded). */
  write(table: DomainTable, id: string, run: () => Promise<PersistResult>): void;
  /** Await every in-flight write. */
  flush(): Promise<void>;
  /** Reset to the initial status (used by the test-only store resets). */
  reset(): void;
}

function initialStatus(): PersistenceStatus {
  const repo = getDomainRepository();
  return {
    state: repo.durable ? 'pending' : 'memory-only',
    backend: repo.backend,
    durable: repo.durable,
    writes: 0,
  };
}

/**
 * A status-tracking mirror over the active port. Shared by the acquisition and
 * Brand Intelligence stores so persistence semantics are defined ONCE.
 */
export function createPersistenceMirror(): PersistenceMirror {
  let status = initialStatus();
  const pending = new Set<Promise<void>>();
  return {
    status: () => ({ ...status }),
    write(table, id, run) {
      const repo = getDomainRepository();
      const base: PersistenceStatus = {
        ...status,
        backend: repo.backend,
        durable: repo.durable,
        lastWrite: { table, id, at: new Date().toISOString() },
        writes: status.writes + 1,
      };
      if (!repo.durable) {
        // Honest: acknowledged in memory only — NOT durable persistence.
        status = { ...base, state: 'memory-only', error: undefined };
        return;
      }
      status = { ...base, state: 'pending' };
      const p = run()
        .then((result) => {
          status = result.ok
            ? { ...status, state: 'durable', durable: true, error: undefined }
            : { ...status, state: 'failed', durable: false, error: result.error };
        })
        .catch((err: unknown) => {
          status = { ...status, state: 'failed', durable: false, error: String(err) };
        });
      pending.add(p);
      void p.finally(() => pending.delete(p));
    },
    async flush() {
      await getDomainRepository().flush();
      await Promise.allSettled([...pending]);
    },
    reset() {
      status = initialStatus();
    },
  };
}

