/**
 * §PHASE 7 — THE FINANCIER LIFECYCLE (the ONE owner).
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `phase7-financier-lifecycle` records the lifecycle a financing
 * partner (a bank, PO / inventory / trade / receivables financier, a working-capital
 * or alternative-credit provider) moves through as Mercenta works it:
 *
 *   RESEARCHED → QUALIFIED → TARGET → CONTACTED → ENGAGED →
 *   DUE DILIGENCE → TERMS → PILOT → ACTIVE PARTNER   (or REJECTED / PARKED)
 *
 * The row's one NON-NEGOTIABLE rule is: "A provider is NEVER marked ACTIVE merely
 * because it was researched." That is enforced HERE, in the transition map: ACTIVE
 * PARTNER is reachable ONLY from PILOT, so the whole chain must really have been
 * walked — a research note can never jump a provider to ACTIVE.
 *
 * This module declares the lifecycle ONCE. The transitions are DERIVED from the
 * ordered stage list (there is no second, hand-maintained edge list), the rules are
 * deterministic (no AI, no clock, no randomness, no network), and the module REFUSES
 * to load if the declared lifecycle is not a legal forward-only machine.
 *
 * TWO DISTINCT FACTS, never collapsed (the same discipline as
 * `src/config/financingRouter.ts` and `src/config/vat.ts`):
 *   · the LIFECYCLE DEFINITION — the real, complete rules; and
 *   · the LABELLED DEMO CANDIDATES — unmistakable illustrations of the machine, NOT
 *     researched financiers and NOT figures. The real partner universe is the
 *     SEPARATE registry row `phase7-financier-universe-research` (not started), so
 *     nothing here claims a real provider has been researched or engaged.
 */

/** The forward (active) stages, in canonical order. ACTIVE PARTNER is last. */
export const FINANCIER_STAGE_ORDER = [
  'researched',
  'qualified',
  'target',
  'contacted',
  'engaged',
  'due_diligence',
  'terms',
  'pilot',
  'active_partner',
] as const;

/** The two off-ramps a provider can take at any active stage. */
export const FINANCIER_OFFRAMP_STAGES = ['rejected', 'parked'] as const;

export type FinancierStageId =
  | (typeof FINANCIER_STAGE_ORDER)[number]
  | (typeof FINANCIER_OFFRAMP_STAGES)[number];

/** The successful end of the happy path. */
export const FINANCIER_ACTIVE_STAGE: FinancierStageId = 'active_partner';

export const FINANCIER_STAGE_LABELS: Record<FinancierStageId, string> = {
  researched: 'Researched',
  qualified: 'Qualified',
  target: 'Target',
  contacted: 'Contacted',
  engaged: 'Engaged',
  due_diligence: 'Due diligence',
  terms: 'Terms',
  pilot: 'Pilot',
  active_partner: 'Active partner',
  rejected: 'Rejected',
  parked: 'Parked',
};

/** What each stage means — a definition a surface or a gate can quote. */
export const FINANCIER_STAGE_DEFINITIONS: Record<FinancierStageId, string> = {
  researched:
    'The provider has been researched from a named, published source; nothing beyond that is established.',
  qualified:
    'The provider is confirmed to fit Mercenta’s need and eligibility — this is a judgement, not a research note.',
  target: 'The provider is selected as a target to approach.',
  contacted: 'A first approach has been made.',
  engaged: 'The provider has responded and a conversation is open.',
  due_diligence: 'Terms and counterparty checks are being examined.',
  terms: 'Terms have been discussed but not agreed.',
  pilot: 'A pilot facility or trial is running.',
  active_partner:
    'A provider is ACTIVE — reachable ONLY through a completed PILOT, never from research alone.',
  rejected: 'The provider is not a fit. Terminal.',
  parked: 'Work is paused. A parked provider re-enters at RESEARCHED and must be re-qualified.',
};

/* ── The transition map — DERIVED from the ordered stages (no second list) ── */

/**
 * The legal transitions. Built from `FINANCIER_STAGE_ORDER`, so the forward edges
 * are DERIVED, never hand-maintained:
 *   · a forward stage advances to exactly the NEXT stage (strictly forward, one
 *     step — a stage is never skipped);
 *   · any forward stage that is not the terminal one may also go to REJECTED or
 *     PARKED (its off-ramps);
 *   · ACTIVE PARTNER is TERMINAL (it has no `next`, so it gains no forward edge
 *     and no off-ramp);
 *   · REJECTED is TERMINAL; PARKED re-enters at RESEARCHED and must re-qualify.
 */
export const FINANCIER_LIFECYCLE_TRANSITIONS: Record<
  FinancierStageId,
  readonly FinancierStageId[]
> = (() => {
  const map = {} as Record<FinancierStageId, FinancierStageId[]>;
  FINANCIER_STAGE_ORDER.forEach((stage, i) => {
    const next = FINANCIER_STAGE_ORDER[i + 1];
    const outs: FinancierStageId[] = [];
    if (next) {
      outs.push(next); // strictly forward, exactly one step
      outs.push('rejected', 'parked'); // any non-terminal active stage may be rejected or parked
    }
    map[stage] = outs;
  });
  map.rejected = [];
  map.parked = ['researched'];
  return map;
})();

/* ── The rules, the refusals, the basis and the pinned invariants ────────── */

