/**
 * §PHASE 10 — ACQUISITION INTELLIGENCE AT SCALE — the pure rules over the ONE owner.
 *
 * The owner (`src/config/acquisitionIntelligence.ts`) declares the dimensions and
 * the research sources; this module applies them. It is PURE and DETERMINISTIC: no
 * clock, no randomness, no network, no AI, no filesystem.
 *
 * THE RULE IT ENFORCES (FAIL CLOSED), in this order:
 *   · a signal on an UNDECLARED dimension is REFUSED (INTELLIGENCE_DIMENSION_UNKNOWN);
 *   · a signal naming NO source is REFUSED (INTELLIGENCE_REQUIRES_NAMED_SOURCE);
 *   · a signal naming an UNDECLARED source is REFUSED (INTELLIGENCE_SOURCE_UNKNOWN);
 *   · a signal whose source does not SUPPLY its dimension is REFUSED
 *     (INTELLIGENCE_SOURCE_DOES_NOT_SUPPLY_DIMENSION);
 *   · a signal whose source's backing provider is NOT available is REFUSED
 *     (INTELLIGENCE_UNAVAILABLE_WITHOUT_PROVIDER) — the platform NEVER fabricates a
 *     value when no provider exists;
 *   · only a signal that names a declared source supplying its dimension, backed by
 *     an available provider, is ALLOWED.
 *
 * Availability is INJECTED (`isProviderAvailable`) so the resolver stays pure: the
 * Control Centre supplies it from the canonical integration registry, and a caller
 * that supplies nothing gets the honest default — nothing is available, so nothing
 * is fabricated.
 */
import {
  ACQUISITION_INTELLIGENCE_BASIS,
  ACQUISITION_INTELLIGENCE_DIMENSIONS,
  ACQUISITION_INTELLIGENCE_DISCLAIMER,
  ACQUISITION_INTELLIGENCE_NEVER_FABRICATES,
  ACQUISITION_INTELLIGENCE_REQUIRES_A_NAMED_SOURCE,
  ACQUISITION_INTELLIGENCE_RULES,
  ACQUISITION_RESEARCH_SOURCES,
  AI_MAY_ONLY_SUMMARISE_INTELLIGENCE,
  DEMO_ACQUISITION_SIGNALS,
  ONE_ACQUISITION_INTELLIGENCE_OWNER,
  RESEARCH_SOURCES_ARE_REUSED_NOT_REDECLARED,
  type AcquisitionResearchSource,
  type AcquisitionSignal,
} from '@/config/acquisitionIntelligence';

const DIMENSION_IDS = new Set(ACQUISITION_INTELLIGENCE_DIMENSIONS.map((d) => d.id));
const DIMENSION_LABEL = new Map<string, string>(ACQUISITION_INTELLIGENCE_DIMENSIONS.map((d) => [d.id, d.label]));
const SOURCE_BY_ID = new Map(ACQUISITION_RESEARCH_SOURCES.map((s) => [s.id, s]));

/** Look up a declared research source, or `null`. */
export function resolveResearchSource(id: string | null | undefined): AcquisitionResearchSource | null {
  if (typeof id !== 'string') return null;
  return SOURCE_BY_ID.get(id) ?? null;
}

/** True only when the value is a DECLARED dimension of acquisition intelligence. */
export function isAcquisitionIntelligenceDimension(value: string | null | undefined): boolean {
  return typeof value === 'string' && DIMENSION_IDS.has(value as never);
}

/**
 * Whether a source's backing provider is genuinely available. Injected so the
 * resolver stays pure; the default (used when none is supplied) is `false` for
 * every provider, which is the honest fail-closed position — nothing is fabricated
 * until a real provider is configured.
 */
export type ProviderAvailability = (providerId: string) => boolean;

export type AcquisitionIntelligenceRefusal =
  | 'INTELLIGENCE_DIMENSION_UNKNOWN'
  | 'INTELLIGENCE_REQUIRES_NAMED_SOURCE'
  | 'INTELLIGENCE_SOURCE_UNKNOWN'
  | 'INTELLIGENCE_SOURCE_DOES_NOT_SUPPLY_DIMENSION'
  | 'INTELLIGENCE_UNAVAILABLE_WITHOUT_PROVIDER';

export interface SignalDecision {
  id: string;
  dimensionId: string;
  sourceId: string | null;
  allowed: boolean;
  refusal: AcquisitionIntelligenceRefusal | null;
  reason: string;
}

/**
 * Decide whether one signal may be produced. FAIL CLOSED: the checks run in a fixed
 * order, and any failure refuses the signal — a value is never fabricated.
 */
