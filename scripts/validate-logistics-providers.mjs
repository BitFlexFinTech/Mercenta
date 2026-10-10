#!/usr/bin/env node
/**
 * §P10 — CARRIER PROVIDER CONFIGURATION + CONSOLIDATION CONTRACT VALIDATOR
 * (programme `docs/DASHBOARD_LOGISTICS_CLEANUP_PROGRAMME_2026-09-22.md` §4 P10,
 * matrix `D10-10`, programme decision 11).
 *
 * The browser suite proves the surfaces RENDER. This validator proves the parts a browser
 * test cannot reach cheaply, and it EXECUTES the real modules (bundled with the project's
 * own esbuild, through the project's own `@/` alias) rather than grepping source text.
 *
 * Asserted behaviour:
 *   1  the provider configuration is a PROJECTION of the canonical owners: exactly the two
 *      declared Mercenta accounts, each with ITS declared lane, service and capability,
 *      and the lane-account mapping read from `SHIPPING_CARRIER_ROUTING`
 *   2  fail-closed: a carrier is operational ONLY for simulation | live; every other state
 *      (available / configuring / disabled / degraded / error / unknown / not_registered)
 *      is NOT operational, is named, and is NEVER presented as simulation or live
 *   3  the state BASIS is truthful (sandbox → simulation; a recorded error is quoted;
 *      operator-disabled says so)
 *   4  a RETIRED carrier (decision 1) has no configuration and is refused BY NAME
 *   5  NO COST LEAK: a provider configuration carries no commercial term (discount,
 *      mark-up, margin, VAT) and the owner does not read `SHIPPING_COMMERCIAL_TERMS`
 *   6  consolidation is RECORDED AS DEFERRED with its documented evidence (the shipment
 *      request's `purchaseOrders[]`, the per-carton PO reference, the 100-confirmation
 *      truckload limit) — while the 1..n model is FUNCTIONAL
 *   7  the 1..n declaration normalises and refuses: empty refused, a duplicate refused
 *   8  the consolidation pre-conditions hold: cross-tenant grouping refused, duplicates
 *      refused, the truckload limit enforced
 *   9  the surfaces are WIRED to the owners (the queue uses the SAME rule as the nav badge
 *      and the notification centre; the brand queue reads TENANT-SCOPED POs; the admin
 *      hand-off to the Integrations view exists and leads somewhere real)
 *  10  zero network calls
 *
 * Run: node scripts/validate-logistics-providers.mjs
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

/* ── Bundle the REAL modules and execute them ─────────────────────────────── */

