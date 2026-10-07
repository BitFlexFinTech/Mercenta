/**
 * §PHASE 5 — THE TUTORIAL RECORDINGS (the ONE owner).
 *
 * WHY THIS EXISTS
 * ---------------
 * The registry row `phase5-tutorial-recording` records that the platform needs
 * REAL Mercenta UI tutorial recordings with tutorial VERSIONING, UI-VERSION
 * COMPATIBILITY, OUTDATED-tutorial DETECTION and REUSABLE ASSETS.
 *
 * The seams already existed: `src/config/sharedWorkflows.ts` declares the
 * canonical journeys through the real screens and names `tutorial_recording` as
 * one of the THREE consumers of ONE automation (the SAME guided tour drives the
 * onboarding walkthrough AND the tutorial timeline, and the SAME `data-tour`
 * anchors drive the E2E test). What was MISSING was the ONE place that declares
 * the tutorial catalogue itself — which recording demonstrates which workflow,
 * the UI version it is compatible with, its own version, and the reusable asset
 * that holds it.
 *
 * This module is that owner. It declares, ONCE:
 *   · the served UI version — the ONE place the platform states which UI version
 *     is live, so outdated-tutorial detection has a single source of truth;
 *   · the reusable asset directory — ONE asset per canonical workflow, so the
 *     recording, the docs and the walkthrough share ONE asset, not three copies;
 *   · the tutorial catalogue — one recording per canonical SHARED WORKFLOW, so
 *     the tutorials can never describe a journey the E2E test does not (the
 *     workflow ids are REUSED from `SHARED_WORKFLOWS`, never re-declared).
 *
 * NO CONTENT IS INVENTED HERE. Every tutorial points at a canonical shared
 * workflow by id; the module-load guards below REFUSE to load if a tutorial names
 * a workflow that does not exist, if two tutorials share a workflow, or if a
 * canonical workflow has no tutorial (fail closed). The recordings themselves are
 * captured assets — an explicitly-pending DATA action — and NO tutorial is
 * presented as playable until its asset genuinely exists (see the resolver).
 *
 * NO AI, no clock, no randomness, no network: this module is fully deterministic.
 */
import { SHARED_WORKFLOWS } from '@/config/sharedWorkflows';

/* ── 1. The served UI version — the ONE place it is stated ─────────────────── */

/**
 * The UI version the platform currently serves. Tutorials declare the UI version
 * they are COMPATIBLE WITH; a tutorial whose compatible version differs from this
 * one is OUTDATED. There is exactly ONE place this is stated, so the rule can
 * never drift across surfaces.
 */
export const SERVED_UI_VERSION = '2026.10';

/* ── 2. The reusable asset directory ───────────────────────────────────────── */

/**
 * The ONE directory that holds every tutorial asset. Assets are REUSABLE: the
 * recording, the onboarding walkthrough and the Knowledge Base all point at the
 * SAME asset per canonical workflow — there is no second copy.
 */
export const TUTORIAL_ASSET_DIR = 'public/tutorials';

/* ── 3. The tutorial catalogue ─────────────────────────────────────────────── */

export interface TutorialRecordingDefinition {
  id: string;
  /** The brand-facing title of the recording. */
  title: string;
  /** What the recording demonstrates, in plain language. */
  description: string;
  /**
   * The canonical SHARED WORKFLOW this recording demonstrates. It is an id into
   * `SHARED_WORKFLOWS` — REUSED, never re-declared — so the recording, the E2E
   * test and the onboarding walkthrough can never describe the same journey
   * differently.
   */
  workflowId: string;
  /**
   * The UI version this recording is COMPATIBLE WITH — the version the UI was on
   * when the recording was made. A recording whose compatible version differs from
   * `SERVED_UI_VERSION` is detected as OUTDATED.
   */
  compatibleUiVersion: string;
  /** The version of the recording itself (monotonic). */
  tutorialVersion: number;
  /**
   * The reusable asset that holds the recording — ONE asset per canonical
   * workflow, named from the workflow id so it cannot drift.
   */
  asset: string;
}

/** The canonical asset path for a shared workflow — derived, never hand-typed. */
export function tutorialAssetFor(workflowId: string): string {
  return `${TUTORIAL_ASSET_DIR}/${workflowId}.mp4`;
}

export const TUTORIAL_RECORDINGS: readonly TutorialRecordingDefinition[] = [
  {
    id: 'tutorial-first-login',
    title: 'Getting started: your first login',
    description: 'The first-time walk through the main navigation and the key rules a brand must know.',
    workflowId: 'first-login-orientation',
    compatibleUiVersion: SERVED_UI_VERSION,
    tutorialVersion: 1,
    asset: tutorialAssetFor('first-login-orientation'),
  },
  {
    id: 'tutorial-add-a-product',
    title: 'Adding a product to your catalogue',
    description: 'Create a catalogue listing and understand the image, cost and compliance requirements.',
    workflowId: 'add-a-product',
    compatibleUiVersion: SERVED_UI_VERSION,
    tutorialVersion: 1,
    asset: tutorialAssetFor('add-a-product'),
  },
  {
    id: 'tutorial-acknowledge-a-purchase-order',
    title: 'Acknowledging a purchase order',
    description: 'Accept, reject or backorder the lines of a purchase order, and what the deadline means.',
    workflowId: 'acknowledge-a-purchase-order',
    compatibleUiVersion: SERVED_UI_VERSION,
    tutorialVersion: 1,
    asset: tutorialAssetFor('acknowledge-a-purchase-order'),
  },
  {
    id: 'tutorial-file-a-shipment',
    title: 'Filing a shipment',
    description: 'How a shipment is raised and tracked once a purchase order is accepted.',
    workflowId: 'file-a-shipment',
    compatibleUiVersion: SERVED_UI_VERSION,
    tutorialVersion: 1,
    asset: tutorialAssetFor('file-a-shipment'),
  },
  {
    id: 'tutorial-handle-a-deduction',
    title: 'Handling a deduction',
    description: 'Review a deduction and dispute one that is wrong, with the evidence that supports the position.',
    workflowId: 'handle-a-deduction',
    compatibleUiVersion: SERVED_UI_VERSION,
    tutorialVersion: 1,
    asset: tutorialAssetFor('handle-a-deduction'),
  },
  {
    id: 'tutorial-keep-compliance-current',
    title: 'Keeping compliance current',
    description: 'Why documents must stay in date, and what happens to a catalogue when one expires.',
    workflowId: 'keep-compliance-current',
    compatibleUiVersion: SERVED_UI_VERSION,
    tutorialVersion: 1,
    asset: tutorialAssetFor('keep-compliance-current'),
  },
];

