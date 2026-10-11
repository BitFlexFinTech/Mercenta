// §BATCH 7 (Part 4.1a) — THE DEEP-LINK GATE (plan Part 5.2).
//
// WHAT IT GUARDS
// --------------
// The plan's Part 5.2 requires a gate that fails if any clickable item:
//   · has NO destination (a dead click), or
//   · points at a view the shell CANNOT render (an address that loads cleanly
//     and shows nothing), or
//   · FORGETS the record it names (lands on a section instead of the record).
//
// Before this work: five of the notification centre's fourteen item builders did
// NOTHING when clicked (contract, score, submission, deduction, compliance) and
// the other nine landed on a SECTION, never the record.
//
// HOW IT IS CHECKED
// -----------------
// Static source reading (comment-stripped) so prose can neither satisfy nor break
// an assertion, PLUS the shells' own render branches as the renderable-view set
// (read from AdminShell/BrandShell, never a hand-written list).
//
// Rules 07/08: every guard here is proved able to fail (mutate → FAIL → restore
// byte-identical) — see the §BATCH 7 Part 4.1a report.
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

/** Strip comments so prose can neither satisfy nor break an assertion. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

const readStripped = (rel) => stripComments(readFileSync(resolve(ROOT, rel), 'utf-8'));

/** Every file under a directory, recursively. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const CENTRE = readStripped('src/components/shared/NotificationCenter.tsx');
const ROUTES = readStripped('src/lib/runtime/productRoutes.ts');
const READER = readStripped('src/lib/runtime/recordDeepLink.ts');
const ADMIN_SHELL = readStripped('src/components/layout/AdminShell.tsx');
const BRAND_SHELL = readStripped('src/components/layout/BrandShell.tsx');

/* ── 1. A DESTINATION IS REQUIRED (a dead click is a TYPE error) ─────────── */
test(
  'D1 the notification item REQUIRES a typed record destination',
  /record:\s*\{\s*kind:\s*RecordLinkKind;\s*view:\s*string;\s*id:\s*string\s*\}/.test(CENTRE)
);
test('D2 the old optional navTarget is GONE', !/navTarget/.test(CENTRE));

/* ── 2. EVERY item builder declares a destination ────────────────────────── */
/**
 * The destination SHAPE, not the interface line: `{ kind: '<link kind>', view: …,
 * id: … }`. The invoice builder legitimately declares TWO (one per environment),
 * so the count is the number of DESTINATIONS, never a hand-written number.
 */
const destinations =
  CENTRE.match(/\{\s*kind:\s*'[a-z_]+',\s*view:[^}]*id:[^}]*\}/g) ?? [];
test('D3 every item builder declares a record destination (14+)', destinations.length >= 14);
test(
  'D4 every destination carries a kind, a view and an id',
  destinations.every((d) => /kind:/.test(d) && /view:/.test(d) && /id:/.test(d))
);
/**
 * A COUNT FLOOR ALONE IS NOT ENOUGH — proved by mutation: deleting one whole
 * `record: { … },` line still left fourteen objects and passed. So every item
 * BUILDER (each declares its item `kind: '…' as const`) must itself carry a
 * `record:` before the next builder begins.
 */
const itemKinds = [...CENTRE.matchAll(/kind:\s*'[a-z_]+' as const/g)];
const buildersMissingDestination = itemKinds
  .map((m, i) => [m.index, i + 1 < itemKinds.length ? itemKinds[i + 1].index : CENTRE.length, m[0]])
  .filter(([start, end]) => !/record:/.test(CENTRE.slice(start, end)))
  .map(([, , k]) => k);
test(
  'D4b EVERY item builder declares its own destination' +
    (buildersMissingDestination.length ? ` :: MISSING AT ${buildersMissingDestination.join(', ')}` : ''),
  itemKinds.length >= 14 && buildersMissingDestination.length === 0
);
test(
  'D4c there is at least one destination per item builder',
  destinations.length >= itemKinds.length
);

/* ── 3. The click routes through the ONE address layer, with the record ──── */
test(
  'D5 the click opens the record through navigateProductView (one address layer)',
  /navigateProductView\(\s*environment,\s*n\.record\.view,\s*recordLinkQuery\(\s*n\.record\.kind,\s*n\.record\.id\s*\)\s*\)/.test(
    CENTRE
  )
);

