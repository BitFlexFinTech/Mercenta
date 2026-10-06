/**
 * §PHASE 8 — THE FOUNDER CAPITAL WORKSPACE / PITCH WORKSPACE (the ONE owner).
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `phase8-financier-pitch-workspace` records the founder capital
 * workspace: Mercenta overview, business model, Vendor infrastructure, acquisition
 * pipeline, purchase volumes, supplier payment requirements, capital requirements,
 * facility request, repayment model, risk controls, evidence, documents, contact
 * history, meetings, follow-ups and pitch preparation. The row's one NON-NEGOTIABLE
 * rule is: "AI may help prepare/explain; the financial numbers stay deterministic."
 *
 * That rule is enforced HERE, structurally: every section declares HOW its content
 * is produced. A section that carries a FINANCIAL number is
 * `deterministic_financial` and must name the canonical owner that computes it —
 * AI can NEVER be the producer of such a section. AI may draft only NARRATIVE.
 *
 * This module declares the workspace ONCE (there is no second, hand-maintained
 * section list), the rules are deterministic (no AI, no clock, no randomness, no
 * network), and the module REFUSES to load if the declared workspace is not legal.
 *
 * TWO DISTINCT FACTS, never collapsed (the same discipline as
 * `src/config/financierLifecycle.ts` and `src/config/vat.ts`):
 *   · the WORKSPACE DEFINITION — the real, complete section structure; and
 *   · the LABELLED DEMO STATE — an unmistakable illustration of a workspace on the
 *     founder surface, NOT a prepared pitch and NOT figures. The real financier
 *     universe is the SEPARATE registry row `phase7-financier-universe-research`
 *     (not started), so nothing here claims a real pitch has been prepared.
 */

/** How a section's content is produced. */
export type PitchSectionKind =
  /** Carries FINANCIAL numbers — produced ONLY by a deterministic canonical owner. */
  | 'deterministic_financial'
  /** Prose Mercenta may draft/explain (AI may help). */
  | 'narrative'
  /** Points at a canonical owner or record (never a number of its own). */
  | 'reference'
  /** Activity drawn from real records (contact history, meetings, follow-ups). */
  | 'activity';

/** Who produced a section's content. */
export type PitchProducer = 'canonical_owner' | 'ai' | 'human';

export interface PitchSection {
  id: string;
  label: string;
  kind: PitchSectionKind;
  /** A complete pitch is not ready unless every required section is present. */
  required: boolean;
  description: string;
  /**
   * The deterministic canonical owner that produces this section's numbers.
   * Declared ONLY for `deterministic_financial` sections — AI never computes them.
   */
  sourceOwner?: string;
  /** AI may draft ONLY narrative sections; never a financial, reference or activity one. */
  aiMayDraft: boolean;
}

/**
 * THE canonical workspace sections, in canonical order. Each is declared ONCE;
 * nothing elsewhere may keep a second list of them.
 */
