#!/usr/bin/env node
/**
 * §PHASE D — THE CANONICAL TABLE CONTRACT, AND THE ONE OWNER OF ITS COUNT.
 *
 * WHY THIS EXISTS
 * ---------------
 * Registry row `discovered-hand-rolled-tables-outside-the-canonical-primitive` records a real
 * defect: surfaces write their own `<table>` markup, so the SAME screen type renders its data at
 * two different sizes depending on which table it uses (hand-rolled tables measured at `text-xs`,
 * `text-sm`, `text-ds-label`, `text-ds-micro` and sometimes nothing at all), and none of them
 * inherits the canonical contract — `scope="col"` headers, a captured `<caption>`, the
 * `data-table` hook the E2E tests select on, or the labelled-card list below `md` that stops a
 * narrow screen having to scroll sideways to read a row.
 *
 * The row's own numbers were measured on 2026-10-13. They had already drifted by 2026-11-28
 * (26 → 28 real elements), because a count retyped into prose has no owner. Per global rule 10 §2
 * a written fact has ONE author: THIS script owns the count, and the registry row points here.
 *
 * WHAT IT ASSERTS
 * ---------------
 *  1. The canonical primitive really provides the contract we migrate TO (positive control):
 *     `scope="col"`, a `<caption>`, the `data-table` hook and the canonical type step. Without
 *     this, "migrate to the canonical primitive" would mean nothing.
 *  2. Every real `<table>` element in the application surfaces is judged: COMPLIANT when it
 *     carries the canonical contract (the row's documented minimum: canonical steps + hook +
 *     caption + scoped headers), DEBT otherwise. Comments are stripped first, so prose that
 *     mentions `<table>` is never counted as an element.
 *  3. The measured debt inventory EQUALS the declared one, in both directions. A new hand-rolled
 *     table therefore fails the build until it is either migrated or declared, and a migration
 *     that does not lower the declaration also fails — the number can only move when the code does.
 *  4. THE RATCHET: `DEBT_BASELINE` may never rise above the number at introduction, and the
 *     measured total must equal it. Progress is lowering both in the same change.
 *  5. A check that discovers NOTHING is a FAILURE (rule 10 §5), never a comfortable green.
 *
 * Run: node scripts/validate-canonical-tables.mjs
 * Print the live inventory: node scripts/validate-canonical-tables.mjs --inventory
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/**
 * The declared DEBT inventory: file → number of `<table>` elements that do NOT yet carry the
 * canonical contract. Measured 2026-11-28 (the date is the measurement, not a history banner:
 * this list is a LIVE claim and assertion 3 fails the moment it stops matching the code).
 *
 * Every entry is work owed by `discovered-hand-rolled-tables-outside-the-canonical-primitive`.
 * Lowering an entry is the ONLY correct way to record a migration.
 */
const DECLARED_DEBT = {
  'src/components/admin/AcquisitionWorkflow.tsx': 1,
  'src/components/admin/AdminDashboard.tsx': 1,
  'src/components/admin/AdminPurchaseOrderDetail.tsx': 1,
  'src/components/admin/AdminPurchaseOrderList.tsx': 1,
  'src/components/admin/BrandIntelligencePanel.tsx': 1,
  'src/components/admin/BrandIntelligenceStrategyPanel.tsx': 1,
  'src/components/admin/CommercialModelsPanel.tsx': 1,
  'src/components/admin/FulfillmentTrack.tsx': 1,
  'src/components/admin/LaunchCentre.tsx': 1,
  'src/components/admin/OpportunityDiscoveryPanel.tsx': 1,
  'src/components/admin/PartnershipsCentre.tsx': 2,
  'src/components/admin/ProductDiscoveryPanel.tsx': 1,
  'src/components/ads/AdsManagement.tsx': 1,
  'src/components/brand/BrandPurchaseOrders.tsx': 4,
  'src/components/brand/BrandSettings.tsx': 1,
  'src/components/shared/BrandGuidance.tsx': 1,
  'src/components/shared/CsvCatalogImport.tsx': 1,
  'src/next/screens/brand/BrandPurchaseOrdersView.tsx': 4,
};

