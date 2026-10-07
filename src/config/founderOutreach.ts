/**
 * §PHASE 7 — THE FOUNDER OUTREACH PIPELINE (the ONE owner).
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `phase7-founder-outreach-pipeline` records the outreach pipeline
 * Mercenta runs OVER the financing-partner universe: the ordered approach that moves
 * a financing partner along the canonical financier lifecycle
 * (`src/config/financierLifecycle.ts`) from TARGET → CONTACTED → ENGAGED.
 *
 * The pipeline is the MACHINERY, not the data. The real partner universe is the
 * SEPARATE registry row `phase7-financier-universe-research` (not started), so
 * nothing here claims that any real provider has been contacted. The candidates shown
 * on the founder surface are unmistakably ILLUSTRATIVE.
 *
 * THE RULES, enforced structurally here and DEFENSIVELY by the resolver
 * (`src/lib/finance/founderOutreach.ts`):
 *   · every touchpoint names a DECLARED channel and a DECLARED touchpoint type;
 *   · outreach BEGINS at the TARGET stage — a merely researched/qualified provider is
 *     never approached;
 *   · the pipeline is FORWARD-ONLY: a follow-up (or any non-initial touchpoint)
 *     requires a provider already at CONTACTED or beyond, and an initial contact is
 *     legal only at exactly TARGET (never a second "first" contact);
 *   · the cadence is a deterministic sequence of day OFFSETS (no clock, no timestamps)
 *     that must be STRICTLY INCREASING — a step is never scheduled before the one it
 *     follows.
 *
 * This module declares the pipeline ONCE. The business fields are grounded in the
 * canonical operating model (Mercenta is the intermediary that raises capital from
 * financing partners); the rules are deterministic (no AI, no clock, no randomness, no
 * network), and the module REFUSES to load if the declared pipeline is not legal.
 *
 * TWO DISTINCT FACTS, never collapsed (the same discipline as
 * `src/config/financierLifecycle.ts` and `src/config/pitchWorkspace.ts`):
 *   · the PIPELINE DEFINITION — the real, complete rules; and
 *   · the LABELLED DEMO TOUCHPOINTS — unmistakable illustrations of the machine, NOT a
 *     record of any real approach. The real universe is researched separately.
 */
import { FINANCIER_STAGE_ORDER, type FinancierStageId } from '@/config/financierLifecycle';

/** A widened string view of the canonical stage order, so membership checks accept any declared stage id. */
const STAGE_ORDER: readonly string[] = FINANCIER_STAGE_ORDER;

/* ── The lifecycle stages outreach reuses (never a second stage list) ───────── */

/** The lifecycle stage at which outreach BEGINS — the provider is a selected TARGET. */
export const OUTREACH_ENTRY_STAGE: FinancierStageId = 'target';

/** The stage a provider must have reached before ANY non-initial touchpoint. */
export const OUTREACH_CONTACTED_STAGE: FinancierStageId = 'contacted';

/** The stage a held meeting moves a provider into — outreach's successful end. */
export const OUTREACH_ENGAGED_STAGE: FinancierStageId = 'engaged';

/* ── The channels through which a touchpoint is made ────────────────────────── */

export interface OutreachChannel {
  id: string;
  label: string;
  description: string;
}

/** The declared channels. A touchpoint naming anything else is REFUSED. */
export const OUTREACH_CHANNELS: readonly OutreachChannel[] = [
  { id: 'email', label: 'Email', description: 'A written approach or reply sent to the provider’s published contact address.' },
  { id: 'phone', label: 'Phone', description: 'A live telephone conversation with the provider’s named contact.' },
  { id: 'video_call', label: 'Video call', description: 'A scheduled video meeting with the provider’s named contact.' },
  { id: 'in_person', label: 'In person', description: 'A face-to-face meeting arranged with the provider.' },
  { id: 'warm_introduction', label: 'Warm introduction', description: 'An approach made through a shared, named third party who introduces Mercenta.' },
  { id: 'event', label: 'Industry event', description: 'A conversation held at a named industry event or conference.' },
];

/* ── The touchpoint types the pipeline uses ─────────────────────────────────── */

export interface OutreachTouchpointType {
  id: string;
  label: string;
  description: string;
  /** True only for the touchpoints that move the lifecycle forward (initial contact, meeting held). */
  advancesPipeline: boolean;
}

/**
 * The declared touchpoint types, in the order the pipeline uses them. The FIRST is
 * the initial contact; every other type requires the provider to be at CONTACTED or
 * beyond. A touchpoint naming anything else is REFUSED.
 */