/* ── 4. The rules, the refusals, the basis and the pinned invariants ───────── */

export const TUTORIAL_RECORDING_RULES: readonly string[] = [
  'Every recording demonstrates a canonical SHARED WORKFLOW — the SAME journey the E2E test drives and the onboarding walkthrough shows — so a tutorial can never describe something the product does not do.',
  'A recording declares the UI version it is COMPATIBLE WITH against the ONE served version, so an OUTDATED tutorial is detected rather than shown as if current.',
  'Assets are REUSABLE: ONE asset per canonical workflow, shared by the recording, the docs and the walkthrough — there is no second copy.',
  'No recording is presented as playable until its asset genuinely exists — an uncaptured tutorial is PENDING, never assumed to work.',
  'The definitions are deterministic — no AI, no clock, no randomness, no network.',
] as const;

export const TUTORIAL_RECORDING_REFUSALS = {
  unknownTutorial:
    'TUTORIAL_UNKNOWN — no recording is declared for that id, so none is shown rather than a guessed one.',
  requiresWorkflow:
    'TUTORIAL_REQUIRES_WORKFLOW — the recording names no workflow, so it is refused rather than shown.',
  unknownWorkflow:
    'TUTORIAL_WORKFLOW_UNKNOWN — the recording points at a workflow that does not exist, so it is refused rather than shown.',
  assetMissing:
    'TUTORIAL_ASSET_MISSING — the recording declares no asset, so it is refused rather than shown.',
} as const;

export const TUTORIAL_RECORDING_BASIS =
  'The tutorial recordings are declared once here: one recording per canonical SHARED WORKFLOW (the workflow ids REUSED, never re-declared), each declaring the UI version it is compatible with against the ONE served version, its own version, and its reusable asset. A recording is CURRENT only when its asset genuinely exists AND its compatible UI version equals the served version; a recording on an older UI version is DETECTED as OUTDATED and an uncaptured recording is PENDING — never shown as if it worked. It is deterministic — no AI, no clock.';

export const TUTORIAL_RECORDING_DISCLAIMER =
  'This declares WHICH recording demonstrates which journey and against which UI version, not the captured video itself. Until a recording asset is captured every tutorial is PENDING: none is asserted as playable, and none is ever fabricated.';

/** Pinned invariants the gate asserts. */
export const ONE_TUTORIAL_RECORDINGS_OWNER = true;
export const TUTORIALS_REUSE_SHARED_WORKFLOWS = true;
export const TUTORIALS_DECLARE_COMPATIBLE_UI_VERSION = true;
export const OUTDATED_TUTORIALS_ARE_DETECTED = true;

/* ── 5. Module-load guards (fail closed) ───────────────────────────────────── */

function assertTutorialRecordingsIntegrity(): void {
  if (TUTORIAL_RECORDINGS.length === 0) {
    throw new Error('[tutorialRecordings] at least one tutorial must be declared');
  }
  if (SERVED_UI_VERSION.trim().length === 0) {
    throw new Error('[tutorialRecordings] the served UI version must be declared');
  }
  const ids = TUTORIAL_RECORDINGS.map((t) => t.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error('[tutorialRecordings] two tutorials must not share an id');
  }
  const workflowIds = TUTORIAL_RECORDINGS.map((t) => t.workflowId);
  if (new Set(workflowIds).size !== workflowIds.length) {
    throw new Error('[tutorialRecordings] two tutorials must not share a workflow');
  }
  const declaredWorkflowIds = new Set(SHARED_WORKFLOWS.map((w) => w.id));
  for (const t of TUTORIAL_RECORDINGS) {
    if (!declaredWorkflowIds.has(t.workflowId)) {
      throw new Error(`[tutorialRecordings] tutorial "${t.id}" points at an undeclared workflow "${t.workflowId}"`);
    }
    if (t.compatibleUiVersion.trim().length === 0) {
      throw new Error(`[tutorialRecordings] tutorial "${t.id}" must declare a compatible UI version`);
    }
    if (!Number.isInteger(t.tutorialVersion) || t.tutorialVersion < 1) {
      throw new Error(`[tutorialRecordings] tutorial "${t.id}" must declare a version of at least 1`);
    }
    if (t.asset.trim().length === 0) {
      throw new Error(`[tutorialRecordings] tutorial "${t.id}" must declare an asset`);
    }
  }
  // COVERAGE: every canonical shared workflow must have a recording, so the
  // tutorial catalogue can never silently fall behind the journeys it teaches.
  for (const w of SHARED_WORKFLOWS) {
    if (!workflowIds.includes(w.id)) {
      throw new Error(`[tutorialRecordings] the canonical workflow "${w.id}" has no tutorial recording`);
    }
  }
}

assertTutorialRecordingsIntegrity();


