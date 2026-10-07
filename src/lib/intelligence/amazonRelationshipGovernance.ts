/**
 * §PHASE 13 — AMAZON RELATIONSHIP GOVERNANCE RESOLVER — the pure rules over the ONE owner.
 *
 * The owner (`src/config/amazonRelationshipGovernance.ts`) declares the authoritative-source
 * universe and the governance rule; this module applies them. It is PURE and DETERMINISTIC:
 * no clock, no randomness, no network, no AI.
 *
 * THE RULES IT ENFORCES:
 *   · a claim may cite only a source DECLARED here — an unknown id is REFUSED
 *     (GOVERNANCE_SOURCE_UNKNOWN);
 *   · claim wording must still pass the canonical retail-channel wording safeguard
 *     (`src/lib/intelligence/amazonWording.ts`) — a failing claim is REFUSED
 *     (CLAIM_FAILS_WORDING_SAFEGUARD);
 *   · a claim may rest only on a source that is VERIFIED — an unverified (or absent) source
 *     is REFUSED (CLAIM_REQUIRES_VERIFIED_SOURCE). Because nothing is verified with the
 *     channel today, EVERY relationship claim currently fails closed.
 *
 * The programme status is READ from the wording owner (never re-typed), so the two can never
 * drift.
 */
import {
  lintAmazonWording,
  AMAZON_PROGRAMME_STATUS,
} from '@/lib/intelligence/amazonWording';
import {
  AMAZON_AUTHORITATIVE_SOURCES,
  AMAZON_AUTHORITATIVE_SOURCES_ARE_DECLARED,
  AMAZON_GOVERNANCE_BASIS,
  AMAZON_GOVERNANCE_DISCLAIMER,
  AMAZON_GOVERNANCE_FAILS_CLOSED,
  AMAZON_GOVERNANCE_REUSES_WORDING_OWNER,
  AMAZON_GOVERNANCE_RULES,
  AMAZON_PROGRAMME_STATUS_OWNER,
  AMAZON_SOURCE_STATUSES,
  ONE_AMAZON_GOVERNANCE_OWNER,
  UNVERIFIED_SOURCE_BLOCKS_CLAIM,
  type AmazonAuthoritativeSource,
  type AmazonSourceStatus,
} from '@/config/amazonRelationshipGovernance';

const BY_ID = new Map(AMAZON_AUTHORITATIVE_SOURCES.map((s) => [s.id, s]));

/** Resolve a declared authoritative source by id — never throws, reports honestly. */
export function resolveAuthoritativeSource(id: string): {
  found: boolean;
  source: AmazonAuthoritativeSource | null;
} {
  const source = BY_ID.get(id) ?? null;
  return { found: source !== null, source };
}

export type AmazonClaimRefusal =
  | 'GOVERNANCE_SOURCE_UNKNOWN'
  | 'CLAIM_FAILS_WORDING_SAFEGUARD'
  | 'CLAIM_REQUIRES_VERIFIED_SOURCE';

/**
 * The PURE support rule: a claim is supported IFF at least one source is cited AND every
 * cited source is `verified`. Kept separate so the positive branch is directly testable.
 */
export function decideClaimSupport(statuses: readonly AmazonSourceStatus[]): {
  allowed: boolean;
  refusal: AmazonClaimRefusal | null;
} {
  if (statuses.length === 0 || statuses.some((s) => s !== 'verified')) {
    return { allowed: false, refusal: 'CLAIM_REQUIRES_VERIFIED_SOURCE' };
  }
  return { allowed: true, refusal: null };
}

export interface AmazonClaimAssessment {
  claimText: string;
  citedSourceIds: string[];
  /** The cited sources that are declared. */
  resolvedSources: AmazonAuthoritativeSource[];
  /** The cited sources that are NOT verified (the reason a claim fails). */
  unverifiedSources: AmazonAuthoritativeSource[];
  /** Ids cited that the registry does not know. */
  unknownSourceIds: string[];
  wordingSafe: boolean;
  allowed: boolean;
  refusal: AmazonClaimRefusal | null;
  reason: string;
  programmeStatus: string;
}

/**
 * Assess an outward claim against the governance. Order of refusal mirrors the rules: an
 * unknown source is the most fundamental error; then the wording safeguard; then the
 * verified-source requirement.
 */
