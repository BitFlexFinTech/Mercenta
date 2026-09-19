// §Stage-15 — shipment operations validation (repointed §Phase M10).
//
// HISTORY: this validator was written for the 3PL "Carrier Terminal" view, which
// was subsequently DELETED from the product (its placeholder test asserted
// `true`). The capabilities it guarded are real and must still be proven, so the
// assertions now run against the CANONICAL surfaces that own them:
//   · cross-shipment visibility with the owning brand  → Admin Logistics Control
//   · create-on-behalf from an ELIGIBLE PO             → createShipmentForPO
//   · lane-correct carrier (canonical routing)         → carrier refused if wrong
//   · drill-down amend                                 → amendShipment
//   · guard rails (unknown PO · retired carrier · cross-tenant refusal)
import { createServer } from 'vite';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { QueryClient } from '@tanstack/react-query';

function fullAsn(po, carrier) {
  return {
    cartons: (po.lineItems ?? []).map((l) => ({
      sku: l.sku,
      quantity: l.acknowledgedQty ?? l.quantity,
      weightKg: 10, lengthCm: 40, widthCm: 30, heightCm: 25,
    })),
    shipDate: new Date().toISOString().slice(0, 10),
    carrier,
    proNumber: `PRO-${po.poNumber}`,
    bolNumber: `BOL-${po.poNumber}`,
    // The seed eligible PO belongs to a canonical Grocery tenant (Tapatío),
    // which is a perishable/regulated category — lot + expiry are required.
    lotNumber: `SIM-LOT-${po.poNumber}`,
    expiryDate: '2027-10-01',
  };
}


const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

try {
  const store = await server.ssrLoadModule('/src/data/demoStore.ts');
  const api = await server.ssrLoadModule('/src/data/api.ts');

  // ── Admin Logistics Control: the canonical cross-shipment surface ──
  const tp = await server.ssrLoadModule('/src/testing/TestProviders.tsx');
  const logMod = await server.ssrLoadModule('/src/components/admin/LogisticsControl.tsx');
  const seededQc = tp.makeQueryClient();
  seededQc.setQueryData(['brands'], { data: store.demoBrands, source: 'seed' });
  seededQc.setQueryData(['purchase-orders'], { data: store.demoPurchaseOrders, source: 'seed' });
  seededQc.setQueryData(['shipments'], { data: store.demoShipments, source: 'seed' });
  const html = renderToString(
    createElement(tp.TestProviders, { client: seededQc },
      createElement(logMod.LogisticsControl))
  );
  test('admin logistics surface renders', html.length > 0 && /Logistics/i.test(html));
  // §M9 — with no seeded shipping-status PO the surface must state that honestly
  // rather than render three zero metrics with no explanation.
  test('admin logistics states the empty case honestly',
    html.includes('No shipments are in transit') || html.includes('No shipments for this brand'));

  // ── Create-on-behalf from an ELIGIBLE PO (lane-correct carrier) ──
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
  // §11 — the carrier is decided by the LANE, and the brand nation decides the
  // lane. The retired 'bak'/'fedex' carriers used by the old test are now
  // refused by the canonical routing rule.
  const routing = await server.ssrLoadModule('/src/lib/shipping/carrierRouting.ts');
  const targetBrand = store.demoBrands.find((b) => b.id === target.brandId);
  const laneCarrier = routing.selectCarrierForLane(
    routing.resolveShippingLane({ brandNation: targetBrand.profile.nation })
  );
  test('the lane carrier for the target brand is a canonical Mercenta account',
    routing.isCanonicalMercentaCarrier(laneCarrier));
  const before = store.demoShipments.length;
  const created = api.createShipmentForPO(target.id, fullAsn(target, laneCarrier));
  test("admin creates shipment on brand's behalf",
    created.ok === true && store.demoShipments.length === before + 1);
  test('new shipment has the lane carrier + the owning brand',
    store.demoShipments.some((s) => s.id === created.shipmentId &&
      s.carrier === laneCarrier && s.brandId === target.brandId));

  // Amend drill-down mutates the actual record.
  const ship = store.demoShipments.find((s) => s.id === created.shipmentId);
  test('created shipment is present for amend', Boolean(ship));
  if (ship) {
    const amended = store.amendShipment(ship.id, { carrier: 'dhl', status: 'uk_customs_cleared' });
    test('amend updates carrier and status on the record',
      amended === true && ship.carrier === 'dhl' && ship.status === 'uk_customs_cleared');
  }

  // Guard rails
  test('unknown PO refused',
    api.createShipmentForPO('po-nope', fullAsn({ poNumber: 'X', lineItems: [] }, 'dhl')).ok === false);
  test('unknown carrier refused',
    api.createShipmentForPO(target.id, fullAsn(target, 'courier-pony')).ok === false);
  test('retired carrier (fedex) refused by the canonical routing rule',
    api.createShipmentForPO(target.id, fullAsn(target, 'fedex')).ok === false);
  test('a brand cannot create a shipment from another tenant\'s PO',
    api.createShipmentForPO(target.id, fullAsn(target, laneCarrier), undefined, 'brand-not-the-owner').ok === false);

  console.log(failures === 0 ? 'STAGE15_VALIDATION_PASS' : `STAGE15_VALIDATION_FAIL (${failures})`);
} finally {
  await server.close();
}
if (failures > 0) process.exit(1);
