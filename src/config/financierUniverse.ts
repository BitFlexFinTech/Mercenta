/**
 * §PHASE 7 — THE FINANCIER UNIVERSE (the ONE owner).
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `phase7-financier-universe-research` records the REAL
 * financing-partner universe Mercenta raises capital from — banks and PO /
 * inventory / trade / receivables financiers, working-capital, SME and
 * e-commerce finance providers and alternative-credit funds across the UK,
 * Europe, Africa, the US and other relevant markets — with the FULL financier
 * record, the SOURCE EVIDENCE behind it and a LAST-RESEARCHED date.
 *
 * Three modules already DELIBERATELY hold no real provider and point at this
 * separate row as the missing owner: `src/config/financierLifecycle.ts`,
 * `src/config/founderOutreach.ts` and `src/config/pitchWorkspace.ts`. This module
 * is that owner.
 *
 * The whole rule is the platform's own evidence rule applied to financing
 * partners: **real providers in, no invented figure ever**. A provider may enter
 * the universe ONLY with a NAMED, PUBLISHED source and a LAST-RESEARCHED date.
 * NO provider has been researched yet, so the REAL universe is EMPTY — and the
 * module is honest about that: the only entries here are unmistakable
 * ILLUSTRATIVE PLACEHOLDERS used to demonstrate the record and the rule.
 *
 * TWO DISTINCT FACTS, never collapsed (the same discipline as
 * `src/config/vat.ts` and `src/config/financierLifecycle.ts`):
 *   · the UNIVERSE DEFINITION — the record shape, the taxonomy, the market scope
 *     and the research rule (real, complete); and
 *   · the LABELLED ILLUSTRATIVE RECORDS — placeholders that are NOT researched
 *     financiers and are refused entry by the resolver.
 *
 * NO AI, no clock, no randomness, no network: this module is fully deterministic.
 */

/* ── The provider-type taxonomy (the kinds of financing partner) ─────────────── */

export interface FinancierProviderType {
  id: string;
  label: string;
  description: string;
}

/**
 * The declared provider types, taken from the registry row. A provider naming
 * anything else is REFUSED by the resolver rather than guessed.
 */
export const FINANCIER_PROVIDER_TYPES: readonly FinancierProviderType[] = [
  { id: 'bank', label: 'Bank', description: 'A bank or building society lending directly (overdraft, term loan, invoice or asset finance).' },
  { id: 'po_finance', label: 'Purchase-order finance', description: 'A provider that advances against a confirmed purchase order.' },
  { id: 'inventory_finance', label: 'Inventory finance', description: 'A provider that advances against goods held as stock.' },
  { id: 'trade_finance', label: 'Trade finance', description: 'A provider funding cross-border trade (letters of credit, import/export finance).' },
  { id: 'receivables_finance', label: 'Receivables finance', description: 'A provider that advances against the amounts owed by the retail channel.' },
  { id: 'working_capital', label: 'Working capital', description: 'A revolving facility for the gap between paying a brand and being paid by the channel.' },
  { id: 'sme_finance', label: 'SME finance', description: 'A provider specialising in small- and medium-business lending.' },
  { id: 'ecommerce_finance', label: 'E-commerce finance', description: 'A provider specialising in marketplace / e-commerce sellers.' },
  { id: 'alternative_credit', label: 'Alternative credit', description: 'An alternative-credit fund or non-bank lender.' },
];

/* ── The market scope ───────────────────────────────────────────────────────── */

export interface FinancierMarket {
  id: string;
  label: string;
}

/**
 * The declared markets, taken from the registry row. A provider spanning any
 * other market is REFUSED until that market is declared.
 */
export const FINANCIER_MARKETS: readonly FinancierMarket[] = [
  { id: 'uk', label: 'United Kingdom' },
  { id: 'europe', label: 'Europe' },
  { id: 'africa', label: 'Africa' },
  { id: 'us', label: 'United States' },
  { id: 'other', label: 'Other relevant markets' },
];

