// §BATCH 0 — THE E2E SCENARIO TRACEABILITY GATE.
//
// WHY THIS EXISTS
// ---------------
// The end-to-end suite must cover every scenario for the ENTIRE platform, and
// "every scenario" must be MACHINE-HELD rather than asserted in prose. This gate
// is swept automatically by `npm run validate:all` (scripts/validate-all.sh runs
// every `scripts/validate-*.mjs`) and by CI, so it runs on every session and
// every push. It fails if the catalogue and the specs drift apart:
//
//   1. the catalogue is well-formed (owner, method axes, capabilities, scenarios);
//   2. every scenario names a REAL spec file that exists on disk  (no missing test);
//   3. every scenario's capability is a declared capability;
//   4. every capability has at least one scenario      (no capability left untested);
//   5. no scenario id is duplicated;
//   6. every `e2e/*.spec.ts` is named by at least one scenario   (no ORPHAN test);
//   7. the generated document `docs/E2E_SCENARIO_CATALOGUE.md` MATCHES the owner
//      (the human doc can never drift from e2e/scenario-catalogue.json).
//
// The ONE owner is `e2e/scenario-catalogue.json`; the doc is GENERATED from it by
// `scripts/e2e-catalogue.mjs` (whose pure `renderDoc` this gate reuses, so there
// is exactly one renderer and one source of truth).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { renderDoc } from './e2e-catalogue.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const abs = (p) => new URL(p, ROOT);

