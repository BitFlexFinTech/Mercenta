#!/usr/bin/env node
/**
 * §PHASE 3 — THE SUPPLY ROUTE + LOGISTICS ESCALATION GATE.
 * (`npm run validate:supply-route-logistics`)
 *
 * WHY THIS EXISTS
 * ---------------
 * The Founder directed (2026-10-04) that the platform's 3PL partner is **Delta
 * Fulfillment** and that the back-end routing to it must be worked out. Two
 * Phase 3 rows were `not_started`: `phase3-supply-route-profile` and
 * `phase3-logistics-escalation-engine`. This gate DRIVES the shipped modules
 * (bundled with the project's own esbuild through its own `@` alias) and fails if
 * any of the following regresses:
 *
 *   · the Supply Route Profile stops being deterministic, or starts GUESSING a
 *     missing component instead of reporting it as unknown;
 *   · the escalation engine stops failing CLOSED — i.e. recommends a 3PL when the
 *     thresholds are NOT AGREED, or when the route/frequency is unknown;
 *   · the escalation stops naming the declared 3PL partner **Delta Fulfillment**;
 *   · a universal maximum-lead-time rule is invented (a real number where the
 *     business has agreed none).
 *
 * §STAGE 2 (2026-10-04) — Delta Fulfillment is now WIRED IN. This gate also fails
 * if the 3PL provider stops being authoritative in the Integrations Hub (registry
 * card / order / meta), if its provider-mode resolution stops being `simulation`,
 * if the mock-first factory stops returning the MOCK client with no credentials,
 * or if the client seam loses one of its 3PL operations.
 *
 * Every mutation-sensitive assertion was PROVED ABLE TO FAIL (see the session
 * report); the mutated file was restored byte-identical.
 *
 * Run: node scripts/validate-supply-route-logistics.mjs
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
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

const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const ENTRY = `
import { buildSupplyRouteProfile } from '@/lib/fulfillment/supplyRoute';
import { evaluateLogisticsEscalation } from '@/lib/fulfillment/escalation';
import {
  FULFILLMENT_PARTNERS, FULFILLMENT_ESCALATION_THRESHOLDS, DECLARED_3PL_PARTNER, getFulfillmentPartner,
} from '@/config/fulfillment';
import { createDeltaFulfillmentClientForConnection } from '@/lib/fulfillment/index';
import {
  defaultIntegrationMode, INTEGRATION_ORDER, INTEGRATION_META, INTEGRATION_REGISTRY,
} from '@/integrations/registry';
import { INITIAL_INTEGRATIONS } from '@/integrations/types';

const full = buildSupplyRouteProfile({
  origin: 'Portugal', shipFrom: 'Porto factory',
  productionLeadTimeDays: 21, exportLeadTimeDays: 3, freightMode: 'sea',
  transitEstimateDays: 14, customsRequired: true, customsBufferDays: 2,
  ukFinalMile: true, appointmentRequired: true, safetyBufferDays: 4, variability: 'medium',
});
const missingTransit = buildSupplyRouteProfile({
  origin: 'Portugal', shipFrom: null,
  productionLeadTimeDays: 21, exportLeadTimeDays: 3, freightMode: 'sea',
  transitEstimateDays: null, customsRequired: true, customsBufferDays: 2,
  ukFinalMile: true, appointmentRequired: false, safetyBufferDays: 4, variability: 'unknown',
});
const noCustoms = buildSupplyRouteProfile({
  origin: 'United Kingdom', shipFrom: 'Leeds', productionLeadTimeDays: 5, exportLeadTimeDays: 0,
  freightMode: 'road', transitEstimateDays: 2, customsRequired: false, customsBufferDays: null,
  ukFinalMile: true, appointmentRequired: false, safetyBufferDays: 1, variability: 'low',
});

const agreed = { maxDirectDoorToFcDays: 20, minPoFrequencyPerMonth: 2, basis: 'TEST thresholds (injected).' };
const escalate = evaluateLogisticsEscalation({ route: full, poFrequencyPerMonth: 3 }, agreed);
const direct = evaluateLogisticsEscalation({ route: noCustoms, poFrequencyPerMonth: 3 }, agreed);
const unagreed = evaluateLogisticsEscalation({ route: full, poFrequencyPerMonth: 3 });
const noFreq = evaluateLogisticsEscalation({ route: full, poFrequencyPerMonth: null }, agreed);
const unknownRoute = evaluateLogisticsEscalation({ route: missingTransit, poFrequencyPerMonth: 3 }, agreed);

let undeclaredRefused = false;
try { getFulfillmentPartner('acme_3pl'); } catch { undeclaredRefused = true; }

const deltaSeam = createDeltaFulfillmentClientForConnection({
  credentials: null, edgeFunctionBase: '/functions/v1',
});

console.log('__RESULT__' + JSON.stringify({
  full, missingTransit, noCustoms, escalate, direct, unagreed, noFreq, unknownRoute,
  partners: FULFILLMENT_PARTNERS, declared: DECLARED_3PL_PARTNER,
  canonicalThresholds: FULFILLMENT_ESCALATION_THRESHOLDS, undeclaredRefused,
  partner: getFulfillmentPartner(DECLARED_3PL_PARTNER),
  deltaRegistry: !!INTEGRATION_REGISTRY.delta_fulfillment,
  deltaInOrder: INTEGRATION_ORDER.includes('delta_fulfillment'),
  deltaMeta: INTEGRATION_META.delta_fulfillment,
  deltaInitial: INITIAL_INTEGRATIONS.delta_fulfillment,
  deltaMode: defaultIntegrationMode('delta_fulfillment'),
  deltaSeamMode: deltaSeam.mode,
  deltaMethods: Object.keys(deltaSeam.client),
}));
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-phase3-'));
const entryPath = path.join(tmpDir, 'entry.ts');
const outPath = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(entryPath, ENTRY, 'utf8');

let r;
try {
  execFileSync(
    path.join(ROOT, 'node_modules/.bin/esbuild'),
    [
      entryPath, '--bundle', '--format=esm', '--platform=node',
      '--banner:js=import{createRequire as __cr}from"module";const require=__cr(import.meta.url);',
      `--alias:@=${path.join(ROOT, 'src')}`, '--define:import.meta.env={}',
      `--outfile=${outPath}`, '--log-level=error',
    ],
    { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] }
  );
  const stdout = execFileSync(process.execPath, [outPath], { cwd: ROOT, encoding: 'utf8' });
  r = JSON.parse(stdout.split('__RESULT__')[1]);
} catch (error) {
  console.log(`  FAIL  bundling/executing the real modules — ${String(error).slice(0, 1200)}`);
  console.log('');
  console.log('SUPPLY_ROUTE_LOGISTICS_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

/* ── 1. the Supply Route Profile is deterministic and never guesses ──────── */
check('the full route sums production+export+transit+customs buffer = 40 days',
  r.full.totalDoorToFcDays === 40, `got ${r.full.totalDoorToFcDays}`);
