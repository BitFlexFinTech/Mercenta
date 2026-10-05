#!/usr/bin/env node
/**
 * §PHASE 13 — THE CLAIMS REGISTRY GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Phase 13 Claims Registry (`src/lib/compliance/claimsRegistry.ts`) is the
 * ONE governance index over every claim Mercenta's outward-facing content may
 * make, in a GREEN (supported) / AMBER (requires verification) / RED (do not
 * use) vocabulary. Its whole value rests on two properties that a comment
 * cannot guarantee:
 *
 *   1  every class POINTS AT a real, canonical owner (module + symbol) — the
 *      registry must never re-implement a rule, so a class whose owner does not
 *      exist is a lie;
 *   2  every RED class's example is actually CAUGHT by that owner, and every
 *      AMBER class names a real qualifier that a surface really uses.
 *
 * This gate EXECUTES the shipped registry (through the project's own Vite/TS
 * pipeline) and fails if either property breaks, if the registry shrinks below
 * its declared coverage, or if a canonical claim owner is not indexed at all.
 *
 * THE GATE CAN FAIL (self-check): the two checkers (`resolves()` and
 * `caughtByOwner()`) are run against deliberately-broken inputs as well as the
 * real ones — the broken inputs MUST be reported — so a green run proves the
 * check works rather than that it is vacuous.
 *
 * Run: node scripts/validate-claims-registry.mjs
 */
import { execSync } from 'node:child_process';
import { createServer } from 'vite';

/** The four canonical claim owners that MUST all be indexed (no un-registered owner). */
const REQUIRED_OWNERS = [
  ['src/lib/discovery/banned-patterns.mjs', 'BANNED_PATTERNS'],
  ['src/lib/intelligence/amazonWording.ts', 'AMAZON_WORDING_RULES'],
  ['src/config/positioning.ts', 'PUBLIC_CLAIM_RED_LINES'],
  ['src/config/ukMarketFit.ts', 'PRE_AUDIT_PROHIBITED_PROMISES'],
];
/** The declared coverage floor — the registry must not silently shrink below this. */
const MIN_CLASSES = 12;

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures += 1;
};

const moduleCache = new Map();
async function loadModule(modulePath) {
  if (!moduleCache.has(modulePath)) {
    moduleCache.set(modulePath, await server.ssrLoadModule('/' + modulePath));
  }
  return moduleCache.get(modulePath);
}

/** Does a class's `source` resolve to a real export of its module? */
async function resolves(cls) {
  const mod = await loadModule(cls.source.module);
  return mod[cls.source.symbol] !== undefined;
}

/** Is a RED class's example caught by its own canonical owner's patterns? */
function caughtByOwner(reg, cls) {
  return reg.redPatternsFor(cls).some((re) => {
    re.lastIndex = 0;
    return re.test(cls.example);
  });
}

/** Files (under src/) that reference a symbol, excluding named files. */
function references(symbol, ...exclude) {
  try {
    const out = execSync(`grep -rl "${symbol}" src --include='*.ts' --include='*.tsx'`, {
      encoding: 'utf8',
    });
    return out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((f) => !exclude.includes(f));
  } catch {
    return [];
  }
}

