/**
 * §D21 — WHOLE-PLATFORM OBJECT RESOLUTION (the ONE owner).
 *
 * THE CANONICAL CHAIN (master matrix §25 / §32 row 1, brief §5):
 *
 *   Amazon event / data → Amazon object → Mercenta object → Brand → Tenant
 *
 * Every domain in this platform already scopes its OWN reads correctly, but each
 * one does that inside its own read model (`listCasesForBrand`, `productsForBrandFromStore`,
 * the PO ingestion router …). Until now there was NO single, reusable mechanism
 * that takes an inbound CHANNEL object (an Amazon PO number, an invoice id, a
 * tracking number) and resolves it to its Mercenta record, its brand and its
 * tenant in one deterministic step. That is the largest open architectural gap
 * (grep for `resolveObject` / `externalObjectId` / `exceptionQueue` found 0 hits).
 *
 * WHAT THIS MODULE IS
 * -------------------
 * ONE pure, deterministic resolver. It is NOT a database and NOT an ingester: it
 * is a resolution MECHANISM over a caller-supplied index of canonical records, so
 * every module can resolve an external object through the SAME contract instead
 * of inventing its own ownership logic.
 *
 * THE PROPERTIES IT GUARANTEES (the D21 acceptance criteria)
 * ---------------------------------------------------------
 *   · D21-01 ONE mechanism — this module, used everywhere an external object is
 *     matched, rather than per-module ad-hoc matching.
 *   · D21-02 Deterministic + tenant-safe + auditable — the SAME input always
 *     yields the SAME chain, and every chain names the Mercenta object, the brand
 *     and the tenant.
 *   · D21-03 Duplicate / replay awareness — a `ResolutionLedger` remembers every
 *     external object it has seen and returns the FIRST resolution again on a
 *     replay, flagged `replay: true`, so a re-delivered channel event cannot mint
 *     a second owner.
 *   · D21-04 No guessing, unknown fails safely — an external object that matches
 *     NOTHING resolves to the declared `unknown` outcome; it is never guessed.
 *   · D21-05 Unresolved objects → Founder review — `unknown` AND `cross_tenant`
 *     outcomes carry the exact reason and are collected by
 *     `buildUnresolvedQueue` for the Founder queue (no canonical queue existed).
 *   · D21-06 Cross-module reference consistency — one shared contract every
 *     module can be reconciled to.
 *
 * ZERO CROSS-TENANT LEAKAGE: if one external identifier matches Mercenta records
 * owned by MORE THAN ONE tenant, resolution FAILS CLOSED to `cross_tenant` rather
 * than picking one — a wrong pick is the one error this must never make.
 */

/** The external bodies Mercenta ingests from. Today there is exactly one channel. */
export type ExternalObjectSource = 'amazon_vendor_central';

/**
 * The external (channel) object types the platform tracks. Each maps to a
 * Mercenta record that carries the channel's own identifier.
 */
export type ExternalObjectType =
  | 'purchase_order'
  | 'invoice'
  | 'shipment'
  | 'case'
  | 'deduction';

/** An inbound external object that must be resolved to its Mercenta owner. */
export interface ExternalObjectRef {
  source: ExternalObjectSource;
  objectType: ExternalObjectType;
  /**
   * The CHANNEL's own identifier for the object — an Amazon PO number, an invoice
   * id, a carrier tracking number. Never a Mercenta id.
   */
  externalId: string;
}

/**
 * One canonical Mercenta object, indexed by the channel identifier it carries.
 * Callers build these from canonical records; the resolver never reads a store.
 */
export interface ResolvableObject {
  objectType: ExternalObjectType;
  /** The channel identifier THIS Mercenta record carries. */
  externalId: string;
  /** The Mercenta record's own id. */
  mercentaId: string;
  /** The brand that owns the Mercenta record. */
  brandId: string;
  /** Display name of the brand (optional). */
  brandName?: string;
  /** The tenant that owns the Mercenta object. A brand IS a tenant. */
  tenantId: string;
}

/** One fully resolved link in the canonical chain. */
export interface ResolutionChain {
  amazonObjectType: ExternalObjectType;
  amazonObjectId: string;
  mercentaObjectId: string;
  brandId: string;
  brandName: string;
  tenantId: string;
}

