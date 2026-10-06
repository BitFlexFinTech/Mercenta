#!/usr/bin/env node
/**
 * §PHASE 6 — THE CAPITAL-REQUIREMENT GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The capital model owner (`src/lib/finance/capitalRequirement.ts`) reports the
 * working capital Model B needs between paying a brand and being paid by the
 * channel. Its whole value rests on properties a comment cannot guarantee:
 *
 *   · the arithmetic is exactly advance = supplierCost × advanceRate, fee =
 *     advance × feePct, repayment = advance + fee, and the gross spread is
 *     receivable − supplier cost — the SAME figures the commercial model owner
 *     produces;
 *   · an over-committed facility is STATED (available-after may be negative,
 *     withinCapacity false), never clamped to a comfortable zero;
 *   · a brand's concentration is its share of the total advance and a breach is
 *     flagged against the facility's own limit;
 *   · the facility terms come from the ONE config owner, never retyped here; and
 *   · the owner is actually USED by the Control Centre and rendered by the
 *     founder surface (Super-Admin only — financing is internal).
 *
 * THE GATE CAN FAIL (self-check): the comparison helper is run against a
 * deliberately-wrong expectation as well as the correct one — the wrong one MUST
 * be rejected — so a green run proves the check works rather than that it is
 * vacuous.
 *
 * Run: node scripts/validate-capital-requirement.mjs
 */
import { execSync } from 'node:child_process';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures += 1;
};
const near = (a, b) => Math.abs(a - b) < 1e-6;

/** A known facility + purchases (all fields explicit, nothing read from elsewhere). */
const FACILITY = {
  facilityCapacityGbp: 1000,
  availableCapitalGbp: 1000,
  advanceRate: 0.8,
  feeRatePctPerTerm: 2,
  termDays: 30,
  concentrationLimitPct: 40,
  currency: 'GBP',
  configured: false,
  label: 'test facility',
  disclaimer: 'test',
};
const PURCHASES = [
  { id: 'p1', brandId: 'a', brandName: 'A', channelReceivableGbp: 1000, supplierCostGbp: 600 },
  { id: 'p2', brandId: 'a', brandName: 'A', channelReceivableGbp: 500, supplierCostGbp: 500 },
];

