// §BATCH 2a — THE AMAZON-ATTRIBUTION GATE.
//
// WHY THIS EXISTS
// ---------------
// The Phase 0A audit registered three findings in which a MERCENTA invention was
// presented as the retail channel's rule:
//
//   · `AV-019`  — the nine `DeductionType` values read as real channel chargeback
//                 codes. No channel source publishes that taxonomy.
//   · `AV-019b` — "typically 14 days from the deduction date" read as a deadline
//                 the brand had to meet. No channel source states a dispute window.
//   · `AV-020b` — "backordered items lose visibility on the retail channel after
//                 30 days" drove a user-facing countdown. No channel source states
//                 any such deadline.
//
// Correcting the wording once is not the fix; a later edit could put the claim
// back. This gate is the fix: it fails if the attribution disappears, if the
// invented consequence returns, or if a second copy of a window is declared
// anywhere outside the ONE owning config module.
//
// WHAT IT PROVES
// --------------
//   1. THE CONFIG LOADS AND DECLARES THE TRUTH — `src/config/deductions.ts`
//      evaluates, and each of the three values reports
//      `verifiedAgainstChannel: false` with a Mercenta-owned `source`. The module
//      is imported for real (not pattern-matched), so this is the RUNNING value.
//   2. EACH NOTE PREDICATES THE ATTRIBUTION — the note for each of the three
//      says, in the words shown to a brand, that it is Mercenta's own and not a
//      channel rule.
//   3. THE TAXONOMY LABELS COVER THE CANONICAL ENUM — every value of
//      `DeductionType` in `src/types.ts` has a non-empty label, and the label map
//      has no value the enum does not declare (one source of truth, no drift).
//   4. THE SURFACES RENDER THE ATTRIBUTION — the brand deductions ledger, the
//      brand purchase-order surface and the guided tours all render the owning
//      config's note rather than re-typing a rule.
//   5. THE INVENTED CLAIMS CANNOT COME BACK — the removed wording ("Visibility
//      LOST", "Disputes must be raised within 14 days", "typically 14 days",
//      "lose visibility on the retail channel", the unsupported "fulfillment
//      score" consequence) is absent from `src/`, comments included.
//   6. THE NUMBERS HAVE ONE OWNER — the `14` and the `30` are not re-declared:
//      `workStore` re-exports the config's value and the domain boundary adds the
//      config's `days`.
import { readFileSync, readdirSync, statSync } from 'node:fs';

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

const ROOT = new URL('../', import.meta.url);
const moduleUrl = (p) => new URL(p, ROOT).href;
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