/**
 * The declared outcome of a resolution. `unknown` and `cross_tenant` are BOTH
 * fail-closed outcomes that route to the Founder review queue.
 */
export type ResolutionOutcome = 'resolved' | 'unknown' | 'cross_tenant';

/** The result of resolving ONE external object. */
export interface ObjectResolution {
  ref: ExternalObjectRef;
  outcome: ResolutionOutcome;
  /** Present ONLY when `outcome === 'resolved'`. */
  chain: ResolutionChain | null;
  /** Always present; states the reasoning, especially for the fail-closed outcomes. */
  reason: string;
  /** True when this exact external object was already resolved (a replay). */
  replay: boolean;
  /** Stable key identifying this external object across replays. */
  key: string;
}

/** Normalise a channel identifier for matching (trim + case-insensitive). */
function normaliseId(id: string): string {
  return id.trim().toUpperCase();
}

/**
 * The stable identity of an external object: source + type + normalised id. Two
 * deliveries of the same channel object produce the SAME key, which is what makes
 * replay detection deterministic.
 */
export function externalObjectKey(ref: ExternalObjectRef): string {
  return `${ref.source}::${ref.objectType}::${normaliseId(ref.externalId)}`;
}

/**
 * Resolve ONE external object against a caller-supplied index of canonical
 * records. Deterministic and pure:
 *   · no match                     → `unknown` (never guessed);
 *   · matches spanning >1 tenant   → `cross_tenant` (fails closed, no leakage);
 *   · matches within one tenant    → `resolved`, returning the full chain.
 */
export function resolveObject(
  ref: ExternalObjectRef,
  sources: readonly ResolvableObject[]
): ObjectResolution {
  const key = externalObjectKey(ref);
  const wantId = normaliseId(ref.externalId);
  const matches = sources.filter(
    (s) => s.objectType === ref.objectType && normaliseId(s.externalId) === wantId
  );

  if (matches.length === 0) {
    return {
      ref,
      outcome: 'unknown',
      chain: null,
      replay: false,
      key,
      reason:
        `No Mercenta record carries ${ref.objectType} "${ref.externalId}" from ` +
        `${ref.source}; ownership is UNKNOWN and the object is routed to the founder ` +
        `review queue (never guessed).`,
    };
  }

  const tenantIds = [...new Set(matches.map((m) => m.tenantId))];
  if (tenantIds.length > 1) {
    return {
      ref,
      outcome: 'cross_tenant',
      chain: null,
      replay: false,
      key,
      reason:
        `"${ref.externalId}" matches ${matches.length} Mercenta records across ` +
        `${tenantIds.length} tenants (${tenantIds.join(', ')}); resolution FAILS CLOSED ` +
        `to prevent cross-tenant leakage and is routed to the founder review queue.`,
    };
  }

  // Exactly one owning tenant. Pick the FIRST match in a stable order so the
  // result is deterministic even when a tenant has several records carrying the
  // same channel identifier.
  const match = [...matches].sort((a, b) => a.mercentaId.localeCompare(b.mercentaId))[0];
  return {
    ref,
    outcome: 'resolved',
    replay: false,
    key,
    chain: {
      amazonObjectType: ref.objectType,
      amazonObjectId: ref.externalId,
      mercentaObjectId: match.mercentaId,
      brandId: match.brandId,
      brandName: match.brandName ?? match.brandId,
      tenantId: match.tenantId,
    },
    reason: `Resolved deterministically to Mercenta ${match.mercentaId} (brand ${match.brandId}, tenant ${match.tenantId}).`,
  };
}

/** True when a resolution produced a chain. */
export function isResolved(r: ObjectResolution): boolean {
  return r.outcome === 'resolved';
}

/** Render the resolved chain in the canonical order, for a surface or an audit row. */
export function formatResolutionChain(chain: ResolutionChain): string {
  return (
    `retail channel ${chain.amazonObjectType} ${chain.amazonObjectId}` +
    ` → Mercenta ${chain.mercentaObjectId}` +
    ` → brand ${chain.brandName}` +
    ` → tenant ${chain.tenantId}`
  );
}