try {
  const reg = await server.ssrLoadModule('/src/lib/compliance/claimsRegistry.ts');
  const classes = reg.CLAIMS_REGISTRY;
  const byStatus = (status) => classes.filter((c) => c.status === status);
  const redClasses = byStatus('do_not_use');
  const amberClasses = byStatus('requires_verification');
  const greenClasses = byStatus('supported');

  console.log(
    `\nregistry: ${classes.length} classes (RED ${redClasses.length} · AMBER ${amberClasses.length} · GREEN ${greenClasses.length}) across ${reg.CLAIM_CHANNELS.length} channels`
  );

  console.log('\n── A. the registry is complete and every class is well-formed ──');
  test(`the registry holds at least ${MIN_CLASSES} classes`, classes.length >= MIN_CLASSES, `${classes.length}`);
  const malformed = classes.filter((c) => !c.id || !c.concern || !c.why || !c.channels?.length || !c.example);
  test('every class declares id / concern / why / channels / example', malformed.length === 0,
    malformed.map((c) => c.id).join(' | '));
  const ids = classes.map((c) => c.id);
  test('every class id is unique', new Set(ids).size === ids.length);

  console.log('\n── B. every class points at a REAL export of its canonical owner ──');
  const unresolved = [];
  for (const cls of classes) {
    if (!(await resolves(cls))) unresolved.push(`${cls.id} → ${cls.source.module}#${cls.source.symbol}`);
  }
  test('every claim class resolves to a real owner export', unresolved.length === 0, unresolved.join(' | '));

  console.log('\n── C. every RED class example is CAUGHT by its own owner ──');
  const uncaught = redClasses.filter((cls) => !caughtByOwner(reg, cls));
  test('every RED example is caught by the owner it points at', uncaught.length === 0,
    uncaught.map((c) => `${c.id} ("${c.example}")`).join(' | '));
  test('every RED class resolves to at least one enforcement pattern',
    redClasses.every((cls) => reg.redPatternsFor(cls).length > 0));

  console.log('\n── D. every AMBER class names a real, USED qualifier ──');
  const qualifierProblems = [];
  for (const cls of amberClasses) {
    const text = cls.requiredQualifier ? reg.qualifierText(cls.requiredQualifier) : null;
    if (!text) {
      qualifierProblems.push(`${cls.id} (no qualifier text)`);
      continue;
    }
    const used = references(
      cls.requiredQualifier.symbol,
      cls.requiredQualifier.module,
      'src/lib/compliance/claimsRegistry.ts'
    );
    if (used.length === 0) qualifierProblems.push(`${cls.id} (${cls.requiredQualifier.symbol} used by no surface)`);
  }
  test('every AMBER class names a real qualifier that a surface uses', qualifierProblems.length === 0,
    qualifierProblems.join(' | '));

  console.log('\n── E. every GREEN class example PASSES (nothing supported is blocked) ──');
  const blockedGreen = greenClasses.filter((cls) => !reg.lintClaims(cls.example, 'website').safe);
  test('every GREEN example passes the registry lint', blockedGreen.length === 0,
    blockedGreen.map((c) => `${c.id} ("${c.example}")`).join(' | '));

  console.log('\n── F. no canonical claim owner is left un-registered ──');
  const indexed = new Set(classes.map((c) => `${c.source.module}#${c.source.symbol}`));
  const notIndexed = REQUIRED_OWNERS.filter(([m, s]) => !indexed.has(`${m}#${s}`));
  test('all four canonical claim owners are indexed', notIndexed.length === 0,
    notIndexed.map(([m, s]) => `${m}#${s}`).join(' | '));
  test('the four canonical owner MODULES are all referenced',
    new Set(classes.map((c) => c.source.module)).size >= 4);

  console.log('\n── G. the lint executes (RED blocks, AMBER advises, GREEN passes) ──');
  const badRed = reg.lintClaims('We are an Amazon approved partner.', 'website');
  test('a RED claim fails the lint (safe === false)', badRed.safe === false && badRed.verdict === 'do_not_use');
  const clean = reg.lintClaims('UK retail placement for Acme', 'acquisition');
  test('clean copy passes the lint (safe === true)', clean.safe === true);
  const amber = reg.lintClaims('Estimated PO opportunity for this brand.', 'sales_material');
  test('an AMBER class is reported with its required qualifier',
    amber.requiresVerification.some((e) => e.classId === 'projection-estimate' && e.qualifier.length > 0));
  test('claimClassesForChannel lists the classes that govern a channel',
    reg.claimClassesForChannel('website').length > 0 && reg.claimClassesForChannel('website').every((c) => c.channels.includes('website')));

  console.log('\n── H. the gate can FAIL (self-check, not vacuous) ──');
  const bogus = { ...classes[0], id: 'self-check', source: { module: 'src/lib/compliance/claimsRegistry.ts', symbol: 'NOT_A_REAL_EXPORT' } };
  test('self-check: resolves() is TRUE for a real class', await resolves(classes[0]));
  test('self-check: resolves() is FALSE for a missing export (would be REPORTED)', !(await resolves(bogus)));
  const uncaughtExample = { ...redClasses[0], example: 'a perfectly ordinary sentence with no claim in it' };
  test('self-check: caughtByOwner() is TRUE for a real RED class', caughtByOwner(reg, redClasses[0]));
  test('self-check: caughtByOwner() is FALSE for an uncaught example (would be REPORTED)',
    !caughtByOwner(reg, uncaughtExample));

  console.log('\n── I. the registry renders nothing (its wording-lint exclusion is safe) ──');
  // The registry is excluded from `scripts/lint-wording.mjs` as a definitions
  // file (its examples must contain the channel name to TEST the owners). That
  // exclusion is only safe while the registry is never RENDERED, so this asserts
  // no component imports it. If a surface ever needs to show the registry, it
  // must render a channel-neutral projection — not this module's examples.
  const componentImporters = references('claimsRegistry').filter((f) => f.startsWith('src/components/'));
  test('no component imports the claims registry (it is not rendered copy)',
    componentImporters.length === 0, componentImporters.join(' | '));
} catch (error) {
  console.error('[validate-claims-registry] THREW:', error);
  failures += 1;
} finally {
  await server.close();
}

console.log(failures === 0
  ? '\nCLAIMS_REGISTRY_VALIDATION_PASS'
  : `\nCLAIMS_REGISTRY_VALIDATION_FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
