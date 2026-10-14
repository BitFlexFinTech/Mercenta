#!/usr/bin/env node
/**
 * §OPENSHIP REPLICATION (Batch 2) — NAVIGATION DESTINATION INVENTORY GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The OpenShip replication is a UI-ONLY transformation. It restyles Mercenta's
 * navigation; it must never change which destinations exist, what they are
 * called, which group they sit in, or who can see them.
 *
 * A restyle touches `Sidebar.tsx` and `AppShell.tsx`, and it is exactly the kind
 * of change that can quietly lose a destination — a section re-typed by hand, an
 * item dropped while rewriting a map, an RBAC id mistyped. Typecheck and build
 * cannot see any of that: the app compiles and runs perfectly with 26 admin
 * destinations instead of 27.
 *
 * So this gate reads the DECLARATION (the source of truth the rail renders from)
 * and fails on any disagreement with the pinned inventory below.
 *
 * WHAT IT PINS
 *   A. the admin section labels, in order  (13 groups)
 *   B. the admin destination ids, in order (27 destinations)
 *   C. the brand section labels, in order  (7 groups)
 *   D. the brand destination ids, in order (20 destinations)
 *   E. the RBAC hidden-for-non-super set    (7 ids)
 *
 * RULE 10 §5 — A CHECK THAT FINDS NOTHING IS A FAILURE, NOT A PASS.
 * If either shell file is missing, or the section/items parse returns nothing,
 * this exits non-zero rather than reporting a comfortable green.
 *
 * RULE 08 — this is an ABSENCE GUARD as well as a presence guard: a destination
 * that disappears fails here, so the removal can never be silent.
 *
 * Run: node scripts/validate-nav-destinations.mjs   (via `npm run validate:all`)
 */
import { readFileSync, existsSync } from 'node:fs';

let failures = 0;
let assertions = 0;
const test = (name, ok, detail = '') => {
  assertions += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

/* ── THE PINNED INVENTORY ────────────────────────────────────────────────────
 * Measured from the repository at the start of the OpenShip workstream.
 * A deliberate navigation change must update BOTH the source AND this list —
 * that is the point: it cannot happen by accident.
 * ─────────────────────────────────────────────────────────────────────────── */

const EXPECTED_ADMIN = [
  ['Overview', ['overview', 'control_centre']],
  ['Operations', ['work', 'purchase_orders_admin', 'logistics', 'returns_tracking', 'calendar']],
  ['Brands', ['crm', 'onboarding_pipeline', 'marketing', 'amazon_ads', 'brand_intelligence']],
  ['Catalogue', ['catalog']],
  ['Commerce', ['fulfillment_track', 'retail_pipeline']],
  ['Finance', ['billing', 'contracts_admin']],
  ['Compliance', ['compliance']],
  ['Communications', ['messages']],
  ['Support', ['helpdesk']],
  ['Monitoring', ['monitoring']],
  ['Administration', ['super_admin', 'audit_log', 'usertour']],
  ['Integrations', ['integrations']],
  ['Founder (private)', ['founder_centre', 'partnerships']],
];

const EXPECTED_BRAND = [
  ['Overview', ['overview']],
  ['Operations', ['purchase_orders', 'logistics', 'returns', 'work', 'calendar']],
  ['Catalogue', ['catalog', 'inventory', 'commercial_readiness']],
  ['Programme', ['lift_off']],
  ['Compliance', ['onboarding', 'compliance', 'contracts']],
  ['Insights', ['analytics', 'market', 'reports']],
  ['Account', ['documents', 'cases', 'team', 'settings']],
];

const EXPECTED_HIDDEN_FOR_NON_SUPER = [
  'super_admin', 'audit_log', 'integrations', 'brand_intelligence',
  'founder_centre', 'partnerships', 'control_centre',
];

const EXPECTED_ADMIN_COUNT = EXPECTED_ADMIN.reduce((n, [, ids]) => n + ids.length, 0);
const EXPECTED_BRAND_COUNT = EXPECTED_BRAND.reduce((n, [, ids]) => n + ids.length, 0);

function stripComments(body) {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

/**
 * Extract `[sectionLabel, [ids…]]` from a `const NAME = [ … ];` block.
 *
 * Section labels are the 4-space-indented `label: 'X',` lines that head each
 * group. Item ids are `id: 'x'` on either a single-line item object or its own
 * line inside a multi-line one — both shapes exist in the source. Comments are
 * stripped first so a comment mentioning an id can never be counted as one.
 */
function readSections(source, blockStart, fileName) {
  const start = source.indexOf(blockStart);
  if (start === -1) {
    test(`${fileName}: the declaration block \`${blockStart}\` exists`, false);
    return null;
  }
  const end = source.indexOf('\n];', start);
  if (end === -1) {
    test(`${fileName}: the declaration block is terminated`, false);
    return null;
  }
  const clean = stripComments(source.slice(start, end));

  const sections = [];
  let current = null;
  for (const line of clean.split('\n')) {
    const sectionMatch = /^\s{4}label: '([^']+)',\s*$/.exec(line);
    if (sectionMatch) {
      current = { label: sectionMatch[1], ids: [] };
      sections.push(current);
      continue;
    }
    for (const raw of line.match(/id: '([a-z_0-9]+)'/g) || []) {
      if (current) current.ids.push(/id: '([a-z_0-9]+)'/.exec(raw)[1]);
    }
  }
  return sections;
}