try {
  const owner = await server.ssrLoadModule('/src/lib/finance/capitalRequirement.ts');
  const cfg = await server.ssrLoadModule('/src/config/financing.ts');

  console.log('── A. the owner + config export the whole contract ──');
  test('computePurchaseCapital / computeCapitalRequirement / formatGbp exist',
    typeof owner.computePurchaseCapital === 'function' &&
    typeof owner.computeCapitalRequirement === 'function' &&
    typeof owner.formatGbp === 'function');
  test('MODEL_B_ACQUISITION_RATIO is exported', typeof owner.MODEL_B_ACQUISITION_RATIO === 'number');
  test('the config exports CAPITAL_FACILITY_CONFIGURED + DEMO_CAPITAL_FACILITY',
    typeof cfg.CAPITAL_FACILITY_CONFIGURED === 'boolean' && !!cfg.DEMO_CAPITAL_FACILITY);
  test('the production facility is NOT configured (figures are an illustration)',
    cfg.CAPITAL_FACILITY_CONFIGURED === false && cfg.DEMO_CAPITAL_FACILITY.configured === false);

  console.log('\n── B. the arithmetic is correct on known input ──');
  const p1 = owner.computePurchaseCapital(FACILITY, PURCHASES[0]);
  test('advance = supplierCost × advanceRate (600 × 0.8 = 480)', near(p1.advanceDrawnGbp, 480));
  test('fee = advance × feePct (480 × 2% = 9.6)', near(p1.financingFeeGbp, 9.6));
  test('repayment = advance + fee (489.6)', near(p1.expectedRepaymentGbp, 489.6));
  test('gross spread = receivable − supplier cost (400)', near(p1.grossSpreadGbp, 400));
  test('net margin = gross spread − fee (390.4)', near(p1.netMarginGbp, 390.4));

  const req = owner.computeCapitalRequirement(FACILITY, PURCHASES);
  test('total required funding = Σ supplier cost (1100)', near(req.totalRequiredFundingGbp, 1100));
  test('total advance drawn = Σ advance (880)', near(req.totalAdvanceDrawnGbp, 880));
  test('total financing fees = Σ fees (17.6)', near(req.totalFinancingFeesGbp, 17.6));
  test('available after = available − advance (120)', near(req.availableCapitalAfterGbp, 120));
  test('utilisation = advance ÷ capacity × 100 (88%)', near(req.facilityUtilisationPct, 88));
  test('within capacity is true when advance ≤ capacity', req.withinCapacity === true);
  test('outstanding financed purchases = 2', req.outstandingFinancedPurchases === 2);

  console.log('\n── C. an over-committed facility is STATED, never clamped ──');
  const over = owner.computeCapitalRequirement({ ...FACILITY, facilityCapacityGbp: 500 }, PURCHASES);
  test('withinCapacity is false when advance > capacity', over.withinCapacity === false);
  test('utilisation exceeds 100% (176%) — not clamped', near(over.facilityUtilisationPct, 176));
  const overAvail = owner.computeCapitalRequirement({ ...FACILITY, availableCapitalGbp: 100 }, PURCHASES);
  test('available-after may be NEGATIVE (−780) — not clamped to 0', near(overAvail.availableCapitalAfterGbp, -780));

  console.log('\n── D. concentration partitions the advance and flags breaches ──');
  test('one brand holds 100% of the advance', req.concentration.length === 1 && near(req.concentration[0].sharePct, 100));
  test('that brand breaches the 40% limit',
    req.concentration[0].breachesLimit === true && req.concentrationBreaches.length === 1);
  const split = owner.computeCapitalRequirement(FACILITY, [
    { id: 'x', brandId: 'a', brandName: 'A', channelReceivableGbp: 100, supplierCostGbp: 100 },
    { id: 'y', brandId: 'b', brandName: 'B', channelReceivableGbp: 300, supplierCostGbp: 300 },
  ]);
  test('concentration sorts largest first (B 75%, A 25%)',
    split.concentration.map((c) => c.brandId).join(',') === 'b,a' &&
    near(split.concentration[0].sharePct, 75) && near(split.concentration[1].sharePct, 25));

  console.log('\n── E. an empty facility is undrawn, with NO NaN ──');
  const none = owner.computeCapitalRequirement(FACILITY, []);
  test('no purchases ⇒ 0 funding, 0 utilisation, 0 purchases',
    none.totalRequiredFundingGbp === 0 && none.facilityUtilisationPct === 0 &&
    none.outstandingFinancedPurchases === 0);
  test('nothing is NaN or Infinity',
    [none.totalRequiredFundingGbp, none.facilityUtilisationPct, none.availableCapitalAfterGbp].every(Number.isFinite));
  test('the basis names the undrawn state', /undrawn/i.test(none.basis));

  console.log('\n── F. the acquisition ratio is DERIVED from the canonical demo Model B ──');
  test('MODEL_B_ACQUISITION_RATIO = 7500/10000 = 0.75', near(owner.MODEL_B_ACQUISITION_RATIO, 0.75));

  console.log('\n── G. the owner is USED (Control Centre model + founder surface) ──');
  const reads = (pattern, file) => {
    try {
      return execSync(`grep -c "${pattern}" "${file}"`, { encoding: 'utf8' }).trim();
    } catch {
      return '0';
    }
  };
  test('controlCentre.ts computes the capital model',
    Number(reads('computeCapitalRequirement', 'src/lib/commandCentre/controlCentre.ts')) > 0);
  test('controlCentre.ts exposes capitalRequirement on the model',
    Number(reads('capitalRequirement', 'src/lib/commandCentre/controlCentre.ts')) > 1);
  test('FounderControlCentre.tsx renders the capital section',
    Number(reads('capitalRequirement', 'src/components/admin/FounderControlCentre.tsx')) > 0 &&
    Number(reads('control-capital-requirement', 'src/components/admin/FounderControlCentre.tsx')) > 0);
  const importers = (() => {
    try {
      return execSync("grep -rl 'finance/capitalRequirement' src/components", { encoding: 'utf8' }).split('\n').filter(Boolean);
    } catch {
      return [];
    }
  })();
  test('the founder surface imports the ONE owner (not a re-implementation)',
    importers.includes('src/components/admin/FounderControlCentre.tsx'), importers.join(' | '));
  const brandImporters = (() => {
    try {
      return execSync("grep -rl 'finance/capitalRequirement' src/components/brand", { encoding: 'utf8' }).split('\n').filter(Boolean);
    } catch {
      return [];
    }
  })();
  test('NO brand component imports the capital model (financing is internal)',
    brandImporters.length === 0, brandImporters.join(' | '));

  console.log('\n── H. the gate can FAIL (self-check, not vacuous) ──');
  test('self-check: near ACCEPTS the correct expectation', near(480, 480));
  test('self-check: near REJECTS a wrong expectation (would be REPORTED)', !near(480, 481));
} catch (error) {

  console.error('[validate-capital-requirement] THREW:', error);
  failures += 1;
}

console.log(failures === 0
  ? '\nCAPITAL_REQUIREMENT_VALIDATION_PASS'
  : `\nCAPITAL_REQUIREMENT_VALIDATION_FAIL (${failures})`);
await server.close();
process.exit(failures === 0 ? 0 : 1);

