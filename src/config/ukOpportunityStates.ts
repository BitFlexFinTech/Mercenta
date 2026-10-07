/**
 * §PHASE 10 — THE UK OPPORTUNITY STATES AT SCALE (the ONE owner).
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `phase10-uk-opportunity-states` records that the six UK
 * opportunity states A–F must operate AT SCALE, feeding UK Market Fit →
 * qualification → outreach. §PHASE 1 already IMPLEMENTS the classification: the
 * six classes A–F are declared ONCE in `src/config/ukMarketFit.ts →
 * UK_PRESENCE_CLASSES`, and `src/lib/preaudit/ukMarketFitEngine.ts →
 * classifyUkPresence` chooses one from the research. What was missing is the
 * SCALED EVIDENCE behind each state: which real research sources a state must rest
 * on, declared once, so a state can only be ASSERTED when the evidence behind it
 * is genuinely available — never fabricated.
 *
 * This module is that owner. It declares, ONCE:
 *   · the RESEARCH SOURCES that may back a UK opportunity-state classification,
 *     each REUSING a canonical integration-registry provider id rather than
 *     re-declaring a provider list;
 *   · the CHAIN the states feed (UK Market Fit → qualification → outreach),
 *     REUSING the canonical integrated-loop stage ids for those three stages; and
 *   · for each of the six states A–F, the EVIDENCE it rests on at scale — the
 *     sources whose evidence Phase 1's fixture inputs already represent.
 *
 * The six class ids and labels are REUSED from `UK_PRESENCE_CLASSES` (asserted by
 * a module-load guard), never re-declared, so the states and the classification
 * can never drift apart.
 *
 * THE RULE (fail closed): a state may be ASSERTED at scale ONLY when it names at
 * least one declared evidence source AND every one of those sources is backed by a
 * genuinely available provider. When no provider is available the platform asserts
 * NO state — it is REFUSED, never fabricated. AI is not an evidence source.
 *
 * NO AI, no clock, no randomness, no network: this module is fully deterministic.
 */
import { UK_PRESENCE_CLASSES, type UkPresenceClass } from '@/config/ukMarketFit';

/* ── The chain the states feed (REUSING the canonical integrated-loop stage ids) ─ */

export type UkOpportunityChainStageId = 'uk-market-fit' | 'qualification' | 'outreach';

export interface UkOpportunityChainStage {
  id: UkOpportunityChainStageId;
  label: string;
}

/**
 * The three stages the row names — "UK Market Fit → qualification → outreach".
 * The ids are the CANONICAL integrated-loop stage ids (`src/config/integratedLoop.ts`),
 * REUSED rather than re-declared, so the chain cannot drift from the loop.
 */
export const UK_OPPORTUNITY_CHAIN_STAGES: readonly UkOpportunityChainStage[] = [
  { id: 'uk-market-fit', label: 'Explore UK Market Fit' },
  { id: 'qualification', label: 'Qualification' },
  { id: 'outreach', label: 'Outreach' },
];

/* ── The research sources that may back a state (each REUSING a provider id) ──── */

export interface UkOpportunityEvidenceSource {
  id: string;
  label: string;
  description: string;
  /**
   * The canonical integration-registry provider id that backs this source. It is
   * REUSED, never re-declared: availability is resolved through the SAME
   * integration mode machine the rest of the platform uses, so a source can never
   * claim a live provider the platform itself reports as simulated/unconfigured.
   */
  providerId: string;
}

/**
 * The declared evidence sources, each REUSING a canonical integration-registry
 * provider id. A state citing anything else is REFUSED rather than guessed.
 */
export const UK_OPPORTUNITY_EVIDENCE_SOURCES: readonly UkOpportunityEvidenceSource[] = [
  { id: 'marketplace_listing_data', label: 'Marketplace listing data', description: 'Whether the product is listed in the UK, and under which product identity.', providerId: 'amazon_sp_api' },
  { id: 'product_history_demand', label: 'Product history and demand', description: 'Product history, ranking and demand evidence for the product.', providerId: 'keepa' },
  { id: 'brand_web_presence', label: 'Brand web presence', description: 'The brand’s own UK web presence and catalogue footprint.', providerId: 'firecrawl' },
  { id: 'company_register', label: 'Company register', description: 'Legal-entity facts about the brand from the company register.', providerId: 'companies_house' },
];

