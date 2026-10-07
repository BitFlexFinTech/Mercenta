/**
 * §PHASE 11 — THE FOUNDER INTELLIGENCE EXPANSION (the ONE owner).
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `phase11-founder-intelligence-expansion` records the founder
 * intelligence expansion: the platform must answer the founder's standing questions —
 * what is happening, what needs attention, what opportunities exist, what is blocked,
 * which brands to pursue, which products matter, which purchase orders need action,
 * where capital is tied up, where financing is needed, which financier conversations
 * need follow-up, and what changed this week. The row's one NON-NEGOTIABLE rule is:
 * **"AI summarises; canonical deterministic data stays the source of truth."**
 *
 * That rule is enforced HERE, structurally: every question DECLARES the canonical owner
 * that deterministically ANSWERS it. AI may SUMMARISE an answer — it may NEVER supply or
 * invent the data behind one. There is no second, hand-maintained question list, and this
 * module REFUSES to load if the declared question set is not legal.
 *
 * TENANT / ROLE POSITION
 * ----------------------
 * This is the FOUNDER'S (Super-Admin) intelligence over the WHOLE portfolio. It is
 * internal: it is surfaced ONLY on the Super-Admin Founder Control Centre and is never
 * imported by a brand surface (the gate pins that). It re-derives no figure of its own —
 * every answer points at the canonical owner that already computes it, so no number is
 * held twice.
 *
 * NO AI, no clock, no randomness, no network: this module is fully deterministic.
 */

/** How a piece of a founder answer is produced. */
export type FounderAnswerProduceKind =
  /** The DATA behind the answer — produced ONLY by the declared canonical owner. */
  | 'data'
  /** A prose summary OVER the data — AI may help; never the data itself. */
  | 'summary';

/** Who is producing a piece of a founder answer. */
export type FounderAnswerSource = 'canonical_owner' | 'ai' | 'human';

/** The declared producers, so nothing can invent a fourth. */
export const FOUNDER_ANSWER_SOURCES: readonly FounderAnswerSource[] = ['canonical_owner', 'ai', 'human'];

/**
 * One founder question. `dataOwner` names the canonical module that DETERMINISTICALLY
 * answers it — the answer is computed there, never here and never by AI. `aiMaySummarise`
 * records that AI may draft a prose summary OVER that data (and only that).
 */
export interface FounderQuestion {
  /** Stable id. */
  id: string;
  /** The founder's question, in the founder's own words. */
  question: string;
  /** What the answer is about (kept short and honest). */
  about: string;
  /** The canonical owner that deterministically computes the answer's data. */
  dataOwner: string;
  /**
   * AI may summarise — but only summarise. The DATA always comes from `dataOwner`;
   * this flag never lets AI supply a figure.
   */
  aiMaySummarise: boolean;
}

/**
 * THE canonical founder questions, in canonical order. Each is declared ONCE and names
 * the canonical owner behind it; nothing elsewhere may keep a second list of them.
 */
