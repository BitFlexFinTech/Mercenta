/**
 * §PHASE 7 — THE FOUNDER OUTREACH PIPELINE RESOLVER — the pure rules over the ONE owner.
 *
 * The owner (`src/config/founderOutreach.ts`) declares the outreach pipeline; this
 * module applies it. It is PURE and DETERMINISTIC: no clock, no randomness, no network,
 * no AI, no filesystem.
 *
 * THE RULES IT ENFORCES:
 *   · every touchpoint names a DECLARED channel and a DECLARED touchpoint type, or it
 *     is REFUSED (OUTREACH_CHANNEL_UNKNOWN / OUTREACH_TYPE_UNKNOWN);
 *   · outreach BEGINS at the TARGET stage — a merely researched/qualified provider is
 *     REFUSED (OUTREACH_REQUIRES_TARGET_STAGE), and an off-ramped provider (REJECTED /
 *     PARKED) is not in the outreach pipeline at all (OUTREACH_STAGE_NOT_IN_PIPELINE);
 *   · the pipeline is FORWARD-ONLY: an initial contact is legal only at exactly TARGET
 *     (a second "first" contact is REFUSED, OUTREACH_INITIAL_ALREADY_DONE) and any
 *     non-initial touchpoint requires a provider already at CONTACTED or beyond
 *     (OUTREACH_FOLLOWUP_REQUIRES_CONTACT);
 *   · an UNKNOWN stage is REFUSED and the next cadence step of an undeclared step is
 *     REFUSED — both fail closed, so nothing is ever guessed.
 */
import {
  DEMO_OUTREACH_TOUCHPOINTS,
  FOUNDER_OUTREACH_BASIS,
  FOUNDER_OUTREACH_DISCLAIMER,
  ONE_OUTREACH_PIPELINE_OWNER,
  OUTREACH_CADENCE,
  OUTREACH_CADENCE_IS_STRICTLY_INCREASING,
  OUTREACH_CHANNELS,
  OUTREACH_CONTACTED_STAGE,
  OUTREACH_ENGAGED_STAGE,
  OUTREACH_ENTRY_STAGE,
  OUTREACH_FOLLOWUP_REQUIRES_CONTACT,
  OUTREACH_IS_FORWARD_ONLY,
  OUTREACH_REFERENCES_DECLARED_CHANNELS,
  OUTREACH_REQUIRES_TARGET_STAGE,
  OUTREACH_TOUCHPOINT_TYPES,
  type OutreachCadenceStep,
} from '@/config/founderOutreach';
import {
  FINANCIER_STAGE_LABELS,
  FINANCIER_STAGE_ORDER,
  type FinancierStageId,
} from '@/config/financierLifecycle';
import { isFinancierStage } from '@/lib/finance/financierLifecycle';

/** A widened string view of the canonical stage order, so membership checks accept any declared stage id. */
const STAGE_ORDER: readonly string[] = FINANCIER_STAGE_ORDER;

export type OutreachRefusal =
  | 'OUTREACH_CHANNEL_UNKNOWN'
  | 'OUTREACH_TYPE_UNKNOWN'
  | 'OUTREACH_STAGE_UNKNOWN'
  | 'OUTREACH_STAGE_NOT_IN_PIPELINE'
  | 'OUTREACH_REQUIRES_TARGET_STAGE'
  | 'OUTREACH_INITIAL_ALREADY_DONE'
  | 'OUTREACH_FOLLOWUP_REQUIRES_CONTACT';

const CHANNEL_IDS = new Set(OUTREACH_CHANNELS.map((c) => c.id));
const TYPE_IDS = new Set(OUTREACH_TOUCHPOINT_TYPES.map((t) => t.id));

export function isOutreachChannel(value: string | null | undefined): boolean {
  return typeof value === 'string' && CHANNEL_IDS.has(value);
}

export function isOutreachTouchpointType(value: string | null | undefined): boolean {
  return typeof value === 'string' && TYPE_IDS.has(value);
}

export interface OutreachTouchpointDecision {
  providerStage: FinancierStageId | null;
  channelId: string;
  typeId: string;
  allowed: boolean;
  refusal: OutreachRefusal | null;
  reason: string;
}