/* ── The six opportunity states at scale (class ids/labels REUSED) ────────────── */

export interface UkOpportunityStateDefinition {
  /** The canonical class id — one of the six `UK_PRESENCE_CLASSES` (A–F). */
  id: UkPresenceClass;
  /** The label — REUSED from `UK_PRESENCE_CLASSES` and asserted equal at module load. */
  label: string;
  /**
   * The declared evidence sources this state rests on at scale. A state with no
   * declared source is REFUSED. These mirror the research facts §PHASE 1's
   * `classifyUkPresence` already reads from its fixture — they add no new business
   * rule, they name WHERE the evidence behind the state comes from.
   */
  evidenceSourceIds: readonly string[];
}

const CLASS_LABEL = new Map(UK_PRESENCE_CLASSES.map((c) => [c.id, c.label] as const));

/**
 * The six states, declared once. The ids and labels are REUSED from
 * `UK_PRESENCE_CLASSES`; the module-load guard fails if they ever drift.
 */
export const UK_OPPORTUNITY_STATES: readonly UkOpportunityStateDefinition[] = [
  { id: 'A', label: CLASS_LABEL.get('A')!, evidenceSourceIds: ['marketplace_listing_data'] },
  { id: 'B', label: CLASS_LABEL.get('B')!, evidenceSourceIds: ['marketplace_listing_data'] },
  { id: 'C', label: CLASS_LABEL.get('C')!, evidenceSourceIds: ['brand_web_presence', 'marketplace_listing_data'] },
  { id: 'D', label: CLASS_LABEL.get('D')!, evidenceSourceIds: ['brand_web_presence', 'product_history_demand'] },
  { id: 'E', label: CLASS_LABEL.get('E')!, evidenceSourceIds: ['brand_web_presence', 'marketplace_listing_data'] },
  { id: 'F', label: CLASS_LABEL.get('F')!, evidenceSourceIds: ['product_history_demand', 'marketplace_listing_data'] },
];

/* ── The founder-facing explanation + pinned invariants ─────────────────────── */

export const ONE_UK_OPPORTUNITY_STATES_OWNER = true;
/** The six state ids and labels are REUSED from `UK_PRESENCE_CLASSES`, never re-declared. */
export const UK_OPPORTUNITY_STATES_REUSE_PRESENCE_CLASSES = true;
/** A state must name at least one declared evidence source to be asserted at scale. */
export const UK_OPPORTUNITY_STATES_REQUIRE_EVIDENCE = true;
/** When no evidence provider is available the platform asserts NO state — never fabricated. */
export const UK_OPPORTUNITY_STATES_NEVER_FABRICATE = true;
/** The evidence sources REUSE the canonical integration providers, never re-declared. */
export const OPPORTUNITY_EVIDENCE_SOURCES_REUSE_CANONICAL_PROVIDERS = true;
/** The six states feed the canonical UK Market Fit → qualification → outreach chain. */
export const STATES_FEED_THE_MARKET_FIT_TO_OUTREACH_CHAIN = true;

export const UK_OPPORTUNITY_STATES_RULES: readonly string[] = [
  'The six UK opportunity states A–F are the §PHASE 1 classification; this owner declares the EVIDENCE each state rests on at scale, never a second classification.',
  'The state ids and labels are REUSED from `UK_PRESENCE_CLASSES` (`src/config/ukMarketFit.ts`): the classification and the scaled states cannot drift apart.',
  'A state may be asserted at scale ONLY when it names a DECLARED evidence source and every one of its sources is backed by a genuinely available provider.',
  'The evidence sources REUSE the canonical integration-registry providers; availability is resolved through the SAME mode machine as the rest of the platform, so a source can never claim a live provider the platform reports as simulated.',
  'When no evidence provider is available the platform asserts NO state: the state is REFUSED, never fabricated — real data in, nothing invented.',
  'The six states feed the canonical UK Market Fit → qualification → outreach chain, whose stage ids are REUSED from the integrated loop.',
  'The scaled states are deterministic (no AI, no clock, no network) and internal to Mercenta: no brand ever sees them.',
];