/* ── 4. The registry is the ONE place that knows the keys ────────────────── */
const registryBody = ROUTES.slice(
  ROUTES.indexOf('RECORD_LINK_PARAMS'),
  ROUTES.indexOf('RecordLinkKind')
);
const registry = Object.fromEntries(
  [...registryBody.matchAll(/^\s{2}(\w+):\s*'([^']+)',/gm)].map((m) => [m[1], m[2]])
);
test('D6 the registry declares the record kinds', Object.keys(registry).length >= 9);
test(
  'D7 recordLinkQuery reads the REGISTRY (no hand-written key anywhere)',
  /RECORD_LINK_PARAMS\[kind\]/.test(ROUTES)
);
const kindsUsed = [...new Set(destinations.map((d) => (d.match(/kind:\s*'([a-z_]+)'/) ?? [])[1]))];
test(
  `D8 every record-link kind a builder uses is declared in the registry (${kindsUsed.join(', ')})`,
  kindsUsed.length > 0 && kindsUsed.every((k) => k in registry)
);

/* ── 5. EVERY kind is opened by a surface, through the ONE reader ─────────── */
const srcFiles = walk(resolve(ROOT, 'src'));
const srcText = Object.fromEntries(
  srcFiles.map((p) => [p.slice(ROOT.length + 1), stripComments(readFileSync(p, 'utf-8'))])
);
const consumersOf = (kind) =>
  Object.entries(srcText).filter(([, text]) =>
    new RegExp(`useRecordDeepLink\\('${kind}'\\)`).test(text)
  );
for (const kind of Object.keys(registry)) {
  test(`D9 a surface opens the "${kind}" record through the ONE reader`, consumersOf(kind).length > 0);
}
test(
  'D10 NO surface keeps its own mount-only reader (the defect this batch fixed)',
  Object.entries(srcText).every(
    ([rel, text]) =>
      !/currentQueryParam\(/.test(text) ||
      ['src/lib/runtime/productRoutes.ts', 'src/lib/runtime/recordDeepLink.ts'].includes(rel)
  )
);
test(
  'D11 the ONE reader re-reads the address on navigation, not only on mount',
  /addEventListener\('popstate'/.test(READER)
);

/* ── 6. Every destination view is a view a shell can actually RENDER ─────── */
const renderable = new Set([
  ...[...ADMIN_SHELL.matchAll(/\{adminView === '([a-z0-9_]+)'/g)].map((m) => m[1]),
  ...[...BRAND_SHELL.matchAll(/\{brandView === '([a-z0-9_]+)'/g)].map((m) => m[1]),
]);
const viewLiterals = new Set([...CENTRE.matchAll(/view:\s*'([a-z0-9_]+)'/g)].map((m) => m[1]));
/** The role-resolved targets (`poTarget`, `contractTarget`, …) are views too. */
for (const m of CENTRE.matchAll(
  /const \w+Target\s*=\s*isBrandSession\s*\?\s*'([a-z0-9_]+)'\s*:\s*'([a-z0-9_]+)'/g
)) {
  viewLiterals.add(m[1]);
  viewLiterals.add(m[2]);
}
test('D12 destination views were found to check', viewLiterals.size >= 6 && renderable.size >= 15);
for (const v of [...viewLiterals].sort()) {
  test(`D13 the shell can render the destination view "${v}"`, renderable.has(v));
}

/* ── 7. The LIST-only surfaces focus the record they were sent to ────────── */
test(
  'D14 the reader offers the focus path for surfaces with no detail view',
  /export function useFocusRecordElement/.test(READER) && /data-record-focused/.test(READER)
);
test(
  'D15 a focused record is marked and scrollable in place',
  /data-record-focused='true'/.test(readStripped('src/index.css'))
);

console.log(
  failures === 0 ? 'BATCH7_DEEPLINK_VALIDATION_PASS' : `BATCH7_DEEPLINK_VALIDATION_FAIL (${failures})`
);
if (failures > 0) process.exit(1);
