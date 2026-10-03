#!/usr/bin/env node
/**
 * §BATCH 2p — THE FOUR INFERENCE RELABELS GATE (AV-002 / AV-017 / AV-025 / AV-044).
 *
 * WHY THIS EXISTS
 * ---------------
 * Four Phase 0A findings were classified INFERENCE (discrepancy register
 * `docs/AMAZON_VENDOR_DISCREPANCY_REGISTER_2026-09-20.md`): each asserted, or
 * implied, an Amazon fact the channel does not state, so the correct disposition
 * was `RELABEL` — the behaviour may stay, but the attribution/wording is wrong and
 * must be corrected so Mercenta's own rule is never presented as the channel's.
 * This gate makes those four corrections CHECKABLE, so none can silently return:
 *
 *   1  `AV-002` — the acknowledgement notification and the ack-deadline label must
 *      state the RISK (a missed window leaves the order AT RISK), never the
 *      unstated certainty "forced cancellation". No `src/` CODE may assert it.
 *   2  `AV-017` — the UK fulfilment-centre list is MERCENTA-MAINTAINED convenience
 *      data, never an Amazon-published directory; the PO's declared ship-to party
 *      stays the authoritative destination.
 *   3  `AV-025` — the internal fulfilment concept is labelled from its ONE owner
 *      ("Brand-direct supply"), never the retail channel's own programme name
 *      "Direct Fulfillment" (a distinct Amazon programme).
 *   4  `AV-044` — the deterministic simulation carries no unverified channel claim
 *      (it inherits the corrected `AV-013`/`AV-003` claims) and keeps its safety
 *      gate that refuses a non-simulation provider.
 *
 * Method mirrors §8 of `validate-wave3-logistics.mjs`: a REPO-WIDE,
 * COMMENT-STRIPPED, WHITESPACE-NORMALISED sweep of `src/`, so an offender is any
 * occurrence in CODE — an explanatory comment that NAMES the old wording and the
 * finding is allowed (it is the inline record the repo requires).
 *
 * Run: node scripts/validate-inference-relabels.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
const errors = [];
function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    errors.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
/** Source with comments stripped and whitespace collapsed — an assertion about CODE, never prose. */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');
const code = (rel) => stripComments(read(rel)).replace(/\s+/g, ' ');

/** Every `.ts`/`.tsx` under `src/`, with its comment-stripped, normalised body. */
function srcCodeFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) srcCodeFiles(full, out);
    else if (/\.tsx?$/.test(entry)) {
      out.push({ rel: path.relative(ROOT, full), body: stripComments(fs.readFileSync(full, 'utf8')).replace(/\s+/g, ' ') });
    }
  }
  return out;
}
const SRC = srcCodeFiles(path.join(ROOT, 'src'));
const offenders = (re) => SRC.filter(({ body }) => re.test(body)).map(({ rel }) => rel);

/* ── AV-002 — the acknowledgement consequence is a RISK, not a certainty ────── */
console.log('\n§ BATCH 2p (AV-002) — the ack consequence is stated as a risk, never "forced cancellation"\n');

const FORCED = /forced\s+cancellation/i;
const forcedOffenders = offenders(FORCED);
check(
  'AV-002: no src CODE asserts "forced cancellation" as the acknowledgement consequence' +
    ' (an explanatory comment that names it is allowed)',
  forcedOffenders.length === 0,
  forcedOffenders.join(', ')
);
const STATUS = code('src/lib/statusPresentation.ts');
check(
  'AV-002: the ack-overdue label states the RISK ("at risk of cancellation") in CODE',
  /at risk of cancellation/i.test(STATUS) && !FORCED.test(STATUS)
);
const NOTIF = code('src/lib/commerce/poAcknowledgementNotifications.ts');
check(
  'AV-002: the acknowledgement notification copy asserts no cancellation at all',
  NOTIF.length > 0 && !/cancellation/i.test(NOTIF)
);
check(
  'AV-002: the PO type documents the 24h window as the real channel rule with the consequence as an INFERENCE',
  /AV-002/.test(read('src/types.ts')) && /INFERENCE, not a channel fact/i.test(read('src/types.ts'))
);