export const OUTREACH_TOUCHPOINT_TYPES: readonly OutreachTouchpointType[] = [
  { id: 'initial_contact', label: 'Initial contact', description: 'The first approach to a selected target — it moves TARGET → CONTACTED.', advancesPipeline: true },
  { id: 'follow_up', label: 'Follow-up', description: 'A reminder sent after the initial contact when no reply has arrived.', advancesPipeline: false },
  { id: 'meeting_request', label: 'Meeting request', description: 'A request for a meeting once a conversation is open.', advancesPipeline: false },
  { id: 'meeting_held', label: 'Meeting held', description: 'A meeting that actually took place — it moves CONTACTED → ENGAGED.', advancesPipeline: true },
  { id: 'information_pack', label: 'Information pack shared', description: 'Sharing the canonical capital-case pack with the provider.', advancesPipeline: false },
  { id: 'check_in', label: 'Check-in', description: 'A light-touch note to keep an open conversation warm.', advancesPipeline: false },
];

/* ── The deterministic follow-up cadence (day OFFSETS, never timestamps) ────── */

export interface OutreachCadenceStep {
  id: string;
  /** The touchpoint type this step performs — must be a declared type. */
  typeId: string;
  /** Days after the first touchpoint — a deterministic OFFSET, never a clock reading. */
  dayOffset: number;
}

/**
 * The canonical cadence: which touchpoint happens on which day OFFSET from the first
 * contact. Offsets MUST be strictly increasing (a step is never scheduled before the
 * one it follows), and the first step MUST be the initial contact.
 */
export const OUTREACH_CADENCE: readonly OutreachCadenceStep[] = [
  { id: 'day_0_initial', typeId: 'initial_contact', dayOffset: 0 },
  { id: 'day_3_follow_up', typeId: 'follow_up', dayOffset: 3 },
  { id: 'day_7_follow_up', typeId: 'follow_up', dayOffset: 7 },
  { id: 'day_10_meeting_request', typeId: 'meeting_request', dayOffset: 10 },
  { id: 'day_21_meeting_held', typeId: 'meeting_held', dayOffset: 21 },
];


/* ── The LABELLED demo touchpoints (illustrations, never a real approach) ───── */

/**
 * Unmistakable PLACEHOLDERS: they demonstrate the machine on the founder surface and
 * are NOT a record of any real approach. The real universe is the separate
 * `phase7-financier-universe-research` row (not started), so nothing here may be read
 * as a claim about the world. Each names the lifecycle stage the illustrative provider
 * is at, so the resolver's allow/refuse decision is visible rather than asserted.
 */
export interface DemoOutreachTouchpoint {
  id: string;
  providerLabel: string;
  /** The lifecycle stage the illustrative provider is at — drives the decision. */
  providerStage: FinancierStageId;
  channelId: string;
  typeId: string;
  cadenceStepId: string;
  dayOffset: number;
  /** ALWAYS true — every touchpoint in this file is an illustration. */
  illustrative: true;
}

export const DEMO_OUTREACH_TOUCHPOINTS: readonly DemoOutreachTouchpoint[] = [
  { id: 'demo-touch-1', providerLabel: 'Illustrative provider — (not a researched financier)', providerStage: 'target', channelId: 'email', typeId: 'initial_contact', cadenceStepId: 'day_0_initial', dayOffset: 0, illustrative: true },
  { id: 'demo-touch-2', providerLabel: 'Illustrative provider — (not a researched financier)', providerStage: 'target', channelId: 'email', typeId: 'follow_up', cadenceStepId: 'day_3_follow_up', dayOffset: 3, illustrative: true },
  { id: 'demo-touch-3', providerLabel: 'Illustrative provider — (not a researched financier)', providerStage: 'contacted', channelId: 'phone', typeId: 'meeting_request', cadenceStepId: 'day_10_meeting_request', dayOffset: 10, illustrative: true },
  { id: 'demo-touch-4', providerLabel: 'Illustrative provider — (not a researched financier)', providerStage: 'qualified', channelId: 'warm_introduction', typeId: 'initial_contact', cadenceStepId: 'day_0_initial', dayOffset: 0, illustrative: true },
];

/* ── The founder-facing explanation ─────────────────────────────────────────── */

export const FOUNDER_OUTREACH_BASIS =
  'The founder outreach pipeline is declared once here: the declared channels, the declared touchpoint types and a deterministic follow-up cadence of day OFFSETS. Outreach begins at the TARGET stage, is forward-only (a follow-up requires an open contact) and every touchpoint names a declared channel and type. It is deterministic — no AI, no clock.';