/**
 * §D21-03 — DUPLICATE / REPLAY AWARENESS.
 *
 * A ledger memorises the FIRST resolution of every external object. A re-delivered
 * channel event (the same source + type + id) resolves to the SAME chain and is
 * flagged `replay: true`, so a duplicate can never mint a second owner — the
 * platform-level replay guard the matrix recorded as missing.
 */
export interface ResolutionLedger {
  resolve(ref: ExternalObjectRef, sources: readonly ResolvableObject[]): ObjectResolution;
  /** The distinct external objects this ledger has seen, in insertion order. */
  seenKeys(): string[];
  /** How many resolutions were replays of an already-seen external object. */
  replayCount(): number;
}

export function createResolutionLedger(): ResolutionLedger {
  const seen = new Map<string, ObjectResolution>();
  let replays = 0;
  return {
    resolve(ref: ExternalObjectRef, sources: readonly ResolvableObject[]): ObjectResolution {
      const base = resolveObject(ref, sources);
      const prior = seen.get(base.key);
      if (prior) {
        replays += 1;
        return { ...prior, replay: true };
      }
      seen.set(base.key, base);
      return base;
    },
    seenKeys(): string[] {
      return [...seen.keys()];
    },
    replayCount(): number {
      return replays;
    },
  };
}

/** The resolution position over a batch of external objects. */
export interface ResolutionSummary {
  total: number;
  resolved: number;
  unknown: number;
  crossTenant: number;
  /** Duplicate deliveries of an already-seen external object. */
  replays: number;
  /** True when every object resolved to exactly one tenant. */
  fullyResolved: boolean;
  byType: {
    objectType: ExternalObjectType;
    total: number;
    resolved: number;
    unresolved: number;
  }[];
  /** Every fail-closed outcome, in the order encountered — the Founder review queue. */
  unresolved: ObjectResolution[];
  /** Human-readable statement of the position, always present. */
  basis: string;
}

/**
 * §D21-05 — THE UNRESOLVED-OWNERSHIP QUEUE.
 *
 * Every external object that did NOT resolve to exactly one tenant, with its
 * reason. This is the canonical Founder review queue the matrix recorded as
 * non-existent. Deterministic and pure.
 */
export function buildUnresolvedQueue(
  refs: readonly ExternalObjectRef[],
  sources: readonly ResolvableObject[]
): ObjectResolution[] {
  return refs
    .map((ref) => resolveObject(ref, sources))
    .filter((r) => r.outcome !== 'resolved');
}

/**
 * Summarise a batch of external objects through the ONE resolver, WITH replay
 * awareness. A ledger is created per call unless one is supplied, so the same
 * batch always yields the same summary while a re-delivered object is counted as
 * a replay.
 */
export function summariseResolutions(
  refs: readonly ExternalObjectRef[],
  sources: readonly ResolvableObject[],
  ledger: ResolutionLedger = createResolutionLedger()
): ResolutionSummary {
  const results = refs.map((ref) => ledger.resolve(ref, sources));

  const resolved = results.filter((r) => r.outcome === 'resolved').length;
  const unknown = results.filter((r) => r.outcome === 'unknown').length;
  const crossTenant = results.filter((r) => r.outcome === 'cross_tenant').length;
  const unresolved = results.filter((r) => r.outcome !== 'resolved');

  const types: ExternalObjectType[] = ['purchase_order', 'invoice', 'shipment', 'case', 'deduction'];
  const byType = types
    .map((objectType) => {
      const of = results.filter((r) => r.ref.objectType === objectType);
      return {
        objectType,
        total: of.length,
        resolved: of.filter((r) => r.outcome === 'resolved').length,
        unresolved: of.filter((r) => r.outcome !== 'resolved').length,
      };
    })
    .filter((t) => t.total > 0);

  const basis = results.length
    ? `${resolved} of ${results.length} channel object(s) resolved to exactly one tenant; ` +
      `${unknown} unknown and ${crossTenant} cross-tenant routed to the founder review queue` +
      `${ledger.replayCount() ? `, ${ledger.replayCount()} replay(ies) deduplicated` : ''}.`
    : 'No channel object is awaiting resolution.';

  return {
    total: results.length,
    resolved,
    unknown,
    crossTenant,
    replays: ledger.replayCount(),
    fullyResolved: unknown === 0 && crossTenant === 0,
    byType,
    unresolved,
    basis,
  };
}