const ENTRY = `
import {
  CONFIGURABLE_CARRIER_PROVIDERS, carrierProviderConfiguration, carrierProviderConfigurations,
  isProviderOperational, providerStateLabel, BRAND_PROVIDER_CONFIGURATION_NOTICE,
} from '@/lib/shipping/providerConfiguration';
import {
  CONSOLIDATION_POSTURE, TRUCKLOAD_CONFIRMATION_LIMIT, consignmentPurchaseOrders,
  checkConsolidatable,
} from '@/lib/shipping/consolidation';

const out = {};
const attempt = (fn) => { try { return { threw: false, value: fn() }; } catch (e) { return { threw: true, message: String(e.message ?? e) }; } };

const MODES = { dhl: 'simulation', palletline: 'simulation' };
const shapes = carrierProviderConfigurations({ modes: MODES, connections: {} });
out.accounts = {
  declared: CONFIGURABLE_CARRIER_PROVIDERS,
  count: shapes.length,
  byCarrier: Object.fromEntries(shapes.map((c) => [c.carrier, {
    laneLabels: c.laneLabels, lanes: c.lanes, routingLanes: c.routingLanes, services: c.services,
    accountLabel: c.accountLabel, capabilityLabel: c.capabilityLabel, providerId: c.providerId,
    owner: c.configurationOwner, brandConfigurable: c.brandConfigurable, controlPlane: c.controlPlane,
    activation: c.activation, mode: c.mode, operational: c.operational, stateLabel: c.stateLabel,
    commercialKeys: Object.keys(c).filter((k) => ['negotiatedDiscountPct', 'markUpPct', 'grossSpread', 'netMargin', 'margin', 'vatRate', 'vatTreatment', 'handlingFeeGbp', 'surchargePct', 'carrierCost', 'brandCharge', 'commercialTerms'].includes(k)),
  }])),
};
out.notice = BRAND_PROVIDER_CONFIGURATION_NOTICE;

/* 2/3 — every mode, plus the basis each connection state produces. */
out.states = {};
for (const mode of ['simulation', 'live', 'available', 'configuring', 'disabled', 'degraded', 'error']) {
  const cfg = carrierProviderConfiguration('dhl', { modes: { dhl: mode } });
  out.states[mode] = { operational: cfg.operational, label: cfg.stateLabel, mode: cfg.mode };
}
const unknown = carrierProviderConfiguration('dhl', { modes: {} });
out.states.unknown = { operational: unknown.operational, label: unknown.stateLabel, mode: unknown.mode };
out.states.helperSimulation = isProviderOperational('simulation');
out.states.helperAvailable = isProviderOperational('available');
out.states.labelUnknown = providerStateLabel('not_registered');

out.basis = {
  sandbox: carrierProviderConfiguration('dhl', { modes: { dhl: 'simulation' }, connections: { dhl: { status: 'connected', sandbox: true } } }).basis,
  verified: carrierProviderConfiguration('dhl', { modes: { dhl: 'live' }, connections: { dhl: { status: 'connected', sandbox: false } } }).basis,
  failed: carrierProviderConfiguration('dhl', { modes: { dhl: 'error' }, connections: { dhl: { status: 'needs_attention', sandbox: false, error: 'HTTP 401 unauthorized' } } }).basis,
  disabled: carrierProviderConfiguration('dhl', { modes: { dhl: 'disabled' }, connections: { dhl: { status: 'connected', sandbox: true, disabled: true } } }).basis,
  none: carrierProviderConfiguration('palletline', { modes: MODES }).basis,
};

/* 4 — retired carriers are refused BY NAME and have no configuration. */
out.retired = {
  fedex: attempt(() => carrierProviderConfiguration('fedex', { modes: MODES })),
  bak: attempt(() => carrierProviderConfiguration('bak', { modes: MODES })),
  unknownAccount: attempt(() => carrierProviderConfiguration('royal_mail', { modes: MODES })),
};

/* 6/7/8 — the consolidation posture + the 1..n model. */
out.posture = CONSOLIDATION_POSTURE;
out.truckload = TRUCKLOAD_CONFIRMATION_LIMIT;
out.declaration = {
  single: consignmentPurchaseOrders({ poNumber: 'PO-9002' }),
  grouped: consignmentPurchaseOrders({ poNumber: 'PO-9002', poNumbers: ['PO-9003', 'PO-9004'] }),
  empty: attempt(() => consignmentPurchaseOrders({ poNumber: '  ' })),
  duplicateExtra: attempt(() => consignmentPurchaseOrders({ poNumber: 'PO-9002', poNumbers: ['PO-9003', 'PO-9003'] })),
  duplicateOwn: attempt(() => consignmentPurchaseOrders({ poNumber: 'PO-9002', poNumbers: ['PO-9002'] })),
};
out.checks = {
  ok: checkConsolidatable({ brandId: 'brand-a', purchaseOrders: [
    { poNumber: 'PO-1', brandId: 'brand-a' }, { poNumber: 'PO-2', brandId: 'brand-a' }] }),
  crossTenant: checkConsolidatable({ brandId: 'brand-a', purchaseOrders: [
    { poNumber: 'PO-1', brandId: 'brand-a' }, { poNumber: 'PO-2', brandId: 'brand-b' }] }),
  duplicate: checkConsolidatable({ brandId: 'brand-a', purchaseOrders: [
    { poNumber: 'PO-1', brandId: 'brand-a' }, { poNumber: 'PO-1', brandId: 'brand-a' }] }),
  empty: checkConsolidatable({ brandId: 'brand-a', purchaseOrders: [] }),
  overLimit: checkConsolidatable({ brandId: 'brand-a', purchaseOrders:
    Array.from({ length: TRUCKLOAD_CONFIRMATION_LIMIT + 1 }, (_, i) => ({ poNumber: 'PO-' + i, brandId: 'brand-a' })) }),
  atLimit: checkConsolidatable({ brandId: 'brand-a', purchaseOrders:
    Array.from({ length: TRUCKLOAD_CONFIRMATION_LIMIT }, (_, i) => ({ poNumber: 'PO-' + i, brandId: 'brand-a' })) }),
};

console.log('__RESULT__' + JSON.stringify(out));
`;

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mercenta-providers-'));
const entryPath = path.join(tmpDir, 'entry.ts');
const outPath = path.join(tmpDir, 'bundle.mjs');
fs.writeFileSync(entryPath, ENTRY, 'utf8');