check('the planning lead time adds the safety buffer = 44 days',
  r.full.planningLeadTimeDays === 44, `got ${r.full.planningLeadTimeDays}`);
check('a fully-known route reports NO unknowns',
  Array.isArray(r.full.unknowns) && r.full.unknowns.length === 0, JSON.stringify(r.full.unknowns));
check('a MISSING transit estimate yields a null total (never a guess)',
  r.missingTransit.totalDoorToFcDays === null, `got ${r.missingTransit.totalDoorToFcDays}`);
check('the missing component is NAMED as unknown',
  r.missingTransit.unknowns.some((u) => /transit/i.test(u)), JSON.stringify(r.missingTransit.unknowns));
check('when customs is NOT required its absent buffer is NOT an unknown',
  r.noCustoms.unknowns.length === 0 && r.noCustoms.totalDoorToFcDays === 7,
  `unknowns=${JSON.stringify(r.noCustoms.unknowns)} total=${r.noCustoms.totalDoorToFcDays}`);

/* ── 2. the escalation engine fails CLOSED ──────────────────────────────── */
check('with the CANONICAL thresholds (unagreed/null) the decision is REVIEW',
  r.unagreed.decision === 'review', JSON.stringify(r.unagreed));
check('…and NO 3PL partner is recommended while thresholds are unagreed',
  r.unagreed.partnerId === null, JSON.stringify(r.unagreed));
check('…and thresholdsAgreed is false', r.unagreed.thresholdsAgreed === false);
check('an UNKNOWN route is routed to REVIEW even with agreed thresholds',
  r.unknownRoute.decision === 'review', JSON.stringify(r.unknownRoute));
check('an UNKNOWN purchase-order frequency is routed to REVIEW',
  r.noFreq.decision === 'review', JSON.stringify(r.noFreq));