/** Every `.ts`/`.tsx` file under `src/`, so a claim cannot hide in a comment. */
const walk = (dir, out = []) => {
  for (const entry of readdirSync(new URL(dir, ROOT))) {
    const rel = `${dir}${entry}`;
    if (statSync(new URL(rel, ROOT)).isDirectory()) walk(`${rel}/`, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(rel);
  }
  return out;
};
const SRC_FILES = walk('src/');
const ALL_SRC = SRC_FILES.map((p) => read(p)).join('\n');

const CONFIG = 'src/config/deductions.ts';
const cfg = await import(moduleUrl(CONFIG));

/* ── 1. The config loads and declares the truth ──────────────────────────── */
test('the attribution config module loads', typeof cfg === 'object' && cfg !== null);

const tax = cfg.DEDUCTION_TAXONOMY;
test('`AV-019` — the taxonomy is declared as Mercenta\'s own working taxonomy',
  tax?.source === 'mercenta_working_taxonomy', `source=${tax?.source}`);
test('`AV-019` — the taxonomy is NOT claimed as channel-verified',
  tax?.verifiedAgainstChannel === false, `verifiedAgainstChannel=${tax?.verifiedAgainstChannel}`);

const win = cfg.DEDUCTION_DISPUTE_WINDOW;
test('`AV-019b` — the dispute window is Mercenta\'s own service standard',
  win?.source === 'mercenta_service_standard', `source=${win?.source}`);
test('`AV-019b` — the dispute window is NOT claimed as channel-verified',
  win?.verifiedAgainstChannel === false, `verifiedAgainstChannel=${win?.verifiedAgainstChannel}`);
test('`AV-019b` — the declared window is still 14 days (the behaviour is kept, only the attribution changed)',
  win?.days === 14, `days=${win?.days}`);

const restock = cfg.BACKORDER_RESTOCK_TARGET;
test('`AV-020b` — the restock target is Mercenta\'s own operational target',
  restock?.source === 'mercenta_operational_target', `source=${restock?.source}`);
test('`AV-020b` — the restock target is NOT claimed as channel-verified',
  restock?.verifiedAgainstChannel === false, `verifiedAgainstChannel=${restock?.verifiedAgainstChannel}`);
test('`AV-020b` — the declared target is still 30 days', restock?.days === 30, `days=${restock?.days}`);

/* ── 2. Every note states the attribution in words a brand reads ─────────── */
const note = (v) => String(v?.attributionNote ?? '');
test('the taxonomy note says these are Mercenta\'s own and NOT the channel\'s codes',
  /Mercenta working taxonomy/i.test(note(tax)) && /NOT the retail channel/i.test(note(tax)),
  note(tax).slice(0, 120));
test('the dispute note says it is NOT a published channel deadline',
  /Mercenta’s own service standard/i.test(note(win)) && /NOT a\s+published channel deadline/i.test(note(win)),
  note(win).slice(0, 120));
test('the restock note makes NO claim about channel visibility',
  /NOT a channel rule/i.test(note(restock)) && /no claim about channel visibility/i.test(note(restock)),
  note(restock).slice(0, 120));
test('the restock overdue label asserts no channel consequence',
  /Mercenta/i.test(String(restock?.overdueLabel)) && !/visibilit/i.test(String(restock?.overdueLabel)),
  String(restock?.overdueLabel));

/* ── 3. The labels cover the canonical enum exactly (one source of truth) ── */
const typesSource = read('src/types.ts');
const enumStart = typesSource.indexOf('export type DeductionType');
const enumBody = typesSource.slice(enumStart, typesSource.indexOf(';', enumStart));
const declared = [...enumBody.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
test('the canonical `DeductionType` enum was found in src/types.ts', declared.length === 9, declared.join(', '));
const labels = cfg.DEDUCTION_TYPE_LABELS ?? {};
test('every canonical DeductionType has a non-empty label',
  declared.every((d) => typeof labels[d] === 'string' && labels[d].length > 0),
  JSON.stringify(labels));
test('no label exists for a value the enum does not declare (no drift)',
  Object.keys(labels).every((k) => declared.includes(k)),
  Object.keys(labels).filter((k) => !declared.includes(k)).join(', '));
test('the label helper returns a label and never a blank chip',
  typeof cfg.deductionTypeLabel === 'function' &&
    cfg.deductionTypeLabel('late_shipment') === labels.late_shipment &&
    cfg.deductionTypeLabel('not_a_real_type').length > 0,
  String(cfg.deductionTypeLabel?.('not_a_real_type')));

/* ── 4. The surfaces render the owning config's attribution ──────────────── */
const LEDGER = read('src/components/brand/DeductionsLedger.tsx');
const PO_SURFACE = read('src/components/brand/BrandPurchaseOrders.tsx');
const TOURS = read('src/config/tours/tourDefinitions.ts');

test('the brand deductions ledger renders the taxonomy attribution from the config',
  LEDGER.includes('DEDUCTION_TAXONOMY.attributionNote'), 'not rendered');
test('the brand deductions ledger renders the dispute attribution from the config',
  LEDGER.includes('DEDUCTION_DISPUTE_WINDOW.attributionNote'), 'not rendered');
test('the brand deductions ledger labels categories through the one label helper',
  LEDGER.includes('deductionTypeLabel(') && !/type\.replace\(\/_\/g/.test(LEDGER), 'raw enum rendering remains');
test('the brand purchase-order surface renders the restock attribution from the config',
  PO_SURFACE.includes('BACKORDER_RESTOCK_TARGET.attributionNote') &&
    PO_SURFACE.includes('BACKORDER_RESTOCK_TARGET.overdueLabel'),
  'not rendered');
test('the guided tours render the dispute + taxonomy + restock attributions from the config',
  TOURS.includes('DEDUCTION_DISPUTE_WINDOW.attributionNote') &&
    TOURS.includes('DEDUCTION_TAXONOMY.attributionNote') &&
    TOURS.includes('BACKORDER_RESTOCK_TARGET.attributionNote'),
  'not rendered');

/* ── 5. The invented claims cannot come back ─────────────────────────────── */
const BANNED = [
  ['the removed channel-visibility consequence', /Visibility LOST/],
  ['the removed "14 days" deadline wording', /Disputes must be raised within \d+ days/],
  ['the removed "typically 14 days" wording', /typically \d+ days from the deduction date/],
  ['the removed channel-visibility claim in the type comment', /lose visibility on the\s+retail channel/],
  ['the removed performance-score sentence in the deductions tour', /The outcome affects your\s+fulfillment score/],
];
for (const [what, pattern] of BANNED) {
  test(`absent from src/ (comments included): ${what}`, !pattern.test(ALL_SRC),
    (ALL_SRC.match(pattern) ?? [''])[0]);
}

/* ── 6. The numbers have ONE owner ───────────────────────────────────────── */
test('the dispute window is not re-declared as a bare number',
  !/DEDUCTION_DISPUTE_WINDOW_DAYS\s*=\s*\d+/.test(ALL_SRC), 'a second literal exists');
test('the work layer re-exports the config\'s dispute window',
  /DEDUCTION_DISPUTE_WINDOW_DAYS = DEDUCTION_DISPUTE_WINDOW\.days/.test(ALL_SRC), 'repoint missing');
test('the restock target is not added as a bare 30 in the domain boundary',
  !/getUTCDate\(\)\s*\+\s*30\)/.test(ALL_SRC), 'a second literal exists');
test('the domain boundary adds the config\'s declared days',
  /BACKORDER_RESTOCK_TARGET\.days/.test(read('src/data/api.ts')), 'repoint missing');

/* ── Verdict ─────────────────────────────────────────────────────────────── */
console.log('');
if (failures > 0) {
  console.log(`AMAZON_ATTRIBUTION_VALIDATION_FAILED — ${failures} of ${checks} assertions failed.`);
  process.exit(1);
}
console.log(
  `AMAZON_ATTRIBUTION_VALIDATION_PASS — AV-019 / AV-019b / AV-020b are attributed to Mercenta and gated (${checks} assertions).`
);