let result;
try {
  execFileSync(
    path.join(ROOT, 'node_modules/.bin/esbuild'),
    [
      entryPath,
      '--bundle',
      '--format=esm',
      '--platform=node',
      `--alias:@=${path.join(ROOT, 'src')}`,
      '--define:import.meta.env={}',
      `--outfile=${outPath}`,
      '--log-level=error',
    ],
    { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit'] }
  );
  const stdout = execFileSync(process.execPath, [outPath], { cwd: ROOT, encoding: 'utf8' });
  result = JSON.parse(stdout.split('__RESULT__')[1]);
} catch (error) {
  console.log(`  FAIL  bundling/executing the real modules — ${String(error).slice(0, 600)}`);
  console.log('');
  console.log('LOGISTICS_PROVIDERS_VALIDATION_FAIL (0 passed, 1 failed)');
  process.exit(1);
}

/* ── 1. the projection of the canonical owners ─────────────────────────────── */

console.log('§P10 — carrier provider configuration (the projection)');
check(
  'the declared carrier accounts are DHL + Palletline ONLY (decision 1)',
  JSON.stringify(result.accounts.declared) === JSON.stringify(['dhl', 'palletline']),
  JSON.stringify(result.accounts.declared)
);
check('a configuration exists for each declared account', result.accounts.count === 2, String(result.accounts.count));

const dhl = result.accounts.byCarrier.dhl;
const pll = result.accounts.byCarrier.palletline;
check(
  'DHL declares the international lane and parcel service',
  JSON.stringify(dhl.lanes) === JSON.stringify(['international']) &&
    JSON.stringify(dhl.services) === JSON.stringify(['parcel']),
  JSON.stringify({ lanes: dhl.lanes, services: dhl.services })
);
check(
  'Palletline declares the UK-domestic lane and palletised service',
  JSON.stringify(pll.lanes) === JSON.stringify(['uk_domestic']) &&
    JSON.stringify(pll.services) === JSON.stringify(['palletised']),
  JSON.stringify({ lanes: pll.lanes, services: pll.services })
);
check(
  'the ROUTING rule selects DHL for international and Palletline for UK domestic',
  JSON.stringify(dhl.routingLanes) === JSON.stringify(['international']) &&
    JSON.stringify(pll.routingLanes) === JSON.stringify(['uk_domestic']),
  JSON.stringify({ dhl: dhl.routingLanes, palletline: pll.routingLanes })
);
check(
  'each account keeps its canonical Mercenta account label',
  /DHL/.test(dhl.accountLabel) && /Palletline/.test(pll.accountLabel),
  `${dhl.accountLabel} | ${pll.accountLabel}`
);
check(
  'the provider id IS the carrier id (no mapping table)',
  dhl.providerId === 'dhl' && pll.providerId === 'palletline',
  `${dhl.providerId} | ${pll.providerId}`
);
check(
  'the configuration owner is MERCENTA and a brand cannot configure it',
  dhl.owner === 'mercenta' && dhl.brandConfigurable === false &&
    pll.owner === 'mercenta' && pll.brandConfigurable === false,
  JSON.stringify({ dhl: [dhl.owner, dhl.brandConfigurable], palletline: [pll.owner, pll.brandConfigurable] })
);
check(
  'the credential path is the Integrations Hub (never a second credential form)',
  /Integrations Hub/.test(dhl.controlPlane) && /credentials/.test(dhl.controlPlane) &&
    /Integrations Hub/.test(pll.controlPlane),
  `${dhl.controlPlane}`
);
check(
  'activation is stated as a credentials-only step (no code change)',
  /no code change/.test(dhl.activation) && /no code change/.test(pll.activation),
  dhl.activation
);
check(
  'the brand notice states the lane decides and Mercenta configures',
  /never selects or configures a carrier/.test(result.notice) &&
    /Mercenta holds and configures/.test(result.notice),
  result.notice
);

/* ── 2. fail-closed provider states ───────────────────────────────────────── */

console.log('§P10 — provider state is fail-closed and named');
const operationalModes = ['simulation', 'live'];
for (const [mode, entry] of Object.entries(result.states)) {
  if (['helperSimulation', 'helperAvailable', 'labelUnknown'].includes(mode)) continue;
  const expected = operationalModes.includes(mode);
  check(
    `mode "${mode}" → operational = ${expected}`,
    entry.operational === expected,
    `operational=${entry.operational}`
  );
  check(
    `mode "${mode}" is named truthfully ("${entry.label}")`,
    typeof entry.label === 'string' && entry.label.length > 8,
    entry.label
  );
  if (mode !== 'simulation') {
    check(
      `mode "${mode}" never presents the provider AS simulation`,
      !/^simulation/i.test(entry.label.trim()),
      entry.label
    );
  }
  if (mode !== 'live') {
    check(
      `mode "${mode}" never presents the provider AS live`,
      !/^live\b/i.test(entry.label.trim()) && !/verified connection/i.test(entry.label),
      entry.label
    );
  }
}
check(
  'the ONLY operational modes are simulation and live',
  result.states.helperSimulation === true && result.states.helperAvailable === false
);
check(
  'an unregistered provider resolves to unknown — never simulated',
  result.states.unknown.mode === 'not_registered' && result.states.unknown.operational === false,
  JSON.stringify(result.states.unknown)
);
check(
  'the unknown-state label says the provider is never treated as simulation',
  /never treated as simulation/.test(result.states.labelUnknown),
  result.states.labelUnknown
);

console.log('§P10 — the state basis is truthful');
check('a sandbox connection is stated as sandbox (→ simulation, never live)', /sandbox/i.test(result.basis.sandbox), result.basis.sandbox);
check('a verified connection is stated as verified non-sandbox', /verified non-sandbox/i.test(result.basis.verified), result.basis.verified);
check('a recorded failure is QUOTED, not generalised', /HTTP 401 unauthorized/.test(result.basis.failed), result.basis.failed);
check('an operator-disabled provider says so', /operator has disabled/i.test(result.basis.disabled), result.basis.disabled);
check('no connection record is stated as such', /No connection record/i.test(result.basis.none), result.basis.none);

/* ── 4. retired carriers ──────────────────────────────────────────────────── */

console.log('§P10 — retired carriers have no configuration (decision 1)');
check('fedex is refused BY NAME as retired', result.retired.fedex.threw === true && /retired/i.test(result.retired.fedex.message), result.retired.fedex.message);
check('bak is refused BY NAME as retired', result.retired.bak.threw === true && /retired/i.test(result.retired.bak.message), result.retired.bak.message);
check(
  'a carrier that is not a Mercenta account is refused as undeclared',
  result.retired.unknownAccount.threw === true && /not a declared Mercenta carrier account/i.test(result.retired.unknownAccount.message),
  result.retired.unknownAccount.message
);

/* ── 5. no cost leak ──────────────────────────────────────────────────────── */

console.log('§P10 — no cost leak into the logistics workspace');
check(
  'no configuration key carries a commercial term',
  [...dhl.commercialKeys, ...pll.commercialKeys].length === 0,
  JSON.stringify([...dhl.commercialKeys, ...pll.commercialKeys])
);
check(
  'the owner does not IMPORT the shipping commercial terms',
  !/import\s*\{[^}]*SHIPPING_COMMERCIAL_TERMS[^}]*\}\s*from\s*'@\/config\/shipping'/s.test(
    read('src/lib/shipping/providerConfiguration.ts')
  )
);
check(
  'the brand Hub renders no shipping commercial term',
  !/negotiatedDiscountPct|markUpPct|SHIPPING_COMMERCIAL_TERMS/.test(read('src/components/brand/LogisticsHub.tsx'))
);