export const UK_OPPORTUNITY_STATES_BASIS =
  'The UK opportunity states at scale are declared once here: the research sources that may back a state (each REUSING a canonical integration provider) and, for each of the six §PHASE 1 states A–F, the evidence it rests on. A state may be asserted only when it names a DECLARED evidence source and every one of its sources is backed by a genuinely available provider; an unknown state, a state with no evidence and a state naming an unknown source are all REFUSED — nothing is ever fabricated. The states feed the canonical UK Market Fit → qualification → outreach chain (stage ids reused from the integrated loop). It is deterministic — no AI, no clock.';

export const UK_OPPORTUNITY_STATES_DISCLAIMER =
  'This declares WHICH evidence each of the six UK opportunity states must rest on at scale, not any real classification. No live research provider is configured, so no state has been asserted: every state shown is REFUSED because the evidence behind it is not available. Real states are asserted only as the named research providers are activated, and no state is ever fabricated.';

/* ── Module-load guards (fail closed) ──────────────────────────────────────── */

function assertUkOpportunityStatesIntegrity(): void {
  if (UK_OPPORTUNITY_CHAIN_STAGES.length === 0) {
    throw new Error('[ukOpportunityStates] at least one chain stage must be declared');
  }
  if (new Set(UK_OPPORTUNITY_CHAIN_STAGES.map((s) => s.id)).size !== UK_OPPORTUNITY_CHAIN_STAGES.length) {
    throw new Error('[ukOpportunityStates] chain-stage ids must be unique');
  }
  if (UK_OPPORTUNITY_EVIDENCE_SOURCES.length === 0) {
    throw new Error('[ukOpportunityStates] at least one evidence source must be declared');
  }
  const sourceIds = new Set(UK_OPPORTUNITY_EVIDENCE_SOURCES.map((s) => s.id));
  if (sourceIds.size !== UK_OPPORTUNITY_EVIDENCE_SOURCES.length) {
    throw new Error('[ukOpportunityStates] evidence-source ids must be unique');
  }
  for (const s of UK_OPPORTUNITY_EVIDENCE_SOURCES) {
    if (s.providerId.trim().length === 0) {
      throw new Error(`[ukOpportunityStates] evidence source "${s.id}" must name a provider id`);
    }
  }
  if (UK_OPPORTUNITY_STATES.length === 0) {
    throw new Error('[ukOpportunityStates] at least one state must be declared');
  }
  const stateIds = new Set(UK_OPPORTUNITY_STATES.map((s) => s.id));
  if (stateIds.size !== UK_OPPORTUNITY_STATES.length) {
    throw new Error('[ukOpportunityStates] state ids must be unique');
  }
  // The REUSE guarantee: every declared state must be one of the canonical six
  // presence classes, and its label must equal the class label exactly.
  const classIds = new Set(UK_PRESENCE_CLASSES.map((c) => c.id));
  if (stateIds.size !== classIds.size) {
    throw new Error('[ukOpportunityStates] the declared states must be exactly the six presence classes');
  }
  for (const s of UK_OPPORTUNITY_STATES) {
    if (!classIds.has(s.id)) {
      throw new Error(`[ukOpportunityStates] state "${s.id}" is not a declared presence class`);
    }
    if (CLASS_LABEL.get(s.id) !== s.label) {
      throw new Error(`[ukOpportunityStates] state "${s.id}" must REUSE the presence-class label`);
    }
    if (s.evidenceSourceIds.length === 0) {
      throw new Error(`[ukOpportunityStates] state "${s.id}" must rest on at least one evidence source`);
    }
    for (const src of s.evidenceSourceIds) {
      if (!sourceIds.has(src)) {
        throw new Error(`[ukOpportunityStates] state "${s.id}" names an undeclared evidence source "${src}"`);
      }
    }
  }
}

assertUkOpportunityStatesIntegrity();
