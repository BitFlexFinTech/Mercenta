// Stage 5 validation: exercises the §3 compliance gate — agreement template
// generation, gate decision logic, and the catalog submission rejection path.
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

try {
  const agreement = await server.ssrLoadModule('/src/lib/agreement.ts');
  const compliance = await server.ssrLoadModule('/src/lib/compliance.ts');
  const api = await server.ssrLoadModule('/src/data/api.ts');

  const text = agreement.buildDistributionAgreement({
    businessName: 'Acme Organics Ltd',
    commissionRate: 12,
    monthlyFee: 250,
    category: 'Health & Personal Care',
  });

  const safeWording =
    text.includes('direct UK retail placement') &&
    !/vendor central|amazon vendor/i.test(text);
  const merged = text.includes('Acme Organics Ltd') && text.includes('12%') && text.includes('GBP 250');
  console.log('agreement wording-safe:', safeWording);
  console.log('agreement merges brand/rate/fee:', merged);

  const { evaluateComplianceGate, REQUIRED_DOCUMENT_TYPES } = compliance;
  // §Batch-5 — distribution_agreement gate now checks the Contract, not a ComplianceDocument.
  // Pass hasSignedAgreement=true to indicate a signed contract exists.
  const cleared = evaluateComplianceGate(
    REQUIRED_DOCUMENT_TYPES.map((t) => ({ type: t, status: 'approved' })),
    true // hasSignedAgreement
  );
  const blocked = evaluateComplianceGate([
    { type: 'letter_of_authorization', status: 'approved' },
    { type: 'product_safety_ukca', status: 'under_review' },
    // insurance_certificate missing entirely
    // distribution_agreement handled by contracts, so pass false for no signed contract
  ], false /* no signed agreement */);
  console.log('gate clears when all approved:', cleared.cleared === true);
  console.log(
    'gate blocks with missing+blocking:',
    blocked.cleared === false &&
      blocked.missing.includes('insurance_certificate') &&
      blocked.missing.includes('distribution_agreement') &&
      blocked.blocking.some((b) => b.type === 'product_safety_ukca')
  );

  // Submission path: real demo-store brands — zambezi cleared (all-approved
  // pattern), nordhaus blocked (under_review + missing docs).
  const okSubmit = await api.submitCatalogItem('brand-zambezi', {
    commodityCode: '3304990090',
    vatStatus: 'Standard 20%',
    hazmat: false,
    length: 10,
    width: 10,
    height: 20,
    weight: 1,
  });
  const blockedSubmit = await api.submitCatalogItem('brand-nordhaus', {
    commodityCode: '1515906010',
    vatStatus: 'Zero-rated',
    hazmat: false,
    length: 5,
    width: 5,
    height: 10,
    weight: 0.2,
  });
  const missingFields = await api.submitCatalogItem('brand-zambezi', {
    commodityCode: '',
    vatStatus: '',
    hazmat: false,
    length: 1,
    width: 1,
    height: 1,
    weight: 1,
  });
  console.log('cleared brand submits ok:', okSubmit.ok === true);
  console.log('blocked brand rejected (gate):', blockedSubmit.ok === false && blockedSubmit.reason === 'COMPLIANCE_GATE_BLOCKED');
  console.log('missing required fields rejected:', missingFields.ok === false && /Missing required fields/.test(missingFields.reason ?? ''));

  const pass =
    safeWording && merged &&
    cleared.cleared === true &&
    blocked.cleared === false && blocked.missing.includes('insurance_certificate') && blocked.missing.includes('distribution_agreement') &&
    okSubmit.ok === true &&
    blockedSubmit.ok === false && blockedSubmit.reason === 'COMPLIANCE_GATE_BLOCKED' &&
    missingFields.ok === false;

  console.log(pass ? 'STAGE5_VALIDATION_PASS' : 'STAGE5_VALIDATION_FAIL');
} finally {
  await server.close();
}
