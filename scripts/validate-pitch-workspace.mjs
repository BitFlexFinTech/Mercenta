#!/usr/bin/env node
/**
 * §PHASE 8 — THE PITCH WORKSPACE GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The pitch-workspace owner (`src/config/pitchWorkspace.ts`) declares the founder
 * capital workspace and how each section's content is produced, and the resolver
 * (`src/lib/finance/pitchWorkspace.ts`) applies it. The row's one NON-NEGOTIABLE rule
 * is: "AI may help prepare/explain; the financial numbers stay deterministic." That
 * is a property a comment cannot guarantee, so this gate proves:
 *
 *   · the workspace is EXACTLY the sixteen canonical sections, in order;
 *   · every financial section names a deterministic canonical owner, and AI may
 *     draft ONLY narrative sections;
 *   · a financial section produced by AI is REFUSED (PITCH_FINANCIAL_REQUIRES_DETERMINISTIC_SOURCE),
 *     and produced by its canonical owner is allowed;
 *   · AI producing a reference/activity section is REFUSED (PITCH_AI_MAY_ONLY_DRAFT_NARRATIVE);
 *   · an UNKNOWN section is REFUSED, and readiness requires every REQUIRED section;
 *   · it is deterministic (no AI, no clock, no network) and INTERNAL (no brand leakage); and
 *   · it is actually USED by the Control Centre and rendered by the founder surface.
 *
 * THE GATE CAN FAIL (self-check): the comparison helper is run against a
 * deliberately-wrong expectation as well as the correct one, and a malformed input is
 * exercised — the wrong expectation MUST be rejected and the malformed input MUST
 * refuse, so a green run proves the checks work rather than being vacuous.
 *
 * Run: node scripts/validate-pitch-workspace.mjs
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
/** Strip comments so a documented example (`Math.random`, a date) is not read as code. */
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

const CANONICAL_SECTIONS = [
  'mercenta_overview',
  'business_model',
  'vendor_infrastructure',
  'acquisition_pipeline',
  'purchase_volumes',
  'supplier_payment_requirements',
  'capital_requirements',
  'facility_request',
  'repayment_model',
  'risk_controls',
  'evidence',
  'documents',
  'contact_history',
  'meetings',
  'follow_ups',
  'pitch_preparation',
];
const REQUIRED = [
  'mercenta_overview',
  'business_model',
  'acquisition_pipeline',
  'purchase_volumes',
  'supplier_payment_requirements',
  'capital_requirements',
  'facility_request',
  'repayment_model',
  'risk_controls',
  'pitch_preparation',
];