/**
 * Decide whether a touchpoint may be made to a provider at a given lifecycle stage.
 * FAIL CLOSED: an unknown channel, an unknown type, an unknown stage, a provider below
 * TARGET, a second initial contact, or a follow-up before an open contact are all
 * REFUSED — never defaulted.
 */
export function planOutreachTouchpoint(
  providerStage: string,
  channelId: string,
  typeId: string
): OutreachTouchpointDecision {
  const refuse = (
    refusal: OutreachRefusal,
    reason: string,
    stage: FinancierStageId | null = null
  ): OutreachTouchpointDecision => ({ providerStage: stage, channelId, typeId, allowed: false, refusal, reason });

  if (!isOutreachChannel(channelId)) {
    return refuse('OUTREACH_CHANNEL_UNKNOWN', 'That is not a declared outreach channel, so the touchpoint is refused rather than guessed.');
  }
  if (!isOutreachTouchpointType(typeId)) {
    return refuse('OUTREACH_TYPE_UNKNOWN', 'That is not a declared touchpoint type, so the touchpoint is refused rather than guessed.');
  }
  if (!isFinancierStage(providerStage)) {
    return refuse('OUTREACH_STAGE_UNKNOWN', 'That is not a declared financier lifecycle stage, so the touchpoint is refused rather than guessed.');
  }
  if (providerStage === 'rejected' || providerStage === 'parked') {
    return refuse('OUTREACH_STAGE_NOT_IN_PIPELINE', 'A rejected or parked provider is not in the outreach pipeline, so no touchpoint is allowed.', providerStage);
  }
  const idx = STAGE_ORDER.indexOf(providerStage);
  const entryIdx = STAGE_ORDER.indexOf(OUTREACH_ENTRY_STAGE);
  const contactedIdx = STAGE_ORDER.indexOf(OUTREACH_CONTACTED_STAGE);
  if (idx < entryIdx) {
    return refuse('OUTREACH_REQUIRES_TARGET_STAGE', 'Outreach begins at the TARGET stage — a merely researched or qualified provider is never approached.', providerStage);
  }
  if (typeId === 'initial_contact' && providerStage !== OUTREACH_ENTRY_STAGE) {
    return refuse('OUTREACH_INITIAL_ALREADY_DONE', 'An initial contact is legal only at exactly TARGET — a second "first" contact is refused.', providerStage);
  }
  if (typeId !== 'initial_contact' && idx < contactedIdx) {
    return refuse('OUTREACH_FOLLOWUP_REQUIRES_CONTACT', 'A follow-up (or any non-initial touchpoint) requires a provider already at CONTACTED or beyond.', providerStage);
  }
  return {
    providerStage,
    channelId,
    typeId,
    allowed: true,
    refusal: null,
    reason: `Allowed: ${FINANCIER_STAGE_LABELS[providerStage]} + ${typeId}.`,
  };
}

/* ── The deterministic cadence ──────────────────────────────────────────────── */

export interface OutreachCadenceDecision {
  currentStepId: string;
  next: OutreachCadenceStep | null;
  atEnd: boolean;
  refused: boolean;
  reason: string;
}

/**
 * The next cadence step after `currentStepId`. FAIL CLOSED: an undeclared step REFUSES
 * rather than guessing; the last step reports `atEnd`.
 */
export function advanceOutreachCadence(currentStepId: string): OutreachCadenceDecision {
  const idx = OUTREACH_CADENCE.findIndex((s) => s.id === currentStepId);
  if (idx === -1) {
    return {
      currentStepId,
      next: null,
      atEnd: false,
      refused: true,
      reason: 'That is not a declared cadence step, so the next step is refused rather than guessed.',
    };
  }
  if (idx === OUTREACH_CADENCE.length - 1) {
    return {
      currentStepId,
      next: null,
      atEnd: true,
      refused: false,
      reason: 'The cadence is complete — there is no further step.',
    };
  }
  const next = OUTREACH_CADENCE[idx + 1];
  return {
    currentStepId,
    next,
    atEnd: false,
    refused: false,
    reason: `Next: day ${next.dayOffset} — ${next.typeId}.`,
  };
}

/* ── The founder-facing summary ─────────────────────────────────────────────── */

