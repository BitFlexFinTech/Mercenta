/**
 * §PHASE 10 — ACQUISITION INTELLIGENCE AT SCALE (the ONE owner).
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `phase10-acquisition-intelligence-scale` records that
 * acquisition intelligence must operate AT SCALE over the REAL research sources —
 * and must NEVER be fabricated when no provider exists. The platform already holds
 * the canonical research providers in the integration registry (`firecrawl`,
 * `keepa`, `amazon_sp_api`, `companies_house`, `hunter`, `lead_sourcing`) and the
 * canonical pre-audit research seam (`src/lib/preaudit/researchProvider.ts`), but
 * there was no single owner declaring WHAT acquisition intelligence may be
 * produced, from WHICH source, over WHICH dimension of scale.
 *
 * This module is that owner. It declares, ONCE:
 *   · the DIMENSIONS of acquisition intelligence (the axes it scales over); and
 *   · the RESEARCH SOURCES that may supply them, each REUSING the canonical
 *     integration-registry provider id rather than re-declaring a provider list.
 *
 * THE RULE (fail closed): a signal may exist ONLY when it names a DECLARED source
 * that actually SUPPLIES its dimension AND whose backing provider is genuinely
 * available. When no provider is available the platform produces NO value — it is
 * REFUSED, never fabricated. AI (`openrouter`) is deliberately NOT a research
 * source: AI may SUMMARISE, never supply the data behind a signal.
 *
 * NO AI, no clock, no randomness, no network: this module is fully deterministic.
 */

/* ── The dimensions of scale (the axes acquisition intelligence scales over) ─── */

export type AcquisitionIntelligenceDimensionId =
  | 'brand_profile'
  | 'product_catalogue'
  | 'demand_signal'
  | 'competition_landscape'
  | 'company_register'
  | 'decision_maker_contact';

export interface AcquisitionIntelligenceDimension {
  id: AcquisitionIntelligenceDimensionId;
  label: string;
  description: string;
}

/**
 * The declared dimensions, declared once. A signal naming anything else is
 * REFUSED by the resolver rather than guessed.
 */
export const ACQUISITION_INTELLIGENCE_DIMENSIONS: readonly AcquisitionIntelligenceDimension[] = [
  { id: 'brand_profile', label: 'Brand profile', description: 'Who the brand is and whether it appears commercially viable.' },
  { id: 'product_catalogue', label: 'Product catalogue', description: 'Which products the brand sells, and under which identifiers.' },
  { id: 'demand_signal', label: 'Demand signal', description: 'Evidence about how much demand a product attracts.' },
  { id: 'competition_landscape', label: 'Competition landscape', description: 'Competing listings and the competitive position of the product.' },
  { id: 'company_register', label: 'Company register', description: 'Legal-entity facts drawn from a company register.' },
  { id: 'decision_maker_contact', label: 'Decision-maker contact', description: 'The person (or role) at the brand that a conversation should approach.' },
];

/* ── The research sources (each REUSING a canonical integration provider id) ─── */

export interface AcquisitionResearchSource {
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
  /** The declared dimensions this source is able to supply. */
  supplies: readonly AcquisitionIntelligenceDimensionId[];
}

/**
 * The declared research sources, taken from the canonical integration registry.
 * A signal citing anything else is REFUSED. AI (`openrouter`) is NOT listed.
 */
export const ACQUISITION_RESEARCH_SOURCES: readonly AcquisitionResearchSource[] = [
  { id: 'marketplace_catalogue', label: 'Marketplace catalogue data', description: 'Catalogue and listing data from the retail channel.', providerId: 'amazon_sp_api', supplies: ['product_catalogue'] },
  { id: 'product_history_demand', label: 'Product history and demand', description: 'Product history, ranking and demand signals.', providerId: 'keepa', supplies: ['demand_signal', 'competition_landscape'] },
  { id: 'brand_web_presence', label: 'Brand web presence', description: 'The brand’s own website and public web presence.', providerId: 'firecrawl', supplies: ['brand_profile', 'competition_landscape'] },
  { id: 'company_register', label: 'Company register', description: 'Legal-entity facts from the company register.', providerId: 'companies_house', supplies: ['company_register', 'brand_profile'] },
  { id: 'contact_discovery', label: 'Contact discovery', description: 'Decision-maker contact discovery.', providerId: 'hunter', supplies: ['decision_maker_contact'] },
  { id: 'lead_sourcing', label: 'Lead sourcing', description: 'Brand and lead sourcing lists.', providerId: 'lead_sourcing', supplies: ['brand_profile', 'decision_maker_contact'] },
];

/* ── The demonstration signals (never real intelligence) ────────────────────── */

/**
 * A signal is one unit of acquisition intelligence: a value about a brand/product
 * on one declared DIMENSION, resting on one declared SOURCE. A REAL signal carries
 * a value; the demonstrations below carry none — they exist only to exercise the
 * resolver's rules on the founder surface.
 */
export interface AcquisitionSignal {
  id: string;
  /** The declared dimension this signal is about. */
  dimensionId: string;
  /** The declared source the signal would rest on — `null` when none is cited. */
  sourceId: string | null;
  /** ALWAYS true on a demonstration: it is NOT real, researched intelligence. */
  illustrative: boolean;
}

/**
 * Unmistakable DEMONSTRATIONS. Each one exercises exactly ONE of the resolver's
 * refusals, in order, so the founder surface shows the rule FIRING rather than
 * merely describing it. They are NOT researched intelligence; no value is claimed.
 *   · d1 — a fully-shaped signal, refused because its provider is not available;
 *   · d2 — a signal that cites NO source;
 *   · d3 — a signal whose source does not SUPPLY its dimension;
 *   · d4 — a signal that cites an UNDECLARED source;
 *   · d5 — a signal on an UNDECLARED dimension.
 */
