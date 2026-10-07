/**
 * §PHASE 5 — THE TUTORIAL RECORDING RESOLVER — the pure rules over the ONE owner.
 *
 * The owner (`src/config/tutorialRecordings.ts`) declares the served UI version,
 * the reusable asset directory and the tutorial catalogue; this module applies
 * them. It is PURE and DETERMINISTIC: no clock, no randomness, no network, no AI,
 * no filesystem.
 *
 * THE RULES IT ENFORCES (FAIL CLOSED), in this order:
 *   · a recording on an UNDECLARED id is REFUSED (TUTORIAL_UNKNOWN);
 *   · a recording naming no workflow is REFUSED (TUTORIAL_REQUIRES_WORKFLOW);
 *   · a recording naming an UNDECLARED workflow is REFUSED
 *     (TUTORIAL_WORKFLOW_UNKNOWN);
 *   · a recording declaring no asset is REFUSED (TUTORIAL_ASSET_MISSING);
 *   · a recording whose asset does not genuinely exist is PENDING
 *     (TUTORIAL_ASSET_PENDING) — it is NEVER presented as playable;
 *   · a recording whose COMPATIBLE UI VERSION differs from the served version is
 *     DETECTED as OUTDATED (TUTORIAL_OUTDATED) — flagged, not shown as current;
 *   · only a recording whose asset exists AND whose compatible version equals the
 *     served version is CURRENT (playable).
 *
 * Asset existence is INJECTED (`assetExists`) so the resolver stays pure: the
 * Control Centre supplies the real probe, and a caller that supplies nothing gets
 * the honest default — nothing is captured, so every recording is PENDING.
 */
import {
  ONE_TUTORIAL_RECORDINGS_OWNER,
  OUTDATED_TUTORIALS_ARE_DETECTED,
  SERVED_UI_VERSION,
  TUTORIAL_ASSET_DIR,
  TUTORIAL_RECORDING_BASIS,
  TUTORIAL_RECORDING_DISCLAIMER,
  TUTORIAL_RECORDING_RULES,
  TUTORIAL_RECORDINGS,
  TUTORIALS_DECLARE_COMPATIBLE_UI_VERSION,
  TUTORIALS_REUSE_SHARED_WORKFLOWS,
  type TutorialRecordingDefinition,
} from '@/config/tutorialRecordings';
import { findSharedWorkflow } from '@/lib/education/resolveSharedWorkflow';

const RECORDING_BY_ID = new Map(TUTORIAL_RECORDINGS.map((t) => [t.id, t]));

/** True only when the value is a DECLARED tutorial recording id. */
export function isTutorialRecording(value: string | null | undefined): boolean {
  return typeof value === 'string' && RECORDING_BY_ID.has(value);
}

/** The canonical recording for an id, or null (fail closed). */
export function findTutorialRecording(id: string | null | undefined): TutorialRecordingDefinition | null {
  if (typeof id !== 'string' || id.length === 0) return null;
  return RECORDING_BY_ID.get(id) ?? null;
}

/**
 * Whether a recording's asset genuinely exists on disk. Injected so the resolver
 * stays pure; the default (used when none is supplied) is `false` for every asset
 * — the honest fail-closed position, so nothing is presented as playable until a
 * real recording is captured.
 */
export type TutorialAssetProbe = (assetPath: string) => boolean;

export type TutorialRecordingRefusal =
  | 'TUTORIAL_UNKNOWN'
  | 'TUTORIAL_REQUIRES_WORKFLOW'
  | 'TUTORIAL_WORKFLOW_UNKNOWN'
  | 'TUTORIAL_ASSET_MISSING'
  | 'TUTORIAL_ASSET_PENDING'
  | 'TUTORIAL_OUTDATED';

export type TutorialRecordingStatus = 'current' | 'outdated' | 'pending';

export interface TutorialRecordingDecision {
  id: string;
  /** True only when the recording is CURRENT and genuinely playable. */
  playable: boolean;
  status: TutorialRecordingStatus;
  refusal: TutorialRecordingRefusal | null;
  reason: string;
}

export interface TutorialRecordingContext {
  /** The UI version the platform currently serves. Defaults to the owner's value. */
  servedUiVersion?: string;
  /** Whether a recording's asset genuinely exists. Defaults to `() => false`. */
  assetExists?: TutorialAssetProbe;
}

/**
 * Decide whether one recording may be presented. FAIL CLOSED: the checks run in a
 * fixed order, and any failure refuses or downgrades the recording — a recording
 * is never presented as playable when it is not.
 */
export function evaluateTutorialRecording(
  def: Pick<TutorialRecordingDefinition, 'id' | 'workflowId' | 'compatibleUiVersion' | 'asset'>,
  context: TutorialRecordingContext = {}
): TutorialRecordingDecision {
  const servedUiVersion = context.servedUiVersion ?? SERVED_UI_VERSION;
  const assetExists = context.assetExists ?? (() => false);

  const refuse = (
    status: TutorialRecordingStatus,
    refusal: TutorialRecordingRefusal,
    reason: string
  ): TutorialRecordingDecision => ({ id: def.id, playable: false, status, refusal, reason });

  if (!RECORDING_BY_ID.has(def.id)) {
    return refuse('pending', 'TUTORIAL_UNKNOWN', 'no recording is declared for that id');
  }
  if (!def.workflowId || def.workflowId.trim().length === 0) {
    return refuse('pending', 'TUTORIAL_REQUIRES_WORKFLOW', 'the recording names no workflow');
  }
  if (!findSharedWorkflow(def.workflowId)) {
    return refuse('pending', 'TUTORIAL_WORKFLOW_UNKNOWN', `the workflow "${def.workflowId}" is not declared`);
  }
  if (!def.asset || def.asset.trim().length === 0) {
    return refuse('pending', 'TUTORIAL_ASSET_MISSING', 'the recording declares no asset');
  }
  if (!assetExists(def.asset)) {
    return refuse('pending', 'TUTORIAL_ASSET_PENDING', 'the recording asset has not been captured yet');
  }
  if (def.compatibleUiVersion !== servedUiVersion) {
    return refuse(
      'outdated',
      'TUTORIAL_OUTDATED',
      `recorded against UI version ${def.compatibleUiVersion}, but the platform serves ${servedUiVersion}`
    );
  }
  return {
    id: def.id,
    playable: true,
    status: 'current',
    refusal: null,
    reason: `recorded against the served UI version ${servedUiVersion} and its asset exists`,
  };
}