export interface FounderOutreachSummary {
  /** The declared channels. */
  channels: { id: string; label: string; description: string }[];
  /** The declared touchpoint types, in order. */
  touchpointTypes: { id: string; label: string; description: string; advancesPipeline: boolean }[];
  /** The deterministic cadence, as day offsets. */
  cadence: { id: string; typeId: string; typeLabel: string; dayOffset: number }[];
  cadenceCount: number;
  /** The three lifecycle stages outreach spans. */
  entryStage: { id: FinancierStageId; label: string };
  contactedStage: { id: FinancierStageId; label: string };
  engagedStage: { id: FinancierStageId; label: string };
  /** The labelled illustrative touchpoints and their allow/refuse decision. */
  demoTouchpoints: {
    id: string;
    providerLabel: string;
    providerStageLabel: string;
    channelLabel: string;
    typeLabel: string;
    dayOffset: number;
    illustrative: boolean;
    allowed: boolean;
    refusal: OutreachRefusal | null;
  }[];
  demoCount: number;
  allowedCount: number;
  refusedCount: number;
  oneOwner: boolean;
  referencesDeclaredChannels: boolean;
  forwardOnly: boolean;
  followUpRequiresContact: boolean;
  requiresTargetStage: boolean;
  cadenceStrictlyIncreasing: boolean;
  basis: string;
  disclaimer: string;
}

/** Summarise the outreach pipeline for the founder surface. Derived, never retyped. */
export function buildFounderOutreachSummary(): FounderOutreachSummary {
  const typeLabelById = new Map(OUTREACH_TOUCHPOINT_TYPES.map((t) => [t.id, t.label]));
  const channelLabelById = new Map(OUTREACH_CHANNELS.map((c) => [c.id, c.label]));

  const demoTouchpoints = DEMO_OUTREACH_TOUCHPOINTS.map((t) => {
    const decision = planOutreachTouchpoint(t.providerStage, t.channelId, t.typeId);
    return {
      id: t.id,
      providerLabel: t.providerLabel,
      providerStageLabel: FINANCIER_STAGE_LABELS[t.providerStage],
      channelLabel: channelLabelById.get(t.channelId) ?? t.channelId,
      typeLabel: typeLabelById.get(t.typeId) ?? t.typeId,
      dayOffset: t.dayOffset,
      illustrative: t.illustrative,
      allowed: decision.allowed,
      refusal: decision.refusal,
    };
  });

  return {
    channels: OUTREACH_CHANNELS.map((c) => ({ id: c.id, label: c.label, description: c.description })),
    touchpointTypes: OUTREACH_TOUCHPOINT_TYPES.map((t) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      advancesPipeline: t.advancesPipeline,
    })),
    cadence: OUTREACH_CADENCE.map((s) => ({
      id: s.id,
      typeId: s.typeId,
      typeLabel: typeLabelById.get(s.typeId) ?? s.typeId,
      dayOffset: s.dayOffset,
    })),
    cadenceCount: OUTREACH_CADENCE.length,
    entryStage: { id: OUTREACH_ENTRY_STAGE, label: FINANCIER_STAGE_LABELS[OUTREACH_ENTRY_STAGE] },
    contactedStage: { id: OUTREACH_CONTACTED_STAGE, label: FINANCIER_STAGE_LABELS[OUTREACH_CONTACTED_STAGE] },
    engagedStage: { id: OUTREACH_ENGAGED_STAGE, label: FINANCIER_STAGE_LABELS[OUTREACH_ENGAGED_STAGE] },
    demoTouchpoints,
    demoCount: demoTouchpoints.length,
    allowedCount: demoTouchpoints.filter((t) => t.allowed).length,
    refusedCount: demoTouchpoints.filter((t) => !t.allowed).length,
    oneOwner: ONE_OUTREACH_PIPELINE_OWNER,
    referencesDeclaredChannels: OUTREACH_REFERENCES_DECLARED_CHANNELS,
    forwardOnly: OUTREACH_IS_FORWARD_ONLY,
    followUpRequiresContact: OUTREACH_FOLLOWUP_REQUIRES_CONTACT,
    requiresTargetStage: OUTREACH_REQUIRES_TARGET_STAGE,
    cadenceStrictlyIncreasing: OUTREACH_CADENCE_IS_STRICTLY_INCREASING,
    basis: FOUNDER_OUTREACH_BASIS,
    disclaimer: FOUNDER_OUTREACH_DISCLAIMER,
  };
}

