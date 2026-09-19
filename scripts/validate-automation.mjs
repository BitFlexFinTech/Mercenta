// §13 — validates the automation layer:
//   auto-approve threshold boundary · track assignment outside/inside band
//   digest sections: borderline scores, 60-day renewals, overnight commissions
//   hot-lead stays real-time (never batched)
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

try {
  const aa = await server.ssrLoadModule('/src/lib/automation/autoApprove.ts');
  const dg = await server.ssrLoadModule('/src/lib/automation/digest.ts');
  const d10 = await server.ssrLoadModule('/src/lib/discovery/engine.ts');

  // Rule 1: commission auto-approve threshold
  test('commission below £10k auto-approves',
    aa.shouldAutoApproveCommission(1200).autoApproved === true);
  const at = aa.shouldAutoApproveCommission(aa.AUTO_APPROVE_THRESHOLD_GBP);
  test('commission at threshold held', at.autoApproved === false);
  test('threshold is £10k placeholder', aa.AUTO_APPROVE_THRESHOLD_GBP === 10000);

  // Rule 2: track assignments
  const decisions = aa.applyAutoTrackAssignments([
    { brandId: 'strong', totalScore: 85, manualOverride: false },
    { brandId: 'weak', totalScore: 30, manualOverride: false },
    { brandId: 'borderline', totalScore: 65, manualOverride: false },
    { brandId: 'overridden', totalScore: 70, manualOverride: true },
  ]);
  const strong = decisions.find((d) => d.brandId === 'strong');
  const weak = decisions.find((d) => d.brandId === 'weak');
  const border = decisions.find((d) => d.brandId === 'borderline');
  const overridden = decisions.find((d) => d.brandId === 'overridden');
  test('score 85 → direct_fulfillment applied immediately',
    strong.action === 'applied' && strong.track === 'direct_fulfillment');
  test('score 30 → financed applied immediately',
    weak.action === 'applied' && weak.track === 'financed');
  test('score 65 (borderline) held for review', border.action === 'held_for_review');
  test('manual overrides never re-assigned', overridden === undefined);

  // Digest builder
  const now = new Date('2026-08-25T08:00:00Z');
  const daysFromNow = (n) => new Date(now.getTime() + n * 86400000).toISOString().slice(0, 10);
  const digest = dg.buildDailyDigest({
    date: now,
    newLeads: [{ id: 'l1', company: 'Regatta' }, { id: 'l2', company: 'Cholula Ltd' }],
    nonUrgentReplies: [{ id: 'r1', subject: 'Thanks, reviewing internally' }],
    scores: [
      { brandId: 'brand-a', totalScore: 58, manualOverride: false },
      { brandId: 'brand-b', totalScore: 90, manualOverride: false },
    ],
    contracts: [
      { id: 'ct-1', brandId: 'brand-a', renewalDate: daysFromNow(45) },
      { id: 'ct-2', brandId: 'brand-b', renewalDate: daysFromNow(200) },
    ],
    commissions: [
      { purchaseOrderId: 'PO-9001', poValue: 4000, commissionAmount: 480, status: 'accrued' },
      { purchaseOrderId: 'PO-9002', poValue: 95000, commissionAmount: 11400, status: 'accrued' },
      { purchaseOrderId: 'PO-9003', poValue: 3000, commissionAmount: 360, status: 'invoiced' },
    ],
    rejectedSubmissions: [{ id: 'sub-1', rejectionReason: 'image too small' }],
  });
  test('digest counts new leads with companies', digest.newLeads.count === 2);
  test('digest batches non-urgent replies only', digest.nonUrgentReplies.count === 1);
  test('digest lists borderline score for review',
    digest.fulfillmentNeedsReview.length === 1 && digest.fulfillmentNeedsReview[0].totalScore === 58);
  test('digest flags contract inside 60-day window with days left',
    digest.contractsInRenewalWindow.length === 1 &&
    digest.contractsInRenewalWindow[0].daysLeft === 45);
  test('small commission auto-sent, large held, processed skipped',
    digest.commissionsOvernight[0].decision === 'auto_sent' &&
    digest.commissionsOvernight[1].decision === 'held_for_approval' &&
    digest.commissionsOvernight[2].decision === 'already_processed');
  test('rejected submissions routed to human', digest.rejectedSubmissionsNeedingHuman.length === 1);

  // Hot leads remain real-time, not digested
  const hot = d10.handleInboundReply({ leadEmail: 'a@b.c', body: 'Can you call me about pricing?' });
  test('hot lead fires real-time notification (outside digest)',
    hot.requiresHuman && !!hot.hotLeadNotification);

  console.log(failures === 0 ? 'AUTOMATION_VALIDATION_PASS' : `AUTOMATION_VALIDATION_FAIL (${failures})`);
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