/** The ratchet. It may only ever be LOWERED, in the same change as a real migration. */
const DEBT_BASELINE = 25;

/**
 * Files that legitimately RENDER a table and are NOT debt, each with its reason. Declared so the
 * exemption is reviewable rather than implied by a silent skip.
 */
const CANONICAL_OWNERS = {
  'src/components/ui.tsx': 'THE canonical DataTable — the primitive every migration targets.',
  'src/next/components/ConsolePrimitives.tsx':
    "The console shell's OWN table primitive. `src/next/**` is a separate shell with its own token " +
    'set (WAVE 3m), so it is not migrated to the application primitive; its screens are still judged.',
};
let pass = 0;
const failures = [];
const check = (name, ok, detail = '') => {
  if (ok) pass++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};

const walk = (dir, out = []) => {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return out;
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (entry.name.endsWith('.tsx')) out.push(rel);
  }
  return out;
};

/**
 * Remove comments while PRESERVING newlines, so a line number reported here is the line number a
 * reader sees in the editor. This is why prose in a docblock (`render its OWN <table> markup`)
 * cannot be mistaken for an element — the mistake a naive grep makes.
 */
const stripComments = (source) =>
  source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));

/** Every real `<table` opening tag in a file, with its line number and element text. */
const tableElements = (rel) => {
  const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const code = stripComments(raw);
  const found = [];
  const re = /<table\b/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const line = code.slice(0, m.index).split('\n').length;
    const openEnd = code.indexOf('>', m.index);
    const openTag = openEnd === -1 ? '' : code.slice(m.index, openEnd + 1);
    const closeIdx = code.indexOf('</table>', openEnd === -1 ? m.index : openEnd);
    const element = closeIdx === -1 ? openTag : code.slice(m.index, closeIdx + '</table>'.length);
    found.push({ line, openTag, element, unterminated: closeIdx === -1 });
  }
  return found;
};

/**
 * THE CONTRACT A TABLE MUST SATISFY — the row's documented minimum ("or at minimum to the
 * canonical steps"): the canonical type step, the `data-table` hook, a real `<caption>`, and a
 * `scope` on every `<th>`. A table that satisfies all four has ADOPTED the contract even when it
 * keeps bespoke per-row treatment the primitive cannot express (e.g. tinting invalid CSV rows).
 */
const canonicalTableIssues = ({ openTag, element }) => {
  const issues = [];
  if (!/data-table=/.test(openTag)) issues.push('no data-table hook');
  if (!/<caption\b/.test(element)) issues.push('no <caption>');
  const ths = element.match(/<th\b[^>]*>/g) ?? [];
  const unscoped = ths.filter((th) => !/\bscope=/.test(th));
  if (unscoped.length) issues.push(`${unscoped.length} <th> without scope`);
  if (!/text-ds-(body|label|micro)\b/.test(openTag)) issues.push('not on a canonical type step');
  return issues;
};

const SURFACES = ['src/components', 'src/next'];
const files = [...new Set(SURFACES.flatMap((d) => walk(d)))].sort();

const measuredDebt = {};
const compliant = [];
let realElements = 0;
for (const rel of files) {
  if (CANONICAL_OWNERS[rel]) continue;
  for (const el of tableElements(rel)) {
    realElements++;
    const issues = canonicalTableIssues(el);
    if (issues.length === 0) compliant.push(`${rel}:${el.line}`);
    else measuredDebt[rel] = (measuredDebt[rel] ?? 0) + 1;
  }
}

const debtTotal = Object.values(measuredDebt).reduce((a, b) => a + b, 0);
const declaredTotal = Object.values(DECLARED_DEBT).reduce((a, b) => a + b, 0);

if (process.argv.includes('--inventory')) {
  console.log(`real <table> elements on the application surfaces: ${realElements}`);
  console.log(`canonical-contract compliant: ${compliant.length}`);
  console.log(`debt: ${debtTotal}`);
  for (const [f, n] of Object.entries(measuredDebt).sort()) console.log(`  ${n}  ${f}`);
  process.exit(0);
}

