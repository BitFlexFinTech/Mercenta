/**
 * §P4 — PROXY-MODEL + INSTRUCTION-TO-MERCENTA VALIDATION.
 *
 * Proves, against the REAL modules (no mocks, no fixtures) that the direction of
 * the proxy model is correct and complete:
 *
 *   brand decision → INSTRUCTION to Mercenta (channelInstructions)
 *                  → MERCENTA performs the channel action (proxyProcessor)
 *                      1. submitAcknowledgement   (SP-API seam, mock-first)
 *                      2. raise the routing/shipment request
 *                      3. file the ASN (automatic on acceptance)
 *                  → outcome recorded on the same record, attributed + audited
 *
 * It also proves what could silently regress:
 *  · `submitAcknowledgement` exists on BOTH clients (AV-040), the real client
 *    refuses without a verified connection, and the mock exposes its success AND
 *    its refusal paths;
 *  · the instruction is IDEMPOTENT (a replay cannot duplicate it or re-issue a
 *    channel action) and the PO's consignment stays a single record;
 *  · an all-rejected decision is actioned with routing/ASN marked NOT APPLICABLE
 *    — never falsely reported as filed;
 *  · a CHANNEL REFUSAL leaves the ASN unfiled with the channel's own reason, and
 *    the retry is a deliberate, audited action;
 *  · the BRAND surface has no filing control left (direction asserted in source,
 *    not assumed).
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond, extra) {
  console.log(`${cond ? '✓' : '✗'} ${name}${cond || !extra ? '' : ` — ${extra}`}`);
  if (!cond) failures++;
}

const api = await server.ssrLoadModule('/src/data/api.ts');
const store = await server.ssrLoadModule('/src/data/demoStore.ts');
const instructions = await server.ssrLoadModule('/src/lib/commerce/channelInstructions.ts');
const proxy = await server.ssrLoadModule('/src/lib/commerce/proxyProcessor.ts');
const clientMod = await server.ssrLoadModule('/src/lib/spapi/client.ts');
const mockMod = await server.ssrLoadModule('/src/lib/spapi/mockClient.ts');

/* ── 1. The SP-API seam (AV-040): submitAcknowledgement on BOTH clients ───── */
const realClientSrc = readFileSync('src/lib/spapi/client.ts', 'utf8');
const mockClientSrc = readFileSync('src/lib/spapi/mockClient.ts', 'utf8');
test('real SP-API client declares submitAcknowledgement', /submitAcknowledgement\(/.test(realClientSrc));
test('mock SP-API client declares submitAcknowledgement', /submitAcknowledgement\(/.test(mockClientSrc));

const mock = mockMod.createMockSpApiClient();
const ackOk = await mock.submitAcknowledgement({
  purchaseOrderNumber: 'MOCK-PO-1',
  lines: [
    { sku: 'S1', ackStatus: 'accepted', orderedQty: 10, acknowledgedQty: 10, unitPrice: 5 },
    { sku: 'S2', ackStatus: 'rejected', orderedQty: 4, acknowledgedQty: 0, unitPrice: 5 },
  ],
});
test('mock acknowledgement succeeds and returns an unmistakably simulated id',
  ackOk.ok === true && /^MOCK-ACK-\d{5}$/.test(ackOk.acknowledgementId ?? ''), JSON.stringify(ackOk));
test('mock acknowledgement reports partially_accepted when a line is rejected',
  ackOk.status === 'partially_accepted', String(ackOk.status));

const ackAllRejected = await mock.submitAcknowledgement({
  purchaseOrderNumber: 'MOCK-PO-2',
  lines: [{ sku: 'S1', ackStatus: 'rejected', orderedQty: 1, acknowledgedQty: 0, unitPrice: 1 }],
});
test('an all-rejected acknowledgement is a legitimate outcome (status rejected, not an error)',
  ackAllRejected.ok === true && ackAllRejected.status === 'rejected', JSON.stringify(ackAllRejected));

const ackOverQty = await mock.submitAcknowledgement({
  purchaseOrderNumber: 'MOCK-PO-3',
  lines: [{ sku: 'S1', ackStatus: 'accepted', orderedQty: 3, acknowledgedQty: 9, unitPrice: 1 }],
});
test('mock REFUSES an acknowledgement above the ordered quantity (failure path reachable)',
  ackOverQty.ok === false && /EXCEEDS_ORDER/.test(ackOverQty.error ?? ''), String(ackOverQty.error));

const ackMissingDate = await mock.submitAcknowledgement({
  purchaseOrderNumber: 'MOCK-PO-4',
  lines: [{ sku: 'S1', ackStatus: 'backordered', orderedQty: 3, acknowledgedQty: 3, unitPrice: 1 }],
});
test('mock REFUSES a backordered line without a scheduled ship date',
  ackMissingDate.ok === false && /MISSING_DATE/.test(ackMissingDate.error ?? ''), String(ackMissingDate.error));

const realClient = clientMod.createSpApiClient(() => null, '/functions/v1/spapi');
let realThrew = false;
try {
  await realClient.submitAcknowledgement({ purchaseOrderNumber: 'X', lines: [] });
} catch {
  realThrew = true;
}
test('real client refuses submitAcknowledgement without a verified connection', realThrew);

/* ── 2. The brand decision becomes an INSTRUCTION — verbatim, idempotent ──── */
const po = store.demoPurchaseOrders.find(
  (p) => (p.status === 'received' || p.status === 'under_review') && p.lineItems.length > 0
);
test('an acknowledgement-eligible canonical PO exists for the validation', !!po);
if (po) {
  const result = api.acknowledgePurchaseOrder(
    po.id,
    po.lineItems.map((l) => ({ sku: l.sku, ackStatus: 'accepted', acknowledgedQty: l.quantity }))
  );
  test('acknowledgePurchaseOrder returns the instruction id it wrote',
    result.ok === true && !!result.instructionId, JSON.stringify(result));

  const instruction = instructions.getChannelInstruction(result.instructionId);
  test('the instruction exists and starts as pending Mercenta action',
    !!instruction && instruction.state === 'pending_mercenta_action', instruction?.state);
  test('the instruction records the decision VERBATIM (one line per PO line)',
    !!instruction && instruction.lines.length === po.lineItems.length
      && instruction.lines.every((l) => l.ackStatus === 'accepted' && l.orderedQty > 0),
    JSON.stringify(instruction?.lines));
  test('the instruction carries simulation provenance',
    instruction?.mode === 'simulation' && instruction?.simulated === true);
  test('the instruction is bound to the PO and the brand',
    instruction?.purchaseOrderId === po.id && instruction?.brandId === po.brandId);

  const again = instructions.issueChannelInstruction({
    type: 'po_acknowledgement', brandId: po.brandId, purchaseOrderId: po.id, poNumber: po.poNumber,
    issuedBy: 'validator',
    lines: [{ sku: 'X', ackStatus: 'accepted', orderedQty: 1, acknowledgedQty: 1, unitPrice: 1 }],
  });
  test('issuing the same instruction again is IDEMPOTENT (created: false, same id)',
    again.created === false && again.instruction?.id === instruction?.id);
  test('the idempotent replay did not overwrite the recorded decision',
    instructions.getChannelInstruction(instruction.id)?.lines.length === po.lineItems.length);

  /* ── 2b. The line derivation: an absent ackStatus is NEVER a rejection ────── */
{
  const seededAccepted = store.demoPurchaseOrders.find(
    (p) => (p.status === 'accepted' || p.status === 'ready_to_fulfil')
      && p.lineItems.some((l) => l.ackStatus === undefined)
  );
  test('a seeded accepted PO with no per-line acknowledgement exists (the regression case)',
    !!seededAccepted, seededAccepted?.poNumber);
  if (seededAccepted) {
    const line = instructions.instructionLineFor(seededAccepted, seededAccepted.lineItems.find((l) => l.ackStatus === undefined));
    test('an absent ackStatus on a live PO derives ACCEPTED with the ordered quantity',
      line.ackStatus === 'accepted' && line.acknowledgedQty === seededAccepted.lineItems[0].quantity,
      JSON.stringify(line));
    const rejectedPo = store.demoPurchaseOrders.find((p) => p.status === 'rejected');
    if (rejectedPo && rejectedPo.lineItems[0]) {
      const rejectedLine = instructions.instructionLineFor(rejectedPo, rejectedPo.lineItems[0]);
      test('an absent ackStatus on a REJECTED PO derives rejected with zero quantity',
        rejectedLine.ackStatus === 'rejected' && rejectedLine.acknowledgedQty === 0,
        JSON.stringify(rejectedLine));
    }
    /**
     * The rejected-PO branch is asserted unconditionally against a SYNTHETIC PO, so
     * the rule is proven even when the demo dataset holds no rejected PO.
     */
    const syntheticRejected = { status: 'rejected', lineItems: [] };
    const syntheticLine = instructions.instructionLineFor(syntheticRejected, {
      sku: 'S', productName: 'S', quantity: 7, unitPrice: 2, commodityCode: '0000',
    });
    test('the rejected-PO rule holds on a synthetic PO (always asserted)',
      syntheticLine.ackStatus === 'rejected' && syntheticLine.acknowledgedQty === 0,
      JSON.stringify(syntheticLine));
  }
}

/* ── 3. MERCENTA performs the channel action ───────────────────────────── */
  const processed = await proxy.processChannelInstruction(instruction.id);
  test('Mercenta processed the instruction to ACTIONED', processed?.state === 'actioned', processed?.state);
  const outcome = processed?.outcome;
  test('the channel acknowledgement was submitted through the seam, in mock mode',
    outcome?.channelAcknowledgement?.ok === true
      && /^MOCK-ACK-/.test(outcome.channelAcknowledgement.acknowledgementId ?? '')
      && outcome.channelAcknowledgement.mode === 'mock',
    JSON.stringify(outcome?.channelAcknowledgement));
  test('Mercenta raised the routing / shipment request',
    /**
     * §P12 — REPOINTED (not weakened). OLD CONTRACT (recorded verbatim): the check
     * asserted `routingRequest.raised === true` AND `/^RR-/.test(reference)` — the
     * platform's OWN label for the request, because the request was minted locally.
     *
     * P12 submits it through the channel seam (`SubmitShipments`), so the recorded
     * reference is now the CHANNEL's own reference and the assertion requires MORE:
     * the request is raised, it carries a genuine channel reference
     * (`MOCK-SHP-REQ-…` in simulation — unmistakably simulated), the seam's mode is
     * recorded, and the local `RR-` label is NO LONGER the reference.
     */
    outcome?.routingRequest?.raised === true &&
      /^MOCK-SHP-REQ-/.test(outcome?.routingRequest?.channelShipmentRequestId ?? '') &&
      outcome.routingRequest.reference === outcome.routingRequest.channelShipmentRequestId &&
      outcome.routingRequest.mode === 'mock' &&
      !/^RR-/.test(outcome?.routingRequest?.reference ?? ''),
    JSON.stringify(outcome?.routingRequest));
  test('Mercenta filed the ASN automatically (decision 9)',
    outcome?.asn?.filed === true && !!outcome?.asn?.shipmentId, JSON.stringify(outcome?.asn));

  const shipment = store.demoShipments.find((s) => s.id === outcome?.asn?.shipmentId);
  test('a REAL canonical consignment exists for the PO', !!shipment && shipment.poNumber === po.poNumber, shipment?.id);
  test('the consignment belongs to the instructing brand (tenant isolation)', shipment?.brandId === po.brandId);

  /* ── 4. Idempotency of the channel action, and of the consignment ───────── */
  const shipmentsBefore = store.demoShipments.filter((s) => s.poNumber === po.poNumber).length;
  const replayed = await proxy.processChannelInstruction(instruction.id);
  const shipmentsAfter = store.demoShipments.filter((s) => s.poNumber === po.poNumber).length;
  test('re-processing an actioned instruction does nothing (no second channel action)',
    replayed?.state === 'actioned' && shipmentsAfter === shipmentsBefore,
    `${shipmentsBefore} → ${shipmentsAfter}`);

  /* ── 5. Every step is attributed + audited ─────────────────────────────── */
  const auditActions = store.demoAuditLog.filter((a) => a.entityId === instruction.id).map((a) => a.action);
  test('the instruction is audited on issue and on action',
    auditActions.includes('channel_instruction_issued') && auditActions.includes('channel_instruction_actioned'),
    auditActions.join(', '));
  test('MERCENTA is the attributed actor for the ASN it filed (never the brand)',
    store.demoAuditLog.some((a) => a.action === 'asn_filed' && a.actorId === proxy.PROXY_ACTOR_ID),
    proxy.PROXY_ACTOR_ID);
}

/* ── 6. An all-rejected decision is NOT falsely reported as shipped ───────── */
const rejectable = store.demoPurchaseOrders.find(
  (p) => (p.status === 'received' || p.status === 'under_review') && p.lineItems.length > 0
);
if (rejectable) {
  const rejected = api.acknowledgePurchaseOrder(
    rejectable.id,
    rejectable.lineItems.map((l) => ({
      sku: l.sku, ackStatus: 'rejected', rejectionCode: 'TemporarilyUnavailable',
    }))
  );
  const rejectedInstruction = instructions.getChannelInstruction(rejected.instructionId);
  const rejectedOutcome = (await proxy.processChannelInstruction(rejected.instructionId))?.outcome;
  test('an all-rejected decision still reaches the channel (the rejection is communicated)',
    rejectedOutcome?.channelAcknowledgement?.ok === true && rejectedInstruction?.state === 'actioned',
    JSON.stringify(rejectedOutcome?.channelAcknowledgement));
  test('an all-rejected decision marks the routing request NOT raised',
    rejectedOutcome?.routingRequest?.raised === false, JSON.stringify(rejectedOutcome?.routingRequest));
  test('an all-rejected decision does NOT claim an ASN was filed',
    rejectedOutcome?.asn?.filed === false && /NOT_APPLICABLE/.test(rejectedOutcome?.asn?.note ?? ''),
    JSON.stringify(rejectedOutcome?.asn));
  test('no consignment was created for the fully-rejected PO',
    !store.demoShipments.some((s) => s.poNumber === rejectable.poNumber));
}

/* ── 7. A channel refusal blocks the ASN and offers an audited retry ──────── */
const acceptedPo = store.demoPurchaseOrders.find((p) => p.status === 'accepted' && p.lineItems.length > 0);
if (acceptedPo) {
  /**
   * Force a refusal through the seam's OWN rule (an acknowledgement above the
   * ordered quantity), then prove the chain STOPS there and that the retry is a
   * deliberate action instead of a silent loop.
   */
  const forced = instructions.issueChannelInstruction({
    type: 'packing_correction',
    brandId: acceptedPo.brandId,
    purchaseOrderId: acceptedPo.id,
    poNumber: acceptedPo.poNumber,
    issuedBy: 'validator',
    lines: acceptedPo.lineItems.map((l) => ({
      sku: l.sku, ackStatus: 'accepted', orderedQty: 1, acknowledgedQty: 99, unitPrice: l.unitPrice,
    })),
  });
  const refused = await proxy.processChannelInstruction(forced.instruction?.id);
  test('a channel refusal marks the instruction REFUSED with the channel reason',
    refused?.state === 'refused' && /CHANNEL_REFUSED/.test(refused?.outcome?.refusedReason ?? ''),
    String(refused?.outcome?.refusedReason));
  test('a refused instruction records NO ASN filing',
    refused?.outcome?.asn?.filed !== true, JSON.stringify(refused?.outcome?.asn));
  test('a refused instruction is NOT silently retried (state stays refused)',
    instructions.getChannelInstruction(forced.instruction?.id)?.state === 'refused');

  const requeued = instructions.requeueChannelInstruction(forced.instruction?.id, 'validator-admin', 'retry test');
  test('the retry is a deliberate, attributed action', requeued?.state === 'pending_mercenta_action');
  test('the retry is audited', store.demoAuditLog.some((a) => a.action === 'channel_instruction_requeued'));
}

/* ── 8. Direction asserted in SOURCE — the brand has no filing control ────── */
const brandSurface = readFileSync('src/components/brand/BrandPurchaseOrders.tsx', 'utf8');
const brandSurfaceCode = brandSurface
  .split('\n')
  .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
  .join('\n');
test('the brand PO surface does NOT import or call createShipmentForPO',
  !/createShipmentForPO/.test(brandSurfaceCode));
test('the brand PO surface does NOT render a routing-request FILING form',
  !/RoutingRequestForm/.test(brandSurfaceCode));
test('the brand PO surface writes an instruction to Mercenta instead',
  /issueChannelInstruction\(/.test(brandSurfaceCode));
test('the brand PO surface shows Mercenta\'s channel status',
  /po-mercenta-asn-/.test(brandSurface) && /po-mercenta-ack-/.test(brandSurface));

const routingModule = readFileSync('src/components/shared/RoutingRequest.tsx', 'utf8');
test('the routing module exposes no brand-side filing control',
  /RoutingRequestStatus/.test(routingModule) && !/export function RoutingRequestForm/.test(routingModule));

const lifecycle = readFileSync('src/lib/commerce/commerceLifecycle.ts', 'utf8');
test("the fulfilment seam is documented as MERCENTA's channel action",
  /THIS IS MERCENTA'S CHANNEL ACTION, NOT THE BRAND'S JOB/.test(lifecycle));

/**
 * §P4 — the instruction store is CANONICAL state, so the deterministic investor
 * demo must reset it. Without this the replay after a reset finds the previous
 * run's instruction already actioned, writes no instruction audit rows, and the
 * replay digest differs (measured: 66/44 → 64/42 audit facts — a real failure of
 * `e2e/investor-demo.spec.ts` test 3).
 */
const investorDemoSrc = readFileSync('src/lib/simulation/investorDemo.ts', 'utf8');
test('the investor demo reset clears the channel-instruction store (deterministic replay)',
  /resetChannelInstructions\(\);/.test(investorDemoSrc));

/* ── 9. The acceptance path no longer hardcodes carrier/hub in a draft ───── */
const apiSrc = readFileSync('src/data/api.ts', 'utf8');
const ackStart = apiSrc.indexOf('export function acknowledgePurchaseOrder');
const ackEnd = apiSrc.indexOf('export interface AsnCarton', ackStart);
const ackCode = apiSrc
  .slice(ackStart, ackEnd > ackStart ? ackEnd : undefined)
  .split('\n')
  .filter((l) => !/^\s*(\*|\/\/|\/\*)/.test(l))
  .join('\n');
test('acknowledgePurchaseOrder no longer creates a draft shipment with a hardcoded carrier',
  !/carrier: 'dhl'/.test(ackCode) && !/shipment-draft-/.test(ackCode));
test('acknowledgePurchaseOrder no longer creates a "brand must add carton details" draft',
  !/Brand must add carton details/.test(ackCode));
test('acknowledgePurchaseOrder writes an instruction to Mercenta',
  /issueChannelInstruction\(/.test(ackCode));

console.log('');
if (failures === 0) {
  console.log('PROXY_MODEL_VALIDATION_PASS');
} else {
  console.log(`PROXY_MODEL_VALIDATION_FAIL (${failures})`);
}
await server.close();
process.exit(failures === 0 ? 0 : 1);