/* ── AV-017 — the FC list is Mercenta convenience data, the PO is authoritative ─ */
console.log('\n§ BATCH 2p (AV-017) — the fulfilment-centre list is Mercenta-maintained, the PO is authoritative\n');

const TYPES = read('src/types.ts');
check(
  'AV-017: the FC-list owner DECLARES it is a MERCENTA-MAINTAINED convenience list',
  /MERCENTA-MAINTAINED convenience list/i.test(TYPES)
);
check(
  'AV-017: the FC-list owner does NOT present itself as an Amazon-published directory (no "Amazon UK FCs" claim in CODE)',
  !/Amazon UK FCs/i.test(code('src/types.ts'))
);
const FC_CLAIM = /amazon\s+(uk\s+)?(fulfil|fulfill)ment\s+cent(re|er)s?\b/i;
const fcClaimOffenders = offenders(FC_CLAIM);
check(
  'AV-017: no src CODE presents the FC list as an Amazon-published directory',
  fcClaimOffenders.length === 0,
  fcClaimOffenders.join(', ')
);
check(
  'AV-017: the destination owner states the PURCHASE ORDER is the authoritative source',
  /THE AUTHORITATIVE SOURCE is the purchase order/i.test(read('src/config/destinationFc.ts'))
);


/* ── AV-025 — the internal track is labelled from ONE owner, never the channel's name ─ */
console.log('\n§ BATCH 2p (AV-025) — the track is "Brand-direct supply", never the channel programme "Direct Fulfillment"\n');

const OWNER = read('src/config/fulfillmentTrack.ts');
check(
  'AV-025: the ONE track-label owner exists and labels the track "Brand-direct supply"',
  /direct_fulfillment:\s*'Brand-direct supply'/.test(OWNER)
);
check(
  'AV-025: the owner provides a fail-closed label function (unknown → "Unassigned")',
  /export function fulfillmentTrackLabel/.test(OWNER) && /unassigned: 'Unassigned'/.test(OWNER)
);
const COLLIDE = /direct\s+fulfill?ment/i;
const collideOffenders = offenders(COLLIDE);
check(
  'AV-025: no src CODE renders the colliding channel programme name "Direct Fulfillment"' +
    ' (only comments explaining the collision may name it)',
  collideOffenders.length === 0,
  collideOffenders.join(', ')
);
check(
  'AV-025: the surfaces consume the ONE owner label (no re-typed copy of the label)',
  /@\/config\/fulfillmentTrack/.test(code('src/components/brand/OnboardingWizard.tsx')) &&
    /@\/config\/fulfillmentTrack/.test(code('src/components/admin/FulfillmentTrack.tsx')) &&
    /@\/config\/fulfillmentTrack/.test(code('src/components/admin/BrandCRM.tsx')) &&
    /@\/config\/fulfillmentTrack/.test(code('src/components/admin/ContractsAdminPanel.tsx'))
);
const AGR = code('src/lib/agreement.ts');
check(
  'AV-025: the agreement clause header reads the ONE owner label (not a re-typed programme name)',
  /FULFILLMENT_TRACK_LABELS\.direct_fulfillment\.toUpperCase\(\)/.test(AGR) && !/DIRECT FULFILLMENT/.test(AGR)
);

/* ── AV-044 — the simulation inherits corrected claims and keeps its safety gate ─ */
console.log('\n§ BATCH 2p (AV-044) — the simulation carries no unverified channel claim and refuses a live provider\n');

const SCEN = code('src/lib/simulation/scenarioEngine.ts');
check(
  'AV-044: the simulation engine carries NO unverified channel claim (no forced cancellation, no Pacific deadline, no performance rating)',
  SCEN.length > 0 &&
    !FORCED.test(SCEN) &&
    !/10\s?(am|:00)\s?(Pacific|PT)\b/i.test(SCEN) &&
    !/vendor\s+performance\s+rating/i.test(SCEN)
);
check(
  'AV-044: the simulation safety gate is present and refuses any non-simulation provider',
  /isProviderSimulationSafe/.test(SCEN) && /safety_refused/.test(SCEN)
);

/* ── summary ────────────────────────────────────────────────────────────────── */
console.log('');
if (fail === 0) {
  console.log(`INFERENCE_RELABELS_VALIDATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
} else {
  console.log(`INFERENCE_RELABELS_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}