/* ── The full financier record ──────────────────────────────────────────────── */

/**
 * The SOURCE EVIDENCE behind a provider — the named, published source the
 * provider record rests on. This is the platform's evidence rule applied to a
 * financing partner: a publisher, a reference and the date it was published.
 */
export interface FinancierResearchSource {
  /** The named body that publishes the evidence (e.g. a bank's corporate site, a regulator's register). */
  publisher: string;
  /** The publication / page / register reference. */
  reference: string;
  /** The date the source was published (ISO YYYY-MM-DD). */
  publishedOn: string;
}

/**
 * THE FULL FINANCIER RECORD. `source` and `lastResearched` are `null` ONLY on an
 * illustrative placeholder: for a REAL entry the resolver requires both.
 */
export interface FinancierRecord {
  id: string;
  /** The provider's legal name, exactly as the source names it. */
  legalName: string;
  /** A declared provider type (see `FINANCIER_PROVIDER_TYPES`). */
  providerTypeId: string;
  /** The declared markets the provider operates in (at least one). */
  marketIds: readonly string[];
  /** The named published source — required for a real entry, `null` on a placeholder. */
  source: FinancierResearchSource | null;
  /** The date the provider was last researched (ISO YYYY-MM-DD) — required for a real entry. */
  lastResearched: string | null;
  /** ALWAYS true on a placeholder: it is NOT a researched financier. */
  illustrative: boolean;
}

/** The fields of the full financier record, so the surface can show its shape. */
export interface FinancierRecordField {
  key: string;
  label: string;
  requirement: string;
  /** True when a REAL entry may not be entered without this field. */
  requiredForRealEntry: boolean;
}

export const FINANCIER_RECORD_FIELDS: readonly FinancierRecordField[] = [
  { key: 'legalName', label: 'Legal name', requirement: 'The provider’s legal name, exactly as the named source gives it.', requiredForRealEntry: true },
  { key: 'providerTypeId', label: 'Provider type', requirement: 'One of the declared provider types.', requiredForRealEntry: true },
  { key: 'marketIds', label: 'Markets', requirement: 'At least one declared market the provider operates in.', requiredForRealEntry: true },
  { key: 'source', label: 'Source evidence', requirement: 'The NAMED, PUBLISHED source (publisher, reference and published date) the record rests on.', requiredForRealEntry: true },
  { key: 'lastResearched', label: 'Last researched', requirement: 'The date the provider was last researched (ISO YYYY-MM-DD).', requiredForRealEntry: true },
];

/* ── The labelled illustrative placeholders (never a researched financier) ──── */

/**
 * Unmistakable PLACEHOLDERS: they demonstrate the RECORD and the RULE on the
 * founder surface and are NOT researched financiers. Every one is marked
 * `illustrative`, so the resolver REFUSES it entry to the real universe — which
 * is the honest position: no provider has been researched yet. Nothing here may
 * be read as a claim about the world.
 */
export const DEMO_FINANCIER_RECORDS: readonly FinancierRecord[] = [
  {
    id: 'demo-financier-1',
    legalName: 'Illustrative provider (placeholder — not a researched financier)',
    providerTypeId: 'bank',
    marketIds: ['uk'],
    source: null,
    lastResearched: null,
    illustrative: true,
  },
  {
    id: 'demo-financier-2',
    legalName: 'Illustrative provider (placeholder — not a researched financier)',
    providerTypeId: 'receivables_finance',
    marketIds: ['uk', 'europe'],
    source: { publisher: 'Illustrative source (placeholder — not a real publication)', reference: 'placeholder', publishedOn: '2000-01-01' },
    lastResearched: '2000-01-01',
    illustrative: true,
  },
  {
    id: 'demo-financier-3',
    legalName: 'Illustrative provider (placeholder — not a researched financier)',
    providerTypeId: 'alternative_credit',
    marketIds: ['other'],
    source: null,
    lastResearched: null,
    illustrative: true,
  },
];
/* ── The founder-facing explanation + pinned invariants ─────────────────────── */

