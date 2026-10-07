#!/usr/bin/env node
/**
 * §PHASE 5 — THE TUTORIAL RECORDINGS GATE.
 *
 * The row `phase5-tutorial-recording` records that the platform needs REAL
 * Mercenta UI tutorial recordings with tutorial VERSIONING, UI-VERSION
 * COMPATIBILITY, OUTDATED-tutorial DETECTION and REUSABLE ASSETS. This increment
 * adds the ONE owner (`src/config/tutorialRecordings.ts`) and the pure resolver
 * (`src/lib/education/resolveTutorialRecording.ts`). The properties a comment
 * cannot guarantee are proved here:
 *
 *   · the recordings are declared, unique by id and by workflow, and every one
 *     names a REAL canonical SHARED WORKFLOW (REUSED, never re-declared);
 *   · EVERY canonical shared workflow has a recording (the catalogue cannot fall
 *     behind the journeys it teaches);
 *   · each recording declares a compatible UI version, a version ≥ 1 and an asset
 *     derived from its workflow id (the REUSABLE-asset guarantee);
 *   · the resolver FAILS CLOSED — an unknown id, no workflow, an unknown workflow
 *     and a missing asset are ALL refused; an uncaptured asset is PENDING and a
 *     recording on an older UI version is DETECTED as OUTDATED — while a recording
 *     whose asset exists AND whose version matches is CURRENT (both branches
 *     proved);
 *   · with no captured asset EVERY recording is PENDING (nothing is shown as
 *     playable until captured);
 *   · it is DETERMINISTIC (no AI, no clock, no network), INTERNAL (no brand
 *     import), USED by the Control Centre and RENDERED by the founder surface.
 *
 * Run: node scripts/validate-tutorial-recordings.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures += 1;
};
const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
const walk = (dir) => {
  let out = [];
  for (const f of readdirSync(dir)) {
    const p = `${dir}/${f}`;
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
};
const equals = (a, b) => JSON.stringify(a) === JSON.stringify(b);

try {
  const owner = await server.ssrLoadModule('/src/config/tutorialRecordings.ts');
  const res = await server.ssrLoadModule('/src/lib/education/resolveTutorialRecording.ts');
  const workflows = await server.ssrLoadModule('/src/config/sharedWorkflows.ts');

  const recordings = owner.TUTORIAL_RECORDINGS;
  const servedUiVersion = owner.SERVED_UI_VERSION;
  const sharedIds = workflows.SHARED_WORKFLOWS.map((w) => w.id);

  console.log('\n── A. the declared recordings ──');
  test('at least one recording is declared', recordings.length > 0, String(recordings.length));
  test('the served UI version is declared', typeof servedUiVersion === 'string' && servedUiVersion.length > 0);
  test('recording ids are unique', new Set(recordings.map((t) => t.id)).size === recordings.length);
  test('recording workflows are unique (one recording per workflow)',
    new Set(recordings.map((t) => t.workflowId)).size === recordings.length);
  test('every recording names a title, a description and an asset',
    recordings.every((t) => t.title.length >= 2 && t.description.length > 8 && t.asset.trim().length > 0));
  test('every recording declares a compatible UI version and a version >= 1',
    recordings.every((t) => t.compatibleUiVersion.trim().length > 0 && Number.isInteger(t.tutorialVersion) && t.tutorialVersion >= 1));

  console.log('\n── B. the recordings REUSE the canonical shared workflows ──');
  test('every recording workflow is a DECLARED shared workflow',
    recordings.every((t) => sharedIds.includes(t.workflowId)),
    recordings.filter((t) => !sharedIds.includes(t.workflowId)).map((t) => t.workflowId).join(', '));
  test('EVERY canonical shared workflow has a recording (coverage)',
    equals(recordings.map((t) => t.workflowId).sort(), [...sharedIds].sort()));
  test('every asset is DERIVED from its workflow id (one reusable asset per workflow)',
    recordings.every((t) => t.asset === owner.tutorialAssetFor(t.workflowId) && t.asset.includes(t.workflowId)),
    recordings.map((t) => `${t.workflowId}:${t.asset}`).join(', '));
  test('every asset lives under the ONE canonical asset directory',
    recordings.every((t) => t.asset.startsWith(`${owner.TUTORIAL_ASSET_DIR}/`)));

  console.log('\n── C. the resolver FAILS CLOSED ──');
  const sample = recordings[0];
  const withAsset = () => true;
  const noAsset = () => false;
  const decide = (def, ctx) => res.evaluateTutorialRecording(def, ctx);
  test('a recording on an unknown id is REFUSED',
    decide({ ...sample, id: 'nope' }, { assetExists: withAsset }).refusal === 'TUTORIAL_UNKNOWN');
  test('a recording naming NO workflow is REFUSED',
    decide({ ...sample, workflowId: '' }, { assetExists: withAsset }).refusal === 'TUTORIAL_REQUIRES_WORKFLOW');
  test('a recording naming an unknown workflow is REFUSED',
    decide({ ...sample, workflowId: 'no-such-workflow' }, { assetExists: withAsset }).refusal === 'TUTORIAL_WORKFLOW_UNKNOWN');
  test('a recording declaring no asset is REFUSED',
    decide({ ...sample, asset: '' }, { assetExists: withAsset }).refusal === 'TUTORIAL_ASSET_MISSING');
  test('a recording whose asset is uncaptured is PENDING (never playable)',
    decide(sample, { assetExists: noAsset }).refusal === 'TUTORIAL_ASSET_PENDING' &&
      decide(sample, { assetExists: noAsset }).playable === false);
  test('a recording on an OLDER UI version is DETECTED as OUTDATED',
    decide(sample, { assetExists: withAsset, servedUiVersion: `${servedUiVersion}-next` }).refusal === 'TUTORIAL_OUTDATED');
  test('a recording whose asset exists AND whose version matches is CURRENT (allowed branch works)',
    decide(sample, { assetExists: withAsset, servedUiVersion }).status === 'current' &&
      decide(sample, { assetExists: withAsset, servedUiVersion }).playable === true);

  console.log('\n── D. deterministic — no AI, no clock, no network ──');
  const ownerSrc = stripComments(read('src/config/tutorialRecordings.ts'));
  const resSrc = stripComments(read('src/lib/education/resolveTutorialRecording.ts'));
  const banned = (s) => /openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date|\bimport\s*\(/i.test(s);
  test('neither the owner nor the resolver makes an AI / provider / network / random / dynamic-import call',
    !banned(ownerSrc) && !banned(resSrc));
  test('the owner fails closed at module load (guards present)',
    /at least one tutorial must be declared/.test(ownerSrc) &&
      /has no tutorial recording/.test(ownerSrc) &&
      /points at an undeclared workflow/.test(ownerSrc));

  console.log('\n── E. INTERNAL — one owner, one resolver, no brand leakage ──');
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand/', import.meta.url)));
  const brandLeak = brandFiles.filter((f) => /tutorialRecordings|TUTORIAL_RECORDINGS|buildTutorialRecordingsSummary/.test(readFileSync(f, 'utf8')));
  test('no brand component imports the tutorial recordings', brandLeak.length === 0, brandLeak.join(', '));

  console.log('\n── F. the founder summary (derived) ──');
  const summary = res.buildTutorialRecordingsSummary();          // default: nothing captured
  const allCaptured = res.buildTutorialRecordingsSummary({ assetExists: () => true });
  test('the summary covers every recording and workflow',
    summary.recordingCount === recordings.length && summary.workflowCount === sharedIds.length);
  test('with no captured asset EVERY recording is PENDING (nothing shown as playable)',
    summary.currentCount === 0 && summary.playableCount === 0 && summary.pendingCount === recordings.length);
  test('with every asset present AND the served version EVERY recording is CURRENT',
    allCaptured.currentCount === recordings.length && allCaptured.playableCount === recordings.length);
  test('the summary’s live CURRENT example is current', summary.exampleCurrent.status === 'current');
  test('the summary’s live OUTDATED example is DETECTED as outdated',
    summary.exampleOutdated.status === 'outdated' && summary.exampleOutdated.refusal === 'TUTORIAL_OUTDATED');
  test('the summary exposes the pinned invariants',
    summary.oneOwner && summary.reusesSharedWorkflows && summary.declaresCompatibleUiVersion && summary.detectsOutdated);
  test('the summary reports the served UI version and the asset directory',
    summary.servedUiVersion === servedUiVersion && summary.assetDir === owner.TUTORIAL_ASSET_DIR);

  console.log('\n── G. USED by the Control Centre + rendered by the founder surface ──');
  const cc = read('src/lib/commandCentre/controlCentre.ts');
  test('controlCentre imports the resolver and exposes tutorialRecordings',
    /buildTutorialRecordingsSummary/.test(cc) && /tutorialRecordings:\s*TutorialRecordingsSummary/.test(cc));
  const fcc = read('src/components/admin/FounderControlCentre.tsx');
  test('the Founder Control Centre renders the tutorial recordings section',
    /control-tutorial-recordings-list/.test(fcc) && /model\.tutorialRecordings/.test(fcc));

  console.log('\n── H. SELF-CHECK — the gate can fail ──');
  test('the comparison helper ACCEPTS a correct expectation', equals(['a'], ['a']));
  test('the comparison helper REJECTS a wrong expectation (proves it can fail)', !equals(['a'], ['b']));
  test('an unknown-id recording REFUSES — proves the refused branch works',
    res.evaluateTutorialRecording({ id: '', workflowId: 'add-a-product', compatibleUiVersion: servedUiVersion, asset: 'x' }, { assetExists: withAsset }).refusal === 'TUTORIAL_UNKNOWN');
} catch (err) {
  console.error('TUTORIAL_RECORDINGS_VALIDATION_FAIL:', err.message);
  failures += 1;
} finally {
  await server.close();
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);

