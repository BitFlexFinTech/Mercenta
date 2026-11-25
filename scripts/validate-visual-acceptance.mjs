#!/usr/bin/env node
/**
 * §BATCH 8 GATE — THE VISUAL ACCEPTANCE RECORD MUST MATCH THE PRODUCT (2026-11-25)
 *
 * WHY THIS EXISTS (rule 10 — describers must match reality)
 * --------------------------------------------------------
 * `docs/VISUAL_ACCEPTANCE_2026-11-25.md` records which screens were walked in which
 * appearance. A record like that is a written fact about the product, and written
 * facts drift: someone adds a destination, the record still lists the old set, and
 * from then on it is a FALSE STATEMENT about what was verified — the exact defect
 * that made the owner ask why a removed surface was still described as live.
 *
 * So this gate RE-DERIVES the inventory from the same owners the walk reads (it
 * imports `discoverInventory` from `scripts/visual-acceptance.mjs` — one discovery,
 * two consumers, never a second list) and FAILS when the record disagrees:
 *
 *   A1  discovery returns screens (rule 10 §5: a check that finds nothing is a
 *       FAILURE, not a pass)
 *   A2  the record exists and carries its generated block
 *   A3  the record's row count equals the discovered screen count
 *   A4  every discovered screen has its own row — nothing missing, nothing invented
 *   A5  every row records BOTH appearances (no `—` cell)
 *   A6  no row records a FAIL — a failing screen cannot be quietly published as done
 *   A7  the record says how it was produced (the script, the two appearances)
 *
 * Run: node scripts/validate-visual-acceptance.mjs   (via `npm run validate:all`)
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverInventory, OWNER_FILES } from './visual-acceptance.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECORD = path.join(ROOT, 'docs', 'VISUAL_ACCEPTANCE_2026-11-25.md');
const BEGIN = '<!-- BEGIN GENERATED ACCEPTANCE TABLE -->';
const END = '<!-- END GENERATED ACCEPTANCE TABLE -->';

let failures = 0;
let assertions = 0;
const test = (name, ok, detail = '') => {
  assertions += 1;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

console.log('§BATCH 8 — VISUAL ACCEPTANCE RECORD GATE');

/* A1 — the discovery must return screens, or every later assertion is vacuous. */
const inventory = discoverInventory();
const screens = inventory.areas.flatMap((area) => area.screens.map((screen) => ({ area, screen })));
test(
  'A1 discovery reads the product declaration (a check that finds nothing is a FAILURE)',
  inventory.problems.length === 0 && screens.length > 0,
  inventory.problems.length ? inventory.problems.join(' · ') : `${screens.length} screen(s)`
);

/* A2 — the record and its generated block. */
const recordExists = existsSync(RECORD);
test('A2 the acceptance record exists', recordExists, path.relative(ROOT, RECORD));
const doc = recordExists ? readFileSync(RECORD, 'utf8') : '';
const start = doc.indexOf(BEGIN);
const stop = doc.indexOf(END);
test('A2 the record carries its generated block', start !== -1 && stop > start);

/* A3/A4 — every discovered screen, exactly once. */
const rows = [];
if (start !== -1 && stop > start) {
  for (const line of doc.slice(start + BEGIN.length, stop).split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 6) continue;
    if (/^-+$/.test(cells[0].replace(/[\s-]/g, '-'))) continue;
    if (cells[0] === '#' || cells[0].startsWith('#')) continue;
    rows.push(cells);
  }
}

test(
  'A3 the record has one row per discovered screen',
  rows.length === screens.length,
  `record ${rows.length} · product ${screens.length}`
);

const missing = [];
for (const { area, screen } of screens) {
  const name = screen.implemented === false ? `${screen.label} _(placeholder)_` : screen.label;
  const found = rows.some((cells) => cells[1] === area.area && cells[2] === name);
  if (!found) missing.push(`${area.area}/${screen.label}`);
}
test(
  'A4 every screen the product declares is in the record (absence guard: rule 08)',
  missing.length === 0,
  missing.length ? `MISSING ${missing.slice(0, 6).join(' · ')}${missing.length > 6 ? ' …' : ''}` : 'none missing'
);

/* A5/A6 — both appearances, and no failing screen presented as done. */
const unrecorded = rows.filter((cells) => cells[4] === '—' || cells[5] === '—' || !cells[4] || !cells[5]);
test(
  'A5 every row records BOTH appearances',
  unrecorded.length === 0,
  unrecorded.length ? `${unrecorded.length} row(s) with a missing appearance` : 'both recorded'
);

const failed = rows.filter((cells) => cells[4] === 'FAIL' || cells[5] === 'FAIL');
test(
  'A6 no screen is recorded as FAIL',
  failed.length === 0,
  failed.length
    ? `${failed.length} failing: ${failed.slice(0, 5).map((c) => `${c[1]}/${c[2]}`).join(' · ')}`
    : 'none'
);

/* A7 — the record says how it was produced, so it cannot read as hand-written. */
test(
  'A7 the record names the script that produced it and the two appearances',
  doc.indexOf('scripts/visual-acceptance.mjs') !== -1 && doc.indexOf('brand-dark') !== -1 && doc.indexOf('brand-light') !== -1
);

/* And it names the owners, so a reader can check the inventory themselves. */
const ownersNamed = Object.values(OWNER_FILES).every((rel) => doc.indexOf(rel) !== -1);
test('A7 the record names every declaration the inventory was read from', ownersNamed);

console.log(
  `\n${failures === 0 ? 'PASS' : 'FAIL'} — ${assertions - failures}/${assertions} assertions`
);
process.exit(failures === 0 ? 0 : 1);