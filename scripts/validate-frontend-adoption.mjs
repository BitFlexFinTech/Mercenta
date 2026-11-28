#!/usr/bin/env node
/**
 * §FRONTEND V1 — THE "EXACT CODE" GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The owner's correction was not a style note: the console in this repository had been a
 * RE-IMPLEMENTATION of their frontend (a "port"), and they said *"i said use this exact code."*
 * A port looks plausible in review, passes typecheck and builds — which is exactly why it went
 * unnoticed for days. Nothing compared this repository's copy against the source it claimed to be.
 *
 * WHAT IT PROVES
 * --------------
 * `docs/frontend-v1-manifest.json` is a SHA-256 fingerprint of every file adopted from
 * `github.com/BitFlexFinTech/mercenta-frontend-v1` @ `9f069f51` (the owner's frontend). This gate
 * re-hashes `src/next/**` and FAILS when:
 *   · an adopted file is MISSING;
 *   · an adopted file's content DIFFERS from the source, unless the path is on DECLARED_EDITS
 *     (a short, reviewed list of the minimum wiring edits — each must state WHY);
 *   · a file exists in `src/next/**` that was NOT adopted (a new file must be declared, so their
 *     tree cannot quietly grow a re-implementation again);
 *   · the manifest itself is empty or implausibly small (a check that finds nothing is a FAILURE).
 *
 * This is the gate the old work lacked. It makes "exact code" a check, not a promise.
 *
 * Run: node scripts/validate-frontend-adoption.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = 'src/next';
const MANIFEST = 'docs/frontend-v1-manifest.json';
const SOURCE_REPO = 'github.com/BitFlexFinTech/mercenta-frontend-v1';
const SOURCE_COMMIT = '9f069f51f52a13ec61f348994a0a430c0b9cdf52';

/**
 * DECLARED EDITS — the ONLY places where an adopted file may differ from the owner's source,
 * each with the reason. Empty today: the adoption required NO source edit (typecheck and build
 * pass unmodified). If an entry is ever needed it goes here, with its reason, and the gate keeps
 * proving that nothing ELSE drifted.
 */
const DECLARED_EDITS = {
  // 'relative/path/inside/src/next': 'why this single edit is unavoidable',
};

let pass = 0;
const failures = [];
const check = (name, ok, detail = '') => {
  if (ok) pass++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};

const sha = (abs) => crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');

const manifestAbs = path.join(ROOT, MANIFEST);
check('the adoption manifest exists (the source of truth for "exact code")', fs.existsSync(manifestAbs), MANIFEST);
const manifest = fs.existsSync(manifestAbs) ? JSON.parse(fs.readFileSync(manifestAbs, 'utf8')) : {};
const manifestPaths = Object.keys(manifest);
check(
  'the manifest holds a plausible number of adopted files (a check that finds nothing is a FAILURE)',
  manifestPaths.length >= 50,
  `${manifestPaths.length} files pinned from ${SOURCE_REPO} @ ${SOURCE_COMMIT.slice(0, 7)}`
);

/* Every adopted file must be present and byte-identical, unless declared. */
for (const rel of manifestPaths) {
  const abs = path.join(ROOT, SRC, rel);
  const declared = DECLARED_EDITS[rel];
  if (!fs.existsSync(abs)) {
    check(`adopted file present: ${SRC}/${rel}`, false, 'MISSING — the owner\'s file was removed');
    continue;
  }
  if (declared) {
    check(`declared edit: ${SRC}/${rel}`, typeof declared === 'string' && declared.trim().length > 10, declared);
    continue;
  }
  const actual = sha(abs);
  check(
    `byte-identical to the owner's source: ${SRC}/${rel}`,
    actual === manifest[rel],
    `expected ${manifest[rel].slice(0, 12)}… got ${actual.slice(0, 12)}… (declare the edit in DECLARED_EDITS with a reason, or restore the file)`
  );
}

/* Nothing may be added to their tree without declaring it. */
const present = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs);
    else present.push(path.relative(path.join(ROOT, SRC), abs));
  }
};
if (fs.existsSync(path.join(ROOT, SRC))) walk(path.join(ROOT, SRC));
const unexpected = present.filter((rel) => !(rel in manifest) && !(rel in DECLARED_EDITS));
check(
  'no file was ADDED to the owner\'s console without being declared',
  unexpected.length === 0,
  unexpected.join(', ')
);

/* Vacuity: if src/next vanished, the loop above would prove nothing. */
check(
  `${SRC} exists and holds the adopted console`,
  fs.existsSync(path.join(ROOT, SRC)) && present.length >= manifestPaths.length,
  `${present.length} file(s) on disk`
);

console.log('');
if (failures.length) {
  for (const f of failures) console.log(`✗ ${f}`);
  console.log(`FRONTEND_ADOPTION_VALIDATION_FAILED — ${failures.length} of ${pass + failures.length} assertions failed.`);
  process.exit(1);
}
console.log(
  `FRONTEND_ADOPTION_VALIDATION_PASS — ${manifestPaths.length} files adopted byte-identical from ` +
    `${SOURCE_REPO} @ ${SOURCE_COMMIT.slice(0, 7)}; ${Object.keys(DECLARED_EDITS).length} declared edit(s). (${pass} assertions)`
);