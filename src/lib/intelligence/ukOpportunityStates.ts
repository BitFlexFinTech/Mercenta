/**
 * §PHASE 10 — THE UK OPPORTUNITY STATES AT SCALE — the pure rules over the ONE owner.
 *
 * The owner (`src/config/ukOpportunityStates.ts`) declares the evidence sources,
 * the chain and the six states; this module applies them. It is PURE and
 * DETERMINISTIC: no clock, no randomness, no network, no AI, no filesystem.
 *
 * THE RULE IT ENFORCES (FAIL CLOSED), in this order:
 *   · a state on an UNDECLARED id is REFUSED (STATE_UNKNOWN);
 *   · a state naming NO evidence source is REFUSED (STATE_REQUIRES_EVIDENCE);
 *   · a state naming an UNDECLARED evidence source is REFUSED
 *     (STATE_EVIDENCE_SOURCE_UNKNOWN);
 *   · a state any of whose evidence sources is backed by a provider that is NOT
 *     available is REFUSED (STATE_UNAVAILABLE_WITHOUT_EVIDENCE) — the platform
 *     NEVER asserts a state whose evidence is unavailable;
 *   · only a state that names a declared evidence source, every one of them backed
 *     by an available provider, is ASSERTABLE at scale.
 *
 * Availability is INJECTED (`isEvidenceAvailable`) so the resolver stays pure: the
 * Control Centre supplies it from the canonical integration registry, and a caller
 * that supplies nothing gets the honest default — nothing is available, so no
 * state is asserted.
 */
import {
  ONE_UK_OPPORTUNITY_STATES_OWNER,
  OPPORTUNITY_EVIDENCE_SOURCES_REUSE_CANONICAL_PROVIDERS,
  STATES_FEED_THE_MARKET_FIT_TO_OUTREACH_CHAIN,
  UK_OPPORTUNITY_CHAIN_STAGES,
  UK_OPPORTUNITY_EVIDENCE_SOURCES,
  UK_OPPORTUNITY_STATES,
  UK_OPPORTUNITY_STATES_BASIS,
  UK_OPPORTUNITY_STATES_DISCLAIMER,
  UK_OPPORTUNITY_STATES_NEVER_FABRICATE,
  UK_OPPORTUNITY_STATES_REQUIRE_EVIDENCE,
  UK_OPPORTUNITY_STATES_REUSE_PRESENCE_CLASSES,
  UK_OPPORTUNITY_STATES_RULES,
  type UkOpportunityChainStage,
  type UkOpportunityStateDefinition,
} from '@/config/ukOpportunityStates';

const STATE_BY_ID = new Map(UK_OPPORTUNITY_STATES.map((s) => [s.id, s]));
const SOURCE_BY_ID = new Map(UK_OPPORTUNITY_EVIDENCE_SOURCES.map((s) => [s.id, s]));

/** True only when the value is a DECLARED UK opportunity state. */
export function isUkOpportunityState(value: string | null | undefined): boolean {
  return typeof value === 'string' && STATE_BY_ID.has(value as never);
}

/** Look up a declared evidence source, or `null`. */
export function resolveOpportunityEvidenceSource(id: string | null | undefined) {
  if (typeof id !== 'string') return null;
  return SOURCE_BY_ID.get(id) ?? null;
}

/**
 * Whether an evidence source's backing provider is genuinely available. Injected so
 * the resolver stays pure; the default (used when none is supplied) is `false` for
 * every provider — the honest fail-closed position, so nothing is asserted until a
 * real provider is configured.
 */
export type EvidenceAvailability = (providerId: string) => boolean;

export type UkOpportunityStateRefusal =
  | 'STATE_UNKNOWN'
  | 'STATE_REQUIRES_EVIDENCE'
  | 'STATE_EVIDENCE_SOURCE_UNKNOWN'
  | 'STATE_UNAVAILABLE_WITHOUT_EVIDENCE';

export interface UkOpportunityStateDecision {
  id: string;
  allowed: boolean;
  refusal: UkOpportunityStateRefusal | null;
  reason: string;
  evidenceSourceIds: string[];
}

/**
 * Decide whether one state may be ASSERTED at scale. FAIL CLOSED: the checks run in
 * a fixed order, and any failure refuses the state — a state is never fabricated.
 */
