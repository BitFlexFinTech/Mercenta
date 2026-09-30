#!/usr/bin/env node
/**
 * §M2 — DOCUMENT VERIFICATION validator.
 *
 * Proves the compliance-document verification lifecycle against the REAL domain
 * modules (no mocks of the modules under test):
 *
 *   A. REQUIREMENTS — category-aware, universal + conditional rules; narrowing
 *      only when the platform positively knows a condition does not apply
 *      (fail-closed default); the three universal documents are never conditional.
 *   B. PROVIDER SEAM — interchangeable provider selection; automated structural
 *      rules are REAL and explicitly NOT external; the simulation seam is only
 *      reachable in a positively-identified `simulation` mode; every other mode
 *      is fail-closed (unavailable → manual review) and never simulates.
 *   C. LIFECYCLE — submit → pending; automated pass → approved; automated fail →
 *      rejected; manual review (approve/reject) with recorded identity; a manual
 *      approval CANNOT bypass the document requirement; replacement creates the
 *      next version and supersedes (never deletes) the previous one; the hard
 *      gate stays blocked until every requirement is verified.
 *   D. GOVERNANCE — tenant isolation, full audit trail, and NO claim of external
 *      verification anywhere.
 *
 * Usage: node scripts/validate-document-verification.mjs
 * Exit code: 0 if all checks pass, 1 on failure.
 */
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
};