/* ── 3. Delta Fulfillment is the declared 3PL partner ───────────────────── */
check('escalating NAMES the declared 3PL partner (Delta Fulfillment)',
  r.escalate.decision === 'escalate_to_3pl' && r.escalate.partnerName === 'Delta Fulfillment',
  JSON.stringify(r.escalate));
check('the escalation partner id is delta_fulfillment',
  r.escalate.partnerId === 'delta_fulfillment', `got ${r.escalate.partnerId}`);
check('a short, frequent route stays DIRECT (no partner)',
  r.direct.decision === 'direct_to_fc' && r.direct.partnerId === null, JSON.stringify(r.direct));
check('DECLARED_3PL_PARTNER is delta_fulfillment', r.declared === 'delta_fulfillment', `got ${r.declared}`);
check('the partner is a 3PL, owned by Mercenta (never the brand)',
  r.partner.role === '3pl' && r.partner.relationshipOwner === 'mercenta', JSON.stringify(r.partner));
check('an UNDECLARED partner id is REFUSED, never defaulted', r.undeclaredRefused === true);

/* ── 4. NO INVENTED universal lead-time rule ────────────────────────────── */
check('the canonical thresholds default to null (NOT AGREED)',
  r.canonicalThresholds.maxDirectDoorToFcDays === null &&
    r.canonicalThresholds.minPoFrequencyPerMonth === null,
  JSON.stringify(r.canonicalThresholds));

/* ── 5. source guards (the contract, not prose) ─────────────────────────── */
const escSrc = read('src/lib/fulfillment/escalation.ts');
check('the engine reads INJECTABLE thresholds (not a hard-coded number)',
  /thresholds\s*:\s*FulfillmentEscalationThresholds/.test(escSrc),
  'the injectable thresholds parameter is missing');
const cfgSrc = read('src/config/fulfillment.ts');
check('the config declares Delta Fulfillment as a 3PL',
  /'delta_fulfillment'/.test(cfgSrc) && /role:\s*'3pl'/.test(cfgSrc));

/* ── 6. Delta Fulfillment is wired in as the authoritative 3PL provider ──── */
check('Delta Fulfillment is registered in the Integrations Hub registry',
  r.deltaRegistry === true);
check('delta_fulfillment is in INTEGRATION_ORDER (rendered by the wizard)',
  r.deltaInOrder === true);
check('its Hub meta is logistics + simulation (the authoritative mode)',
  r.deltaMeta?.category === 'logistics' && r.deltaMeta?.defaultMode === 'simulation',
  JSON.stringify(r.deltaMeta));
check('it starts disconnected (never pre-connected)',
  r.deltaInitial?.status === 'disconnected', JSON.stringify(r.deltaInitial));
check('the canonical provider-mode resolution is `simulation` (never unknown/not_registered)',
  r.deltaMode === 'simulation', `got ${r.deltaMode}`);
check('the mock-first factory returns the MOCK client with NO credentials',
  r.deltaSeamMode === 'mock', `got ${r.deltaSeamMode}`);
check('the client seam exposes the 3PL operations (inbound, inventory, dispatch, invoice)',
  ['createInboundReceipt', 'getInboundReceiptStatus', 'getInventoryLevel', 'createDispatch',
    'getDispatchStatus', 'getFulfillmentInvoice'].every((m) => r.deltaMethods.includes(m)),
  JSON.stringify(r.deltaMethods));

/* ── 7. source guards for the Delta adapter ─────────────────────────────── */
const idxSrc = read('src/lib/fulfillment/index.ts');
check('the factory refuses a `mock:` secretRef for the live path',
  /isMockDeltaSecret\(credentials\.secretRef\)/.test(idxSrc));
const deltaClientSrc = read('src/lib/fulfillment/client.ts');
check('the live client talks through the delta-fulfillment Edge Function path',
  /delta-fulfillment\//.test(deltaClientSrc));
check('a 3PL fulfils — the adapter imports no carrier lane choice',
  !/from ['"]@\/config\/shipping['"]/.test(deltaClientSrc) &&
    !/chooseCarrier\s*\(/.test(deltaClientSrc));

/* ── summary ────────────────────────────────────────────────────────────── */
console.log('');
console.log(`Phase 3 supply route + escalation: ${pass} passed, ${fail} failed`);
if (fail > 0) console.log(`FAILED: ${errors.join(' | ')}`);
console.log(fail === 0 ? 'SUPPLY_ROUTE_LOGISTICS_PASS' : `SUPPLY_ROUTE_LOGISTICS_FAIL (${fail})`);
process.exit(fail === 0 ? 0 : 1);