let failures = 0;
let checks = 0;
const test = (name, ok, detail) => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 400)}`);
  }
};

const CATALOGUE = 'docs/scenario-catalogue.json';
const DOC = 'docs/WHOLE_PLATFORM_E2E_COVERAGE_MATRIX.md';

test(`the catalogue owner exists (${CATALOGUE})`, existsSync(abs(CATALOGUE)));
let c = null;
if (existsSync(abs(CATALOGUE))) {
  try {
    c = JSON.parse(read(CATALOGUE));
  } catch (e) {
    test('the catalogue parses as JSON', false, String(e));
  }
}

if (c) {
  /* ── 1. shape ──────────────────────────────────────────────────────────── */
  test('it declares its meta owner + generator', !!c.meta?.owner && !!c.meta?.generator);
  test('it declares the method (principle + axes)', !!c.method?.principle && !!c.method?.axes);
  test(
    'the method declares all eight axes',
    ['object', 'actor', 'trigger', 'outcome', 'data_condition', 'tenancy', 'provider_mode', 'time'].every(
      (a) => Array.isArray(c.method?.axes?.[a]) && c.method.axes[a].length > 0
    )
  );
  test('it lists capabilities and scenarios', Array.isArray(c.capabilities) && Array.isArray(c.scenarios));

  const capabilities = new Set(c.capabilities ?? []);
  const required = ['id', 'capability', 'journey', 'actor', 'type', 'spec', 'expects'];

  /* ── 2/3. each scenario is complete, references a real spec + capability ── */
  const incomplete = (c.scenarios ?? []).filter((s) => required.some((k) => !s[k]));
  test('every scenario carries all required fields', incomplete.length === 0, incomplete.map((s) => s.id).join(', '));

  const unknownCap = (c.scenarios ?? []).filter((s) => !capabilities.has(s.capability));
  test(
    'every scenario names a declared capability',
    unknownCap.length === 0,
    unknownCap.map((s) => `${s.id}->${s.capability}`).join(', ')
  );

  const missingSpec = (c.scenarios ?? []).filter((s) => s.spec && !existsSync(abs(s.spec)));
  test(
    'every scenario names a spec file that EXISTS (no missing test)',
    missingSpec.length === 0,
    missingSpec.map((s) => `${s.id}->${s.spec}`).join(', ')
  );

  /* ── 4. every capability is covered ─────────────────────────────────────── */
  const covered = new Set((c.scenarios ?? []).map((s) => s.capability));
  const uncovered = (c.capabilities ?? []).filter((cap) => !covered.has(cap));
  test('every capability has at least one scenario', uncovered.length === 0, uncovered.join(', '));

  /* ── 5. ids are unique ───────────────────────────────────────────────────── */
  const ids = (c.scenarios ?? []).map((s) => s.id);
  const dups = ids.filter((id, i) => ids.indexOf(id) !== i);
  test('no scenario id is duplicated', dups.length === 0, [...new Set(dups)].join(', '));

  /* ── 6. no orphan spec ───────────────────────────────────────────────────── */
  const onDisk = readdirSync(abs('e2e'))
    .filter((f) => f.endsWith('.spec.ts'))
    .map((f) => `e2e/${f}`);
  const named = new Set((c.scenarios ?? []).map((s) => s.spec));
  const orphan = onDisk.filter((f) => !named.has(f));
  test(
    'every e2e spec is named by the catalogue (no orphan test)',
    orphan.length === 0,
    orphan.join(', ')
  );

  /* ── 6b. traceability: a scenario that names its proving TEST must find it ──
   *
   * §E2E-1 (§BATCH 1) — the enumeration must be traceable to individual test cases,
   * not merely to a file. A scenario MAY declare `test` (a substring of the
   * Playwright test title that proves it); when it does, that title must be
   * present in the named spec, so a scenario cannot claim coverage that the
   * spec does not actually contain. Every platform-foundation scenario (`pf-*`)
   * MUST declare it, so the Batch 1 enumeration is pinned to real tests.
   *
   * §E2E-2 — the SAME obligation is extended to the onboarding & acquisition
   * domain (`oa-*`), so each enumerated scenario in that domain is pinned to the
   * real test that proves it.
   *
   * §E2E-3 — the SAME obligation is extended to the purchase-order & documents
   * domain (`po-*`), so each enumerated scenario in that domain is pinned to the
   * real test that proves it. A self-check below asserts the prefix set covers
   * ALL THREE enumerated domains and never the auto-seeded `spec-*` rows.
   */
  const SCENARIO_TEST_REQUIRED = /^(pf-|oa-|po-)/;
  const withTest = (c.scenarios ?? []).filter((s) => s.test);
  const notFound = withTest.filter((s) => existsSync(abs(s.spec)) && !read(s.spec).includes(s.test));
  test(
    'every scenario that names its proving test finds that test in its spec',
    notFound.length === 0,
    notFound.map((s) => `${s.id} -> "${s.test}" is NOT in ${s.spec}`).join(', ')
  );
  const untraced = (c.scenarios ?? []).filter((s) => SCENARIO_TEST_REQUIRED.test(s.id) && !s.test);
  test(
    'every enumerated scenario (pf-* platform foundations, oa-* onboarding & acquisition, po-* purchase order & documents) is traceable to a named test',
    untraced.length === 0,
    untraced.map((s) => s.id).join(', ')
  );
  /* §E2E-3 — self-check: the enumeration prefix set itself must be what we think it
   * is, so a future rename cannot silently drop a whole domain's traceability. */
  test(
    'the traceable-prefix set covers all three enumerated domains (pf-, oa- and po-)',
    SCENARIO_TEST_REQUIRED.test('pf-x') &&
      SCENARIO_TEST_REQUIRED.test('oa-x') &&
      SCENARIO_TEST_REQUIRED.test('po-x') &&
      !SCENARIO_TEST_REQUIRED.test('spec-x'),
    String(SCENARIO_TEST_REQUIRED)
  );

  /* ── 7. the generated doc matches the owner ──────────────────────────────── */
  test(`the generated document exists (${DOC})`, existsSync(abs(DOC)));
  if (existsSync(abs(DOC))) {
    const want = renderDoc(c);
    const have = read(DOC);
    test(
      'the generated document MATCHES the owner (no drift — run: node scripts/e2e-catalogue.mjs --doc)',
      want === have,
      want === have ? undefined : 'docs/E2E_SCENARIO_CATALOGUE.md is stale relative to e2e/scenario-catalogue.json'
    );
  }

  console.log(
    `\n[e2e-scenarios] ${checks - failures}/${checks} checks pass · ${(c.scenarios ?? []).length} scenarios (${withTest.length} traceable to a test) · ${(c.capabilities ?? []).length} capabilities`
  );
}

if (failures > 0) {
  console.log(`\n[e2e-scenarios] ${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('[e2e-scenarios] the scenario catalogue and the spec suite are consistent.');