export const DEMO_ACQUISITION_SIGNALS: readonly AcquisitionSignal[] = [
  { id: 'demo-signal-1', dimensionId: 'brand_profile', sourceId: 'brand_web_presence', illustrative: true },
  { id: 'demo-signal-2', dimensionId: 'demand_signal', sourceId: null, illustrative: true },
  { id: 'demo-signal-3', dimensionId: 'company_register', sourceId: 'marketplace_catalogue', illustrative: true },
  { id: 'demo-signal-4', dimensionId: 'demand_signal', sourceId: 'made_up_source', illustrative: true },
  { id: 'demo-signal-5', dimensionId: 'made_up_dimension', sourceId: 'product_history_demand', illustrative: true },
];

/* ── The founder-facing explanation + pinned invariants ─────────────────────── */

export const ONE_ACQUISITION_INTELLIGENCE_OWNER = true;
/** A signal may rest only on a DECLARED research source. */
export const ACQUISITION_INTELLIGENCE_REQUIRES_A_NAMED_SOURCE = true;
/** When no provider is available the platform produces NO value — never fabricated. */
export const ACQUISITION_INTELLIGENCE_NEVER_FABRICATES = true;
/** The research sources REUSE the canonical integration providers, never re-declared. */
export const RESEARCH_SOURCES_ARE_REUSED_NOT_REDECLARED = true;
/** AI may only summarise — it is NOT a research source and never supplies a signal. */
export const AI_MAY_ONLY_SUMMARISE_INTELLIGENCE = true;

export const ACQUISITION_INTELLIGENCE_RULES: readonly string[] = [
  'A signal may exist only when it names a DECLARED research source that actually SUPPLIES its dimension — an unknown dimension, an unknown source or a source that does not supply the dimension is refused rather than guessed.',
  'The research sources REUSE the canonical integration-registry providers; availability is resolved through the SAME mode machine as the rest of the platform, so a source can never claim a live provider the platform reports as simulated.',
  'When no provider is available the platform produces NO value: the signal is REFUSED, never fabricated — real data in, nothing invented.',
  'AI may only SUMMARISE an acquisition signal; it is not a research source and never supplies the data behind one.',
  'Acquisition intelligence is deterministic (no AI, no clock, no network) and internal to Mercenta: no brand ever sees it.',
];


export const ACQUISITION_INTELLIGENCE_BASIS =
  'Acquisition intelligence is declared once here: the dimensions it scales over and the research sources that may supply them. A signal may rest only on a DECLARED source that SUPPLIES its dimension and whose canonical integration provider is genuinely available; an unknown dimension, an unknown source, a source that does not supply the dimension, and a signal with no available provider are all REFUSED — nothing is ever fabricated. It is deterministic — no AI, no clock.';

export const ACQUISITION_INTELLIGENCE_DISCLAIMER =
  'This declares WHAT intelligence may be produced and from WHICH source, not any real intelligence. No live research provider is configured, so no acquisition signal has been produced: every signal shown is an unmistakable DEMONSTRATION and is REFUSED. Real intelligence is produced only as the named research providers are activated, and no signal is ever fabricated.';

/* ── Module-load guards (fail closed) ──────────────────────────────────────── */

function assertAcquisitionIntelligenceIntegrity(): void {
  if (ACQUISITION_INTELLIGENCE_DIMENSIONS.length === 0) {
    throw new Error('[acquisitionIntelligence] at least one dimension must be declared');
  }
  const dimensionIds = new Set(ACQUISITION_INTELLIGENCE_DIMENSIONS.map((d) => d.id));
  if (dimensionIds.size !== ACQUISITION_INTELLIGENCE_DIMENSIONS.length) {
    throw new Error('[acquisitionIntelligence] dimension ids must be unique');
  }
  if (ACQUISITION_RESEARCH_SOURCES.length === 0) {
    throw new Error('[acquisitionIntelligence] at least one research source must be declared');
  }
  const sourceIds = new Set(ACQUISITION_RESEARCH_SOURCES.map((s) => s.id));
  if (sourceIds.size !== ACQUISITION_RESEARCH_SOURCES.length) {
    throw new Error('[acquisitionIntelligence] research-source ids must be unique');
  }
  for (const s of ACQUISITION_RESEARCH_SOURCES) {
    if (s.providerId.trim().length === 0) {
      throw new Error(`[acquisitionIntelligence] source "${s.id}" must name a provider id`);
    }
    if (s.supplies.length === 0) {
      throw new Error(`[acquisitionIntelligence] source "${s.id}" must supply at least one dimension`);
    }
    // Every supplied dimension must be DECLARED. (The demonstration signals
    // deliberately reference undeclared ids to prove the refusals, so they are not
    // checked here — only the STRUCTURE of the declarations is guarded.)
    for (const d of s.supplies) {
      if (!dimensionIds.has(d)) {
        throw new Error(`[acquisitionIntelligence] source "${s.id}" supplies an undeclared dimension "${d}"`);
      }
    }
  }
  const signalIds = new Set<string>();
  for (const g of DEMO_ACQUISITION_SIGNALS) {
    if (signalIds.has(g.id)) {
      throw new Error(`[acquisitionIntelligence] duplicate signal id "${g.id}"`);
    }
    signalIds.add(g.id);
  }
}

assertAcquisitionIntelligenceIntegrity();

