/**
 * §PHASE 7 — THE FINANCIER UNIVERSE RESOLVER — the pure rules over the ONE owner.
 *
 * The owner (`src/config/financierUniverse.ts`) declares the provider taxonomy,
 * the market scope, the full record and the research discipline; this module
 * applies it. It is PURE and DETERMINISTIC: no clock, no randomness, no network,
 * no AI, no filesystem.
 *
 * THE RULE IT ENFORCES (FAIL CLOSED), in this order:
 *   · a provider naming an UNDECLARED type is REFUSED (FINANCIER_PROVIDER_TYPE_UNKNOWN);
 *   · a provider naming no market, or an UNDECLARED market, is REFUSED (FINANCIER_MARKET_UNKNOWN);
 *   · an ILLUSTRATIVE placeholder is REFUSED entry to the real universe
 *     (FINANCIER_IS_ILLUSTRATIVE_NOT_A_RESEARCHED_PROVIDER) — it is never a real provider;
 *   · a REAL provider with NO named published source is REFUSED (FINANCIER_REQUIRES_NAMED_SOURCE);
 *   · a REAL provider with NO last-researched date is REFUSED (FINANCIER_REQUIRES_RESEARCH_DATE);
 *   · only a fully-sourced, dated, real provider is ALLOWED in.
 *
 * It re-derives no figure of its own: it holds the record to the evidence rule.
 */
import {
  DEMO_FINANCIER_RECORDS,
  FINANCIER_MARKETS,
  FINANCIER_PROVIDER_TYPES,
  FINANCIER_RECORD_FIELDS,
  FINANCIER_UNIVERSE_BASIS,
  FINANCIER_UNIVERSE_DISCLAIMER,
  FINANCIER_UNIVERSE_FAILS_CLOSED,
  FINANCIER_UNIVERSE_REQUIRES_NAMED_SOURCE,
  FINANCIER_UNIVERSE_REQUIRES_RESEARCH_DATE,
  FINANCIER_UNIVERSE_RULES,
  ONE_FINANCIER_UNIVERSE_OWNER,
  type FinancierRecord,
} from '@/config/financierUniverse';

const PROVIDER_TYPE_IDS = new Set(FINANCIER_PROVIDER_TYPES.map((t) => t.id));
const MARKET_IDS = new Set(FINANCIER_MARKETS.map((m) => m.id));
const PROVIDER_TYPE_LABEL = new Map(FINANCIER_PROVIDER_TYPES.map((t) => [t.id, t.label]));
const MARKET_LABEL = new Map(FINANCIER_MARKETS.map((m) => [m.id, m.label]));

export function isFinancierProviderType(value: string | null | undefined): boolean {
  return typeof value === 'string' && PROVIDER_TYPE_IDS.has(value);
}

export function isFinancierMarket(value: string | null | undefined): boolean {
  return typeof value === 'string' && MARKET_IDS.has(value);
}

/**
 * A pure ISO-date check (YYYY-MM-DD with a real month/day range). Pure on
 * purpose: it reads NO clock, so the universe stays deterministic.
 */
export function isFinancierResearchDate(value: string | null | undefined): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

export type FinancierUniverseRefusal =
  | 'FINANCIER_PROVIDER_TYPE_UNKNOWN'
  | 'FINANCIER_MARKET_UNKNOWN'
  | 'FINANCIER_IS_ILLUSTRATIVE_NOT_A_RESEARCHED_PROVIDER'
  | 'FINANCIER_REQUIRES_NAMED_SOURCE'
  | 'FINANCIER_REQUIRES_RESEARCH_DATE';

export interface FinancierEntryDecision {
  id: string;
  allowed: boolean;
  refusal: FinancierUniverseRefusal | null;
  reason: string;
}

/** True only when the source is a NAMED, PUBLISHED source (publisher + reference + date). */
function hasNamedSource(record: FinancierRecord): boolean {
  const s = record.source;
  return (
    s !== null &&
    typeof s.publisher === 'string' &&
    s.publisher.trim().length >= 3 &&
    typeof s.reference === 'string' &&
    s.reference.trim().length >= 3 &&
    isFinancierResearchDate(s.publishedOn)
  );
}

/**
 * Decide whether a provider may enter the REAL universe. FAIL CLOSED: an unknown
 * type, an unknown/missing market, an illustrative placeholder, and an entry with
 * no named source or no research date are all REFUSED — never defaulted.
 */