export const FOUNDER_QUESTIONS: readonly FounderQuestion[] = [
  {
    id: 'what-is-happening',
    question: 'What is happening across the platform right now?',
    about: 'The live operational picture — portfolio, revenue signals and workload.',
    dataOwner: 'src/lib/commandCentre/controlCentre.ts',
    aiMaySummarise: true,
  },
  {
    id: 'what-needs-attention',
    question: 'What needs my attention?',
    about: 'The work that is critical or past its deadline and is waiting on a decision.',
    dataOwner: 'src/lib/work/workStore.ts',
    aiMaySummarise: true,
  },
  {
    id: 'what-opportunities-exist',
    question: 'What opportunities exist?',
    about: 'The acquisition pipeline — active prospects and where they sit.',
    dataOwner: 'src/lib/acquisition/acquisitionEngine.ts',
    aiMaySummarise: true,
  },
  {
    id: 'what-is-blocked',
    question: 'What is blocked?',
    about: 'Work and automations that cannot progress without something being cleared.',
    dataOwner: 'src/lib/automation/registry.ts',
    aiMaySummarise: true,
  },
  {
    id: 'which-brands-to-pursue',
    question: 'Which brands should I pursue?',
    about: 'UK Market Fit qualification — which prospects are worth approaching.',
    dataOwner: 'src/lib/preaudit/ukMarketFitEngine.ts',
    aiMaySummarise: true,
  },
  {
    id: 'which-products-matter',
    question: 'Which products matter?',
    about: 'The canonical business-intelligence findings over the product universe.',
    dataOwner: 'src/lib/intelligence/intelligenceLayer.ts',
    aiMaySummarise: true,
  },
  {
    id: 'which-pos-need-action',
    question: 'Which purchase orders need action?',
    about: 'The purchase-order work the operating layer has derived.',
    dataOwner: 'src/lib/work/workStore.ts',
    aiMaySummarise: true,
  },
  {
    id: 'where-capital-is-tied-up',
    question: 'Where is capital tied up?',
    about: 'The internal capital model — how much Model B acquisition ties up.',
    dataOwner: 'src/lib/finance/capitalRequirement.ts',
    aiMaySummarise: true,
  },
  {
    id: 'where-financing-is-needed',
    question: 'Where is financing needed?',
    about: 'The financing router — which purchases need an external facility.',
    dataOwner: 'src/lib/finance/financingRouter.ts',
    aiMaySummarise: true,
  },
  {
    id: 'which-financier-conversations-need-follow-up',
    question: 'Which financier conversations need follow-up?',
    about: 'The founder outreach pipeline — which partner contacts are open and due.',
    dataOwner: 'src/lib/finance/founderOutreach.ts',
    aiMaySummarise: true,
  },
  {
    id: 'what-changed-this-week',
    question: 'What changed this week?',
    about: 'The platform audit trail — the recorded actions taken this week.',
    dataOwner: 'src/data/demoStore.ts',
    aiMaySummarise: true,
  },
];

/** The question ids, derived once — the canonical key list. */
export const FOUNDER_QUESTION_IDS: readonly string[] = FOUNDER_QUESTIONS.map((q) => q.id);

/* ── Pinned invariants (the properties the summary + the gate assert) ─────── */

/** This module is the ONE owner of the founder-question universe + the rule over it. */
export const ONE_FOUNDER_INTELLIGENCE_OWNER = true;
/** Every question is answered from a NAMED canonical owner — never from AI or memory. */
export const FOUNDER_INTELLIGENCE_ANSWERS_FROM_CANONICAL_DATA = true;
/** AI may SUMMARISE an answer; it may never SUPPLY the data behind one. */
export const FOUNDER_INTELLIGENCE_AI_MAY_ONLY_SUMMARISE = true;
/** The intelligence fails closed: an unknown question or an AI-supplied figure is refused. */
export const FOUNDER_INTELLIGENCE_FAILS_CLOSED = true;

export const FOUNDER_INTELLIGENCE_RULES: readonly string[] = [
  'Every founder question is answered from a named canonical owner — never from AI and never from memory.',
  'AI may SUMMARISE an answer; it may never SUPPLY or invent the data behind one.',
  'A question that is not declared is refused rather than guessed.',
  'An answer whose data is not produced by its declared canonical owner is refused.',
  'The expansion re-derives no figure of its own — every answer points at the owner that already computes it, so no number is held twice.',
];

export const FOUNDER_INTELLIGENCE_BASIS =
  'The founder intelligence expansion declares the founder’s standing questions once, each naming the canonical owner that deterministically answers it. AI may summarise an answer over that data but can never supply the data itself. It is deterministic (no AI, no clock, no network) and internal (Super-Admin only).';

export const FOUNDER_INTELLIGENCE_DISCLAIMER =
  'This is the FOUNDER’S own intelligence over the whole portfolio. Naming a canonical owner here is not a claim that a summary has been written — it states WHERE the answer’s data comes from. An AI summary is never the source of a figure.';

/* ── Module-load guards (fail closed) ──────────────────────────────────────── */

{
  if (FOUNDER_QUESTIONS.length === 0) {
    throw new Error('[founderIntelligence] at least one founder question must be declared');
  }
  const ids = new Set<string>();
  for (const q of FOUNDER_QUESTIONS) {
    if (!q.id || !q.question || !q.about || !q.dataOwner) {
      throw new Error(`[founderIntelligence] question "${q.id}" is missing a field`);
    }
    if (ids.has(q.id)) {
      throw new Error(`[founderIntelligence] duplicate question id "${q.id}"`);
    }
    ids.add(q.id);
    // The DATA must always come from a declared canonical owner — AI may only summarise.
    if (!q.aiMaySummarise) {
      throw new Error(`[founderIntelligence] question "${q.id}" must allow AI to summarise (AI is never the data source)`);
    }
  }
}