export const FOUNDER_OUTREACH_DISCLAIMER =
  'This is Mercenta’s internal governance of its own approach to financing partners; it never states that any provider has been contacted or engaged. The real partner universe is researched separately and no provider here is claimed to be real.';

/** Pinned invariants the gate asserts. */
export const ONE_OUTREACH_PIPELINE_OWNER = true;
export const OUTREACH_REFERENCES_DECLARED_CHANNELS = true;
export const OUTREACH_IS_FORWARD_ONLY = true;
export const OUTREACH_FOLLOWUP_REQUIRES_CONTACT = true;
export const OUTREACH_REQUIRES_TARGET_STAGE = true;
export const OUTREACH_CADENCE_IS_STRICTLY_INCREASING = true;


/* ── Module-load guards (fail closed) ──────────────────────────────────────── */

{
  if (OUTREACH_CHANNELS.length === 0) {
    throw new Error('[founderOutreach] at least one channel must be declared');
  }
  const channelIds = new Set(OUTREACH_CHANNELS.map((c) => c.id));
  if (channelIds.size !== OUTREACH_CHANNELS.length) {
    throw new Error('[founderOutreach] channel ids must be unique');
  }
  const typeIds = new Set(OUTREACH_TOUCHPOINT_TYPES.map((t) => t.id));
  if (typeIds.size !== OUTREACH_TOUCHPOINT_TYPES.length) {
    throw new Error('[founderOutreach] touchpoint type ids must be unique');
  }
  if (!typeIds.has('initial_contact')) {
    throw new Error('[founderOutreach] the initial_contact type must be declared');
  }
  // The reused lifecycle stages must really exist in the ONE lifecycle owner.
  for (const stage of [OUTREACH_ENTRY_STAGE, OUTREACH_CONTACTED_STAGE, OUTREACH_ENGAGED_STAGE]) {
    if (!STAGE_ORDER.includes(stage)) {
      throw new Error(`[founderOutreach] stage "${stage}" is not a declared financier stage`);
    }
  }
  if (
    STAGE_ORDER.indexOf(OUTREACH_ENTRY_STAGE) >=
    STAGE_ORDER.indexOf(OUTREACH_CONTACTED_STAGE)
  ) {
    throw new Error('[founderOutreach] TARGET must precede CONTACTED in the lifecycle');
  }
  if (OUTREACH_CADENCE.length === 0) {
    throw new Error('[founderOutreach] at least one cadence step must be declared');
  }
  const cadenceIds = new Set(OUTREACH_CADENCE.map((s) => s.id));
  if (cadenceIds.size !== OUTREACH_CADENCE.length) {
    throw new Error('[founderOutreach] cadence step ids must be unique');
  }
  // The cadence must start with the contact and be strictly increasing in day offset.
  if (OUTREACH_CADENCE[0].typeId !== 'initial_contact') {
    throw new Error('[founderOutreach] the first cadence step must be the initial contact');
  }
  for (let i = 1; i < OUTREACH_CADENCE.length; i += 1) {
    if (OUTREACH_CADENCE[i].dayOffset <= OUTREACH_CADENCE[i - 1].dayOffset) {
      throw new Error('[founderOutreach] cadence day offsets must be strictly increasing');
    }
  }
  // Every cadence step and every demo touchpoint must reference declared ids.
  for (const s of OUTREACH_CADENCE) {
    if (!typeIds.has(s.typeId)) {
      throw new Error(`[founderOutreach] cadence step "${s.id}" references an undeclared type "${s.typeId}"`);
    }
  }
  for (const t of DEMO_OUTREACH_TOUCHPOINTS) {
    if (!t.illustrative) {
      throw new Error(`[founderOutreach] demo touchpoint "${t.id}" must be marked illustrative`);
    }
    if (!channelIds.has(t.channelId)) {
      throw new Error(`[founderOutreach] demo touchpoint "${t.id}" references an undeclared channel "${t.channelId}"`);
    }
    if (!typeIds.has(t.typeId)) {
      throw new Error(`[founderOutreach] demo touchpoint "${t.id}" references an undeclared type "${t.typeId}"`);
    }
    if (!cadenceIds.has(t.cadenceStepId)) {
      throw new Error(`[founderOutreach] demo touchpoint "${t.id}" references an undeclared cadence step "${t.cadenceStepId}"`);
    }
    if (!STAGE_ORDER.includes(t.providerStage)) {
      throw new Error(`[founderOutreach] demo touchpoint "${t.id}" is at an undeclared stage "${t.providerStage}"`);
    }
  }
}