export const FINANCIER_LIFECYCLE_RULES: readonly string[] = [
  'A provider moves through the lifecycle in order: RESEARCHED → QUALIFIED → TARGET → CONTACTED → ENGAGED → DUE DILIGENCE → TERMS → PILOT → ACTIVE PARTNER.',
  'A provider is NEVER marked ACTIVE merely because it was researched: ACTIVE PARTNER is reachable ONLY from PILOT.',
  'No stage is skipped — a forward move advances exactly one stage.',
  'From any active stage a provider may be REJECTED (not a fit) or PARKED (paused); both off-ramps are always available before ACTIVE PARTNER.',
  'A PARKED provider re-enters at RESEARCHED and must be re-qualified — it is never silently restored to a later stage.',
  'The lifecycle is deterministic — no AI, no clock, no randomness, no network.',
] as const;

export const FINANCIER_LIFECYCLE_REFUSALS = {
  unknownStage:
    'FINANCIER_STAGE_UNKNOWN — that is not a declared lifecycle stage, so the move is refused rather than guessed.',
  illegalTransition:
    'FINANCIER_TRANSITION_ILLEGAL — that move is not a declared transition, so it is refused.',
  activeRequiresPilot:
    'FINANCIER_ACTIVE_REQUIRES_PILOT — a provider is never marked ACTIVE merely because it was researched; ACTIVE PARTNER is reachable only from PILOT.',
} as const;

export const FINANCIER_LIFECYCLE_BASIS =
  'The financier lifecycle is a forward-only, fail-closed state machine declared once here: a financing partner advances one stage at a time from RESEARCHED to ACTIVE PARTNER (reachable only through PILOT), with REJECTED and PARKED as off-ramps from any active stage. It is deterministic — no AI, no clock.';

export const FINANCIER_LIFECYCLE_DISCLAIMER =
  'The lifecycle is Mercenta’s internal governance of its own approach to financing partners; it never states that any provider is engaged or active. The real partner universe is researched separately and no provider here is claimed to be real.';

/** Pinned invariants the gate asserts. */
export const ONE_FINANCIER_LIFECYCLE_OWNER = true;
export const FINANCIER_LIFECYCLE_IS_FORWARD_ONLY = true;
export const FINANCIER_ACTIVE_REQUIRES_PILOT = true;
export const FINANCIER_OFFRAMPS_FROM_ANY_ACTIVE_STAGE = true;

/* ── The LABELLED demo candidates (illustrations, never real providers) ──── */

/**
 * Unmistakable PLACEHOLDERS: they demonstrate the machine on the founder surface
 * and are NOT researched financiers and NOT figures. The real universe is the
 * separate `phase7-financier-universe-research` row (not started), so nothing here
 * may be read as a claim about the world.
 */
export interface DemoFinancierCandidate {
  id: string;
  label: string;
  stage: FinancierStageId;
  /** ALWAYS true — every candidate in this file is an illustration. */
  illustrative: true;
}

export const DEMO_FINANCIER_CANDIDATES: readonly DemoFinancierCandidate[] = [
  { id: 'demo-provider-a', label: 'Illustrative provider A — (not a researched financier)', stage: 'researched', illustrative: true },
  { id: 'demo-provider-b', label: 'Illustrative provider B — (not a researched financier)', stage: 'qualified', illustrative: true },
  { id: 'demo-provider-c', label: 'Illustrative provider C — (not a researched financier)', stage: 'due_diligence', illustrative: true },
  { id: 'demo-provider-d', label: 'Illustrative provider D — (not a researched financier)', stage: 'pilot', illustrative: true },
  { id: 'demo-provider-e', label: 'Illustrative provider E — (not a researched financier)', stage: 'active_partner', illustrative: true },
  { id: 'demo-provider-f', label: 'Illustrative provider F — (not a researched financier)', stage: 'rejected', illustrative: true },
] as const;

/* ── Module-load guards (fail closed) ────────────────────────────────────── */

{
  if (FINANCIER_STAGE_ORDER.length !== 9) {
    throw new Error('[financierLifecycle] exactly nine active stages must be declared');
  }
  if (FINANCIER_STAGE_ORDER[FINANCIER_STAGE_ORDER.length - 1] !== 'active_partner') {
    throw new Error('[financierLifecycle] ACTIVE PARTNER must be the final active stage');
  }
  if (FINANCIER_OFFRAMP_STAGES.length !== 2) {
    throw new Error('[financierLifecycle] exactly two off-ramps (rejected, parked)');
  }
  // ACTIVE PARTNER is reachable ONLY from PILOT — never from research.
  const intoActive = (Object.keys(FINANCIER_LIFECYCLE_TRANSITIONS) as FinancierStageId[]).filter(
    (from) => FINANCIER_LIFECYCLE_TRANSITIONS[from].includes('active_partner')
  );
  if (intoActive.length !== 1 || intoActive[0] !== 'pilot') {
    throw new Error('[financierLifecycle] ACTIVE PARTNER must be reachable ONLY from PILOT');
  }
  if (FINANCIER_LIFECYCLE_TRANSITIONS.active_partner.length !== 0) {
    throw new Error('[financierLifecycle] ACTIVE PARTNER must be terminal');
  }
  if (FINANCIER_LIFECYCLE_TRANSITIONS.rejected.length !== 0) {
    throw new Error('[financierLifecycle] REJECTED must be terminal');
  }
  for (const c of DEMO_FINANCIER_CANDIDATES) {
    if (!c.illustrative) {
      throw new Error(`[financierLifecycle] demo candidate "${c.id}" must be marked illustrative`);
    }
  }
}
