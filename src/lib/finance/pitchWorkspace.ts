/**
 * §PHASE 8 — THE PITCH WORKSPACE RESOLVER — the pure rules over the ONE owner.
 *
 * The owner (`src/config/pitchWorkspace.ts`) declares the founder capital workspace
 * and how each section's content is produced; this module applies it. It is PURE and
 * DETERMINISTIC: no clock, no randomness, no network, no AI, no filesystem.
 *
 * THE RULES IT ENFORCES:
 *   · an UNKNOWN section is REFUSED (PITCH_SECTION_UNKNOWN);
 *   · a FINANCIAL section's numbers come ONLY from their deterministic canonical
 *     owner — AI is REFUSED as their producer (PITCH_FINANCIAL_REQUIRES_DETERMINISTIC_SOURCE);
 *   · AI may draft ONLY a NARRATIVE section (PITCH_AI_MAY_ONLY_DRAFT_NARRATIVE);
 *   · the workspace is not READY while a REQUIRED section is missing
 *     (PITCH_REQUIRES_ALL_REQUIRED_SECTIONS) — both fail closed, so nothing is guessed.
 */
import {
  DEMO_PITCH_SECTION_STATES,
  ONE_PITCH_WORKSPACE_OWNER,
  PITCH_FINANCIALS_STAY_DETERMINISTIC,
  PITCH_REQUIRES_ALL_REQUIRED_SECTIONS,
  PITCH_SECTIONS_ARE_CANONICAL,
  PITCH_SECTION_COUNT,
  PITCH_SECTION_IDS,
  PITCH_WORKSPACE_BASIS,
  PITCH_WORKSPACE_DISCLAIMER,
  PITCH_WORKSPACE_RULES,
  PITCH_WORKSPACE_SECTIONS,
  REQUIRED_PITCH_SECTION_IDS,
  type PitchProducer,
  type PitchSection,
  type PitchSectionKind,
} from '@/config/pitchWorkspace';

export type PitchRefusal =
  | 'PITCH_SECTION_UNKNOWN'
  | 'PITCH_FINANCIAL_REQUIRES_DETERMINISTIC_SOURCE'
  | 'PITCH_AI_MAY_ONLY_DRAFT_NARRATIVE'
  | 'PITCH_REQUIRES_ALL_REQUIRED_SECTIONS';

/** A human label for each section kind — quoted by a surface or a gate. */
export const PITCH_SECTION_KIND_LABELS: Record<PitchSectionKind, string> = {
  deterministic_financial: 'Deterministic (canonical owner)',
  narrative: 'Narrative',
  reference: 'Reference',
  activity: 'Activity (real records)',
};

export function isPitchSection(value: string | null | undefined): value is string {
  return typeof value === 'string' && PITCH_SECTION_IDS.includes(value);
}

/** The declared section, or null (refused) for an unknown id — fail closed. */
export function resolvePitchSection(id: string | null | undefined): PitchSection | null {
  if (!isPitchSection(id)) return null;
  return PITCH_WORKSPACE_SECTIONS.find((s) => s.id === id) ?? null;
}

export interface PitchContributionDecision {
  sectionId: string;
  section: PitchSection | null;
  producer: PitchProducer;
  allowed: boolean;
  refusal: PitchRefusal | null;
  reason: string;
}

/**
 * Decide whether a section may be produced by `producer`. FAIL CLOSED: an unknown
 * section, a financial section produced by anyone but its canonical owner, and AI
 * producing anything but narrative are all REFUSED — never defaulted.
 */
export function evaluatePitchContribution(
  sectionId: string,
  producer: PitchProducer
): PitchContributionDecision {
  const section = resolvePitchSection(sectionId);
  if (!section) {
    return {
      sectionId,
      section: null,
      producer,
      allowed: false,
      refusal: 'PITCH_SECTION_UNKNOWN',
      reason: 'That is not a declared workspace section, so it is refused rather than guessed.',
    };
  }
  if (section.kind === 'deterministic_financial' && producer !== 'canonical_owner') {
    return {
      sectionId,
      section,
      producer,
      allowed: false,
      refusal: 'PITCH_FINANCIAL_REQUIRES_DETERMINISTIC_SOURCE',
      reason: `“${section.label}” carries figures, so it must be produced by its deterministic canonical owner (${section.sourceOwner}) — never by AI.`,
    };
  }
  if (producer === 'ai' && section.kind !== 'narrative') {
    return {
      sectionId,
      section,
      producer,
      allowed: false,
      refusal: 'PITCH_AI_MAY_ONLY_DRAFT_NARRATIVE',
      reason: `AI may draft only narrative sections — “${section.label}” is ${section.kind}.`,
    };
  }
  return {
    sectionId,
    section,
    producer,
    allowed: true,
    refusal: null,
    reason: `Allowed: “${section.label}” produced by ${producer}.`,
  };
}

