/**
 * §PHASE 12 — THE INTEGRATED ACQUISITION → CAPITAL → OPERATIONS LOOP (the ONE owner).
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `phase12-integrated-acquisition-capital-operations-loop` records the
 * integrated loop the whole business runs:
 *
 *   discovery → Explore UK Market Fit → qualification → outreach → onboarding →
 *   product readiness → commercial terms → Mercenta purchase → supply-route analysis →
 *   capital requirement → financing eligibility → financing → supplier purchase →
 *   Vendor operations → PO → fulfilment → invoice → payment → repayment → margin →
 *   Founder Intelligence
 *
 * That loop had NO single owner: each stage exists somewhere in the codebase, but the
 * ORDER and the fact that the LAST stage feeds the founder's own intelligence were held
 * nowhere. This module declares the loop ONCE. Every stage NAMES the canonical owner that
 * DETERMINISTICALLY owns its behaviour — the loop re-derives no figure of its own, so no
 * number is held twice. This module REFUSES to load if the declared loop is not legal.
 *
 * THE ONE NON-NEGOTIABLE RULE
 * ---------------------------
 * The loop is FORWARD-ONLY and CLOSED. A stage is reached from exactly its declared
 * predecessor (the transition set is DERIVED from the ordered list — there is no second
 * list of moves), and the final stage is Founder Intelligence, so the loop closes back into
 * the founder's own intelligence owner (`src/config/founderIntelligence.ts`, §PHASE 11).
 *
 * TENANT / ROLE POSITION
 * ----------------------
 * This is the FOUNDER'S (Super-Admin) view of the end-to-end business. It is INTERNAL: it is
 * surfaced ONLY on the Super-Admin Founder Control Centre and never imported by a brand
 * surface (the gate pins that).
 *
 * NO AI, no clock, no randomness, no network: this module is fully deterministic.
 */

/** One stage of the integrated loop. */
export interface IntegratedLoopStage {
  /** Stable id. */
  id: string;
  /** The stage, named plainly. */
  label: string;
  /** What happens at this stage (kept short and honest). */
  about: string;
  /**
   * The canonical module that DETERMINISTICALLY owns this stage's behaviour. The gate
   * asserts every declared owner path EXISTS on disk — a named owner is only meaningful
   * if it is real.
   */
  dataOwner: string;
}

/**
 * THE canonical integrated loop, in canonical order. Declared ONCE; nothing elsewhere may
 * keep a second list of the stages or of the moves between them.
 */
export const INTEGRATED_LOOP_STAGES: readonly IntegratedLoopStage[] = [
  {
    id: 'discovery',
    label: 'Discovery',
    about: 'Finding candidate brands in the ten approved categories.',
    dataOwner: 'src/lib/discovery/engine.ts',
  },
  {
    id: 'uk-market-fit',
    label: 'Explore UK Market Fit',
    about: 'Scoring a candidate against the UK opportunity states.',
    dataOwner: 'src/lib/preaudit/ukMarketFitEngine.ts',
  },
  {
    id: 'qualification',
    label: 'Qualification',
    about: 'Moving a qualified prospect through the acquisition pipeline.',
    dataOwner: 'src/lib/acquisition/acquisitionEngine.ts',
  },
  {
    id: 'outreach',
    label: 'Outreach',
    about: 'The forward-only approach that converts a prospect into a brand.',
    dataOwner: 'src/lib/finance/founderOutreach.ts',
  },
  {
    id: 'onboarding',
    label: 'Onboarding',
    about: 'The academy curriculum a new brand completes before it trades.',
    dataOwner: 'src/config/onboardingCurriculum.ts',
  },
  {
    id: 'product-readiness',
    label: 'Product readiness',
    about: 'The category-aware compliance gate every product must pass.',
    dataOwner: 'src/lib/compliance.ts',
  },
  {
    id: 'commercial-terms',
    label: 'Commercial terms',
    about: 'The brand-level commercial model (A commission or B resell), chosen explicitly.',
    dataOwner: 'src/config/commercialModel.ts',
  },
  {
    id: 'mercenta-purchase',
    label: 'Mercenta purchase',
    about: 'The Mercenta to brand commercial order and its acquisition arithmetic.',
    dataOwner: 'src/lib/finance/commercialModel.ts',
  },
  {
    id: 'supply-route-analysis',
    label: 'Supply-route analysis',
    about: 'The route from the brand to the channel, with its lead times and buffers.',
    dataOwner: 'src/lib/fulfillment/supplyRoute.ts',
  },
  {
    id: 'capital-requirement',
    label: 'Capital requirement',
    about: 'The capital the Model B purchase ties up, derived from the canonical POs.',
    dataOwner: 'src/lib/finance/capitalRequirement.ts',
  },
  {
    id: 'financing-eligibility',
    label: 'Financing eligibility',
    about: 'The deterministic router that picks the financing route for the need.',
    dataOwner: 'src/lib/finance/financingRouter.ts',
  },
  {
    id: 'financing',
    label: 'Financing',
    about: 'The declared financing facility a purchase is funded through.',
    dataOwner: 'src/config/financing.ts',
  },
  {
    id: 'supplier-purchase',
    label: 'Supplier purchase',
    about: 'The financed purchase of goods, modelled as a canonical financed purchase.',
    dataOwner: 'src/lib/finance/capitalRequirement.ts',
  },
  {
    id: 'vendor-operations',
    label: 'Vendor operations',
    about: 'Operating the retail-channel account on the brand’s behalf (Mercenta is the actor).',
    dataOwner: 'src/lib/commerce/proxyProcessor.ts',
  },
  {
    id: 'purchase-order',
    label: 'PO',
    about: 'Routing an incoming channel PO to the correct brand by its own lines.',
    dataOwner: 'src/lib/commerce/channelPurchaseOrderIngestion.ts',
  },
  {
    id: 'fulfilment',
    label: 'Fulfilment',
    about: 'Booking the carrier and filing the shipment against the order.',
    dataOwner: 'src/lib/fulfillment/index.ts',
  },
  {
    id: 'invoice',
    label: 'Invoice',
    about: 'Issuing the channel invoice against the fulfilled order.',
    dataOwner: 'src/lib/billing/invoice.ts',
  },
  {
    id: 'payment',
    label: 'Payment',
    about: 'Recording the channel settlement and reconciling it.',
    dataOwner: 'src/lib/finance/financialReconciliation.ts',
  },
  {
    id: 'repayment',
    label: 'Repayment',
    about: 'Repaying the financing when the channel settles — the purchase’s cost of capital.',
    dataOwner: 'src/lib/finance/capitalRequirement.ts',
  },
  {
    id: 'margin',
    label: 'Margin',
    about: 'The Mercenta margin, spread less every separate cost — never the gross spread.',
    dataOwner: 'src/lib/finance/commercialModel.ts',
  },
  {
    id: 'founder-intelligence',
    label: 'Founder Intelligence',
    about: 'The founder’s own intelligence — where the loop closes and reports back.',
    dataOwner: 'src/config/founderIntelligence.ts',
  },
];

