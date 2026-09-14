#!/usr/bin/env node
/**
 * §Phase E2E — DETERMINISTIC INVESTOR-DEMO validator.
 *
 * Runs the REAL `investorDemo` orchestration (no mocks of the orchestration
 * itself) and pins the investor-demo contract:
 *
 *   1. ZERO NETWORK — `globalThis.fetch` and `XMLHttpRequest` are instrumented;
 *      a completed run must produce exactly 0 calls.
 *   2. FULL LIFECYCLE — all 22 stages reach `ok` (no blocked/error stage).
 *   3. REAL CONSEQUENCES — canonical state changes are read back from the
 *      canonical stores (PO, shipment, invoice, payment, deduction, commission,
 *      payout audit, onboarding, compliance docs), and the money maths is
 *      asserted numerically.
 *   4. TENANT ISOLATION + RBAC — brand-pinned actors are refused cross-tenant
 *      reads, operator-only actions and mutation with a view-only account.
 *   5. FAIL-CLOSED — unknown/live integration modes and non-simulation social
 *      modes are never treated as simulation.
 *   6. DETERMINISM — reset → run → identical digest, and no duplicated records.
 *
 * Usage: node scripts/validate-investor-demo.mjs
 * Exit code: 0 if all checks pass, 1 on failure.
 */
import { createServer } from 'vite';

/* ── Network instrumentation (installed BEFORE the app is loaded) ─────────── */
let networkCalls = 0;
const realFetch = globalThis.fetch;
globalThis.fetch = (...args) => {
  networkCalls += 1;
  console.error('[validate-investor-demo] UNEXPECTED network call:', args[0]);
  return realFetch(...args);
};
if (typeof globalThis.XMLHttpRequest !== 'undefined') {
  const RealXhr = globalThis.XMLHttpRequest;
  globalThis.XMLHttpRequest = class extends RealXhr {
    open(...args) {
      networkCalls += 1;
      console.error('[validate-investor-demo] UNEXPECTED XHR:', args[0]);
      return super.open(...args);
    }
  };
}

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
};