export const ONE_FINANCIER_UNIVERSE_OWNER = true;
/** A REAL provider may enter only with a named, published source. */
export const FINANCIER_UNIVERSE_REQUIRES_NAMED_SOURCE = true;
/** A REAL provider may enter only with a last-researched date. */
export const FINANCIER_UNIVERSE_REQUIRES_RESEARCH_DATE = true;
/** Unknown type / market, an unsourced entry, an undated entry and a placeholder are all REFUSED. */
export const FINANCIER_UNIVERSE_FAILS_CLOSED = true;

export const FINANCIER_UNIVERSE_RULES: readonly string[] = [
  'A provider may enter the universe only with a NAMED, PUBLISHED source and a LAST-RESEARCHED date — no provider is ever invented.',
  'Every provider names a declared provider type and at least one declared market; an unknown type or market is refused rather than guessed.',
  'An illustrative placeholder is never a researched financier and is refused entry to the real universe.',
  'The universe is deterministic (no AI, no clock, no network) and internal to Mercenta’s treasury: no brand ever sees it.',
];

export const FINANCIER_UNIVERSE_BASIS =
  'The financier universe is declared once here: the provider-type taxonomy, the market scope, the full financier record and the research discipline. A provider may enter only with a NAMED PUBLISHED SOURCE and a LAST-RESEARCHED DATE; an unknown provider type or market, an unsourced or undated entry, and an illustrative placeholder are all refused. It is deterministic — no AI, no clock.';

export const FINANCIER_UNIVERSE_DISCLAIMER =
  'This declares the RECORD and the RULE, not any real financier. No financing partner has been researched yet: the universe holds ZERO real providers, and every entry shown is an unmistakable ILLUSTRATIVE PLACEHOLDER. Real partners — each with a named published source and a last-researched date — are added as they are researched, and no provider is ever invented.';

/* ── Module-load guards (fail closed) ──────────────────────────────────────── */

{
  if (FINANCIER_PROVIDER_TYPES.length === 0) {
    throw new Error('[financierUniverse] at least one provider type must be declared');
  }
  const typeIds = new Set(FINANCIER_PROVIDER_TYPES.map((t) => t.id));
  if (typeIds.size !== FINANCIER_PROVIDER_TYPES.length) {
    throw new Error('[financierUniverse] provider-type ids must be unique');
  }
  if (FINANCIER_MARKETS.length === 0) {
    throw new Error('[financierUniverse] at least one market must be declared');
  }
  const marketIds = new Set(FINANCIER_MARKETS.map((m) => m.id));
  if (marketIds.size !== FINANCIER_MARKETS.length) {
    throw new Error('[financierUniverse] market ids must be unique');
  }
  for (const f of FINANCIER_RECORD_FIELDS) {
    if (!f.key || !f.label || !f.requirement) {
      throw new Error(`[financierUniverse] record field "${f.key}" is missing a field`);
    }
  }
  // Every record must reference declared ids; a REAL (non-illustrative) record must be sourced AND dated.
  const recordIds = new Set<string>();
  for (const r of DEMO_FINANCIER_RECORDS) {
    if (recordIds.has(r.id)) {
      throw new Error(`[financierUniverse] duplicate record id "${r.id}"`);
    }
    recordIds.add(r.id);
    if (!typeIds.has(r.providerTypeId)) {
      throw new Error(`[financierUniverse] record "${r.id}" names an undeclared provider type "${r.providerTypeId}"`);
    }
    if (r.marketIds.length === 0 || r.marketIds.some((m) => !marketIds.has(m))) {
      throw new Error(`[financierUniverse] record "${r.id}" names an undeclared market`);
    }
    if (!r.illustrative && (!r.source || !r.lastResearched)) {
      throw new Error(`[financierUniverse] a real record "${r.id}" must carry a source and a last-researched date`);
    }
  }
}

