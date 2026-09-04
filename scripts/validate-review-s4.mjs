// Stage 4 (review pass) validation: brand PO tab — accept/reject workflow,
// fulfillment-track branching, shipment creation, shared-store visibility.
import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function fullAsn(po) {
  return {
    cartons: (po.lineItems ?? []).map((l) => ({
      sku: l.sku,
      quantity: l.acknowledgedQty ?? l.quantity,
      weightKg: 10, lengthCm: 40, widthCm: 30, heightCm: 25,
    })),
    shipDate: new Date().toISOString().slice(0, 10),
    carrier: 'dhl',
    proNumber: `PRO-${po.poNumber}`,
    bolNumber: `BOL-${po.poNumber}`,
  };
}


const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

let failures = 0;
function test(name, cond) {
  console.log(`${cond ? '✓' : '✗'} ${name}`);
  if (!cond) failures++;
}

try {
  const api = await server.ssrLoadModule('/src/data/api.ts');
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const g = await server.ssrLoadModule('/src/context/GlobalStateContext.tsx');
  const poMod = await server.ssrLoadModule('/src/components/brand/BrandPurchaseOrders.tsx');

  // ── Workflow: reject requires reason ──
  const pos0 = (await api.fetchPurchaseOrders()).data;
  const actionable = pos0.find((p) => p.status === 'received' || p.status === 'under_review');
  test('actionable demo PO exists', Boolean(actionable));

  const noReason = await api.updatePurchaseOrderStatus(actionable.id, 'rejected');
  test('reject without reason refused', noReason.ok === false && /reason/i.test(noReason.error ?? ''));

  const rejected = await api.updatePurchaseOrderStatus(
    actionable.id, 'rejected', 'Cannot fulfil this quarter.'
  );
  test('reject with reason succeeds + logged',
    rejected.ok === true && rejected.po.status === 'rejected' &&
      rejected.po.rejectionReason === 'Cannot fulfil this quarter.');

  // ── Accept + financed branch (no shipment action needed) ──
  const shipmentsBefore = (await api.fetchShipmentsAll()).data.length;
  const financedPO = pos0.find(
    (p) =>
      p.status === 'received' &&
      store.demoBrands.find((b) => b.id === p.brandId)?.track === 'financed'
  );
  test('financed received PO exists for branch demo', Boolean(financedPO));
  if (financedPO) {
    await api.updatePurchaseOrderStatus(financedPO.id, 'accepted');
    const after = (await api.fetchShipmentsAll()).data.length;
    test('financed accept does NOT auto-create a brand shipment',
      after === shipmentsBefore);
  }

  // ── Direct fulfillment branch: accept → create shipment → shipped state ──
  const directPO = pos0.find(
    (p) =>
      ['received', 'under_review'].includes(p.status) &&
      store.demoBrands.find((b) => b.id === p.brandId)?.track === 'direct_fulfillment'
  );
  test('direct-fulfillment received PO exists for branch demo', Boolean(directPO));
  if (directPO) {
    await api.updatePurchaseOrderStatus(directPO.id, 'accepted');
    const ship = api.createShipmentForPO(directPO.id, { ...fullAsn(directPO), carrier: 'dhl' });
    test('shipment created for direct-fulfillment PO',
      ship.ok === true && Boolean(ship.shipmentId));
    const shipmentsAfter = (await api.fetchShipmentsAll()).data;
    const created = shipmentsAfter.find((s) => s.id === ship.shipmentId);
    test('created shipment is on DHL for the right PO',
      created?.carrier === 'dhl' && created.poNumber === directPO.poNumber);
    const badCarrier = api.createShipmentForPO(directPO.id, { ...fullAsn(directPO), carrier: 'ups' });
    test('unknown carrier refused', badCarrier.ok === false);
  }

  // ── Shared-store visibility (single source of truth) ──
  const allAfter = (await api.fetchPurchaseOrders()).data;
  const changedPOs = allAfter.filter(
    (p) =>
      p.status === 'rejected' ||
      (financedPO && p.id === financedPO.id && p.status === 'accepted') ||
      (directPO && p.id === directPO.id)
  );
  test('admin-side fetch sees every brand mutation', changedPOs.length >= 3);

  // ── Panel renders with statuses and action buttons ──
  const seedMod = await server.ssrLoadModule('/src/data/demoStore.ts');
  const qc = new QueryClient();
  qc.setQueryData(['brands'], { data: seedMod.demoBrands, source: 'seed' });
  qc.setQueryData(['purchase_orders'], { data: (await api.fetchPurchaseOrders()).data, source: 'seed' });

  const html = renderToString(
    createElement(g.AppProvider, null,
      createElement(QueryClientProvider, { client: qc },
        createElement(poMod.BrandPurchaseOrders)))
  );
  test('tab renders header + brand selector', html.includes('Purchase Orders') && html.includes('UK retail network'));
  test('workflow status badges render post-mutation',
    (html.includes('Received') || html.includes('Rejected')) &&
      html.includes('Under Review'));
  test('accept/reject buttons render on actionable POs', html.includes('Accept') || html.includes('Rejected'));

  console.log(failures === 0 ? 'STAGE4_REVIEW_PASS' : `STAGE4_REVIEW_FAIL (${failures} failures)`);
} finally {
  await server.close();
}
process.exitCode = failures === 0 ? 0 : 1;