export function evaluateFinancierEntry(record: FinancierRecord): FinancierEntryDecision {
  const refuse = (refusal: FinancierUniverseRefusal, reason: string): FinancierEntryDecision => ({
    id: record.id,
    allowed: false,
    refusal,
    reason,
  });

  if (!isFinancierProviderType(record.providerTypeId)) {
    return refuse(
      'FINANCIER_PROVIDER_TYPE_UNKNOWN',
      `“${record.providerTypeId}” is not a declared provider type, so it is refused rather than guessed.`
    );
  }
  if (record.marketIds.length === 0 || record.marketIds.some((m) => !isFinancierMarket(m))) {
    return refuse(
      'FINANCIER_MARKET_UNKNOWN',
      'A provider must name at least one declared market; a missing or undeclared market is refused.'
    );
  }
  if (record.illustrative) {
    return refuse(
      'FINANCIER_IS_ILLUSTRATIVE_NOT_A_RESEARCHED_PROVIDER',
      'This is an illustrative placeholder, not a researched financier, so it never enters the real universe.'
    );
  }
  if (!hasNamedSource(record)) {
    return refuse(
      'FINANCIER_REQUIRES_NAMED_SOURCE',
      'A real provider must rest on a NAMED, PUBLISHED source (publisher, reference and published date).'
    );
  }
  if (!isFinancierResearchDate(record.lastResearched)) {
    return refuse(
      'FINANCIER_REQUIRES_RESEARCH_DATE',
      'A real provider must carry a LAST-RESEARCHED date (ISO YYYY-MM-DD).'
    );
  }
  return {
    id: record.id,
    allowed: true,
    refusal: null,
    reason: 'A fully-sourced, dated, real provider — accepted into the universe.',
  };
}

/* ── The founder-facing summary over the canonical universe ─────────────────── */

export interface FinancierUniverseSummary {
  providerTypes: { id: string; label: string; description: string }[];
  markets: { id: string; label: string }[];
  recordFields: { key: string; label: string; requirement: string; requiredForRealEntry: boolean }[];
  /** The number of REAL (non-illustrative) providers in the universe today. */
  realCount: number;
  /** The labelled illustrative placeholders and the resolver's decision on each. */
  illustrative: {
    id: string;
    legalName: string;
    providerTypeLabel: string;
    marketLabels: string[];
    illustrative: boolean;
    allowed: boolean;
    refusal: FinancierUniverseRefusal | null;
    reason: string;
  }[];
  illustrativeCount: number;
  allowedCount: number;
  refusedCount: number;
  oneOwner: boolean;
  requiresNamedSource: boolean;
  requiresResearchDate: boolean;
  failsClosed: boolean;
  /** A live demonstration: the first placeholder is REFUSED (fail-closed proof, computed not written). */
  exampleRefusal: { legalName: string; refusal: FinancierUniverseRefusal | null; reason: string };
  rules: readonly string[];
  basis: string;
  disclaimer: string;
}

/**
 * Summarise the financier universe for the founder surface. The decisions and the
 * empty real-universe count are DERIVED from the owner and the resolver, so the
 * surface shows the rule actually firing rather than merely describing it.
 */
export function buildFinancierUniverseSummary(): FinancierUniverseSummary {
  const illustrative = DEMO_FINANCIER_RECORDS.map((r) => {
    const decision = evaluateFinancierEntry(r);
    return {
      id: r.id,
      legalName: r.legalName,
      providerTypeLabel: PROVIDER_TYPE_LABEL.get(r.providerTypeId) ?? r.providerTypeId,
      marketLabels: r.marketIds.map((m) => MARKET_LABEL.get(m) ?? m),
      illustrative: r.illustrative,
      allowed: decision.allowed,
      refusal: decision.refusal,
      reason: decision.reason,
    };
  });

  const first = illustrative[0];

  return {
    providerTypes: FINANCIER_PROVIDER_TYPES.map((t) => ({ id: t.id, label: t.label, description: t.description })),
    markets: FINANCIER_MARKETS.map((m) => ({ id: m.id, label: m.label })),
    recordFields: FINANCIER_RECORD_FIELDS.map((f) => ({ key: f.key, label: f.label, requirement: f.requirement, requiredForRealEntry: f.requiredForRealEntry })),
    realCount: DEMO_FINANCIER_RECORDS.filter((r) => !r.illustrative).length,
    illustrative,
    illustrativeCount: illustrative.length,
    allowedCount: illustrative.filter((r) => r.allowed).length,
    refusedCount: illustrative.filter((r) => !r.allowed).length,
    oneOwner: ONE_FINANCIER_UNIVERSE_OWNER,
    requiresNamedSource: FINANCIER_UNIVERSE_REQUIRES_NAMED_SOURCE,
    requiresResearchDate: FINANCIER_UNIVERSE_REQUIRES_RESEARCH_DATE,
    failsClosed: FINANCIER_UNIVERSE_FAILS_CLOSED,
    exampleRefusal: {
      legalName: first?.legalName ?? '',
      refusal: first?.refusal ?? null,
      reason: first?.reason ?? '',
    },
    rules: FINANCIER_UNIVERSE_RULES,
    basis: FINANCIER_UNIVERSE_BASIS,
    disclaimer: FINANCIER_UNIVERSE_DISCLAIMER,
  };
}