/* ── 6/7/8. consolidation: deferred, documented, functional 1..n ──────────── */

console.log('§P10 — consolidation is RECORDED as deferred, and the model is 1..n');
const posture = result.posture;
check('the posture is DEFERRED (decision 11)', posture.status === 'deferred', posture.status);
check('the posture names the decision', /decision 11/i.test(posture.decision), posture.decision);
check(
  'today is stated as one purchase order = one consignment',
  /One purchase order = one consignment/.test(posture.today),
  posture.today
);
check('the model support is stated as 1..n purchase orders', /1\.\.n/.test(posture.modelSupports), posture.modelSupports);
check('the posture carries the three documented evidence entries', posture.evidence.length === 3, String(posture.evidence.length));
check(
  'the evidence records the shipment request purchaseOrders array',
  posture.evidence.some((e) => /"purchaseOrders"/.test(e)),
  posture.evidence.join(' | ')
);
check(
  'the evidence records the per-carton purchase-order reference',
  posture.evidence.some((e) => /per carton/.test(e)),
  posture.evidence.join(' | ')
);
check(
  'the evidence records the 100-confirmation truckload limit',
  posture.evidence.some((e) => /100 shipment confirmations/.test(e)) && result.truckload === 100,
  String(result.truckload)
);
/**
 * §P12 — REPOINTED (not weakened). OLD CONTRACT (recorded verbatim): *"activation is
 * declared as the channel shipment request (P12), not implemented here"* — asserted
 * only that the posture's `activation` string mentioned the shipment request and P12.
 *
 * P12 DELIVERED that activation (`src/lib/shipping/channelShipmentOperations.ts`
 * submits the declared 1..n purchase-order set through the SP-API seam), so the check
 * now asserts MORE: the activation names both the shipment request and P12 AND the
 * posture records the implemented half (`shipmentRequestImplemented === true`) while
 * the POSTURE ITSELF stays `deferred` (decision 11).
 */