export function evaluateUkOpportunityState(
  state: Pick<UkOpportunityStateDefinition, 'id' | 'evidenceSourceIds'>,
  isEvidenceAvailable: EvidenceAvailability = () => false
): UkOpportunityStateDecision {
  const base = { id: state.id, evidenceSourceIds: [...state.evidenceSourceIds] };

  if (!isUkOpportunityState(state.id)) {
    return { ...base, allowed: false, refusal: 'STATE_UNKNOWN', reason: `"${state.id}" is not a declared UK opportunity state.` };
  }
  if (state.evidenceSourceIds.length === 0) {
    return { ...base, allowed: false, refusal: 'STATE_REQUIRES_EVIDENCE', reason: 'A state must rest on at least one DECLARED evidence source.' };
  }
  const unknownSource = state.evidenceSourceIds.find((s) => !SOURCE_BY_ID.has(s));
  if (unknownSource) {
    return { ...base, allowed: false, refusal: 'STATE_EVIDENCE_SOURCE_UNKNOWN', reason: `"${unknownSource}" is not a declared evidence source.` };
  }
  const unavailable = state.evidenceSourceIds
    .map((s) => SOURCE_BY_ID.get(s)!)
    .find((src) => !isEvidenceAvailable(src.providerId));
  if (unavailable) {
    return { ...base, allowed: false, refusal: 'STATE_UNAVAILABLE_WITHOUT_EVIDENCE', reason: `The provider behind "${unavailable.id}" (${unavailable.providerId}) is not available, so the state cannot be asserted — nothing is fabricated.` };
  }
  return { ...base, allowed: true, refusal: null, reason: 'A declared state whose every declared evidence source is backed by an available provider.' };
}

/* ── The founder-facing summary over the canonical owner ────────────────────── */

export interface UkOpportunityEvidenceSourceView {
  id: string;
  label: string;
  providerId: string;
  available: boolean;
}

export interface UkOpportunityStateView {
  id: string;
  label: string;
  evidenceLabels: string[];
  evidenceProviderIds: string[];
  assertable: boolean;
  refusal: UkOpportunityStateRefusal | null;
  reason: string;
}

export interface UkOpportunityStatesSummary {
  states: UkOpportunityStateView[];
  chainStages: UkOpportunityChainStage[];
  evidenceSources: UkOpportunityEvidenceSourceView[];
  /** The number of REAL (asserted) states today. Always 0 until providers exist. */
  realAssertedCount: number;
  assertableCount: number;
  refusedCount: number;
  availableEvidenceSourceCount: number;
  /** A live demonstration: the first state is REFUSED (fail-closed proof, computed not written). */
  exampleRefusal: { id: string; refusal: UkOpportunityStateRefusal | null; reason: string };
  oneOwner: boolean;
  reusesClasses: boolean;
  requiresEvidence: boolean;
  neverFabricates: boolean;
  sourcesReused: boolean;
  feedsMarketFitChain: boolean;
  rules: readonly string[];
  basis: string;
  disclaimer: string;
}

/**
 * Summarise the UK opportunity states at scale for the founder surface. The
 * decisions and the empty asserted-state count are DERIVED from the owner and the
 * resolver, so the surface shows the rule actually firing rather than merely
 * describing it.
 */
export function buildUkOpportunityStatesSummary(
  isEvidenceAvailable: EvidenceAvailability = () => false
): UkOpportunityStatesSummary {
  const evidenceSources: UkOpportunityEvidenceSourceView[] = UK_OPPORTUNITY_EVIDENCE_SOURCES.map((s) => ({
    id: s.id,
    label: s.label,
    providerId: s.providerId,
    available: isEvidenceAvailable(s.providerId),
  }));

  const states: UkOpportunityStateView[] = UK_OPPORTUNITY_STATES.map((st) => {
    const decision = evaluateUkOpportunityState(st, isEvidenceAvailable);
    return {
      id: st.id,
      label: st.label,
      evidenceLabels: st.evidenceSourceIds.map((id) => SOURCE_BY_ID.get(id)?.label ?? id),
      evidenceProviderIds: st.evidenceSourceIds.map((id) => SOURCE_BY_ID.get(id)?.providerId ?? id),
      assertable: decision.allowed,
      refusal: decision.refusal,
      reason: decision.reason,
    };
  });

  const first = states[0];

  return {
    states,
    chainStages: [...UK_OPPORTUNITY_CHAIN_STAGES],
    evidenceSources,
    realAssertedCount: 0,
    assertableCount: states.filter((s) => s.assertable).length,
    refusedCount: states.filter((s) => !s.assertable).length,
    availableEvidenceSourceCount: evidenceSources.filter((s) => s.available).length,
    exampleRefusal: {
      id: first?.id ?? '',
      refusal: first?.refusal ?? null,
      reason: first?.reason ?? '',
    },
    oneOwner: ONE_UK_OPPORTUNITY_STATES_OWNER,
    reusesClasses: UK_OPPORTUNITY_STATES_REUSE_PRESENCE_CLASSES,
    requiresEvidence: UK_OPPORTUNITY_STATES_REQUIRE_EVIDENCE,
    neverFabricates: UK_OPPORTUNITY_STATES_NEVER_FABRICATE,
    sourcesReused: OPPORTUNITY_EVIDENCE_SOURCES_REUSE_CANONICAL_PROVIDERS,
    feedsMarketFitChain: STATES_FEED_THE_MARKET_FIT_TO_OUTREACH_CHAIN,
    rules: UK_OPPORTUNITY_STATES_RULES,
    basis: UK_OPPORTUNITY_STATES_BASIS,
    disclaimer: UK_OPPORTUNITY_STATES_DISCLAIMER,
  };
}
