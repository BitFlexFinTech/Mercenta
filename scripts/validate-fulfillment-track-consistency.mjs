#!/usr/bin/env node
/**
 * §WAVE 3d (2026-11-25) — FULFILMENT TRACK CONSISTENCY.
 *
 * WHY THIS EXISTS. A defect was found by RENDERING the admin fulfilment screen:
 * Astonish scored 88 and displayed "financed"; Le Creuset scored 45 and displayed
 * "direct fulfilment". The cause was structural — `demoStore.ts` drew every score
 * from ONE total list while `track` was copied from the brand row, so the two were
 * chosen independently. `FulfillmentScore` documents the rule (the track is
 * auto-assigned at totalScore >= 65) and `recalculateAllScores` implements it, but
 * the seed went through neither.
 *
 * This gate makes the rule structural instead of hopeful: the seed must draw from a
 * pool chosen BY THE BRAND'S TRACK, each pool must sit wholly on its side of the
 * documented threshold, and the derivation used elsewhere must use the same
 * threshold. A check that finds nothing is a FAILURE (rule 10), so an empty or
 * missing pool fails loudly rather than passing quietly.
 *
 * Run: node scripts/validate-fulfillment-track-consistency.mjs
 */
import { readFileSync, existsSync } from 'node:fs';

const THRESHOLD = 65; // documented on `FulfillmentScore` and used by `recalculateAllScores`

const STORE = 'src/data/demoStore.ts';
const API = 'src/data/api.ts';

let failures = 0;
const results = [];
function check(label, ok, detail = '') {
  results.push({ label, ok, detail });
  if (!ok) failures += 1;
}

if (!existsSync(STORE) || !existsSync(API)) {
  console.error('FULFILLMENT_TRACK_CONSISTENCY_FAIL — the data layer is missing');
  process.exit(1);
}

const store = readFileSync(STORE, 'utf8');
const api = readFileSync(API, 'utf8');

const directMatch = store.match(/const DIRECT_SCORE_TOTALS = \[([^\]]*)\]/);
const financedMatch = store.match(/const FINANCED_SCORE_TOTALS = \[([^\]]*)\]/);
const parse = (m) =>
  m ? m[1].split(',').map((v) => Number(v.trim())).filter((v) => !Number.isNaN(v)) : [];

const direct = parse(directMatch);
const financed = parse(financedMatch);

/* 1. Both pools exist and are non-empty — a lookup returning nothing is a FAILURE. */
check('the direct-fulfilment score pool exists and is not empty', direct.length > 0, `${direct.length} values`);
check('the financed score pool exists and is not empty', financed.length > 0, `${financed.length} values`);

/* 2. Each pool sits wholly on its side of the documented threshold. */
const directBad = direct.filter((t) => t < THRESHOLD);
const financedBad = financed.filter((t) => t >= THRESHOLD);
check(
  `every direct-fulfilment total is at or above ${THRESHOLD}`,
  directBad.length === 0,
  directBad.join(', ')
);
check(
  `every financed total is below ${THRESHOLD}`,
  financedBad.length === 0,
  financedBad.join(', ')
);

/* 3. The seed CHOOSES the pool by the brand's declared track — this is the property
      that makes the two impossible to contradict. */
check(
  'the seed selects its score pool by the brand track',
  /const pool = b\.track === 'direct_fulfillment' \? DIRECT_SCORE_TOTALS : FINANCED_SCORE_TOTALS;/.test(
    store
  )
);

/* 4. The score's track is still the brand's declared track (one owner, not two). */
check(
  "the seed still takes the track from the brand row's single declaration",
  /track: b\.track as 'direct_fulfillment' \| 'financed'/.test(store)
);

/* 5. The derivation used elsewhere agrees on the threshold — two different
      thresholds would put the same score on two different tracks. */
check(
  `recalculateAllScores derives the track at the same ${THRESHOLD} threshold`,
  new RegExp(`total >= ${THRESHOLD} \\? 'direct_fulfillment' : 'financed'`).test(api)
);

/* 6. Both tracks actually occur in the demo, so the pools are exercised rather than
      one branch being dead. */
check(
  'the demo data declares both a financed and a direct-fulfilment brand',
  /track: 'financed'/.test(readFileSync('src/data/demoData.ts', 'utf8')) &&
    /track: 'direct_fulfillment'/.test(readFileSync('src/data/demoData.ts', 'utf8'))
);

for (const r of results) {
  console.log(`${r.ok ? '✓' : '✗'} ${r.label}${r.detail ? ` — ${r.detail}` : ''}`);
}

if (failures > 0) {
  console.error(
    `\nFULFILLMENT_TRACK_CONSISTENCY_FAIL — ${failures} of ${results.length} assertions failed.`
  );
  process.exit(1);
}

console.log(
  `\nFULFILLMENT_TRACK_CONSISTENCY_PASS — ${results.length} assertions. A brand's score and its declared track cannot contradict each other, and one threshold governs both.`
);