check(
  'activation records the channel shipment request (P12) AND that P12 delivered it, with the posture still deferred',
  /shipment request/i.test(posture.activation) &&
    /P12/.test(posture.activation) &&
    posture.shipmentRequestImplemented === true &&
    posture.status === 'deferred',
  `${posture.activation} · shipmentRequestImplemented=${String(posture.shipmentRequestImplemented)} · status=${posture.status}`
);
check(
  'the tenant invariant is declared FIRST (never group across brands)',
  posture.invariants.length === 4 && /different brands/.test(posture.invariants[0]),
  posture.invariants[0]
);

check('a single-PO consignment is not grouped', result.declaration.single.grouped === false && result.declaration.single.poNumbers.length === 1, JSON.stringify(result.declaration.single.poNumbers));
check('a 1..n declaration IS supported: three POs normalise and group', result.declaration.grouped.grouped === true && JSON.stringify(result.declaration.grouped.poNumbers) === JSON.stringify(['PO-9002', 'PO-9003', 'PO-9004']), JSON.stringify(result.declaration.grouped));
check('an empty declaration is refused', result.declaration.empty.threw === true, result.declaration.empty.message);
check('a duplicated extra PO is refused', result.declaration.duplicateExtra.threw === true && /Duplicate/.test(result.declaration.duplicateExtra.message), result.declaration.duplicateExtra.message);
check('re-declaring the consignment\'s own PO is refused', result.declaration.duplicateOwn.threw === true && /Duplicate/.test(result.declaration.duplicateOwn.message), result.declaration.duplicateOwn.message);

check('a same-brand grouping passes the pre-condition', result.checks.ok.ok === true && result.checks.ok.poNumbers.length === 2, JSON.stringify(result.checks.ok));
check('a CROSS-TENANT grouping is refused', result.checks.crossTenant.ok === false && /another brand/.test(result.checks.crossTenant.error), result.checks.crossTenant.error);
check('a duplicate purchase order is refused', result.checks.duplicate.ok === false && /declared twice/.test(result.checks.duplicate.error), result.checks.duplicate.error);
check('an empty grouping is refused', result.checks.empty.ok === false, result.checks.empty.error);
check('the truckload limit is enforced above it', result.checks.overLimit.ok === false && /limit of 100/.test(result.checks.overLimit.error), result.checks.overLimit.error);
check('the truckload limit itself is allowed', result.checks.atLimit.ok === true, JSON.stringify(result.checks.atLimit).slice(0, 80));

/* ── 9. the surfaces are wired to the owners ──────────────────────────────── */

console.log('§P10 — the surfaces are wired to the ONE owners');
const queueSource = read('src/components/shared/logistics/PoDocumentQueuePanel.tsx');
const brandSource = read('src/components/brand/LogisticsHub.tsx');
const adminSource = read('src/components/admin/LogisticsControl.tsx');
const shellSource = read('src/components/layout/AdminShell.tsx');
const providerPanel = read('src/components/shared/logistics/CarrierProviderConfigurationPanel.tsx');
const consolidationPanel = read('src/components/shared/logistics/ConsolidationPosturePanel.tsx');

check('the queue renders the SAME pack component (one renderer)', /PoDocumentPackPanel/.test(queueSource));
check(
  'the queue derives its rows from the ONE download rule (not a second definition)',
  /documentsAwaitingDownload/.test(queueSource) && !/status === 'accepted'/.test(queueSource)
);
check(
  'the nav badge and the notification centre still share that same ONE rule',
  /documentsAwaitingDownload/.test(read('src/lib/nav/navBadges.ts')) &&
    /documentsAwaitingDownload/.test(read('src/components/shared/NotificationCenter.tsx'))
);
check(
  'the BRAND queue is fed TENANT-SCOPED purchase orders (scopedPos)',
  /pos=\{scopedPos\}/.test(brandSource)
);
/**
 * §BATCH 2 (2026-10-10) — REPOINTED (rule 08, removal coherence: the check that ASSERTS
 * the removed card exists is REWRITTEN into an ABSENCE GUARD — never deleted, never
 * weakened). The owner instructed removal of the "Consolidation" card from BOTH logistics
 * workspaces. The owner lib `src/lib/shipping/consolidation.ts` and the retained (now
 * unmounted) `ConsolidationPosturePanel` STAY, because decision 11 is a recorded Founder
 * decision ("deferred, not designed out") — removing a card is not removing a decision.
 * So each surface now wires its TWO remaining owners AND must render NO consolidation card.
 */