/* ── 1. The positive control: the contract we migrate TO exists ───────────── */
const primitive = fs.readFileSync(path.join(ROOT, 'src/components/ui.tsx'), 'utf8');
check(
  'the canonical DataTable renders a `scope="col"` header',
  /<th[\s\S]{0,200}?scope="col"/.test(primitive)
);
check('the canonical DataTable renders a sr-only <caption>', /<caption className="sr-only">/.test(primitive));
check('the canonical DataTable carries the `data-table` hook', /data-table=\{dataTable\}/.test(primitive));
check(
  'the canonical DataTable body uses the canonical type step (not a raw Tailwind size)',
  /<table className="w-full text-ds-body/.test(primitive)
);

/* ── 2. Something was actually discovered ─────────────────────────────────── */
check(
  'real <table> elements were DISCOVERED on the application surfaces (a check that finds nothing is a failure)',
  realElements > 0,
  `${realElements} elements across ${files.length} files`
);

/* ── 3. The measured debt equals the declared debt, in BOTH directions ────── */
for (const [rel, declaredCount] of Object.entries(DECLARED_DEBT)) {
  const measured = measuredDebt[rel] ?? 0;
  check(
    `${rel} still owes exactly ${declaredCount} hand-rolled table${declaredCount === 1 ? '' : 's'}`,
    measured === declaredCount,
    `measured ${measured} — ${
      measured === 0 ? 'MIGRATED: lower DECLARED_DEBT and DEBT_BASELINE now' : 'the declared count is stale'
    }`
  );
}
for (const [rel, measured] of Object.entries(measuredDebt)) {
  if (rel in DECLARED_DEBT) continue;
  check(
    `${rel} introduced a hand-rolled table WITHOUT declaring it (${measured})`,
    false,
    'migrate it to the canonical contract, or declare the debt explicitly in DECLARED_DEBT'
  );
}

/* ── 4. The ratchet ──────────────────────────────────────────────────────── */
check(
  'the measured debt equals the declared total (the declaration and the code move together)',
  debtTotal === declaredTotal,
  `measured ${debtTotal} vs declared ${declaredTotal}`
);
check(
  'the debt has not RISEN above the ratchet baseline',
  debtTotal <= DEBT_BASELINE,
  `measured ${debtTotal}, baseline ${DEBT_BASELINE}`
);
check(
  'the declared total equals the ratchet baseline (a partial edit cannot hide progress or a regression)',
  declaredTotal === DEBT_BASELINE,
  `declared ${declaredTotal}, baseline ${DEBT_BASELINE}`
);
check(
  'every declared debt file still exists (no orphaned entry left behind by a rename or a removal)',
  Object.keys(DECLARED_DEBT).every((rel) => fs.existsSync(path.join(ROOT, rel))),
  Object.keys(DECLARED_DEBT)
    .filter((rel) => !fs.existsSync(path.join(ROOT, rel)))
    .join(', ')
);
check(
  'no table element is left unterminated (a half-written table cannot be judged)',
  files.every((rel) => tableElements(rel).every((el) => !el.unterminated)),
  files
    .map((rel) => [rel, tableElements(rel).filter((el) => el.unterminated).map((el) => el.line)])
    .filter(([, lines]) => lines.length)
    .map(([rel, lines]) => `${rel}:${lines.join(',')}`)
    .join(' · ')
);

/* ── Verdict ─────────────────────────────────────────────────────────────── */
console.log('');
if (failures.length) {
  for (const f of failures) console.log(`✗ ${f}`);
  console.log(
    `CANONICAL_TABLES_VALIDATION_FAILED — ${failures.length} of ${pass + failures.length} assertions failed.`
  );
  console.log(
    `\nREMAINING DEBT: ${debtTotal} hand-rolled table${debtTotal === 1 ? '' : 's'} across ` +
      `${Object.keys(measuredDebt).length} files (baseline ${DEBT_BASELINE}).`
  );
  process.exit(1);
}
console.log(
  `CANONICAL_TABLES_VALIDATION_PASS — ${realElements} real table element(s) on the application ` +
    `surfaces; ${compliant.length} carry the canonical contract; ${debtTotal} remain declared debt. ` +
    `(${pass} assertions)`
);