try {
  const compliance = await server.ssrLoadModule('/src/lib/compliance.ts');
  const verification = await server.ssrLoadModule('/src/lib/verification/documentVerification.ts');
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');

  const TENANT = 'brand-lecreuset';
  const OPS = { staffId: 'validator-operator', canMutate: true };
  const BRAND = { staffId: 'brand', canMutate: true, tenantId: TENANT };
  const VIEW_ONLY = { staffId: 'view', canMutate: false, tenantId: TENANT };

  /* ── A. REQUIREMENTS ─────────────────────────────────────────────────── */
  console.log('\n── A. Requirements (category-aware, conditional, fail-closed) ──');

  const kitchen = compliance.getComplianceRequirements('Kitchen');
  test('universal requirements are the three base documents',
    kitchen.filter((r) => r.scope === 'universal').length === 3 &&
      compliance.BASE_REQUIRED_DOCUMENTS.every((t) =>
        kitchen.some((r) => r.type === t && r.scope === 'universal')));
  test('Kitchen adds exactly one conditional category requirement',
    kitchen.filter((r) => r.scope === 'conditional').length === 1 &&
      kitchen.some((r) => r.type === 'food_contact_material' && r.condition === 'touchesFood'));
  test('Office Products has NO category requirement (base only)',
    compliance.getRequiredDocumentsForCategory('Office Products').length === 3);
  test('every requirement states WHY it is required',
    kitchen.every((r) => typeof r.rationale === 'string' && r.rationale.length > 20));
  test('with NO product context the conditional rule still applies (fail-closed)',
    compliance.getRequiredDocumentsForContext('Kitchen').length === 4 &&
      compliance.getRequiredDocumentsForContext('Kitchen', { touchesFood: undefined }).length === 4);
  test('a positively-known non-applicable condition NARROWS the requirement',
    compliance.getRequiredDocumentsForContext('Kitchen', { touchesFood: false }).length === 3 &&
      !compliance.getRequiredDocumentsForContext('Kitchen', { touchesFood: false })
        .includes('food_contact_material'));
  test('a positively-applicable condition keeps the requirement',
    compliance.getRequiredDocumentsForContext('Kitchen', { touchesFood: true })
      .includes('food_contact_material'));
  /* ── B. PROVIDER SEAM ────────────────────────────────────────────────── */
  console.log('\n── B. Provider seam (interchangeable, fail-closed) ───────────');

  const simSel = verification.selectDocumentVerificationProvider({ mode: 'simulation' });
  test('positively-identified simulation selects the simulation seam',
    simSel.provider.id === 'simulated_document_verification' &&
      simSel.provider.simulated === true && simSel.provider.external === false);
  test('the simulation seam is never presented as LIVE/external',
    simSel.provider.simulated === true && simSel.provider.method === 'automated');

  const liveSel = verification.selectDocumentVerificationProvider({ mode: 'live' });
  test('live mode selects the automated structural rule engine',
    liveSel.provider.id === 'internal_structural_rules' &&
      liveSel.provider.method === 'automated');
  test('the automated rule engine claims NO external verification',
    liveSel.provider.external === false && liveSel.provider.authoritative === true);

  const manualSel = verification.selectDocumentVerificationProvider({ mode: 'unknown', method: 'manual' });
  test('an explicit manual request always resolves to the operator provider',
    manualSel.provider.id === 'manual_mercenta_admin' &&
      manualSel.provider.method === 'manual' && manualSel.provider.source === 'manual_operator');

  for (const mode of ['unknown', 'not_registered', 'available', 'configuring', 'disabled', 'degraded', 'error']) {
    const sel = verification.selectDocumentVerificationProvider({ mode });
    test(`FAIL-CLOSED: mode "${mode}" resolves to the unavailable provider`,
      sel.provider.id === 'unavailable_document_verification' &&
        sel.provider.available === false && sel.provider.authoritative === false,
      sel.provider.id);
  }

  test('the unavailable provider refuses and claims nothing',
    await (async () => {
      const sel = verification.selectDocumentVerificationProvider({ mode: 'available' });
      const v = await sel.provider.verify({
        documentId: 'x', brandId: 'x', documentType: 'insurance_certificate', documentVersion: 1,
      });
      return v.result === 'refused' && v.status === 'unavailable' && !v.evidenceReference;
    })());

  test('structural rules PASS a complete, in-date document',
    await (async () => {
      const v = await liveSel.provider.verify({
        documentId: 'd', brandId: 'b', documentType: 'insurance_certificate', documentVersion: 1,
        fileUrl: 'simulated://x', reference: 'POL-123456', issuer: 'Example Insurers Ltd',
        expiryDate: '2099-01-01',
      });
      return v.result === 'pass' && v.status === 'verified';
    })());
  test('structural rules FAIL a document with no artefact',
    await (async () => {
      const v = await liveSel.provider.verify({
        documentId: 'd', brandId: 'b', documentType: 'insurance_certificate', documentVersion: 1,
      });
      return v.result === 'fail' && /no document artefact/.test(v.failureReason ?? '');
    })());
  test('structural rules FAIL an expired document',
    await (async () => {
      const v = await liveSel.provider.verify({
        documentId: 'd', brandId: 'b', documentType: 'insurance_certificate', documentVersion: 1,
        reference: 'POL-123456', issuer: 'Example Insurers Ltd', expiryDate: '2000-01-01',
      });
      return v.result === 'fail' && /expired/.test(v.failureReason ?? '');
    })());
  test('structural rules FAIL a malformed reference',
    await (async () => {
      const v = await liveSel.provider.verify({
        documentId: 'd', brandId: 'b', documentType: 'letter_of_authorization', documentVersion: 1,
        reference: 'x', issuer: 'Example Issuer',
      });
      return v.result === 'fail' && /reference/.test(v.failureReason ?? '');
    })());
  test('a manual decision with no operator identity is REFUSED',
    await (async () => {
      const v = await manualSel.provider.verify({
        documentId: 'd', brandId: 'b', documentType: 'letter_of_authorization', documentVersion: 1,
        fileUrl: 'simulated://x',
      });
      return v.result === 'refused' && v.status === 'manual_review_required';
    })());

  test('category requirement counts are unchanged from the canonical map',
    compliance.getRequiredDocumentsForContext('Automotive').length === 4 &&
      compliance.getRequiredDocumentsForContext('Grocery').length === 4 &&
      compliance.getRequiredDocumentsForContext('Apparel').length === 4);

  /* ── C. LIFECYCLE ────────────────────────────────────────────────────── */
  console.log('\n── C. Lifecycle (submit → verify → reject → replace → gate) ──');

  const required = compliance.getRequiredDocumentsForCategory('Kitchen');
  const docsFor = () => store.demoComplianceDocs.filter((d) => d.brandId === TENANT);
  const latest = () => compliance.latestDocumentsByType(docsFor());
  const evidence = (type) => ({
    fileUrl: `simulated://compliance/${TENANT}/${type}`,
    reference: `SIM-${type.toUpperCase()}-VALIDATOR`,
    issuer: 'Simulated issuing body (no external provider)',
  });
  const simMode = { getMode: () => 'simulation' };
  const unknownMode = { getMode: () => 'unknown' };

  // Every required document is submitted (upload → under_review + pending).
  for (const type of required) {
    const doc = latest().get(type);
    if (!doc) continue;
    const submitted = verification.submitDocumentForVerification(doc.id, BRAND);
    if (submitted.ok) Object.assign(doc, evidence(type));
  }
  const pending = store.demoDocumentVerifications.filter((r) => r.status === 'pending');
  test('every submission creates a PENDING verification record',
    pending.length === required.length, `${pending.length}/${required.length}`);
  test('a submission sets the document to under_review (never approved)',
    required.every((t) => latest().get(t)?.status === 'under_review'));
  const gateAfterSubmit = compliance.evaluateComplianceGate(docsFor(), undefined, true, true, true);
  test('the HARD GATE blocks after submission but before verification',
    gateAfterSubmit.cleared === false);

  // Automated FAILURE on one requirement.
  const failType = required[required.length - 1];
  const failDoc = latest().get(failType);
  const failedRun = await verification.verifyDocumentVersion(failDoc.id, OPS, {
    ...simMode, simulateFailure: true,
  });
  test('an automated failure REJECTS the document',
    failedRun.ok && failedRun.value.result === 'fail' && failDoc.status === 'rejected',
    failedRun.ok ? `${failedRun.value.status}/${failDoc.status}` : failedRun.error);
  test('a rejected document still blocks the gate',
    compliance.evaluateComplianceGate(docsFor(), undefined, true, true, true).cleared === false);
  test('the rejection records the failure reason and the verifier identity',
    !!failedRun.value.failureReason && !!failedRun.value.verifierIdentity);

  // A rejected requirement is replaced by the NEXT version.
  const rejectedVersion = failDoc.version ?? 1;
  const replaced = verification.replaceComplianceDocument({
    documentId: failDoc.id,
    actor: BRAND,
    reason: 'Validator drill: replacement of a rejected document.',
    ...evidence(failType),
  });
  test('a rejected document is REPLACEABLE',
    replaced.ok === true, replaced.ok ? '' : replaced.error);
  test('the replacement is the NEXT version and supersedes the previous record',
    replaced.ok && replaced.value.version === rejectedVersion + 1 &&
      failDoc.status === 'superseded' &&
      replaced.value.newDocument.supersedesDocumentId === failDoc.id);
  test('the superseded version is RETAINED (never deleted)',
    docsFor().some((d) => d.id === failDoc.id && d.status === 'superseded'));
  test('the previous verification records are marked superseded, not removed',
    store.demoDocumentVerifications.some((r) => r.documentId === failDoc.id && r.superseded === true));
  test('an unverified replacement still blocks the gate',
    compliance.evaluateComplianceGate(docsFor(), undefined, true, true, true).cleared === false);
  test('the gate reads the LATEST version, not the superseded one',
    compliance.latestDocumentsByType(docsFor()).get(failType)?.id ===
      replaced.value.newDocument.id);


  // AUTOMATED PASS on every requirement (simulation mode).
  for (const type of required) {
    const doc = latest().get(type);
    const res = await verification.verifyDocumentVersion(doc.id, OPS, simMode);
    if (!res.ok) test(`verify ${type}`, false, res.error);
  }
  test('automated verification PASSES every requirement in simulation mode',
    required.every((t) => latest().get(t)?.status === 'approved'),
    required.map((t) => `${t}:${latest().get(t)?.status}`).join(','));
  test('the gate CLEARS only once every requirement is verified',
    compliance.evaluateComplianceGate(docsFor(), undefined, true, true, true).cleared === true);
  test('an automated verdict carries provider identity, mode and a simulated marker',
    await (async () => {
      const res = await verification.verifyDocumentVersion(
        latest().get(required[0]).id, OPS, simMode);
      return res.ok && res.value.simulated === true && res.value.external === false &&
        res.value.providerId === 'simulated_document_verification' &&
        res.value.providerMode === 'simulation' &&
        String(res.value.evidenceReference ?? '').startsWith('SIM-DOC-VERIFY');
    })());

  // Manual review is a first-class path.
  store.resetDocumentVerifications();
  const manualTarget = latest().get(required[0]);
  await verification.submitDocumentForVerification(manualTarget.id, BRAND);
  const manualApprove = await verification.recordManualDocumentVerification(
    manualTarget.id, OPS, 'approve', 'Validator: operator reviewed the document.');
  test('a manual approval clears the requirement and records WHO verified it',
    manualApprove.ok && manualTarget.status === 'approved' &&
      manualApprove.value.method === 'manual' &&
      manualApprove.value.source === 'manual_operator' &&
      manualApprove.value.external === false &&
      /validator-operator/.test(manualApprove.value.verifierIdentity),
    manualApprove.ok ? manualApprove.value.verifierIdentity : manualApprove.error);

  const rejectTarget = latest().get(required[1]);
  await verification.submitDocumentForVerification(rejectTarget.id, BRAND);
  const manualReject = await verification.recordManualDocumentVerification(
    rejectTarget.id, OPS, 'reject', 'Validator: operator rejected the document.');
  test('a manual rejection moves the document to rejected with the reason recorded',
    manualReject.ok && rejectTarget.status === 'rejected' &&
      /rejected/.test(manualReject.value.failureReason ?? ''));
  test('manual verification requires a recorded reason',
    (await verification.recordManualDocumentVerification(rejectTarget.id, OPS, 'approve', '')).ok === false);

  // Manual approval must NOT bypass the document requirement.
  const noArtefactId = `doc-validator-bare-${TENANT}`;
  store.demoComplianceDocs.push({
    id: noArtefactId, brandId: TENANT, type: 'insurance_certificate',
    status: 'under_review', version: 9,
  });
  const bypass = await verification.recordManualDocumentVerification(
    noArtefactId, OPS, 'approve', 'Validator: approving a requirement with no artefact.');
  const bareDoc = store.demoComplianceDocs.find((d) => d.id === noArtefactId);
  test('MANUAL APPROVAL CANNOT BYPASS the document requirement',
    bypass.ok && bypass.value.result === 'fail' && bareDoc.status !== 'approved',
    `result=${bypass.ok ? bypass.value.result : bypass.error} status=${bareDoc.status}`);


  /* ── D. GOVERNANCE ───────────────────────────────────────────────────── */
  console.log('\n── D. Governance (isolation, audit, no external claims) ───────');

  const foreign = verification.resolveComplianceDocument(
    latest().get(required[0]).id,
    { staffId: 'brand', canMutate: true, tenantId: 'brand-tapatio' });
  test("a brand cannot reach another tenant's compliance document",
    foreign.ok === false && foreign.crossTenant === true, foreign.error);
  const viewOnlySubmit = verification.submitDocumentForVerification(
    latest().get(required[0]).id, VIEW_ONLY);
  test('a view-only account cannot submit a document for verification',
    viewOnlySubmit.ok === false, viewOnlySubmit.error);
  const foreignReplace = verification.replaceComplianceDocument({
    documentId: latest().get(required[0]).id,
    actor: { staffId: 'brand', canMutate: true, tenantId: 'brand-tapatio' },
    reason: 'validator cross-tenant drill',
  });
  test("a brand cannot replace another tenant's document",
    foreignReplace.ok === false && foreignReplace.crossTenant === true);

  const auditActions = store.demoAuditLog.map((a) => a.action);
  test('submission, verdicts, rejection and replacement are all audited',
    auditActions.includes('compliance_document_verification_requested') &&
      auditActions.includes('compliance_document_verified') &&
      auditActions.includes('compliance_document_rejected') &&
      auditActions.includes('compliance_document_replaced'),
    auditActions.filter((a) => a.startsWith('compliance_document')).join(','));
  test('every compliance audit row carries the tenant and the actor',
    store.demoAuditLog
      .filter((a) => a.action.startsWith('compliance_document'))
      .every((a) => !!a.brandId && !!a.actorId));

  test('NO verification record claims an external provider verified a document',
    store.demoDocumentVerifications.every((r) => r.external === false));
  test('every verdict records providerId, providerMode, method and result',
    store.demoDocumentVerifications.filter((r) => r.status !== 'pending')
      .every((r) => !!r.providerId && !!r.providerMode && !!r.method && !!r.result));
  test('FAIL-CLOSED: an unknown provider mode changes NO document state',
    await (async () => {
      store.resetDocumentVerifications();
      const target = latest().get(required[0]);
      await verification.submitDocumentForVerification(target.id, BRAND);
      const before = target.status;
      const res = await verification.verifyDocumentVersion(target.id, OPS, unknownMode);
      return res.ok && res.value.status === 'unavailable' &&
        res.value.result === 'refused' && target.status === before &&
        res.value.external === false && res.value.simulated === false;
    })());
  test('FAIL-CLOSED: an unknown provider mode never simulates a verdict',
    await (async () => {
      const res = await verification.verifyDocumentVersion(
        latest().get(required[0]).id, OPS, unknownMode);
      return res.ok && res.value.simulated === false &&
        res.value.providerId === 'unavailable_document_verification';
    })());
  test('verification records are tenant-scoped read models',
    verification.listVerificationsForBrand(TENANT).every((r) => r.brandId === TENANT) &&
      verification.listVerificationsForBrand('brand-tapatio').length === 0);

  const standing = verification.documentVerificationStanding(TENANT, 'Kitchen');
  test('the brand standing lists every requirement with its rationale and blocker',
    standing.requiredCount === required.length &&
      standing.rows.every((r) => !!r.rationale && !!r.label) &&
      standing.rows.filter((r) => r.status !== 'approved').every((r) => !!r.blockingReason),
    JSON.stringify(standing.rows.map((r) => `${r.type}:${r.status}`)));


} finally {
  await server.close();
}
console.log(failures === 0 ? 'ALL DOCUMENT-VERIFICATION CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