/** The stage ids, derived once — the canonical key list. */
export const INTEGRATED_LOOP_STAGE_IDS: readonly string[] = INTEGRATED_LOOP_STAGES.map((s) => s.id);

/** The ENTRY stage id (the first declared stage). */
export const INTEGRATED_LOOP_ENTRY_STAGE_ID: string = INTEGRATED_LOOP_STAGES[0].id;

/**
 * The FINAL stage id — the loop CLOSES into the founder's own intelligence. Derived from the
 * ordered list, never re-typed, so it cannot drift.
 */
export const INTEGRATED_LOOP_FINAL_STAGE_ID: string =
  INTEGRATED_LOOP_STAGES[INTEGRATED_LOOP_STAGES.length - 1].id;

/**
 * The DECLARED predecessor of each stage, DERIVED from the ordered list: the entry stage has
 * none; every other stage is reached from exactly the one before it. This is the transition
 * set — there is no second, hand-maintained list of moves.
 */
export const INTEGRATED_LOOP_PREDECESSOR: Readonly<Record<string, string | null>> = Object.freeze(
  INTEGRATED_LOOP_STAGES.reduce<Record<string, string | null>>((acc, s, i) => {
    acc[s.id] = i === 0 ? null : INTEGRATED_LOOP_STAGES[i - 1].id;
    return acc;
  }, {})
);

/* ── Pinned invariants (the properties the summary + the gate assert) ─────── */

/** This module is the ONE owner of the integrated loop + the rule over it. */
export const ONE_INTEGRATED_LOOP_OWNER = true;
/** The loop is FORWARD-ONLY: a stage is reached only from its declared predecessor. */
export const INTEGRATED_LOOP_IS_FORWARD_ONLY = true;
/** Every stage names the canonical owner that deterministically owns its behaviour. */
export const INTEGRATED_LOOP_STAGES_HAVE_CANONICAL_OWNERS = true;
/** The loop CLOSES into the founder's own intelligence (the final stage). */
export const INTEGRATED_LOOP_CLOSES_INTO_FOUNDER_INTELLIGENCE = true;

export const INTEGRATED_LOOP_RULES: readonly string[] = [
  'The loop is declared once, in one order; a stage that is not declared is refused rather than guessed.',
  'The loop is forward-only: a stage is reached only from its declared predecessor (one forward step).',
  'Every stage names the canonical owner that deterministically owns its behaviour — the loop re-derives no figure of its own.',
  'The loop is closed: its final stage is Founder Intelligence, so the loop reports back into the founder’s own intelligence owner.',
];

export const INTEGRATED_LOOP_BASIS =
  'The integrated acquisition → capital → operations loop declares the end-to-end journey once, each stage naming the canonical owner that deterministically owns its behaviour. The moves between stages are derived from the ordered list (no second list), the loop is forward-only, and it closes into the founder’s own intelligence. It is deterministic (no AI, no clock, no network) and internal (Super-Admin only).';

export const INTEGRATED_LOOP_DISCLAIMER =
  'This is the FOUNDER’S own map of the end-to-end business. Naming a canonical owner against a stage states WHERE that stage’s behaviour comes from — it is not a claim that every stage is currently live with real credentials. Stages that depend on an external service run on their simulated client until real credentials are entered.';


/* ── Module-load guards (fail closed) ──────────────────────────────────────── */

{
  if (INTEGRATED_LOOP_STAGES.length === 0) {
    throw new Error('[integratedLoop] at least one stage must be declared');
  }
  const ids = new Set<string>();
  for (const s of INTEGRATED_LOOP_STAGES) {
    if (!s.id || !s.label || !s.about || !s.dataOwner) {
      throw new Error(`[integratedLoop] stage "${s.id}" is missing a field`);
    }
    if (ids.has(s.id)) {
      throw new Error(`[integratedLoop] duplicate stage id "${s.id}"`);
    }
    ids.add(s.id);
  }
  // The loop must CLOSE into the founder's own intelligence.
  if (INTEGRATED_LOOP_FINAL_STAGE_ID !== 'founder-intelligence') {
    throw new Error('[integratedLoop] the final stage must be founder-intelligence (the loop closes there)');
  }
}