export const PITCH_WORKSPACE_SECTIONS: readonly PitchSection[] = [
  {
    id: 'mercenta_overview',
    label: 'Mercenta overview',
    kind: 'narrative',
    required: true,
    description: 'Who Mercenta is and what it does — the intermediary operating the retail-channel relationship.',
    aiMayDraft: true,
  },
  {
    id: 'business_model',
    label: 'Business model',
    kind: 'narrative',
    required: true,
    description: 'The two commercial models (commission and buy/resell) and how Mercenta earns.',
    aiMayDraft: true,
  },
  {
    id: 'vendor_infrastructure',
    label: 'Vendor infrastructure',
    kind: 'narrative',
    required: false,
    description: 'The vendor account and the operating infrastructure Mercenta brings to the relationship.',
    aiMayDraft: true,
  },
  {
    id: 'acquisition_pipeline',
    label: 'Acquisition pipeline',
    kind: 'deterministic_financial',
    required: true,
    description: 'The live acquisition pipeline — counted from the canonical acquisition engine.',
    sourceOwner: 'src/lib/acquisition/acquisitionEngine.ts',
    aiMayDraft: false,
  },
  {
    id: 'purchase_volumes',
    label: 'Purchase volumes',
    kind: 'deterministic_financial',
    required: true,
    description: 'Purchase-order volumes — from the canonical purchase-order records.',
    sourceOwner: 'src/data/demoStore.ts (demoPurchaseOrders)',
    aiMayDraft: false,
  },
  {
    id: 'supplier_payment_requirements',
    label: 'Supplier payment requirements',
    kind: 'deterministic_financial',
    required: true,
    description: 'What must be paid to suppliers and when — from the canonical commerce terms.',
    sourceOwner: 'src/lib/commerce/invoiceTerms.ts',
    aiMayDraft: false,
  },
  {
    id: 'capital_requirements',
    label: 'Capital requirements',
    kind: 'deterministic_financial',
    required: true,
    description: 'The internal capital model behind Model B — from the canonical capital-requirement owner.',
    sourceOwner: 'src/lib/finance/capitalRequirement.ts',
    aiMayDraft: false,
  },
  {
    id: 'facility_request',
    label: 'Facility request',
    kind: 'deterministic_financial',
    required: true,
    description: 'The facility Mercenta is requesting — from the canonical financing configuration.',
    sourceOwner: 'src/config/financing.ts',
    aiMayDraft: false,
  },
  {
    id: 'repayment_model',
    label: 'Repayment model',
    kind: 'deterministic_financial',
    required: true,
    description: 'How the facility is repaid — from the canonical financing configuration.',
    sourceOwner: 'src/config/financing.ts',
    aiMayDraft: false,
  },
  {
    id: 'risk_controls',
    label: 'Risk controls',
    kind: 'narrative',
    required: true,
    description: 'The controls that limit Mercenta’s exposure.',
    aiMayDraft: true,
  },
  {
    id: 'evidence',
    label: 'Evidence',
    kind: 'reference',
    required: false,
    description: 'The published sources and records that back the workspace.',
    aiMayDraft: false,
  },
  {
    id: 'documents',
    label: 'Documents',
    kind: 'reference',
    required: false,
    description: 'The documents that accompany the workspace.',
    aiMayDraft: false,
  },
  {
    id: 'contact_history',
    label: 'Contact history',
    kind: 'activity',
    required: false,
    description: 'Who has been approached — from the real contact records.',
    aiMayDraft: false,
  },
  {
    id: 'meetings',
    label: 'Meetings',
    kind: 'activity',
    required: false,
    description: 'Meetings held — from the real meeting records.',
    aiMayDraft: false,
  },
  {
    id: 'follow_ups',
    label: 'Follow-ups',
    kind: 'activity',
    required: false,
    description: 'What is owed a follow-up — from the real activity records.',
    aiMayDraft: false,
  },
  {
    id: 'pitch_preparation',
    label: 'Pitch preparation',
    kind: 'narrative',
    required: true,
    description: 'The pitch itself — AI may help prepare and explain it; the numbers come from the sections above.',
    aiMayDraft: true,
  },
];

/** The canonical section ids, in order. */
export const PITCH_SECTION_IDS: readonly string[] = PITCH_WORKSPACE_SECTIONS.map((s) => s.id);

/** Every section without which the workspace is NOT ready. */
export const REQUIRED_PITCH_SECTION_IDS: readonly string[] = PITCH_WORKSPACE_SECTIONS.filter(
  (s) => s.required
).map((s) => s.id);

/** The canonical owners a financial section's numbers may come from. */
export const PITCH_DETERMINISTIC_SOURCES: readonly string[] = PITCH_WORKSPACE_SECTIONS.filter(
  (s) => s.kind === 'deterministic_financial' && s.sourceOwner
).map((s) => s.sourceOwner as string);

export const PITCH_WORKSPACE_RULES: readonly string[] = [
  'Every financial number in the workspace comes from a deterministic canonical owner — AI never computes a figure.',
  'AI may help prepare and explain only the NARRATIVE sections; it is never the producer of a financial, reference or activity section.',
  'A complete pitch is not ready unless every REQUIRED section is present.',
  'The workspace is Mercenta’s OWN capital case; it never claims a facility has been granted or a partner engaged.',
  'The workspace is deterministic — no clock, no randomness, no network; AI may explain but never supplies a number.',
] as const;