try {
  const mod = await server.ssrLoadModule('/src/lib/simulation/investorDemo.ts');
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const acq = await server.ssrLoadModule('/src/data/acquisitionStore.ts');
  const compliance = await server.ssrLoadModule('/src/lib/compliance.ts');
  const verification = await server.ssrLoadModule('/src/lib/verification/documentVerification.ts');
  const api = await server.ssrLoadModule('/src/data/api.ts');

  const EXPECTED_STAGES = [
    'application', 'approval', 'onboarding',
    // §Phase M12 — REPOINTED. The contract this asserts is UNCHANGED (the demo
    // runs exactly the documented lifecycle, in order, and every stage is OK);
    // the lifecycle legitimately grew by one stage in M12 because the brand's
    // commercial relationship (§5) is now a first-class, brand-level concept and
    // must be demonstrated alongside both models (§19).
    'commercial_models',
    'compliance', 'catalogue',
    'purchase_order', 'acknowledgement', 'fulfilment', 'shipment', 'shipping_commercial',
    'delivery', 'returns', 'deductions', 'dispute', 'commission', 'payout',
    'crm', 'marketing', 'integrations', 'cases', 'social', 'rbac', 'audit', 'error_recovery',
  ];
  test('the stage vocabulary is the documented 25-stage lifecycle',
    mod.INVESTOR_DEMO_STAGES.length === EXPECTED_STAGES.length &&
    EXPECTED_STAGES.every((id, i) => mod.INVESTOR_DEMO_STAGES[i].id === id),
    mod.INVESTOR_DEMO_STAGES.map((s) => s.id).join(','));

  // ── Run 1 ────────────────────────────────────────────────────────────────
  mod.resetInvestorDemo();
  const callsBefore = networkCalls;
  const run = await mod.runInvestorDemo({ seed: 1 });
  const callsDuring = networkCalls - callsBefore;

  test('run reports simulation mode + deterministic',
    run.mode === 'simulation' && run.deterministic === true);
  test('run reports 0 network calls', run.networkCalls === 0 && callsDuring === 0, `observed ${callsDuring}`);
  test('every stage reached ok (no blocked/error)',
    run.summary.error === 0 && run.summary.blocked === 0 && run.summary.ok === EXPECTED_STAGES.length,
    JSON.stringify(run.summary));

  const byId = Object.fromEntries(run.stages.map((s) => [s.id, s]));
  test('the full lifecycle executed in order',
    EXPECTED_STAGES.every((id) => byId[id]?.status === 'ok'),
    run.stages
      .filter((s) => s.status !== 'ok')
      .map((s) => `${s.id}:${s.status}:${s.detail}`)
      .join(' | '));

  // ── §5/§19 M12 — the commercial-relationship stage's own evidence ────────
  const cm = byId.commercial_models;
  const cmFacts = cm?.facts ?? {};
  test('§5 the brand holds a recorded commercial relationship (from the seed)',
    cmFacts.model === 'commission_agent' && cmFacts.modelAAssignmentFromSeed === true,
    JSON.stringify(cmFacts));
  test('§19 Model A is exactly £10,000 at 20% → £2,000 Mercenta / £8,000 brand',
    cmFacts.modelACommissionGbp === 2000 && cmFacts.modelABrandGbp === 8000,
    JSON.stringify(cmFacts));
  test('§19 Model B is exactly £2,500 gross spread → £2,270 net after £230 of stated costs',
    cmFacts.modelBGrossSpreadGbp === 2500 &&
      cmFacts.modelBNetMarginGbp === 2270 &&
      cmFacts.modelBTotalCostsGbp === 230,
    JSON.stringify(cmFacts));
  test('§19 Brand B runs Model B from the seed (one source of truth)',
    cmFacts.modelBAssignmentFromSeed === true, JSON.stringify(cmFacts));
  test('§5 an unknown commercial model is REFUSED (fail-closed)',
    cmFacts.unknownModelRefused === true);
  test('§3 the commercial model cannot change the compliance requirements',
    cmFacts.complianceUnchangedByModel === true &&
      typeof cmFacts.applicableRequirements === 'number' &&
      cmFacts.applicableRequirements > 0,
    JSON.stringify(cmFacts));
  test('§5 the commercial-relationship write is audited on the canonical platform log',
    typeof cmFacts.auditedWrites === 'number' && cmFacts.auditedWrites >= 1,
    String(cmFacts.auditedWrites));
  test('§19 the shipping illustration is derived from the canonical terms (£30)',
    cmFacts.shippingGrossMarginGbp === 30, String(cmFacts.shippingGrossMarginGbp));

  // ── Real consequences, read back from the canonical stores ───────────────
  const tenantId = run.tenantId;
  const po = store.demoPurchaseOrders.find((p) => p.brandId === tenantId && p.simulated === true);
  test('the PO exists in the canonical store and is simulated', !!po && po.simulated === true);
  test('the PO was acknowledged and delivered',
    !!po?.acknowledgedAt && po?.status === 'delivered', po?.status);
  test('the PO money maths is canonical (£504 @7% = £35.28)',
    po?.poValue === 504 && po?.commissionAmount === 35.28,
    `value=${po?.poValue} commission=${po?.commissionAmount}`);
  test('the PO line item is the ordered quantity/price',
    po?.lineItems.length === 1 && po?.lineItems[0].quantity === 120 && po?.lineItems[0].unitPrice === 4.2);

  const shipId = byId.fulfilment.entityIds[0];
  const shipment = store.demoShipments.find((s) => s.id === shipId);
  test('the fulfilment created a shipment owned by the demo tenant',
    !!shipment && shipment.brandId === tenantId);
  test('the shipment reached the terminal milestone, then recovered from the delay drill',
    byId.shipment.facts.finalMilestone === 'live_amazon' &&
    shipment?.delayed === false && shipment?.status === 'mercenta_hub',
    `${shipment?.status}/${String(shipment?.delayed)}`);

  const invoice = po ? store.getCommerceInvoiceForPo(po.id) : undefined;
  test('the simulated invoice exists and is paid', !!invoice && invoice.status === 'paid', invoice?.status);
  const payments = invoice ? store.getCommercePaymentsForInvoice(invoice.id) : [];
  test('a simulated payment settled the invoice',
    payments.length === 1 && payments[0].status === 'settled' && payments[0].simulated === true);

  const deduction = store.demoDeductions.find((d) => d.id === 'ded-investor-demo-1');
  test('the deduction is resolved with the OPERATOR outcome',
    deduction?.status === 'resolved' && deduction?.dispute?.outcome === 'partial',
    `${deduction?.status}/${deduction?.dispute?.outcome}`);

  const returns = store.demoReturns.filter((r) => r.brandId === tenantId);
  test('the return is owned by the demo tenant only',
    returns.length === 1 && returns[0].id === 'ret-investor-demo-1', `${returns.length} return(s)`);

  const commissions = store.listCommissionsForPayout().filter((c) => c.brandId === tenantId);
  test('the commission is paid (settled exactly once)',
    commissions.length === 1 && commissions[0].status === 'paid' && commissions[0].id === `comm-${po.id}`,
    JSON.stringify(commissions.map((c) => `${c.id}:${c.status}`)));
  test('the payout audit row was written for the tenant',
    store.demoAuditLog.some((e) => e.action === 'commission_payout_settled' && e.brandId === tenantId));

  const onboarding = acq.getOnboardingForBrand(tenantId);
  test('the canonical onboarding record reached completed',
    onboarding?.status === 'completed', onboarding?.status);

  const docs = store.demoComplianceDocs.filter((d) => d.brandId === tenantId);
  // §M2 — the invariant is "every REQUIRED document is approved", evaluated on
  // the LATEST version of each requirement (a replaced version is superseded and
  // retained for audit, and must not be mistaken for the current state).
  const latestDocs = compliance.latestDocumentsByType(docs);
  test('every required compliance document is approved (latest version per requirement)',
    latestDocs.size >= 4 && [...latestDocs.values()].every((d) => d.status === 'approved'),
    [...latestDocs.values()].map((d) => `${d.type}:${d.status}`).join(','));
  test('the replaced document version is retained as superseded (audit)',
    docs.some((d) => d.status === 'superseded' && d.supersedesDocumentId === undefined) ||
      docs.some((d) => d.status === 'superseded'),
    docs.map((d) => `${d.type}:v${d.version ?? 1}:${d.status}`).join(','));

  const contract = store.demoContracts.find((c) => c.brandId === tenantId);
  test('the distribution agreement is active', contract?.status === 'active');

  /* ── §M2 — document verification ledger (the evidence trail) ───────────── */
  const records = store.demoDocumentVerifications.filter((r) => r.brandId === tenantId);
  const verdicts = records.filter((r) => r.result === 'pass' || r.result === 'fail');
  test('§M2 submissions opened pending verification records',
    records.filter((r) => r.status === 'pending').length >= 4,
    `${records.filter((r) => r.status === 'pending').length}`);
  test('§M2 one verification deliberately failed and the document was rejected',
    verdicts.filter((r) => r.result === 'fail').length === 1);
  test('§M2 no verification record claims an EXTERNAL provider',
    verdicts.every((r) => r.external === false));
  test('§M2 every demo verdict is unmistakably simulated',
    verdicts.every((r) => r.simulated === true) &&
      verdicts.every((r) => String(r.evidenceReference ?? '').startsWith('SIM-DOC-VERIFY') || r.result === 'fail'));
  test('§M2 superseded verification records remain auditable',
    records.some((r) => r.superseded === true));
  test('§M2 every verdict records verifier identity, method and provider',
    verdicts.every((r) => !!r.verifierIdentity && !!r.method && !!r.providerId));
  const standing = verification.documentVerificationStanding(
    tenantId,
    'Grocery',
    undefined,
    await api.evaluateBrandCatalogGate(tenantId)
  );
  test('§M2 standing reports every requirement cleared with no replacement outstanding',
    standing.cleared === true && standing.needsReplacement.length === 0 &&
      standing.verifiedCount === standing.requiredCount && standing.requiredCount >= 4,
    JSON.stringify({
      cleared: standing.cleared,
      required: standing.requiredCount,
      verified: standing.verifiedCount,
      blocking: standing.blocking,
    }));
  test('§M2 a manual approval cannot clear a requirement with no document artefact',
    await (async () => {
      const fresh = verification.replaceComplianceDocument({
        documentId: store.demoComplianceDocs.find((d) => d.brandId === tenantId).id,
        actor: { staffId: 'validator', canMutate: true, tenantId },
        reason: 'validator drill',
      });
      if (!fresh.ok) return false;
      const bare = verification.replaceComplianceDocument({
        documentId: fresh.value.newDocument.id,
        actor: { staffId: 'validator', canMutate: true, tenantId },
        reason: 'validator drill 2',
      });
      if (!bare.ok) return false;
      delete bare.value.newDocument.fileUrl;
      delete bare.value.newDocument.reference;
      const manual = await verification.recordManualDocumentVerification(
        bare.value.newDocument.id,
        { staffId: 'operator', canMutate: true },
        'approve',
        'validator manual approval attempt'
      );
      const doc = store.demoComplianceDocs.find((d) => d.id === bare.value.newDocument.id);
      return manual.ok && manual.value.result === 'fail' && doc.status !== 'approved';
    })());

  const submissions = store.getSubmissionsForBrand(tenantId);
  test('the catalog submission is recorded and simulated',
    submissions.length === 1 && submissions[0].simulated === true, `${submissions.length}`);


  // ── Stage-level contract facts ───────────────────────────────────────────
  test('compliance: upload alone did NOT clear the gate, approval did',
    byId.compliance.facts.gateBlockedBeforeApproval === true &&
    byId.compliance.facts.gateClearedAfterApproval === true &&
    byId.compliance.facts.blockedSubmissionReason === 'COMPLIANCE_GATE_BLOCKED');
  test('catalogue: submission is simulated through the mock seam',
    byId.catalogue.facts.submissionSimulated === true && byId.catalogue.facts.submissionMode === 'mock');
  test('acknowledgement: duplicate acknowledgement refused',
    byId.acknowledgement.facts.duplicateRefused === true);
  test('shipment: the track terminated at live_amazon',
    byId.shipment.facts.trackTerminated === true && byId.shipment.facts.finalMilestone === 'live_amazon');
  test('deductions: visible to brand AND operator, refused for a foreign tenant',
    byId.deductions.facts.inBrandLedger === true &&
    byId.deductions.facts.inOperatorLedger === true &&
    byId.deductions.facts.foreignReadRefused === true);
  test('dispute: brand outcome refused, operator outcome consistent everywhere',
    byId.dispute.facts.brandOutcomeRefused === true &&
    byId.dispute.facts.outcome === 'partial' &&
    byId.dispute.facts.consistentAcrossSurfaces === true);
  test('commission: rate normalised to a percentage (no fraction/percent ambiguity)',
    byId.commission.facts.commissionRatePct === 7 &&
    byId.commission.facts.commissionAmount === 35.28 &&
    byId.commission.facts.netShareGbp === 468.72,
    JSON.stringify(byId.commission.facts));
  test('payout: mock mode, audited, double payout refused',
    byId.payout.facts.payoutMode === 'mock' &&
    byId.payout.facts.auditRecorded === true &&
    byId.payout.facts.doublePayoutRefused === true &&
    byId.payout.facts.pendingAfter === 0);

  /* ── §M6 — the money flow: reconciliation → accounting → payout gate ────── */
  const finance = await server.ssrLoadModule('/src/lib/finance/financialReconciliation.ts');
  test('§M7 shipping: both lanes route correctly and the commercial model holds',
    byId.shipping_commercial.status === 'ok' &&
      byId.shipping_commercial.facts.ukLaneCarrier === 'palletline' &&
      byId.shipping_commercial.facts.intlLaneCarrier === 'dhl' &&
      byId.shipping_commercial.facts.arbitraryCarrierRefused === true,
    JSON.stringify(byId.shipping_commercial.facts));
  test('§M7 shipping: the shipment is PO-gated (foreign tenant + carrier refused)',
    byId.shipping_commercial.facts.foreignTenantShipmentRefused === true &&
      byId.shipping_commercial.facts.nonCanonicalCarrierShipmentRefused === true);
  test('§M7 shipping: the carrier cost is preserved and the brand charge is upfront',
    byId.shipping_commercial.facts.carrierCostRetained ===
      byId.shipping_commercial.facts.carrierInvoiceCost &&
      byId.shipping_commercial.facts.chargeRecordedUpfront === true &&
      byId.shipping_commercial.facts.carrierInvoiceCost <
        byId.shipping_commercial.facts.carrierListCost);
  test('§M7 shipping: no hardcoded 90% and the terms are flagged placeholder',
    byId.shipping_commercial.facts.marginFractionBelowRetiredRule === true &&
      byId.shipping_commercial.facts.placeholderTerms === true);
  test('§M7 cases: Mercenta review precedes channel escalation, then resolution',
    byId.cases.status === 'ok' &&
      byId.cases.facts.escalationBeforeReviewRefused === true &&
      byId.cases.facts.reviewRecorded === true &&
      byId.cases.facts.unknownModeRefused === true &&
      byId.cases.facts.providerCaseOpened === true &&
      byId.cases.facts.providerCaseSimulated === true &&
      byId.cases.facts.escalationIdempotent === true &&
      byId.cases.facts.providerResponseRecorded === true &&
      byId.cases.facts.resolved === true,
    JSON.stringify(byId.cases.facts));
  test('§M7 cases: reads are tenant-scoped and the lifecycle is audited',
    byId.cases.facts.foreignCases === 0 && Number(byId.cases.facts.auditRows) >= 3);
  test('§M6 the payout was BLOCKED before the payment was reconciled',
    byId.payout.facts.blockedBeforeReconciliation === true &&
      /no payment has been reconciled/.test(String(byId.payout.facts.blockedReasonAtReconciliation ?? '')),
    String(byId.payout.facts.blockedReasonAtReconciliation));
  test('§M6 the payout was BLOCKED before the destination was verified',
    byId.payout.facts.blockedBeforeDestinationVerification === true &&
      byId.payout.facts.destinationStatus === 'verified');
  test('§M6 one payment produced exactly ONE reconciliation',
    byId.payout.facts.reconciliationsForPayment === 1 &&
      byId.payout.facts.reconciliationState === 'reconciled');
  test('§M6 the accounting representation is simulated, never external',
    byId.payout.facts.accountingRepresented === true &&
      byId.payout.facts.accountingSimulated === true &&
      byId.payout.facts.accountingProvider === 'simulated_accounting_representation');
  test('§M6 the payout identity reached settled exactly once, linked to the reconciliation',
    byId.payout.facts.payoutState === 'settled' &&
      byId.payout.facts.payoutAttempts === 1 &&
      byId.payout.facts.settledPayoutCount === 1);
  test('§M6 VAT is NOT invented — the treatment stays configuration-required',
    byId.payout.facts.vatTreatment === 'configuration_required' &&
      byId.payout.facts.vatConfigured === false &&
      byId.payout.facts.vatAmountGbp === 0);
  test('§M6 the money maths come from the canonical PO facts',
    byId.payout.facts.commissionAmountGbp === 35.28 &&
      byId.payout.facts.netToBrandGbp ===
        Math.round((504 - 35.28 - Number(byId.payout.facts.deductionsAppliedGbp) - 0) * 100) / 100,
    JSON.stringify({
      commission: byId.payout.facts.commissionAmountGbp,
      deductions: byId.payout.facts.deductionsAppliedGbp,
      net: byId.payout.facts.netToBrandGbp,
    }));
  const runReconciliation = finance.getReconciliationForPayment(
    store.demoCommercePayments.find((p) => p.brandId === tenantId).id
  );
  test('§M6 the reconciliation is readable by its payment identity and audited',
    !!runReconciliation &&
      store.demoAuditLog.some((e) => e.action === 'payment_reconciled' && e.brandId === tenantId));
  test('integrations: unknown and live are NEVER simulation',
    byId.integrations.facts.unknownIsUnsafe === true &&
    byId.integrations.facts.liveIsUnsafe === true &&
    byId.integrations.facts.requiredProvidersSafe === 6);
  test('social: fail-closed, simulated publish, failure recovered, all simulated',
    byId.social.facts.wronglyAccepted === 0 &&
    byId.social.facts.retryRecovered === true &&
    byId.social.facts.allSimulated === true &&
    byId.social.facts.scheduledNotRunEarly === true);
  test('rbac: all refusal/allow checks hold',
    byId.rbac.facts.brandOnboardingInitiationRefused === true &&
    byId.rbac.facts.crossTenantReadRefused === true &&
    byId.rbac.facts.viewOnlyMutationRefused === true &&
    byId.rbac.facts.operatorAllowed === true &&
    byId.rbac.facts.matrixFailures === 0);
  test('error/recovery: every deterministic failure drill passed',
    byId.error_recovery.status === 'ok' &&
    Object.values(byId.error_recovery.facts).every((v) => v === true),
    JSON.stringify(byId.error_recovery.facts));
  test('audit: full attribution on every demo-tenant row',
    byId.audit.facts.incompleteRows === 0 && byId.audit.facts.auditRows > 0);

  // ── Determinism / reset-replay ───────────────────────────────────────────
  const digest1 = run.digest;
  mod.resetInvestorDemo();
  const run2 = await mod.runInvestorDemo({ seed: 1 });
  test('reset → run reproduces the SAME digest', run2.digest === digest1, `${digest1} vs ${run2.digest}`);
  test('the second run also has no failed stages',
    run2.summary.error === 0 && run2.summary.ok === EXPECTED_STAGES.length);
  const runsPo = store.demoPurchaseOrders.filter((p) => p.brandId === tenantId && p.simulated === true);
  test('replay did NOT duplicate canonical records (POs)', runsPo.length === 1, `${runsPo.length} PO(s)`);
  const runsDed = store.demoDeductions.filter((d) => d.brandId === tenantId);
  test('replay did NOT duplicate deductions', runsDed.length === 1, `${runsDed.length}`);
  const runsComm = store.listCommissionsForPayout().filter((c) => c.brandId === tenantId);
  test('replay did NOT duplicate commissions', runsComm.length === 1, `${runsComm.length}`);

  // A different seed is still deterministic, and differs from seed 1.
  mod.resetInvestorDemo();
  const runSeed2 = await mod.runInvestorDemo({ seed: 2 });
  test('a different seed produces a different, still-clean run',
    runSeed2.digest !== digest1 && runSeed2.summary.error === 0);

  test('the whole validation performed ZERO network calls', networkCalls === 0, `observed ${networkCalls}`);

  console.log(failures === 0 ? 'INVESTOR_DEMO_VALIDATION_PASS' : `INVESTOR_DEMO_VALIDATION_FAIL (${failures})`);
} finally {
  globalThis.fetch = realFetch;
  await server.close();
}
if (failures > 0) process.exit(1);