export interface PitchReadinessDecision {
  presentRequired: string[];
  missingRequired: string[];
  requiredCount: number;
  ready: boolean;
  refusal: PitchRefusal | null;
  reason: string;
}

/**
 * Decide whether the workspace is READY. Unknown ids in the given list are ignored
 * (never guessed); readiness requires every REQUIRED section to be present, and
 * asking to mark it ready while one is missing is REFUSED.
 */
export function evaluatePitchReadiness(
  presentSectionIds: readonly string[],
  requestReady: boolean
): PitchReadinessDecision {
  const present = new Set(presentSectionIds.filter(isPitchSection));
  const presentRequired = REQUIRED_PITCH_SECTION_IDS.filter((id) => present.has(id));
  const missingRequired = REQUIRED_PITCH_SECTION_IDS.filter((id) => !present.has(id));
  const ready = missingRequired.length === 0;
  if (requestReady && !ready) {
    return {
      presentRequired,
      missingRequired,
      requiredCount: REQUIRED_PITCH_SECTION_IDS.length,
      ready: false,
      refusal: 'PITCH_REQUIRES_ALL_REQUIRED_SECTIONS',
      reason: `A complete pitch is not ready while a required section is missing: ${missingRequired.join(', ')}.`,
    };
  }
  return {
    presentRequired,
    missingRequired,
    requiredCount: REQUIRED_PITCH_SECTION_IDS.length,
    ready,
    refusal: null,
    reason: ready
      ? 'Every required section is present.'
      : `${missingRequired.length} required section(s) still missing.`,
  };
}

/* ── The founder-facing summary ──────────────────────────────────────────── */

export interface PitchWorkspaceSummary {
  sections: {
    id: string;
    label: string;
    kind: PitchSectionKind;
    kindLabel: string;
    required: boolean;
    sourceOwner: string | null;
    aiMayDraft: boolean;
  }[];
  sectionCount: number;
  requiredCount: number;
  financialCount: number;
  narrativeCount: number;
  aiDraftableCount: number;
  /** The labelled illustrative state and its readiness decision. */
  demo: { sectionId: string; label: string; present: boolean }[];
  demoPresentCount: number;
  readiness: PitchReadinessDecision;
  oneOwner: boolean;
  sectionsCanonical: boolean;
  financialsDeterministic: boolean;
  requiresAllRequiredSections: boolean;
  rules: readonly string[];
  basis: string;
  disclaimer: string;
}

/** Summarise the workspace for the founder surface. Derived, never retyped. */
export function buildPitchWorkspaceSummary(): PitchWorkspaceSummary {
  const sections = PITCH_WORKSPACE_SECTIONS.map((s) => ({
    id: s.id,
    label: s.label,
    kind: s.kind,
    kindLabel: PITCH_SECTION_KIND_LABELS[s.kind],
    required: s.required,
    sourceOwner: s.sourceOwner ?? null,
    aiMayDraft: s.aiMayDraft,
  }));
  const label = (id: string) => sections.find((s) => s.id === id)?.label ?? id;
  const demo = DEMO_PITCH_SECTION_STATES.map((d) => ({
    sectionId: d.sectionId,
    label: label(d.sectionId),
    present: d.present,
  }));
  const demoPresent = demo.filter((d) => d.present).map((d) => d.sectionId);
  return {
    sections,
    sectionCount: sections.length,
    requiredCount: REQUIRED_PITCH_SECTION_IDS.length,
    financialCount: sections.filter((s) => s.kind === 'deterministic_financial').length,
    narrativeCount: sections.filter((s) => s.kind === 'narrative').length,
    aiDraftableCount: sections.filter((s) => s.aiMayDraft).length,
    demo,
    demoPresentCount: demoPresent.length,
    readiness: evaluatePitchReadiness(demoPresent, true),
    oneOwner: ONE_PITCH_WORKSPACE_OWNER,
    sectionsCanonical: PITCH_SECTIONS_ARE_CANONICAL,
    financialsDeterministic: PITCH_FINANCIALS_STAY_DETERMINISTIC,
    requiresAllRequiredSections: PITCH_REQUIRES_ALL_REQUIRED_SECTIONS,
    rules: PITCH_WORKSPACE_RULES,
    basis: PITCH_WORKSPACE_BASIS,
    disclaimer: PITCH_WORKSPACE_DISCLAIMER,
  };
}

/** The canonical section count — re-exported for a surface/gate to quote. */
export const PITCH_WORKSPACE_SECTION_COUNT = PITCH_SECTION_COUNT;
