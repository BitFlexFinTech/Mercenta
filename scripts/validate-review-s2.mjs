// Stage 2 (review pass) validation: clause-block contract variants driven by
// fulfillment track + amendment flow + wizard renders the selection step.
import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

try {
  const ag = await server.ssrLoadModule('/src/lib/agreement.ts');
  const ct = await server.ssrLoadModule('/src/lib/contracts.ts');

  const base = {
    businessName: 'Acme Organics Ltd',
    commissionRate: 12,
    monthlyFee: 250,
    category: 'Health & Personal Care',
  };

  // ── Clause variants ──
  const direct = ag.buildDistributionAgreement({ ...base, fulfillmentTrack: 'direct_fulfillment' });
  const financed = ag.buildDistributionAgreement({ ...base, fulfillmentTrack: 'financed' });

  test('direct variant: ships to UK fulfilment centre (generic wording, no channel name)',
    direct.includes('UK fulfilment centre') && !/amazon/i.test(direct));
  test('direct variant: remits brand share less performance fee within business days',
    direct.includes('Retail Performance Fee') && direct.includes('10 business days'));
  test('direct variant does NOT contain Ex-Works purchase language',
    !direct.includes('purchases inventory at agreed'));

  test('financed variant: Ex-Works purchase + nominated account remittance',
    /Ex-Works\s+pricing/.test(financed) && /nominated\s+account/.test(financed));
  test('financed variant does NOT contain fulfilment-centre shipping language',
    !financed.includes('UK fulfilment centre'));

  for (const [label, doc] of [['direct', direct], ['financed', financed]]) {
    test(`${label} variant keeps shared clauses`,
      doc.includes('APPOINTMENT') && doc.includes('IMPORTER OF RECORD') &&
        doc.includes('COMPLIANCE GATE') && doc.includes('Acme Organics Ltd'));
    test(`${label} variant wording-safe`,
      !/vendor central|amazon vendor/i.test(doc));
  }

  // Regeneration pulls the updated clause when the track changes.
  const regenerated = ag.buildDistributionAgreement({ ...base, fulfillmentTrack: 'financed' });
  test('regenerating with new track swaps the payment clause',
    regenerated.includes('Ex-Works pricing') && !regenerated.includes('UK fulfilment centre'));

  // ── Amendment flow ──
  const signedContract = {
    id: 'contract-x', brandId: 'b1', type: 'distribution_agreement',
    status: 'signed', commissionRate: 12, monthlyFee: 250,
    fulfillmentTrack: 'direct_fulfillment', effectiveDate: '2026-01-01',
    renewalDate: '2027-01-01', documentUrl: '', signatories: [], version: 2,
  };
  test('signed contract with changed track → mismatch detected',
    ct.trackMismatch(signedContract, 'financed') === true);
  test('same-track signed contract → no mismatch',
    ct.trackMismatch(signedContract, 'direct_fulfillment') === false);
  const draftMismatch = { ...signedContract, status: 'draft' };
  test('draft contract never triggers amendment flow',
    ct.trackMismatch(draftMismatch, 'financed') === false);

  const amendment = ct.createTrackAmendment(signedContract, 'financed');
  test('amendment issued as rate_card_addendum draft, version bumped, track updated',
    amendment.type === 'rate_card_addendum' && amendment.status === 'draft' &&
      amendment.version === 3 && amendment.fulfillmentTrack === 'financed' &&
      amendment.signatories.length === 0 && amendment.id !== signedContract.id);

  // ── Wizard renders the Fulfillment Track step (step 4 of the 5-step wizard) ──
  const g = await server.ssrLoadModule('/src/context/GlobalStateContext.tsx');
  const w = await server.ssrLoadModule('/src/components/brand/OnboardingWizard.tsx');
  const html = renderToString(
    createElement(g.AppProvider, null, createElement(w.OnboardingWizard, { initialStep: 4 }))
  );
  test('wizard shows Fulfillment Track selector', html.includes('Fulfillment Track'));
  /* §Batch 2p (`AV-025`) — REPOINTED: the track's label is now the ONE OWNER's
     "Brand-direct supply" (never the retail channel's programme name). */
  test('wizard shows both model options', html.includes('Brand-direct supply') && html.includes('Financed'));
  test('wizard explains amendment-not-silent-edit policy',
    /formal\s+amendment/.test(html));

  console.log(failures === 0 ? 'STAGE2_REVIEW_PASS' : `STAGE2_REVIEW_FAIL (${failures} failures)`);
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;