export const PITCH_WORKSPACE_REFUSALS = {
  unknownSection:
    'PITCH_SECTION_UNKNOWN — that is not a declared workspace section, so it is refused rather than guessed.',
  financialRequiresDeterministicSource:
    'PITCH_FINANCIAL_REQUIRES_DETERMINISTIC_SOURCE — a financial section’s numbers come only from their deterministic canonical owner; they are never produced by AI.',
  aiMayOnlyDraftNarrative:
    'PITCH_AI_MAY_ONLY_DRAFT_NARRATIVE — AI may help with the narrative only; it is never the producer of a financial, reference or activity section.',
  requiresAllRequiredSections:
    'PITCH_REQUIRES_ALL_REQUIRED_SECTIONS — a complete pitch is not ready while a required section is missing.',
} as const;

export const PITCH_WORKSPACE_BASIS =
  'The founder capital workspace is declared once here as an ordered set of sections, each naming how its content is produced: a deterministic canonical owner for every financial figure, AI for the narrative only, real records for the activity. It is deterministic — a financial number is never produced by AI.';

export const PITCH_WORKSPACE_DISCLAIMER =
  'This is Mercenta’s OWN capital case prepared for a financing partner; it never states that a facility has been granted or a provider engaged. The real partner universe is researched separately and no provider here is claimed to be real.';

/** Pinned invariants the gate asserts. */
export const ONE_PITCH_WORKSPACE_OWNER = true;
export const PITCH_SECTIONS_ARE_CANONICAL = true;
export const PITCH_FINANCIALS_STAY_DETERMINISTIC = true;
export const PITCH_REQUIRES_ALL_REQUIRED_SECTIONS = true;
export const PITCH_SECTION_COUNT = PITCH_WORKSPACE_SECTIONS.length;

/* ── The LABELLED demo state (an illustration, never a prepared pitch) ────── */

/**
 * Unmistakable PLACEHOLDERS: they demonstrate the workspace on the founder surface
 * and are NOT a prepared pitch and NOT figures. The real universe is the separate
 * `phase7-financier-universe-research` row (not started), so nothing here may be
 * read as a claim about the world.
 */
export interface DemoPitchSectionState {
  sectionId: string;
  present: boolean;
  /** ALWAYS true — every entry in this file is an illustration. */
  illustrative: true;
}

export const DEMO_PITCH_SECTION_STATES: readonly DemoPitchSectionState[] =
  PITCH_WORKSPACE_SECTIONS.map((s) => ({
    sectionId: s.id,
    // The illustration shows an INCOMPLETE draft: the financial sections are present
    // (produced by their canonical owners), the narrative is partly drafted, and the
    // pitch itself plus the activity/reference sections are still outstanding — so the
    // readiness gate is visible rather than vacuously satisfied.
    present:
      s.kind === 'deterministic_financial' ||
      (s.kind === 'narrative' && s.id !== 'pitch_preparation'),
    illustrative: true as const,
  }));

/* ── Module-load guards (fail closed) ────────────────────────────────────── */

{
  if (PITCH_WORKSPACE_SECTIONS.length === 0) {
    throw new Error('[pitchWorkspace] at least one section must be declared');
  }
  const ids = new Set(PITCH_WORKSPACE_SECTIONS.map((s) => s.id));
  if (ids.size !== PITCH_WORKSPACE_SECTIONS.length) {
    throw new Error('[pitchWorkspace] section ids must be unique');
  }
  for (const s of PITCH_WORKSPACE_SECTIONS) {
    if (s.kind === 'deterministic_financial' && !s.sourceOwner) {
      throw new Error(`[pitchWorkspace] financial section "${s.id}" must name a deterministic source owner`);
    }
    if (s.kind !== 'deterministic_financial' && s.sourceOwner) {
      throw new Error(`[pitchWorkspace] only financial sections may declare a source owner ("${s.id}")`);
    }
    // AI may draft ONLY narrative sections.
    if (s.aiMayDraft && s.kind !== 'narrative') {
      throw new Error(`[pitchWorkspace] AI may draft only narrative sections ("${s.id}" is ${s.kind})`);
    }
  }
  if (REQUIRED_PITCH_SECTION_IDS.length === 0) {
    throw new Error('[pitchWorkspace] at least one required section must be declared');
  }
  for (const s of DEMO_PITCH_SECTION_STATES) {
    if (!s.illustrative) {
      throw new Error(`[pitchWorkspace] demo section state "${s.sectionId}" must be marked illustrative`);
    }
  }
}