function compareInventory(label, actual, expected, expectedCount) {
  if (!actual) {
    // RULE 10 §5 — a discovery that returned nothing is a FAILURE.
    test(`${label}: discovery returned nothing — FAILING (a check that finds nothing is a failure)`, false);
    return null;
  }

  test(`${label}: the declaration parsed (guard against a vacuous pass)`,
    actual.length > 0, `${actual.length} section(s), ${actual.flatMap((s) => s.ids).length} destination(s)`);

  const actualLabels = actual.map((s) => s.label);
  const expectedLabels = expected.map(([l]) => l);
  test(`${label}: the section labels and their ORDER are unchanged`,
    JSON.stringify(actualLabels) === JSON.stringify(expectedLabels),
    actualLabels.join(' · '));

  const flatActual = actual.flatMap((s) => s.ids);
  const flatExpected = expected.flatMap(([, ids]) => ids);
  test(`${label}: every destination id is present, in the same group and the same order`,
    JSON.stringify(flatActual) === JSON.stringify(flatExpected),
    `${flatActual.length} destination(s)`);

  test(`${label}: the destination count is exactly ${expectedCount}`,
    flatActual.length === expectedCount, `measured ${flatActual.length}`);

  const missing = flatExpected.filter((id) => !flatActual.includes(id));
  const added = flatActual.filter((id) => !flatExpected.includes(id));
  test(`${label}: no destination is MISSING`, missing.length === 0, missing.join(', ') || 'none');
  test(`${label}: no destination was ADDED without this list being updated`,
    added.length === 0, added.join(', ') || 'none');

  return flatActual;
}

/* ── RUN ───────────────────────────────────────────────────────────────────── */

const ADMIN_FILE = 'src/components/layout/AdminShell.tsx';
const BRAND_FILE = 'src/components/layout/BrandShell.tsx';

try {
  for (const f of [ADMIN_FILE, BRAND_FILE]) test(`${f} exists`, existsSync(f));

  if (existsSync(ADMIN_FILE)) {
    const src = readFileSync(ADMIN_FILE, 'utf8');
    const adminFlat = compareInventory(
      'ADMIN',
      readSections(src, 'const ADMIN_SECTIONS = [', 'AdminShell.tsx'),
      EXPECTED_ADMIN,
      EXPECTED_ADMIN_COUNT
    );

    const hiddenBlock = /HIDDEN_FOR_NON_SUPER = new Set\(\[([\s\S]*?)\]\)/.exec(src);
    if (hiddenBlock) {
      const clean = stripComments(hiddenBlock[1]);
      const ids = (clean.match(/'([a-z_0-9]+)'/g) || []).map((s) => s.replace(/'/g, ''));
      test('ADMIN RBAC: the hidden-for-non-super set is exactly the pinned seven',
        JSON.stringify(ids) === JSON.stringify(EXPECTED_HIDDEN_FOR_NON_SUPER),
        ids.join(' · '));
      test('ADMIN RBAC: every hidden id is a real destination',
        adminFlat ? ids.every((id) => adminFlat.includes(id)) : false,
        ids.filter((id) => !adminFlat || !adminFlat.includes(id)).join(', ') || 'all real');
    } else {
      test('ADMIN RBAC: HIDDEN_FOR_NON_SUPER is declared', false);
    }
  }

  if (existsSync(BRAND_FILE)) {
    compareInventory(
      'BRAND',
      readSections(readFileSync(BRAND_FILE, 'utf8'), 'const BRAND_SECTIONS = [', 'BrandShell.tsx'),
      EXPECTED_BRAND,
      EXPECTED_BRAND_COUNT
    );
  }
} catch (err) {
  failures += 1;
  console.error('✗ VALIDATOR THREW:', err && err.stack ? err.stack : err);
}

console.log(
  `\nNAVIGATION DESTINATION INVENTORY: ${failures === 0 ? 'PASS' : 'FAIL'} — ` +
  `${assertions} assertion(s), ${failures} failure(s)`
);
process.exit(failures === 0 ? 0 : 1);