check(
  'the brand Hub wires its two remaining owners (queue, provider configuration)',
  /PoDocumentQueuePanel/.test(brandSource) &&
    /carrierProviderConfigurations/.test(brandSource) &&
    /CarrierProviderConfigurationPanel/.test(brandSource) &&
    /scope="brand"/.test(brandSource)
);
check(
  'the admin Hub wires the same two owners in the operator scope',
  /PoDocumentQueuePanel/.test(adminSource) &&
    /carrierProviderConfigurations/.test(adminSource) &&
    /CarrierProviderConfigurationPanel/.test(adminSource) &&
    /scope="admin"/.test(adminSource)
);
/* ── 9a. §BATCH 2 ABSENCE GUARDS — the removed Consolidation card is GONE ─────────── */
check(
  'ABSENCE GUARD — the brand Hub renders NO Consolidation card and mounts no ConsolidationPosturePanel',
  !/ConsolidationPosturePanel/.test(brandSource) && !/title="Consolidation"/.test(brandSource)
);
check(
  'ABSENCE GUARD — the admin Hub renders NO Consolidation card and mounts no ConsolidationPosturePanel',
  !/ConsolidationPosturePanel/.test(adminSource) && !/title="Consolidation"/.test(adminSource)
);
check(
  'the deferred decision is RETAINED in its owner lib (decision 11 — deferred, not designed out)',
  /CONSOLIDATION_POSTURE/.test(read('src/lib/shipping/consolidation.ts'))
);
check(
  'the admin provider configuration offers a REAL, RBAC-gated hand-off to the Integrations view',
  /onOpenIntegrations/.test(adminSource) &&
    /onOpenIntegrations=\{isSuper \? \(\) => setAdminView\('integrations'\) : undefined\}/.test(shellSource) &&
    /adminView === 'integrations'/.test(shellSource) &&
    /IntegrationsPanel/.test(shellSource) &&
    /data-handoff=\{onOpenIntegrations \? 'available' : 'role_restricted'\}/.test(providerPanel)
);
check(
  'the provider panel renders the owner record and adds no mode of its own',
  /CarrierProviderConfiguration/.test(providerPanel) &&
    !/modeForState|defaultIntegrationMode|resolveProviderMode/.test(providerPanel)
);
check(
  'the consolidation panel renders the owner posture',
  /CONSOLIDATION_POSTURE/.test(consolidationPanel) && /consignmentPurchaseOrders/.test(consolidationPanel)
);
check(
  'the provider configuration panel states the provider decline rule (availability is not eligibility)',
  /availability is never eligibility/.test(providerPanel)
);

/* ── 10. no placeholders, no network ──────────────────────────────────────── */

console.log('§P10 — no placeholders, zero network calls');
const newSources = {
  'src/lib/shipping/providerConfiguration.ts': read('src/lib/shipping/providerConfiguration.ts'),
  'src/lib/shipping/consolidation.ts': read('src/lib/shipping/consolidation.ts'),
  'src/components/shared/logistics/PoDocumentQueuePanel.tsx': queueSource,
  'src/components/shared/logistics/CarrierProviderConfigurationPanel.tsx': providerPanel,
  'src/components/shared/logistics/ConsolidationPosturePanel.tsx': consolidationPanel,
};
for (const [file, source] of Object.entries(newSources)) {
  check(`${file} contains no TODO/FIXME placeholder`, !/TODO|FIXME/.test(source));
  check(`${file} makes no network call`, !/fetch\(|XMLHttpRequest|axios/.test(source));
}

console.log('');
if (fail === 0) {
  console.log(`LOGISTICS_PROVIDERS_VALIDATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
}
console.log(`LOGISTICS_PROVIDERS_VALIDATION_FAIL (${pass} passed, ${fail} failed)`);
for (const error of errors) console.log(`  · ${error}`);
process.exit(1);