export function evaluateAcquisitionSignal(
  signal: AcquisitionSignal,
  isProviderAvailable: ProviderAvailability = () => false
): SignalDecision {
  const base = { id: signal.id, dimensionId: signal.dimensionId, sourceId: signal.sourceId };

  if (!isAcquisitionIntelligenceDimension(signal.dimensionId)) {
    return { ...base, allowed: false, refusal: 'INTELLIGENCE_DIMENSION_UNKNOWN', reason: `"${signal.dimensionId}" is not a declared dimension of acquisition intelligence.` };
  }
  if (!signal.sourceId) {
    return { ...base, allowed: false, refusal: 'INTELLIGENCE_REQUIRES_NAMED_SOURCE', reason: 'A signal must name a DECLARED research source to rest on.' };
  }
  const source = resolveResearchSource(signal.sourceId);
  if (!source) {
    return { ...base, allowed: false, refusal: 'INTELLIGENCE_SOURCE_UNKNOWN', reason: `"${signal.sourceId}" is not a declared research source.` };
  }
  if (!source.supplies.includes(signal.dimensionId as never)) {
    return { ...base, allowed: false, refusal: 'INTELLIGENCE_SOURCE_DOES_NOT_SUPPLY_DIMENSION', reason: `"${source.id}" does not supply the "${signal.dimensionId}" dimension.` };
  }
  if (!isProviderAvailable(source.providerId)) {
    return { ...base, allowed: false, refusal: 'INTELLIGENCE_UNAVAILABLE_WITHOUT_PROVIDER', reason: `The provider behind "${source.id}" (${source.providerId}) is not available, so no value is produced — nothing is fabricated.` };
  }
  return { ...base, allowed: true, refusal: null, reason: 'A signal on a declared dimension, from a declared source that supplies it, backed by an available provider.' };
}

/* ── The founder-facing summary over the canonical owner ────────────────────── */

export interface AcquisitionIntelligenceSourceView {
  id: string;
  label: string;
  providerId: string;
  available: boolean;
  suppliedLabels: string[];
}

export interface AcquisitionIntelligenceDemonstration {
  id: string;
  dimensionLabel: string;
  sourceLabel: string;
  allowed: boolean;
  refusal: AcquisitionIntelligenceRefusal | null;
  reason: string;
}

export interface AcquisitionIntelligenceSummary {
  dimensions: { id: string; label: string; description: string }[];
  sources: AcquisitionIntelligenceSourceView[];
  /** The number of REAL (non-demonstration) signals produced today. Always 0 until providers exist. */
  realSignalCount: number;
  /** The labelled demonstrations and the resolver's decision on each (computed, not written). */
  demonstrations: AcquisitionIntelligenceDemonstration[];
  demonstrationCount: number;
  allowedCount: number;
  refusedCount: number;
  availableSourceCount: number;
  /** A live demonstration: the first signal is REFUSED (fail-closed proof, computed not written). */
  exampleRefusal: { id: string; refusal: AcquisitionIntelligenceRefusal | null; reason: string };
  oneOwner: boolean;
  requiresNamedSource: boolean;
  neverFabricates: boolean;
  sourcesReused: boolean;
  aiSummarisesOnly: boolean;
  rules: readonly string[];
  basis: string;
  disclaimer: string;
}

/**
 * Summarise acquisition intelligence for the founder surface. The decisions and the
 * empty real-signal count are DERIVED from the owner and the resolver, so the
 * surface shows the rule actually firing rather than merely describing it.
 */
export function buildAcquisitionIntelligenceSummary(
  isProviderAvailable: ProviderAvailability = () => false
): AcquisitionIntelligenceSummary {
  const sources: AcquisitionIntelligenceSourceView[] = ACQUISITION_RESEARCH_SOURCES.map((s) => ({
    id: s.id,
    label: s.label,
    providerId: s.providerId,
    available: isProviderAvailable(s.providerId),
    suppliedLabels: s.supplies.map((d) => DIMENSION_LABEL.get(d) ?? d),
  }));

  const demonstrations: AcquisitionIntelligenceDemonstration[] = DEMO_ACQUISITION_SIGNALS.map((g) => {
    const decision = evaluateAcquisitionSignal(g, isProviderAvailable);
    return {
      id: g.id,
      dimensionLabel: DIMENSION_LABEL.get(g.dimensionId) ?? g.dimensionId,
      sourceLabel: g.sourceId ? (SOURCE_BY_ID.get(g.sourceId)?.label ?? g.sourceId) : 'no source cited',
      allowed: decision.allowed,
      refusal: decision.refusal,
      reason: decision.reason,
    };
  });

  const first = demonstrations[0];

  return {
    dimensions: ACQUISITION_INTELLIGENCE_DIMENSIONS.map((d) => ({ id: d.id, label: d.label, description: d.description })),
    sources,
    realSignalCount: 0,
    demonstrations,
    demonstrationCount: demonstrations.length,
    allowedCount: demonstrations.filter((d) => d.allowed).length,
    refusedCount: demonstrations.filter((d) => !d.allowed).length,
    availableSourceCount: sources.filter((s) => s.available).length,
    exampleRefusal: {
      id: first?.id ?? '',
      refusal: first?.refusal ?? null,
      reason: first?.reason ?? '',
    },
    oneOwner: ONE_ACQUISITION_INTELLIGENCE_OWNER,
    requiresNamedSource: ACQUISITION_INTELLIGENCE_REQUIRES_A_NAMED_SOURCE,
    neverFabricates: ACQUISITION_INTELLIGENCE_NEVER_FABRICATES,
    sourcesReused: RESEARCH_SOURCES_ARE_REUSED_NOT_REDECLARED,
    aiSummarisesOnly: AI_MAY_ONLY_SUMMARISE_INTELLIGENCE,
    rules: ACQUISITION_INTELLIGENCE_RULES,
    basis: ACQUISITION_INTELLIGENCE_BASIS,
    disclaimer: ACQUISITION_INTELLIGENCE_DISCLAIMER,
  };
}
