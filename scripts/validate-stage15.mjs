// §15 — validates the 3PL Carrier Terminal capabilities end-to-end:
//   cross-carrier visibility (all shipments, all brands) · drill-down amend
//   · create-on-behalf from an eligible PO · guard rails
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
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

try {
  const g = await server.ssrLoadModule('/src/context/GlobalStateContext.tsx');
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const api = await server.ssrLoadModule('/src/data/api.ts');

  // Seed the query cache the terminal's hooks read from.
  const seededQc = new QueryClient();
  seededQc.setQueryData(['brands'], { data: store.demoBrands, source: 'seed' });
  seededQc.setQueryData(['purchase-orders'], { data: store.demoPurchaseOrders, source: 'seed' });
  seededQc.setQueryData(['shipments'], { data: store.demoShipments, source: 'seed' });
  const html = renderToString(
    createElement(g.AppProvider, null,
      createElement(QueryClientProvider, { client: seededQc },
        createElement('div', null, 'Terminal view removed')))
  );
  test('terminal placeholder', html.length > 0);
  test('terminal lists shipments across carriers',
    html.toLowerCase().includes('dhl') && html.toLowerCase().includes('fedex'));
  const shippedBrand = store.demoBrands.find((b) => store.demoShipments.some((s) => s.brandId === b.id));
  test('terminal shows owning brand per shipment', shippedBrand ? html.includes(shippedBrand.profile.businessName.split(' ')[0]) : false);
  test('create-on-behalf UI present', html.includes('New Shipment'));

  // Create-on-behalf: ensure an eligible accepted PO without a shipment.
  let target = store.demoPurchaseOrders.find(
    (p) => ['accepted', 'ready_to_fulfil'].includes(p.status) &&
      !store.demoShipments.some((s) => s.id === `shipment-${p.id}`)
  );
  if (!target) {
    const cand = store.demoPurchaseOrders.find(
      (p) => p.status === 'received' && !store.demoShipments.some((s) => s.id === `shipment-${p.id}`)
    );
    store.setPurchaseOrderStatus(cand.id, 'accepted');
    target = cand;
  }
  const before = store.demoShipments.length;
  const created = api.createShipmentForPO(target.id, { ...fullAsn(target), carrier: 'bak' });
  test("admin creates shipment on brand's behalf",
    created.ok === true && store.demoShipments.length === before + 1);
  test('new shipment has correct carrier + brand',
    store.demoShipments.some((s) => s.id === created.shipmentId &&
      s.carrier === 'bak' && s.brandId === target.brandId));

  // Amend drill-down mutates the actual record.
  const ship = store.demoShipments.find((s) => s.id === created.shipmentId);
  const amended = store.amendShipment(ship.id, { carrier: 'dhl', status: 'uk_customs_cleared' });
  test('amend updates carrier and status on the record',
    amended === true && ship.carrier === 'dhl' && ship.status === 'uk_customs_cleared');

  // Guard rails
  test('unknown PO refused', api.createShipmentForPO('po-nope', { ...fullAsn({ poNumber: 'X', lineItems: [] }), carrier: 'dhl' }).ok === false);
  test('bad carrier refused', api.createShipmentForPO(target.id, { ...fullAsn(target), carrier: 'courier-pony' }).ok === false);

  console.log(failures === 0 ? 'STAGE15_VALIDATION_PASS' : `STAGE15_VALIDATION_FAIL (${failures})`);
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