export function evaluateAmazonClaim(claimText: string, citedSourceIds: readonly string[]): AmazonClaimAssessment {
  const resolvedSources: AmazonAuthoritativeSource[] = [];
  const unknownSourceIds: string[] = [];
  for (const id of citedSourceIds) {
    const r = resolveAuthoritativeSource(id);
    if (r.found && r.source) resolvedSources.push(r.source);
    else unknownSourceIds.push(id);
  }
  const unverifiedSources = resolvedSources.filter((s) => s.status !== 'verified');
  const wording = lintAmazonWording(claimText);
  const wordingSafe = wording.safe;

  const refuse = (refusal: AmazonClaimRefusal, reason: string): AmazonClaimAssessment => ({
    claimText,
    citedSourceIds: [...citedSourceIds],
    resolvedSources,
    unverifiedSources,
    unknownSourceIds,
    wordingSafe,
    allowed: false,
    refusal,
    reason,
    programmeStatus: AMAZON_PROGRAMME_STATUS,
  });

  if (unknownSourceIds.length > 0) {
    return refuse(
      'GOVERNANCE_SOURCE_UNKNOWN',
      `The claim cites source(s) the governance does not know: ${unknownSourceIds.join(', ')}.`
    );
  }
  if (!wordingSafe) {
    return refuse(
      'CLAIM_FAILS_WORDING_SAFEGUARD',
      'The claim fails the canonical retail-channel wording safeguard and cannot be made.'
    );
  }
  const support = decideClaimSupport(resolvedSources.map((s) => s.status));
  if (!support.allowed) {
    return refuse(
      'CLAIM_REQUIRES_VERIFIED_SOURCE',
      'No cited authoritative source is verified, so the claim is not supported; the governance fails closed.'
    );
  }
  return {
    claimText,
    citedSourceIds: [...citedSourceIds],
    resolvedSources,
    unverifiedSources,
    unknownSourceIds,
    wordingSafe,
    allowed: true,
    refusal: null,
    reason: 'Every cited authoritative source is verified, so the claim is supported.',
    programmeStatus: AMAZON_PROGRAMME_STATUS,
  };
}

/* ── The founder-facing summary over the canonical sources ─────────────────── */

export interface AmazonGovernanceSummary {
  programmeStatus: string;
  oneOwner: boolean;
  failsClosed: boolean;
  sourcesAreDeclared: boolean;
  unverifiedSourceBlocksClaim: boolean;
  reusesWordingOwner: boolean;
  programmeStatusOwner: string;
  statuses: readonly AmazonSourceStatus[];
  sources: AmazonAuthoritativeSource[];
  sourceCount: number;
  verifiedCount: number;
  notHeldCount: number;
  /** A live demonstration: a sample relationship claim is REFUSED (fail-closed proof). */
  exampleRefusal: { claim: string; refusal: AmazonClaimRefusal | null; reason: string };
  rules: string[];
  basis: string;
  disclaimer: string;
}

/**
 * Summarise the governance for the founder surface. The `exampleRefusal` is computed LIVE
 * from the resolver, so the surface shows the fail-closed rule actually firing rather than
 * merely describing it.
 */
export function buildAmazonGovernanceSummary(): AmazonGovernanceSummary {
  const sources = AMAZON_AUTHORITATIVE_SOURCES.map((s) => ({ ...s }));
  const verifiedCount = sources.filter((s) => s.status === 'verified').length;
  const notHeldCount = sources.filter((s) => s.status === 'not_held').length;

  // A sample claim that is wording-safe but rests on an unverified source — it must REFUSE.
  const sample = evaluateAmazonClaim(
    'Mercenta manages retail-channel purchase orders for its brand partners.',
    ['vendor-agreement']
  );

  return {
    programmeStatus: AMAZON_PROGRAMME_STATUS,
    oneOwner: ONE_AMAZON_GOVERNANCE_OWNER,
    failsClosed: AMAZON_GOVERNANCE_FAILS_CLOSED,
    sourcesAreDeclared: AMAZON_AUTHORITATIVE_SOURCES_ARE_DECLARED,
    unverifiedSourceBlocksClaim: UNVERIFIED_SOURCE_BLOCKS_CLAIM,
    reusesWordingOwner: AMAZON_GOVERNANCE_REUSES_WORDING_OWNER,
    programmeStatusOwner: AMAZON_PROGRAMME_STATUS_OWNER,
    statuses: [...AMAZON_SOURCE_STATUSES],
    sources,
    sourceCount: sources.length,
    verifiedCount,
    notHeldCount,
    exampleRefusal: { claim: sample.claimText, refusal: sample.refusal, reason: sample.reason },
    rules: [...AMAZON_GOVERNANCE_RULES],
    basis: AMAZON_GOVERNANCE_BASIS,
    disclaimer: AMAZON_GOVERNANCE_DISCLAIMER,
  };
}