try {
  const cfg = await server.ssrLoadModule('/src/config/pitchWorkspace.ts');
  const res = await server.ssrLoadModule('/src/lib/finance/pitchWorkspace.ts');

  console.log('\n── A. the workspace is exactly the sixteen canonical sections ──');
  test(
    'the section ids are the sixteen canonical sections in order',
    equals([...cfg.PITCH_SECTION_IDS], CANONICAL_SECTIONS)
  );
  test('there are sixteen sections', cfg.PITCH_WORKSPACE_SECTIONS.length === 16);
  test(
    'the required sections are the ten canonical required ones',
    equals([...cfg.REQUIRED_PITCH_SECTION_IDS], REQUIRED)
  );

  console.log('\n── B. every financial section names a deterministic owner; AI only narrative ──');
  const fin = cfg.PITCH_WORKSPACE_SECTIONS.filter((s) => s.kind === 'deterministic_financial');
  test('every financial section names a deterministic source owner', fin.every((s) => !!s.sourceOwner));
  test(
    'only financial sections declare a source owner',
    cfg.PITCH_WORKSPACE_SECTIONS.filter((s) => s.sourceOwner).every(
      (s) => s.kind === 'deterministic_financial'
    )
  );
  test(
    'AI may draft only narrative sections',
    cfg.PITCH_WORKSPACE_SECTIONS.filter((s) => s.aiMayDraft).every((s) => s.kind === 'narrative')
  );

  console.log('\n── C. a financial section produced by AI is REFUSED; by its owner is ALLOWED ──');
  const aiFin = res.evaluatePitchContribution('capital_requirements', 'ai');
  test(
    'AI producing a financial section is refused (deterministic source required)',
    aiFin.allowed === false && aiFin.refusal === 'PITCH_FINANCIAL_REQUIRES_DETERMINISTIC_SOURCE'
  );
  const ownerFin = res.evaluatePitchContribution('capital_requirements', 'canonical_owner');
  test('the canonical owner producing a financial section is allowed', ownerFin.allowed === true);

  console.log('\n── D. AI may draft only NARRATIVE ──');
  const aiNarr = res.evaluatePitchContribution('mercenta_overview', 'ai');
  test('AI producing a narrative section is allowed', aiNarr.allowed === true);
  const aiRef = res.evaluatePitchContribution('evidence', 'ai');
  test(
    'AI producing a reference section is refused',
    aiRef.allowed === false && aiRef.refusal === 'PITCH_AI_MAY_ONLY_DRAFT_NARRATIVE'
  );
  const aiAct = res.evaluatePitchContribution('meetings', 'ai');
  test(
    'AI producing an activity section is refused',
    aiAct.allowed === false && aiAct.refusal === 'PITCH_AI_MAY_ONLY_DRAFT_NARRATIVE'
  );

  console.log('\n── E. an unknown section is REFUSED ──');
  test(
    'isPitchSection is true for a declared section and false otherwise',
    res.isPitchSection('risk_controls') === true &&
      res.isPitchSection('bogus') === false &&
      res.isPitchSection('') === false &&
      res.isPitchSection(null) === false
  );
  const unk = res.evaluatePitchContribution('bogus', 'human');
  test(
    'an unknown section is refused',
    unk.allowed === false && unk.refusal === 'PITCH_SECTION_UNKNOWN'
  );

  console.log('\n── F. readiness requires every required section ──');
  const notReady = res.evaluatePitchReadiness(['mercenta_overview', 'business_model'], true);
  test(
    'asking ready while required sections are missing is REFUSED',
    notReady.ready === false && notReady.refusal === 'PITCH_REQUIRES_ALL_REQUIRED_SECTIONS'
  );
  const ready = res.evaluatePitchReadiness(REQUIRED, true);
  test('every required section present is READY', ready.ready === true);
  test(
    'unknown ids in the present list are ignored, never guessed',
    res.evaluatePitchReadiness([...REQUIRED, 'bogus'], true).ready === true
  );

  console.log('\n── G. deterministic — no AI, no clock, no network ──');
  const ownerSrc = stripComments(read('src/config/pitchWorkspace.ts'));
  const resSrc = stripComments(read('src/lib/finance/pitchWorkspace.ts'));
  test(
    'neither the owner nor the resolver makes an AI / provider / network / random call',
    !/openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(ownerSrc) &&
      !/openrouter|\bsupabase\b|\bfetch\(|Math\.random|Date\.now|new Date/i.test(resSrc)
  );

  console.log('\n── H. INTERNAL — no brand leakage ──');
  const brandFiles = walk(fileURLToPath(new URL('../src/components/brand/', import.meta.url)));
  const brandLeak = brandFiles.filter((f) =>
    /pitchWorkspace|evaluatePitchContribution|PITCH_WORKSPACE_SECTIONS/.test(
      readFileSync(f, 'utf8')
    )
  );
  test('no brand component imports the pitch workspace', brandLeak.length === 0, brandLeak.join(', '));

  console.log('\n── I. USED by the Control Centre + rendered by the founder surface ──');
  const cc = read('src/lib/commandCentre/controlCentre.ts');
  test(
    'controlCentre imports the resolver and exposes pitchWorkspace',
    /pitchWorkspace/.test(cc) && /pitchWorkspace:\s*PitchWorkspaceSummary/.test(cc)
  );
  const fcc = read('src/components/admin/FounderControlCentre.tsx');
  test(
    'the Founder Control Centre renders the pitch workspace section',
    /control-pitch-workspace/.test(fcc) && /model\.pitchWorkspace/.test(fcc)
  );
  const brandLeak2 = brandFiles.filter((f) => /pitchWorkspace/.test(readFileSync(f, 'utf8')));
  test('no brand surface references the pitch workspace summary', brandLeak2.length === 0, brandLeak2.join(', '));

  console.log('\n── J. SELF-CHECK — the gate can fail ──');
  test('the comparison helper ACCEPTS a correct expectation', equals(['a'], ['a']));
  test(
    'the comparison helper REJECTS a wrong expectation (proves it can fail)',
    !equals(['a'], ['b'])
  );
  const malformed = res.evaluatePitchContribution('', 'ai');
  test(
    'a malformed (empty) section REFUSES — proves the fail-closed branch works',
    malformed.allowed === false && malformed.refusal === 'PITCH_SECTION_UNKNOWN'
  );
} finally {
  await server.close();
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
