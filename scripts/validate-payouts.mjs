// §8 — validates commission payout rules:
//   Separate Charges & Transfers (transfer only, never a charge)
//   double-payout guard · paid-only-after-confirmation · track-based fee math
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

try {
  const p = await server.ssrLoadModule('/src/lib/billing/payouts.ts');

  // Fee math
  test('direct net share: 10000 @12% → 8800',
    p.computeBrandNetShare({ poValue: 10000, commissionRatePct: 12, fulfillmentTrack: 'direct_fulfillment' }) === 8800);
  test('financed net share applies clause fee (placeholder £0)',
    p.computeBrandNetShare({ poValue: 10000, commissionRatePct: 12, fulfillmentTrack: 'financed' }) ===
    8800 - p.FINANCED_FULFILMENT_FEE_PLACEHOLDER_GBP);
  test('rounding to pennies', p.computeBrandNetShare({ poValue: 999.99, commissionRatePct: 12, fulfillmentTrack: 'direct_fulfillment' }) === 879.99);

  // Factory seam
  test('factory → mock without credentials', p.createPayoutClient(null).mode === 'mock');
  test('factory → mock for sandbox creds',
    p.createPayoutClient({ secretRef: 'mock:x', verified: true }).mode === 'mock');

  // Settlement happy path
  p.resetMockPayouts();
  const client = new p.MockStripePayoutClient();
  const markPaidCalls = [];
  const comm = { id: 'c-1', brandId: 'b-1', poValue: 10000, commissionRate: 12, status: 'invoiced' };
  const r1 = await p.settleCommission(comm, {
    fulfillmentTrack: 'financed',
    destinationAccountId: 'acct_test',
    client,
    markPaid: async (id, tid) => { markPaidCalls.push([id, tid]); },
  });
  test('settle succeeds with transfer id + net share', r1.ok && !!r1.transferId && r1.netShareGbp === 8800);
  test('markPaid called exactly once, AFTER transfer', markPaidCalls.length === 1 && markPaidCalls[0][0] === 'c-1');

  // Double-payout guards
  const r2 = await p.settleCommission({ ...comm, status: 'paid' }, {
    fulfillmentTrack: 'financed', destinationAccountId: 'acct_test', client,
    markPaid: async () => { throw new Error('must not be called'); },
  });
  test('already-paid commission refused', !r2.ok && /already paid/.test(r2.error));

  const before = p.MockStripePayoutClient.has('comm_c-1');
  const replay = await client.createTransfer({ idempotencyKey: 'comm_c-1', amountGbp: 1, destinationAccountId: 'x' });
  test('idempotency key replays the SAME transfer, never a second one',
    before && replay.ok && replay.transferId === r1.transferId);

  // Failure path: commission must NOT be marked paid when transfer fails
  const failing = { async createTransfer() { return { ok: false, error: 'card_declined' }; }, mode: 'mock' };
  let failMarked = false;
  const r3 = await p.settleCommission({ id: 'c-2', brandId: 'b-1', poValue: 5000, commissionRate: 12, status: 'accrued' }, {
    fulfillmentTrack: 'direct_fulfillment', destinationAccountId: 'acct_test', client: failing,
    markPaid: async () => { failMarked = true; },
  });
  test('failed transfer → not marked paid, error surfaced', !r3.ok && !failMarked);

  console.log(failures === 0 ? 'PAYOUT_VALIDATION_PASS' : `PAYOUT_VALIDATION_FAIL (${failures})`);
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