/** Resolve a canonical recording by id. FAIL CLOSED: an unknown id is REFUSED. */
export function resolveTutorialRecording(
  id: string,
  context: TutorialRecordingContext = {}
): TutorialRecordingDecision {
  const def = findTutorialRecording(id);
  if (!def) {
    return {
      id,
      playable: false,
      status: 'pending',
      refusal: 'TUTORIAL_UNKNOWN',
      reason: 'no recording is declared for that id',
    };
  }
  return evaluateTutorialRecording(def, context);
}

/* ── The founder-facing summary over the canonical owner ────────────────────── */

export interface TutorialRecordingView {
  id: string;
  title: string;
  workflowId: string;
  workflowLabel: string;
  compatibleUiVersion: string;
  tutorialVersion: number;
  asset: string;
  status: TutorialRecordingStatus;
  playable: boolean;
  refusal: TutorialRecordingRefusal | null;
  reason: string;
}

export interface TutorialRecordingExample {
  id: string;
  status: TutorialRecordingStatus;
  refusal: TutorialRecordingRefusal | null;
  reason: string;
}

export interface TutorialRecordingsSummary {
  servedUiVersion: string;
  assetDir: string;
  recordings: TutorialRecordingView[];
  recordingCount: number;
  /** Recordings that are CURRENT and playable today (0 until an asset is captured). */
  currentCount: number;
  playableCount: number;
  outdatedCount: number;
  pendingCount: number;
  workflowCount: number;
  /** A live example that is CURRENT (asset present + version match) — computed, not written. */
  exampleCurrent: TutorialRecordingExample;
  /** A live example DETECTED as OUTDATED (asset present, older UI version) — computed, not written. */
  exampleOutdated: TutorialRecordingExample;
  oneOwner: boolean;
  reusesSharedWorkflows: boolean;
  declaresCompatibleUiVersion: boolean;
  detectsOutdated: boolean;
  rules: readonly string[];
  basis: string;
  disclaimer: string;
}

/** The version used to prove the OUTDATED branch fires — a demonstration only. */
export const DEMO_NEXT_UI_VERSION = `${SERVED_UI_VERSION}-next`;

/**
 * Summarise the tutorial recordings for the founder surface. The statuses and the
 * two live examples are DERIVED from the owner and the resolver, so the surface
 * shows the rules actually firing rather than merely describing them.
 */
export function buildTutorialRecordingsSummary(
  context: TutorialRecordingContext = {}
): TutorialRecordingsSummary {
  const recordings: TutorialRecordingView[] = TUTORIAL_RECORDINGS.map((def) => {
    const decision = evaluateTutorialRecording(def, context);
    return {
      id: def.id,
      title: def.title,
      workflowId: def.workflowId,
      workflowLabel: findSharedWorkflow(def.workflowId)?.label ?? def.workflowId,
      compatibleUiVersion: def.compatibleUiVersion,
      tutorialVersion: def.tutorialVersion,
      asset: def.asset,
      status: decision.status,
      playable: decision.playable,
      refusal: decision.refusal,
      reason: decision.reason,
    };
  });

  const first = TUTORIAL_RECORDINGS[0];
  const currentDecision = first
    ? evaluateTutorialRecording(first, { servedUiVersion: SERVED_UI_VERSION, assetExists: () => true })
    : null;
  const outdatedDecision = first
    ? evaluateTutorialRecording(first, { servedUiVersion: DEMO_NEXT_UI_VERSION, assetExists: () => true })
    : null;

  const toExample = (d: TutorialRecordingDecision | null): TutorialRecordingExample => ({
    id: d?.id ?? '',
    status: d?.status ?? 'pending',
    refusal: d?.refusal ?? null,
    reason: d?.reason ?? '',
  });

  return {
    servedUiVersion: context.servedUiVersion ?? SERVED_UI_VERSION,
    assetDir: TUTORIAL_ASSET_DIR,
    recordings,
    recordingCount: recordings.length,
    currentCount: recordings.filter((r) => r.status === 'current').length,
    playableCount: recordings.filter((r) => r.playable).length,
    outdatedCount: recordings.filter((r) => r.status === 'outdated').length,
    pendingCount: recordings.filter((r) => r.status === 'pending').length,
    workflowCount: new Set(recordings.map((r) => r.workflowId)).size,
    exampleCurrent: toExample(currentDecision),
    exampleOutdated: toExample(outdatedDecision),
    oneOwner: ONE_TUTORIAL_RECORDINGS_OWNER,
    reusesSharedWorkflows: TUTORIALS_REUSE_SHARED_WORKFLOWS,
    declaresCompatibleUiVersion: TUTORIALS_DECLARE_COMPATIBLE_UI_VERSION,
    detectsOutdated: OUTDATED_TUTORIALS_ARE_DETECTED,
    rules: TUTORIAL_RECORDING_RULES,
    basis: TUTORIAL_RECORDING_BASIS,
    disclaimer: TUTORIAL_RECORDING_DISCLAIMER,
  };
}


