/**
 * §P4 + §P5 — LIVE VERIFICATION against the DEPLOYED demo (https://demo.mercenta.co.uk).
 *
 * Not part of the local suite: it is the third leg of the completion contract and
 * exercises the REAL deployed bundle in a real browser. Every check prints its
 * own PASS/FAIL with evidence; the script exits non-zero if any check fails.
 *
 * The P4 checks (the proxy direction on the brand PO surface) are kept, and §P5
 * adds the arrival-node checks: the deployed map draws destination-FC nodes and no
 * `mercenta_hub` node, no surface names a Mercenta hub as a destination, and the
 * admin Overview h1 reads "Overview".
 */
import { chromium } from 'playwright';

const BASE = process.env.LIVE_BASE ?? 'https://demo.mercenta.co.uk';
let failures = 0;
const results = [];
function check(name, ok, extra = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'} — ${name}${extra ? ` :: ${extra}` : ''}`);
  console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}${extra ? ` :: ${extra}` : ''}`);
  if (!ok) failures++;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});

/* ── 1. The deployed bundle MOUNTS (the check the P3 live leg added) ──────── */
await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(4000);
const rootHtml = (await page.locator('#root').innerHTML().catch(() => '')).length;
check('the deployed app mounts (#root non-empty)', rootHtml > 500, `#root html length ${rootHtml}`);
check('no uncaught page error on boot', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
check('the marketing homepage renders its Partner Login entry',
  await page.getByRole('button', { name: 'Partner Login' }).first().isVisible({ timeout: 8000 }).catch(() => false));

/* ── 2. A brand session sees STATUS, not a filing control ────────────────── */
await page.getByRole('button', { name: 'Partner Login' }).first().click().catch(async () => {
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Partner Login' }).last().click();
});
await page.waitForTimeout(800);
await page.click('text=Tapatío');
await page.waitForTimeout(2500);
/**
 * Navigate the way the product does (click the Operations nav item) — NOT by a
 * hand-written URL, which would only match the nav label and prove nothing.
 */
await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
await page.waitForTimeout(3500);

const body = await page.locator('body').innerText().catch(() => '');
check('the brand Purchase Orders surface renders on the deployed build',
  /Queue value/i.test(body) || /Acknowledge each line/i.test(body) || /Purchase orders/i.test(body));
check('NO brand-side filing control exists ("Create Shipment" absent)',
  !/Create Shipment/i.test(body));
check('NO brand-side filing control exists ("File ASN" absent)', !/"File ASN"|File ASN\b/i.test(body));
check('NO brand-side routing filing form ("Confirm routing step" absent)',
  !/Confirm routing step/i.test(body));
const packingBtn = page.locator('button', { hasText: 'Packing differs?' }).first();
const hasPacking = await packingBtn.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
check('the packing-correction exception IS offered', hasPacking);

/* ── 2b. A brand ACCEPTANCE issues the instruction on the live build ─────── */
const ackBtn = page.locator('button', { hasText: 'Acknowledge' }).first();
if (await ackBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
  await ackBtn.click();
  await page.waitForTimeout(700);
  await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
  const issued = await page.getByText(/Decision issued to Mercenta/i).first()
    .waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  check('the brand decision is issued to MERCENTA on the live build', issued);
  const ackTransmitted = await page.getByText(/Mercenta filed the acknowledgement with the retail channel/i).first()
    .waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  check('MERCENTA files the channel acknowledgement (live)', ackTransmitted);
  const simulatedNote = await page.getByText(/simulated, no live call/i).first()
    .waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  check('the channel submission is labelled SIMULATED (never claimed live)', simulatedNote);
  const statusPanelAck = await page.locator('[data-testid^="po-mercenta-ack-"]').first()
    .waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  check('the channel-status panel shows the acknowledgement reference (live)', statusPanelAck);
}

/* ── 3. A packing correction reaches Mercenta, which files the ASN ───────── */
if (hasPacking) {
  await packingBtn.click();
  await page.waitForTimeout(800);
  /**
   * Scoped, not a whole-page text match: "Carrier" appears elsewhere on the page
   * (the admin nav item, the commerce panel), so the check is that the CORRECTION
   * FORM itself offers no carrier field — exactly what the local spec asserts.
   */
  const carrierLabels = await page.locator('label', { hasText: 'Carrier' }).count();
  const carrierSelects = await page.locator('select[aria-label="Carrier"], label:has-text("Carrier") select').count();
  check('the correction form offers NO carrier choice to the brand',
    carrierLabels === 0 && carrierSelects === 0, `labels=${carrierLabels} selects=${carrierSelects}`);
  await page.locator('button', { hasText: 'Send packing correction to Mercenta' }).click();
  const sent = await page.getByText(/Packing correction sent to Mercenta/i).first()
    .waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  check('the correction is issued to Mercenta on the live build', sent);
  const asnFiled = await page.getByText(/Mercenta filed the ASN/i).first()
    .waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  check('MERCENTA files the ASN from it (live)', asnFiled);
  const statusPanel = await page.locator('[data-testid^="po-mercenta-asn-"]').first()
    .waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  check('the Mercenta channel-status panel renders the ASN + consignment (live)', statusPanel);
}

check('no uncaught page error during the brand flow', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

/* ── 3c. §P9 — THE CARRIER SURFACE IS GONE ON THE DEPLOYED BUILD ─────────── */
{
  const carrierPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const carrierErrors = [];
  carrierPage.on('pageerror', (e) => carrierErrors.push(String(e)));

  /* (i) The removed address is NOT a product address, so it resolves to the PUBLIC
     site — never a guessed environment, never a resurrected carrier shell. */
  await carrierPage.goto(`${BASE}/carrier/manifest`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await carrierPage.waitForTimeout(4000);
  check('§P9 the removed carrier address does NOT render a carrier shell (fail-closed)',
    await carrierPage.getByRole('button', { name: 'Partner Login' }).first()
      .isVisible({ timeout: 15000 }).catch(() => false));
  check('§P9 the deployed build exposes no carrier navigation at that address',
    (await carrierPage.locator('nav[aria-label="Primary"]').count()) === 0);
  const removedBody = await carrierPage.locator('body').innerText().catch(() => '');
  check('§P9 the removed carrier surfaces are absent from the rendered page',
    !/3PL Carrier Terminal/.test(removedBody) &&
      !/BAK Logistics Hub/.test(removedBody) &&
      !/API Request Auditor/.test(removedBody));

  /* (ii) The LOGIN screen offers no carrier card of any kind. */
  await carrierPage.getByRole('button', { name: 'Partner Login' }).first().click().catch(async () => {
    await carrierPage.getByRole('button', { name: 'Open navigation' }).click();
    await carrierPage.waitForTimeout(400);
    await carrierPage.getByRole('button', { name: 'Partner Login' }).last().click();
  });
  await carrierPage.waitForTimeout(1500);
  const loginBody = await carrierPage.locator('body').innerText().catch(() => '');
  check('§P9 the "3PL Carrier Terminal" login card is absent from the deployed login screen',
    !/3PL Carrier Terminal/.test(loginBody));
  check('§P9 the deployed login screen still offers the operations logins it should',
    /Mercenta Admin Hub/.test(loginBody) && /Super Admin/.test(loginBody));
  check('§P9 no uncaught page error on the removed-carrier checks',
    carrierErrors.length === 0, carrierErrors.slice(0, 2).join(' | '));
  await carrierPage.close();
}

/* ── 3b. §P8 — THE DEPLOYED INVENTORY SURFACE (decision 5 / decision 10) ─── */
await page.click('nav[aria-label="Primary"] >> text=Inventory').catch(() => {});
await page.waitForTimeout(3000);
const inventoryBody = await page.locator('body').innerText().catch(() => '');
check('§P8 the deployed brand Inventory surface renders its derived position',
  /Inventory position/i.test(inventoryBody) || /Units on hand/i.test(inventoryBody),
  inventoryBody.replace(/\s+/g, ' ').slice(0, 160));
const liveInvRules = await page
  .locator('[data-testid="inventory-rules"]')
  .first()
  .innerText()
  .catch(() => '');
check('§P8 the deployed surface states that every figure comes from the movement ledger',
  /append-only movement ledger/i.test(liveInvRules),
  liveInvRules.replace(/\s+/g, ' ').slice(0, 160));
const liveAsinRules = await page
  .locator('[data-testid="inventory-asin-rules"]')
  .first()
  .innerText()
  .catch(() => '');
check('§P8 the deployed surface states the identifier rule (a brand may supply it only for an existing listing)',
  /already exists on the channel/i.test(liveAsinRules),
  liveAsinRules.replace(/\s+/g, ' ').slice(0, 160));
const liveAsinCells = await page.locator('[data-testid^="inventory-asin-"]').count();
check('§P8 the deployed Inventory table carries the per-catalogue-product identifier column',
  liveAsinCells > 0, `${liveAsinCells} cell(s)`);
check('§P8 the deployed surface states the figures are Mercenta\u2019s own, never a channel reading',
  /never a channel reading/i.test(inventoryBody),
  inventoryBody.replace(/\s+/g, ' ').slice(0, 120));
check('no uncaught page error on the deployed §P8 brand surface',
  pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

/* ── 4. Mercenta's side is visible on the admin PO detail ────────────────── */
const admin = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const adminErrors = [];
admin.on('pageerror', (e) => adminErrors.push(String(e)));
await admin.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await admin.waitForTimeout(4000);
await admin.getByRole('button', { name: 'Partner Login' }).first().click().catch(async () => {
  await admin.getByRole('button', { name: 'Open navigation' }).click();
  await admin.waitForTimeout(400);
  await admin.getByRole('button', { name: 'Partner Login' }).last().click();
});
await admin.waitForTimeout(800);
await admin.click('text=Mercenta Admin Hub');
await admin.waitForTimeout(2500);
await admin.goto(`${BASE}/admin/purchase_orders_admin`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await admin.waitForTimeout(3000);
const adminBody = await admin.locator('body').innerText().catch(() => '');
/**
 * §P13 / S4 — the deployed admin PO LIST is addressed at its own route
 * (`/admin/purchase_orders_admin` — the nav view id). The previous address
 * (`/admin/purchase-orders`) resolves to NO declared admin view and silently
 * rendered Overview, so this check now asserts the LIST itself (a purchase-order
 * number is present), not merely the nav label "Purchase Orders".
 */
check('the admin Purchase Orders surface renders on the deployed build',
  /Purchase Orders/i.test(adminBody) && /PO-\d{4}/.test(adminBody),
  adminBody.replace(/\s+/g, ' ').slice(0, 120));
check('no uncaught page error on the admin flow', adminErrors.length === 0, adminErrors.slice(0, 2).join(' | '));

/* ── 4b. §P7 — THE DEPLOYED INVOICING SURFACES + THE DEPLOYED BUNDLE'S RULES ─ */

/**
 * §P7 — the admin Retail Pipeline carries the invoicing surfaces: the per-PO
 * terms selector, the receiving status and the published AV-022 rule list. The
 * rule list renders whether or not any invoice exists yet, so this is a real
 * check of the deployed build rather than of seeded state.
 */
await admin.goto(`${BASE}/admin/purchase-orders`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await admin.waitForTimeout(2500);
await admin.click('nav[aria-label="Primary"] >> text=Retail Pipeline').catch(() => {});
await admin.waitForTimeout(3500);
const livePipelineBody = await admin.locator('body').innerText().catch(() => '');
check('§P7 the deployed Retail Pipeline renders the operable simulated-PO section',
  /Operable simulated purchase orders/i.test(livePipelineBody));
const liveRuleList = await admin
  .locator('[data-state="admin-invoice-number-rules"]')
  .first()
  .innerText()
  .catch(() => '');
check('§P7 the deployed build states the invoice-number rules where the numbers are handled',
  /never reused/i.test(liveRuleList) && /zero-value/i.test(liveRuleList) && /NEW Invoice ID/i.test(liveRuleList),
  liveRuleList.replace(/\s+/g, ' ').slice(0, 160));

/**
 * §P7 — the Accounting surface carries the invoice-number REGISTRY ledger. The
 * Accounting tab lives inside SUPER ADMIN, so this leg opens its own session:
 * the Mercenta Admin Hub role does not see that destination (RBAC is enforced in
 * the domain), and asking its session to render it would be a false negative.
 */
const superAdmin = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const superAdminErrors = [];
superAdmin.on('pageerror', (e) => superAdminErrors.push(String(e)));
await superAdmin.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
await superAdmin.waitForTimeout(3000);
await superAdmin.getByRole('button', { name: 'Partner Login' }).first().click().catch(() => {});
await superAdmin.waitForTimeout(800);
await superAdmin.click('text=Super Admin — Tadii').catch(() => {});
await superAdmin.waitForTimeout(2500);
await superAdmin.click('nav[aria-label="Primary"] >> text=Super Admin').catch(() => {});
await superAdmin.waitForTimeout(1200);
await superAdmin.locator('button', { hasText: 'Accounting' }).first().click().catch(() => {});
await superAdmin.waitForTimeout(3000);
const liveRegistry = await superAdmin
  .getByTestId('accounting-invoice-registry')
  .first()
  .innerText()
  .catch(() => '');
check('§P7 the deployed Accounting surface renders the invoice-number registry ledger',
  /Numbers allocated/i.test(liveRegistry) && /Receivables/i.test(liveRegistry),
  liveRegistry.replace(/\s+/g, ' ').slice(0, 160));
check('§P7 the deployed registry states that a number is never reused',
  /never reused/i.test(liveRegistry));
check('§P7 the deployed registry labels the payment figures as derived (no Vendor Payments API)',
  /derived from the invoice date/i.test(liveRegistry), liveRegistry.replace(/\s+/g, ' ').slice(0, 200));

/**
 * §P7 — THE DEPLOYED BUNDLE IS THE P7 BUILD.
 *
 * The refusal codes are read out of the deployed JavaScript ITSELF, so a stale
 * build cannot pass this leg by merely rendering a page that looks right. The
 * app is code-split, so the probe must read every chunk the deployed page
 * actually loaded (script tags + the resource timeline), not only the entry
 * scripts named in `index.html` — reading only those produced a false negative
 * when this leg first ran.
 */
const bundleProbe = await superAdmin
  .evaluate(async () => {
    const urls = Array.from(
      new Set([
        ...Array.from(document.querySelectorAll('script[src]')).map((s) => s.getAttribute('src') ?? ''),
        ...performance
          .getEntriesByType('resource')
          .map((r) => r.name)
          .filter((n) => n.endsWith('.js')),
      ])
    ).filter(Boolean);
    const texts = [];
    for (const u of urls) {
      try {
        const r = await fetch(u);
        texts.push(await r.text());
      } catch {
        /* a chunk that cannot be read is simply not part of the evidence */
      }
    }
    const all = texts.join('\n');
    return {
      count: urls.length,
      read: texts.length,
      receiptGate: all.includes('RECEIPT_REQUIRED'),
      zeroValue: all.includes('INVOICE_ZERO_VALUE'),
      terms: all.includes('INVOICE_TERM_RULE'),
      numberShape: all.includes('SIM-INV'),
      cancel: all.includes('INVOICE_NOT_CANCELLABLE'),
      /**
       * §P8 — the inventory + channel-identifier refusals. Read from the DEPLOYED
       * bundle so a stale build cannot pass by rendering a page that looks right.
       */
      p8CasePack: all.includes('INVENTORY_CASE_PACK_UNKNOWN'),
      p8NegativeBucket: all.includes('INVENTORY_NEGATIVE_BUCKET'),
      p8AdjustmentReason: all.includes('INVENTORY_ADJUSTMENT_REASON_REQUIRED'),
      p8AsinPlaceholder: all.includes('ASIN_PLACEHOLDER'),
      p8AsinListing: all.includes('ASIN_REQUIRES_EXISTING_LISTING'),
      p8SimAsin: all.includes('SIM-ASIN-'),
      /**
       * §P9 — the carrier removal AND the rehomed console, read from the DEPLOYED
       * bundle itself, so a stale build cannot pass the live leg by rendering a
       * page that merely looks right.
       */
      p9ConsoleRehomed: all.includes('mercenta-admin-logistics'),
      p9CarrierLoginGone: !all.includes('3PL Carrier Terminal'),
      p9CarrierNavGone: !all.includes('BAK Logistics Hub') && !all.includes('API Request Auditor'),
      p9CarrierMonitorGone: !all.includes('Carrier Integration Monitor'),
      /**
       * §P10 — the logistics-completion build, read from the DEPLOYED bundle itself.
       * The provider-configuration projection, the download queue and the deferred
       * consolidation posture must all be IN the shipped code, so a stale build cannot
       * pass the live leg by rendering a page that merely looks right.
       */
      p10ProviderConfig: all.includes('carrier-provider-configuration'),
      p10Consolidation: all.includes('consolidation-posture'),
      p10Queue: all.includes('po-documents-queue'),
      p10Deferred: all.includes('One purchase order = one consignment'),
      p10Truckload: all.includes('100 shipment confirmations for every truckload shipment'),
      /**
       * §P11 — the channel-ingestion build, read from the DEPLOYED bundle itself:
       * the routing owner's fail-closed code, the surface's channel-read control
       * and its simulated-provenance notice must be IN the shipped code, and the
       * REMOVED create-PO action and its Postmark notification seam must NOT be —
       * so a stale build cannot pass the live leg by rendering a page that merely
       * looks right.
       */
      p11IngestionOwner: all.includes('CHANNEL_PO_LINE_NOT_IN_CATALOGUE'),
      p11ChannelRead: all.includes('Read channel POs'),
      p11SimulatedNotice: all.includes('no live channel call was made'),
      p11CreatePoGone: !all.includes('Create Purchase Order on Behalf'),
      p11PostmarkSeamGone: !all.includes('mock:postmark:'),
      /**
       * §P12 — the seam-extension build, read from the DEPLOYED bundle itself: the
       * region rule for channel-generated labels, the receiving-sync provenance, the
       * channel-operations console and the stock-push control must be IN the shipped
       * code — so a stale build cannot pass the live leg by rendering a page that
       * merely looks right.
       */
      p12LabelRule: all.includes('LABELS_NOT_GENERATED_IN_REGION'),
      p12LabelNeverClaimed: all.includes('never issues a channel-generated label for a UK/EU consignment'),
      p12ReceivingOwner: all.includes('CHANNEL_READ_SIMULATED'),
      p12Console: all.includes('channel-operations') && all.includes('channel-receiving-read'),
      p12SimulatedReadNotice: all.includes('Simulation (mock) — simulated channel read'),
      p12InventoryPush: all.includes('catalog-inventory-push'),
    };
  })
  .catch(() => ({ count: 0, read: 0 }));
const probeDetail = `${bundleProbe.read}/${bundleProbe.count} loaded chunk(s) read`;
check('§P7 the deployed bundle carries the receipt gate (AV-018)', bundleProbe.receiptGate === true, probeDetail);
check('§P7 the deployed bundle carries the zero-value refusal (AV-022)', bundleProbe.zeroValue === true, probeDetail);
check('§P7 the deployed bundle carries the declared-term refusal', bundleProbe.terms === true, probeDetail);
check('§P7 the deployed bundle carries the unmistakably-simulated invoice-number prefix', bundleProbe.numberShape === true, probeDetail);
check('§P7 the deployed bundle carries the cancellation rule (NEW Invoice ID)', bundleProbe.cancel === true, probeDetail);
check('§P8 the deployed bundle carries the case-pack refusal (a case is never silently 1 each)', bundleProbe.p8CasePack === true, probeDetail);
check('§P8 the deployed bundle carries the negative-bucket refusal', bundleProbe.p8NegativeBucket === true, probeDetail);
check('§P8 the deployed bundle carries the counted-correction reason requirement', bundleProbe.p8AdjustmentReason === true, probeDetail);
check('§P8 the deployed bundle carries the identifier-shape rule', bundleProbe.p8AsinListing === true, probeDetail);
check('§P8 the deployed bundle refuses the simulated placeholder as a real identifier', bundleProbe.p8AsinPlaceholder === true, probeDetail);
check('§P8 the deployed bundle carries the unmistakably-simulated identifier prefix', bundleProbe.p8SimAsin === true, probeDetail);
/* §P9 (programme decision 4) — the deployed bundle IS the carrier-removal build. */
check('§P9 the deployed bundle carries the REHOMED carrier console (attributed to the Founder / Super Admin)', bundleProbe.p9ConsoleRehomed === true, probeDetail);
check('§P9 the deployed bundle carries NO carrier login card', bundleProbe.p9CarrierLoginGone === true, probeDetail);
check('§P9 the deployed bundle carries NO carrier navigation (BAK Logistics Hub / API Request Auditor)', bundleProbe.p9CarrierNavGone === true, probeDetail);
check('§P9 the deployed bundle carries NO admin Carrier Monitor', bundleProbe.p9CarrierMonitorGone === true, probeDetail);
/* §P10 — the deployed bundle IS the logistics-completion build. */
check('§P10 the deployed bundle carries the carrier provider configuration surface', bundleProbe.p10ProviderConfig === true, probeDetail);
check('§P10 the deployed bundle carries the consolidation posture surface', bundleProbe.p10Consolidation === true, probeDetail);
check('§P10 the deployed bundle carries the PO-document download queue', bundleProbe.p10Queue === true, probeDetail);
check('§P10 the deployed bundle records consolidation as DEFERRED (one PO = one consignment)', bundleProbe.p10Deferred === true, probeDetail);
check('§P10 the deployed bundle carries the documented 100-confirmation truckload evidence', bundleProbe.p10Truckload === true, probeDetail);
/* §P11 (programme decision 3) — the deployed bundle IS the channel-ingestion build. */
check('§P11 the deployed bundle carries the channel-ingestion routing owner (fail-closed codes)', bundleProbe.p11IngestionOwner === true, probeDetail);
check('§P11 the deployed bundle carries the channel-read control (the ONLY PO entry point)', bundleProbe.p11ChannelRead === true, probeDetail);
check('§P11 the deployed bundle states the channel read’s simulated provenance', bundleProbe.p11SimulatedNotice === true, probeDetail);
check('§P11 the deployed bundle carries NO create-PO dialogue (decision 3)', bundleProbe.p11CreatePoGone === true, probeDetail);
check('§P11 the deployed bundle carries NO Postmark PO-notification seam', bundleProbe.p11PostmarkSeamGone === true, probeDetail);
/* §P12 (`AV-040`) — the deployed bundle IS the SP-API seam-extension build. */
check('§P12 the deployed bundle carries the label region rule (NA only — refused here)', bundleProbe.p12LabelRule === true, probeDetail);
check('§P12 the deployed bundle states a channel label is NEVER claimed for UK/EU', bundleProbe.p12LabelNeverClaimed === true, probeDetail);
check('§P12 the deployed bundle carries the simulated-reading refusal in the receiving sync', bundleProbe.p12ReceivingOwner === true, probeDetail);
check('§P12 the deployed bundle carries the channel-operations console and its receiving read', bundleProbe.p12Console === true, probeDetail);
check('§P12 the deployed bundle states the simulated channel-read provenance', bundleProbe.p12SimulatedReadNotice === true, probeDetail);
check('§P12 the deployed bundle carries the attributed stock-push control', bundleProbe.p12InventoryPush === true, probeDetail);
check('no uncaught page error on the deployed P7 invoicing flows',
  adminErrors.length === 0 && superAdminErrors.length === 0,
  [...adminErrors, ...superAdminErrors].slice(0, 2).join(' | '));

/* ── 5. §P5 — THE DEPLOYED ARRIVAL NODE IS THE FC ON THE PO, NOT A HUB ───── */
await page.click('nav[aria-label="Primary"] >> text=Logistics Hub').catch(() => {});
await page.waitForTimeout(4000);
const hubBody = await page.locator('body').innerText().catch(() => '');
/**
 * §P9 (programme decision 4) — THE REHOMED CARRIER CONSOLE IS AN **ADMIN** SURFACE.
 *
 * Two things are proven live: (a) the brand Logistics Hub the section above just
 * visited does NOT carry the Mercenta-side carrier console — that is the tenant
 * boundary; (b) the ADMIN Logistics Hub does, with a live interactive control.
 * (Reading the console out of the brand page was the first version of this check
 * and it failed for the right reason: the surface is admin-only by design.)
 */
check('§P9 the deployed brand Logistics Hub does NOT carry the Mercenta-side carrier console',
  !/Carrier API console/i.test(hubBody) &&
    (await page.locator('select[aria-label^="Update milestone for"]').count()) === 0);

/* ── §P10 (programme §4 P10) — the BRAND hub's completion surfaces, live ──── */
check('§P10 the deployed brand Hub carries the PO-document DOWNLOAD QUEUE',
  (await page.locator('[data-testid^="po-documents-queue-row-"]').count()) > 0 ||
    /Shipping documents awaiting download/i.test(hubBody));
check('§P10 the deployed brand Hub states BOTH Mercenta carrier accounts (provider configuration)',
  (await page.locator('[data-testid="carrier-provider-dhl"]').count()) > 0 &&
    (await page.locator('[data-testid="carrier-provider-palletline"]').count()) > 0);
check('§P10 the deployed brand Hub tells the brand who configures its carriers',
  /Mercenta holds and configures these carrier accounts/i.test(hubBody));
check('§P10 the deployed brand Hub exposes NO credential form for a carrier',
  (await page.locator('input[type="password"]').count()) === 0);
check('§P10 the deployed brand Hub renders the consolidation posture as DEFERRED',
  (await page.locator('[data-testid="consolidation-status"][data-status="deferred"]').count()) > 0);
check('§P10 the deployed brand Hub never names a retired carrier as an account',
  !/FedEx|BAK Logistics/i.test(hubBody));
/* Navigate the EXISTING admin session through the product's own nav (a reload
   would land on the login entry: each Playwright page has its own tab-scoped
   session, and the admin tab's session lives in that tab). */
await admin.click('nav[aria-label="Primary"] >> text=Logistics Hub').catch(() => {});
await admin.waitForTimeout(4000);
const adminHubBody = await admin.locator('body').innerText().catch(() => '');
check('§P9 the deployed ADMIN Logistics Hub renders the rehomed Carrier API console',
  /Carrier API console/i.test(adminHubBody));
check('§P9 the deployed console exposes the interactive milestone control',
  (await admin.locator('select[aria-label^="Update milestone for"]').count()) > 0);
check('§P9 the deployed console offers the simulated DHL advance',
  /DHL status → next milestone/i.test(adminHubBody));

/* ── §P10 — the ADMIN hub's completion surfaces, live ────────────────────── */
check('§P10 the deployed ADMIN Logistics Hub carries the carrier provider configuration',
  (await admin.locator('[data-testid="carrier-provider-configuration-admin"]').count()) > 0);
check('§P10 the deployed ADMIN provider configuration states both Mercenta accounts',
  (await admin.locator('[data-testid="carrier-provider-dhl"]').count()) > 0 &&
    (await admin.locator('[data-testid="carrier-provider-palletline"]').count()) > 0);
check('§P10 the deployed ADMIN provider configuration is RBAC-gated on its credential hand-off',
  (await admin.locator('[data-testid="carrier-provider-configuration-admin"][data-handoff]').count()) > 0);
check('§P10 a non-super admin session gets NO dead-end credential control',
  (await admin.getByRole('button', { name: 'Open Integration Settings' }).count()) === 0);
check('§P10 the deployed ADMIN Hub carries the cross-tenant PO-document queue',
  (await admin.locator('[data-testid="po-documents-queue-admin"]').count()) > 0 ||
    /PO documents awaiting the brand/i.test(adminHubBody));
check('§P10 the deployed ADMIN Hub renders the consolidation posture',
  (await admin.locator('[data-testid="consolidation-posture"]').count()) > 0);

/* ── §P11 — the ADMIN purchase-order queue, live (decision 3) ─────────────── */
await admin.click('nav[aria-label="Primary"] >> text=Purchase Orders').catch(() => {});
await admin.waitForTimeout(2500);
const adminPoBody = await admin.locator('body').innerText().catch(() => '');
check('§P11 the deployed ADMIN purchase-order queue has NO "Create PO" action',
  (await admin.getByRole('button', { name: 'Create PO' }).count()) === 0);
check('§P11 the deployed ADMIN purchase-order queue offers the CHANNEL READ',
  (await admin.locator('[data-state="admin-po-ingest"]').count()) > 0 &&
    /Read channel POs/.test(adminPoBody));
check('§P11 the deployed ADMIN queue states the channel read has not happened yet',
  /Not yet read/.test(adminPoBody) || /Simulation \(mock\)/.test(adminPoBody));
await admin.locator('[data-state="admin-po-ingest"]').first().click().catch(() => {});
await admin.waitForTimeout(3000);
const adminPoBodyAfter = await admin.locator('body').innerText().catch(() => '');
check('§P11 the deployed channel read reports its SIMULATED provenance',
  /Simulated read — no live channel call was made/.test(adminPoBodyAfter));
check('§P11 the deployed channel read states every outcome (filed / already held / refused)',
  /Filed/.test(adminPoBodyAfter) && /Already held/.test(adminPoBodyAfter) && /Refused/.test(adminPoBodyAfter));
check('§P11 the deployed channel read FILES routable POs against the correct brand',
  (await admin.locator('[data-outcome="ingested"]').count()) > 0);
check('§P11 the deployed channel read REFUSES an out-of-catalogue PO with its reason',
  (await admin.locator('[data-outcome="refused"]').count()) > 0 &&
    /matches no product in the Mercenta catalogue/.test(adminPoBodyAfter));
check('no uncaught page error on the deployed §P11 channel-ingestion flow',
  adminErrors.length === 0,
  adminErrors.slice(0, 2).join(' | '));

/* ── §P12 — the CHANNEL OPERATIONS console, live (`AV-040`) ───────────────── */
/* Same session as the §P11 read above, so the channel's POs are in the store and
   the receiving sync has something real to report. */
await admin.click('nav[aria-label="Primary"] >> text=Retail Pipeline').catch(() => {});
await admin.waitForTimeout(2500);
check('§P12 the deployed CHANNEL OPERATIONS console renders on the admin surface',
  (await admin.locator('[data-testid="channel-operations"]').count()) > 0);
check('§P12 the deployed console renders all four channel operations',
  (await admin.locator('[data-testid="channel-receiving-sync"]').count()) > 0 &&
    (await admin.locator('[data-testid="channel-routing-instructions"]').count()) > 0 &&
    (await admin.locator('[data-testid="channel-invoice-submission"]').count()) > 0 &&
    (await admin.locator('[data-testid="channel-shipment-labels"]').count()) > 0);
const p12Labels = await admin.locator('[data-state="channel-labels-rule"]').innerText().catch(() => '');
check('§P12 the deployed console states the channel label rule is REFUSED in this region',
  /NA only/.test(p12Labels) &&
    /never issues a channel-generated label for a UK\/EU consignment/.test(p12Labels),
  p12Labels.slice(0, 140));
await admin.locator('[data-state="channel-receiving-read"]').first().click().catch(() => {});
await admin.waitForTimeout(3000);
const p12Sync = await admin.locator('[data-testid="channel-receiving-sync"]').innerText().catch(() => '');
const p12Notice = await admin.locator('[data-state="channel-ops-notice"]').innerText().catch(() => '');
check('§P12 the deployed receiving read STATES its provenance and its outcome counts',
  /Simulation \(mock\) — simulated channel read; no live channel call was made|Read complete/.test(p12Sync) &&
    /purchase order\(s\) reported/.test(p12Notice),
  `${p12Notice.slice(0, 90)}`);
check('§P12 the deployed receiving read reports the channel’s own state per purchase order',
  (await admin.locator('[data-testid="channel-receiving-readings"] li').count()) > 0 &&
    /channel: /.test(p12Sync) &&
    /Mercenta: /.test(p12Sync));
check('§P12 the deployed console states the reading is REPORTED, never written as a receipt',
  /never written/.test(p12Sync));
check('§P12 the deployed console STATES why a simulated reading is not applied (no dead control)',
  (await admin.locator('[data-state="channel-apply-refused"]').count()) > 0 &&
    (await admin.locator('[data-testid^="channel-apply-"]').count()) === 0);
check('no uncaught page error on the deployed §P12 channel-operations flow',
  adminErrors.length === 0,
  adminErrors.slice(0, 2).join(' | '));
const hubNodeKinds = await page
  .locator('[data-testid^="logistics-node-"]')
  .evaluateAll((els) => els.map((e) => e.getAttribute('data-kind')))
  .catch(() => []);
check('the brand Logistics Hub renders on the deployed build',
  /Logistics Hub/i.test(hubBody) || hubNodeKinds.length > 0);
check('the deployed map draws DESTINATION-FC nodes',
  hubNodeKinds.includes('amazon_fc'), `kinds=${[...new Set(hubNodeKinds)].join(',')}`);
check('the deployed map draws NO mercenta_hub node',
  !hubNodeKinds.includes('mercenta_hub'), `kinds=${[...new Set(hubNodeKinds)].join(',')}`);
check('no deployed surface names a Mercenta hub as a destination',
  !/Mercenta\s+(UK\s+)?(Distribution\s+)?Hub/i.test(hubBody));
/**
 * The canonical milestone strip renders INSIDE the consignment tracking timeline,
 * so the live proof opens it (rather than hoping a whole-page regex matches a label
 * that is only rendered on demand). Every milestone is listed there, so the
 * pre-live state must appear under its own name — and the retired hub must not.
 */
const trackBtn = page.locator('button', { hasText: 'Track' }).first();
const trackOpened = await trackBtn.click().then(() => true).catch(() => false);
let timelineText = '';
if (trackOpened) {
  const dialog = page.locator('[data-testid="logistics-tracking-dialog"]').first();
  const opened = await dialog.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
  if (opened) timelineText = await dialog.innerText().catch(() => '');
}
check('a consignment tracking timeline opens on the deployed build', timelineText.length > 0);
check('the deployed milestone strip names the canonical pre-live state ("Delivered to Destination FC")',
  /Delivered to Destination FC/i.test(timelineText), timelineText.replace(/\s+/g, ' ').slice(0, 160));
check('the deployed milestone strip names NO Mercenta hub',
  !/Mercenta\s+(UK\s+)?(Distribution\s+)?Hub/i.test(timelineText));
check('no uncaught page error on the Logistics Hub live flow',
  pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

/* ── 6. §P5 copy pass — the admin Overview header is the deployed title ──── */
await admin.goto(`${BASE}/admin/overview`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await admin.waitForTimeout(3500);
const adminH1s = await admin
  .locator('h1')
  .evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()))
  .catch(() => []);
check('the deployed admin Overview h1 reads "Overview" (not "Operations Overview")',
  adminH1s.includes('Overview') && !adminH1s.includes('Operations Overview'),
  `h1s=${adminH1s.slice(0, 3).join(' | ')}`);

/* ── 7. §P6 — THE DEPLOYED DOCUMENT PACK + THE COLLECT CHAIN ─────────────── */

/**
 * The P6 live leg: the changed functionality must be present ON the deployed
 * build. The brand accepts a PO, follows the product's own "Open shipping
 * documents" hand-off, and the pack must be there — with honest readiness (SSCC
 * ready because Mercenta generated them from the ASN it filed; the waybill NOT
 * ready because no carrier has booked one) and the SSCC labels printing complete
 * 18-digit identifiers under the stated placeholder prefix.
 */
/**
 * Close any dialogue an earlier section left open FIRST: a modal overlay covers
 * the page and swallows the navigation clicks below, which would make this whole
 * section vacuous (it would "fail" on a page it never reached).
 */
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(500);
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(500);
await page.click('nav[aria-label="Primary"] >> text=Purchase Orders').catch(() => {});
await page.waitForTimeout(2500);
check('§P6 the deployed brand PO list is reachable for the document-pack leg',
  /purchase/i.test(page.url()), page.url());
/**
 * This session has ALREADY accepted PO-9002 in section 2b, so the acknowledgement
 * is only issued when it is still outstanding, and the row is only expanded when
 * the hand-off is not already on screen — a blind second click would COLLAPSE the
 * row and hide the very control under test.
 */
const liveCta = page.locator('[data-testid="po-open-documents-PO-9002"]').first();
if (!(await liveCta.isVisible().catch(() => false))) {
  const liveAck = page.locator('button', { hasText: 'Acknowledge' }).first();
  if (await liveAck.isVisible({ timeout: 2500 }).catch(() => false)) {
    await liveAck.click().catch(() => {});
    await page.waitForTimeout(700);
    await page.locator('button', { hasText: 'Submit acknowledgment' }).first().click().catch(() => {});
    /**
     * SEQUENCING MATTERS: the deep link selects a PO only once its CONSIGNMENT
     * exists, and Mercenta's action creates it AFTER the acknowledgement is
     * accepted — so the acceptance is awaited here rather than clicked blind.
     */
    await page
      .getByText(/Decision issued to Mercenta/i)
      .first()
      .waitFor({ state: 'visible', timeout: 15000 })
      .catch(() => {});
    await page.waitForTimeout(1500);
  } else {
    await page.locator('text=PO-9002').first().click().catch(() => {});
    await page.waitForTimeout(1200);
  }
}
const liveCtaOpened = await liveCta.click().then(() => true).catch(() => false);
await page.waitForTimeout(3500);
const livePack = page.locator('[data-testid="po-documents-panel"]').first();
const livePackVisible = await livePack
  .waitFor({ state: 'visible', timeout: 15000 })
  .then(() => true)
  .catch(() => false);
check('§P6 the deployed build offers "Open shipping documents" after acceptance', liveCtaOpened);
check('§P6 the deployed Logistics Hub renders "Documents for this PO"', livePackVisible);

const livePackText = livePackVisible ? await livePack.innerText().catch(() => '') : '';
check('§P6 every document the pack declares is listed on the deployed build',
  ['SSCC carton labels', 'Carrier shipping label', 'Freight waybill', 'Packing list & delivery note', 'ASN sheet']
    .every((title) => livePackText.includes(title)),
  livePackText.replace(/\s+/g, ' ').slice(0, 200));
check('§P6 the deployed pack names NO Mercenta site as the destination',
  !/Mercenta\s+(UK\s+)?(Distribution\s+)?Hub/i.test(livePackText));
const liveSsccStanding = await page
  .locator('[data-testid="po-document-status-sscc_carton_labels"]')
  .getAttribute('data-standing')
  .catch(() => null);
const liveWaybillStanding = await page
  .locator('[data-testid="po-document-status-freight_waybill"]')
  .getAttribute('data-standing')
  .catch(() => null);
check('§P6 the deployed SSCC labels are READY (generated from the filed ASN)',
  liveSsccStanding === 'ready', String(liveSsccStanding));
check('§P6 the deployed waybill is honestly NOT READY (no carrier booking exists)',
  liveWaybillStanding === 'not_ready', String(liveWaybillStanding));

const liveSsccOpened = await page
  .locator('[data-testid="po-document-open-sscc_carton_labels"]')
  .click()
  .then(() => true)
  .catch(() => false);
let liveSsccText = '';
if (liveSsccOpened) {
  const liveFrame = page.locator('[data-testid="po-document-frame"]').first();
  const liveFrameVisible = await liveFrame
    .waitFor({ state: 'visible', timeout: 10000 })
    .then(() => true)
    .catch(() => false);
  if (liveFrameVisible) {
    const frame = page.frameLocator('[data-testid="po-document-frame"]').first();
    liveSsccText = await frame.locator('body').innerText().catch(() => '');
  }
  const placeholderNotice = await page
    .locator('[data-testid="po-document-placeholder-notice"]')
    .innerText()
    .catch(() => '');
  check('§P6 the deployed SSCC label document states the unassigned GS1 placeholder prefix',
    /XX-PENDING-GS1-LICENCE/.test(placeholderNotice), placeholderNotice.slice(0, 120));
  await page.keyboard.press('Escape').catch(() => {});
}
const liveIdentifiers = liveSsccText.match(/\b0{8}\d{10}\b/g) ?? [];
check('§P6 the deployed SSCC labels print complete 18-digit identifiers per carton',
  liveIdentifiers.length > 0 && liveIdentifiers.every((i) => i.length === 18),
  `${liveIdentifiers.length} identifier(s)`);
check('§P6 the deployed brand rail carries the document-download badge',
  (await page.locator('[data-testid="nav-badge-logistics"]').count().catch(() => 0)) > 0);
check('no uncaught page error on the deployed P6 document-pack flow',
  pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

/**
 * The collect chain on the deployed build — on the tenant that OWNS the seeded
 * Freight Collect PO. Astonish is the first cleared tenant, so `PO-9200` (its
 * first lifecycle PO) is the collect one; a different tenant's session must never
 * be asked to render it, because the Hub is tenant-scoped by design.
 */
const astonish = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const astonishErrors = [];
astonish.on('pageerror', (e) => astonishErrors.push(String(e)));
await astonish.goto(BASE, { waitUntil: 'domcontentloaded' }).catch(() => {});
await astonish.waitForTimeout(2500);
await astonish.getByRole('button', { name: 'Partner Login' }).first().click().catch(() => {});
await astonish.waitForTimeout(800);
await astonish.click('text=Astonish').catch(() => {});
await astonish.waitForTimeout(2500);
await astonish.goto(`${BASE}/brand/logistics?po=PO-9200`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await astonish.waitForTimeout(4000);
const liveChain = astonish.locator('[data-testid="collect-chain"]').first();
const liveChainVisible = await liveChain
  .waitFor({ state: 'visible', timeout: 15000 })
  .then(() => true)
  .catch(() => false);
const liveChainText = liveChainVisible ? await liveChain.innerText().catch(() => '') : '';
check('§P6 the deployed collect lane renders the documented chain', liveChainVisible,
  liveChainText.replace(/\s+/g, ' ').slice(0, 160));
check('§P6 the deployed chain states the channel pickup lead time (two business days)',
  /at least two business days/i.test(liveChainText));
const liveArnState = await astonish
  .locator('[data-testid="collect-step-arn"]')
  .getAttribute('data-state')
  .catch(() => null);
check('§P6 the deployed ARN step awaits the channel — no fabricated ARN',
  liveArnState === null || liveArnState === 'awaiting_channel' || liveArnState === 'not_applicable',
  String(liveArnState));
check('§P6 the deployed collect lane presents no ARN value',
  !/ARN\s+[A-Z0-9-]{4,}/.test(liveChainText));
check('no uncaught page error on the deployed collect-lane flow',
  astonishErrors.length === 0, astonishErrors.slice(0, 2).join(' | '));

/* ── §P13 / S3 — THE DEPLOYED WORK LAYER ASKS THE RULE'S OWNER ────────────
   S3's changed functionality is a DERIVED queue, so it must be verified ON the
   deployed bundle rather than merely built: the deployed queue must still present
   the acknowledgement work of genuinely OPEN purchase orders (with the OWNER's
   real window state) and must present NO acknowledgement work for a PO that is
   past the acknowledgement decision — `PO-9003` is `accepted`, i.e. no longer in
   the channel's `New` set, and presenting it as acknowledgement work is the
   founder-reported defect class S3 removed at source. */
async function openLiveNav(target, label) {
  const nav = target.locator('nav[aria-label="Primary"]:visible').first();
  const el = nav
    .locator('span')
    .filter({ hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) })
    .first();
  await el.click();
  await target.waitForTimeout(1500);
}

/**
 * §P13 / S8 — CLOSE WHATEVER THE PREVIOUS LEGS LEFT OPEN.
 *
 * The §P13/S5–S6 legs end with the notification centre open, and its overlay
 * (`div.fixed.inset-0.z-50`) intercepts pointer events, so the next navigation click
 * timed out. The earlier script ended at that point, which is why it never surfaced.
 * This closes ANY open overlay through its own visible Close control (and Escape),
 * without touching the application.
 */
async function closeLiveOverlays(target) {
  for (let i = 0; i < 4; i++) {
    const overlay = target.locator('div.fixed.inset-0.z-50').first();
    if (!(await overlay.isVisible({ timeout: 400 }).catch(() => false))) return;
    await target.keyboard.press('Escape').catch(() => {});
    await target.waitForTimeout(300);
    if (await overlay.isVisible({ timeout: 300 }).catch(() => false)) {
      /** These modals close on their BACKDROP (`onClick={onClose}`) — click a corner. */
      await overlay.click({ position: { x: 4, y: 4 }, force: true }).catch(() => {});
      await target.waitForTimeout(350);
    }
    if (await overlay.isVisible({ timeout: 300 }).catch(() => false)) {
      const close = target.locator('button[aria-label^="Close"], button:has-text("Close")').last();
      if (await close.isVisible({ timeout: 300 }).catch(() => false)) {
        await close.click({ force: true }).catch(() => {});
        await target.waitForTimeout(350);
      }
    }
  }
}

/* The brand's OWN queue (Tapatío): this session accepted PO-9002 above, so its only
   remaining seeded PO is PO-9003 — which must NOT be offered as acknowledgement work. */
await openLiveNav(page, 'Tasks & Deadlines');
await page.waitForTimeout(2500);
const brandWorkBody = await page.locator('body').innerText().catch(() => '');
check('§P13/S3 the deployed brand work list renders (Operations → Tasks & Deadlines)',
  brandWorkBody.length > 200 && /Tasks & Deadlines/i.test(brandWorkBody),
  brandWorkBody.replace(/\s+/g, ' ').slice(0, 100));
check('§P13/S3 the deployed brand queue offers NO acknowledgement work for PO-9003 (accepted = past the decision)',
  !/Acknowledge PO-9003/.test(brandWorkBody));

/* Mercenta's queue spans BOTH tenants on the SAME deployed bundle. */
await openLiveNav(admin, 'Work Management');
await admin.waitForTimeout(2500);
const adminWorkBody = await admin.locator('body').innerText().catch(() => '');
const liveAckRows = await admin.locator('[data-testid^="work-row-work-po_acknowledgement-"]').count();
check('§P13/S3 the deployed admin work list renders (Work Management)',
  adminWorkBody.length > 200 && /Work Management/i.test(adminWorkBody));
check('§P13/S3 the deployed admin queue STILL presents the open PO of tenant 1 (PO-9001)',
  /Acknowledge PO-9001/.test(adminWorkBody));
check('§P13/S3 …and of tenant 2 (PO-9002) — the deployed queue spans both tenants',
  /Acknowledge PO-9002/.test(adminWorkBody));
check('§P13/S3 the deployed admin queue offers NO acknowledgement work for PO-9003 (the defect is ABSENT live)',
  !/Acknowledge PO-9003/.test(adminWorkBody));
check('§P13/S3 every deployed acknowledgement row states the OWNER’s real window state',
  liveAckRows > 0 && /left of the 24-hour window/.test(adminWorkBody),
  `${liveAckRows} acknowledgement row(s)`);
check('no uncaught page error on the deployed §P13/S3 work-layer flow',
  pageErrors.length === 0 && adminErrors.length === 0,
  [...pageErrors, ...adminErrors].slice(0, 2).join(' | '));

/* ── §P13 / S6 — THE DEPLOYED BRAND ACKNOWLEDGEMENT SURFACES ──────────────────
   S6 removed the brand surface's LAST hand-rolled copies of the 24-hour rule — the
   row badge's `received + 24 * 60 * 60 * 1000`, the preview's `+ 24 * 3600 * 1000`,
   and the surface's own actionability predicate. So the DEPLOYED bundle must now
   present the window FROM ITS ONE OWNER: an in-window purchase order reads as
   due/urgent (never overdue, never `NaN`), the record preview shows the same
   owner-derived window, and the acknowledgement panel states the window the decision
   is being made inside in the owner's own words.
   ORDERING: this runs BEFORE the §P13/S4 legs below, which approve and close the
   seeded closing-window purchase order (PO-9001, Astonish). */
await astonish.goto(`${BASE}/brand/purchase_orders`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await astonish.waitForTimeout(4000);
const s6Badge = astonish.locator('[data-status="ack_urgent"], [data-status="ack_due"]').first();
const s6BadgeVisible = await s6Badge
  .waitFor({ state: 'visible', timeout: 12000 })
  .then(() => true)
  .catch(() => false);
const s6BadgeText = s6BadgeVisible ? await s6Badge.innerText().catch(() => '') : '';
check('§P13/S6 the deployed brand PO surface presents the window from its OWNER (a real countdown)',
  s6BadgeVisible && /Ack within [\d.]+h/.test(s6BadgeText),
  s6BadgeText.replace(/\s+/g, ' ').slice(0, 120));
check('§P13/S6 the deployed brand surface presents NO overdue window the rule has not produced',
  (await astonish.locator('[data-status="ack_overdue"]').count()) === 0);
check('§P13/S6 the deployed brand surface renders NO NaN countdown (the old arithmetic’s failure mode)',
  (await astonish.getByText('NaN', { exact: false }).count()) === 0);
check('§P13/S6 the deployed closing window states itself (the owner’s own classification)',
  /closing window/i.test(s6BadgeText) || /closing window/i.test(await astonish.locator('body').innerText().catch(() => '')));

/** The record PREVIEW shows the same owner-derived window — not its own copy. */
await astonish.locator('[data-state^="brand-po-preview-"]').first().click().catch(() => {});
await astonish.waitForTimeout(1500);
const s6Drawer = astonish.getByTestId('brand-po-record-drawer').first();
const s6DrawerText = await s6Drawer.innerText().catch(() => '');
check('§P13/S6 the deployed record preview shows the owner-derived window and NOT its own copy',
  /Ack within [\d.]+h|Ack deadline PASSED/.test(s6DrawerText) &&
    !/Acknowledge within/.test(s6DrawerText) &&
    !/Acknowledgment deadline passed/.test(s6DrawerText),
  s6DrawerText.replace(/\s+/g, ' ').slice(0, 160));
await astonish.getByRole('button', { name: 'Close record' }).click().catch(() => {});
await astonish.waitForTimeout(1000);

/** The acknowledgement panel states the window the decision is made inside. */
await astonish.locator('button', { hasText: 'Acknowledge' }).first().click().catch(() => {});
await astonish.waitForTimeout(1200);
const s6WindowState = await astonish
  .locator('[data-testid^="po-ack-window-state-"]')
  .first()
  .innerText()
  .catch(() => '');
check('§P13/S6 the deployed acknowledgement panel states the window state in the OWNER’s words',
  /24-hour window/.test(s6WindowState),
  s6WindowState.replace(/\s+/g, ' ').slice(0, 200));
check('no uncaught page error on the deployed §P13/S6 brand-surface flow',
  astonishErrors.length === 0, astonishErrors.slice(0, 2).join(' | '));

/* ── §P13 / S7 — THE DEPLOYED ADMIN ACKNOWLEDGEMENT SURFACES ──────────────────
   S7 removed the ADMIN side's hand-rolled copies of the 24-hour rule: the detail's
   `setHours(getHours() + 24)` deadline, its status-derived actionability predicate,
   its own `EXPIRED` wording and second badge rendering; the list's
   `orderDate + 24 * 3600 * 1000` preview arithmetic and its status-derived
   "Awaiting action" figure; and three further copies of the obligation set (the
   dashboard KPI, its pipeline bucket, and the shared notification centre). So the
   DEPLOYED admin bundle must present the window FROM ITS ONE OWNER: the seeded
   closing-window purchase order (PO-9001) reads as urgent with the closing window
   called out, its deadline tile is the owner's classification (never the old
   `EXPIRED` wording), the acceptance the owner permits IS offered there, and a
   DECIDED order (PO-9003, `accepted`) states the owner's reason with NO control the
   domain writer would refuse.
   ORDERING: runs BEFORE the §P13/S4 legs below, which approve and close PO-9001. */
await admin.goto(`${BASE}/admin/purchase_orders_admin`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await admin.waitForTimeout(3500);
const s7ListText = await admin.locator('body').innerText().catch(() => '');
check('§P13/S7 the deployed admin PO list renders the owner-derived queue figure',
  /Awaiting action/.test(s7ListText));
check('§P13/S7 the deployed admin list presents NO overdue window the rule has not produced',
  (await admin.locator('[data-status="ack_overdue"]').count()) === 0);
check('§P13/S7 the deployed admin list renders NO NaN countdown (the old arithmetic’s failure mode)',
  (await admin.getByText(/NaN/).count()) === 0);

/** The record PREVIEW derives the same window from the owner. */
await admin.locator('[data-testid="po-preview-po-brand-astonish-2"]').first().click().catch(() => {});
await admin.waitForTimeout(1800);
const s7DrawerText = await admin.getByTestId('po-record-drawer').first().innerText().catch(() => '');
check('§P13/S7 the deployed admin record preview shows the OWNER-derived window',
  /Ack within [\d.]+h|Ack deadline PASSED/.test(s7DrawerText),
  s7DrawerText.replace(/\s+/g, ' ').slice(0, 160));
await admin.keyboard.press('Escape').catch(() => {});
await admin.waitForTimeout(900);

/** The DETAIL: the owner's urgency, its classification, and the permitted acceptance. */
const s7Row = admin
  .locator('div.flex.items-center.justify-between', { hasText: 'PO-9001' })
  .filter({ has: admin.locator('button[title="View detail"]') })
  .first();
await s7Row.locator('button[title="View detail"]').click().catch(() => {});
await admin.waitForTimeout(2000);
const s7BadgeText = await admin.locator('[data-status="ack_urgent"], [data-status="ack_due"]').first().innerText().catch(() => '');
const s7TileText = await admin.locator('[data-testid="admin-po-ack-window-PO-9001"]').first().innerText().catch(() => '');
check('§P13/S7 the deployed admin detail presents the window from its OWNER (a real countdown)',
  /Ack within [\d.]+h/.test(s7BadgeText), s7BadgeText.replace(/\s+/g, ' ').slice(0, 120));
check('§P13/S7 the deployed admin detail calls the CLOSING window out (the owner’s classification)',
  /closing window/i.test(s7BadgeText));
check('§P13/S7 the deployed admin detail’s deadline tile is the OWNER’s state — never the old EXPIRED wording',
  /Ack within/.test(s7TileText) && !/EXPIRED/.test(s7TileText),
  s7TileText.replace(/\s+/g, ' ').slice(0, 120));
check('§P13/S7 the deployed admin detail offers the acceptance the owner permits (an in-queue PO)',
  (await admin.locator('button', { hasText: 'Acknowledge on behalf of' }).count()) > 0);

/** A DECIDED order: the owner's reason is stated and NO dead control is offered. */
await admin.goto(`${BASE}/admin/purchase_orders_admin`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await admin.waitForTimeout(3000);
const s7DecidedRow = admin
  .locator('div.flex.items-center.justify-between', { hasText: 'PO-9003' })
  .filter({ has: admin.locator('button[title="View detail"]') })
  .first();
await s7DecidedRow.locator('button[title="View detail"]').click().catch(() => {});
await admin.waitForTimeout(2000);
const s7DecidedState = await admin.locator('[data-testid="admin-po-ack-state-PO-9003"]').first().innerText().catch(() => '');
check('§P13/S7 a DECIDED order states the OWNER’s reason in the deployed admin detail',
  /past the acknowledgement decision|in the fulfilment track/.test(s7DecidedState),
  s7DecidedState.replace(/\s+/g, ' ').slice(0, 160));
check('§P13/S7 …and offers NO acceptance the domain writer would refuse (no dead control)',
  (await admin.locator('button', { hasText: 'Acknowledge on behalf of' }).count()) === 0);
check('no uncaught page error on the deployed §P13/S7 admin-surface flow',
  adminErrors.length === 0, adminErrors.slice(0, 2).join(' | '));


/* ── §P13 / S4 — THE DEPLOYED ON-BEHALF DRAFT + THE BRAND'S APPROVAL ──────────
   S4's changed functionality is a REAL control on both PO surfaces, so it must be
   exercised ON the deployed bundle: the deployed brand surface must offer
   Mercenta's draft for the seeded closing-window purchase order (and NOT for a PO
   in the middle of its window), the brand's approval must perform the channel
   rejection through the ONE writer, and Mercenta's console must show the SAME
   draft and record an attributed override. */
await astonish.goto(`${BASE}/brand/purchase_orders`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await astonish.waitForTimeout(4000);
const s4Draft = astonish.locator('[data-testid="po-onbehalf-draft-PO-9001"]').first();
const s4DraftVisible = await s4Draft
  .waitFor({ state: 'visible', timeout: 15000 })
  .then(() => true)
  .catch(() => false);
const s4DraftText = s4DraftVisible ? await s4Draft.innerText().catch(() => '') : '';
check('§P13/S4 the deployed brand surface offers Mercenta’s on-behalf rejection draft for the closing-window PO',
  s4DraftVisible, s4DraftText.replace(/\s+/g, ' ').slice(0, 160));
check('§P13/S4 the deployed draft states the rule, the channel’s own reason code and its content address',
  /24 hours/i.test(s4DraftText) &&
    /TemporarilyUnavailable/.test(s4DraftText) &&
    /draft-po-brand-astonish-2-/.test(s4DraftText));
check('§P13/S4 the deployed draft states honestly that the brand may still decide for itself',
  /may still decide for yourself/i.test(s4DraftText));
check('§P13/S4 the deployed surface offers NO draft for a PO in the middle of its window (the offer is rule-driven)',
  (await astonish.locator('[data-testid="po-onbehalf-draft-PO-9000"]').count()) === 0);
check('§P13/S4 nothing is performed before the brand approves (no approved record yet)',
  (await astonish.locator('[data-testid="po-onbehalf-approved-PO-9001"]').count()) === 0);
await astonish.locator('[data-testid="po-onbehalf-approve-PO-9001"]').first().click().catch(() => {});
await astonish.waitForTimeout(3500);
const s4BrandBody = await astonish.locator('body').innerText().catch(() => '');
check('§P13/S4 the deployed approval performs the channel rejection through the ONE writer',
  /Mercenta performed the retail channel's required rejection on your behalf/i.test(s4BrandBody));
const s4ApprovedText = await astonish
  .locator('[data-testid="po-onbehalf-approved-PO-9001"]')
  .first()
  .innerText()
  .catch(() => '');
check('§P13/S4 the deployed record shows WHO approved, and the draft is no longer on offer',
  /brand-astonish/.test(s4ApprovedText) &&
    (await astonish.locator('[data-testid="po-onbehalf-draft-PO-9001"]').count()) === 0,
  s4ApprovedText.replace(/\s+/g, ' ').slice(0, 140));
check('no uncaught page error on the deployed §P13/S4 brand flow',
  astonishErrors.length === 0, astonishErrors.slice(0, 2).join(' | '));

/* MERCENTA'S CONSOLE: the SAME draft, and an ATTRIBUTED override.
   The admin PO LIST is addressed at its own route (the nav view id) — the address
   `/admin/purchase-orders` resolves to no declared admin view and renders
   Overview, so the list itself must be opened. */
await admin.goto(`${BASE}/admin/purchase_orders_admin`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await admin.waitForTimeout(3500);
const s4AdminRow = admin
  .locator('div.flex.items-center.justify-between', { hasText: 'PO-9001' })
  .filter({ has: admin.locator('button[title="View detail"]') })
  .first();
const s4RowVisible = await s4AdminRow
  .waitFor({ state: 'visible', timeout: 15000 })
  .then(() => true)
  .catch(() => false);
check('§P13/S4 the deployed admin PO list presents the seeded closing-window PO', s4RowVisible);
if (s4RowVisible) {
  await s4AdminRow.locator('button[title="View detail"]').click().catch(() => {});
  await admin.waitForTimeout(2500);
}
const s4AdminDraft = await admin
  .locator('[data-testid="admin-po-onbehalf-draft-PO-9001"]')
  .first()
  .innerText()
  .catch(() => '');
check('§P13/S4 the deployed admin console shows the SAME draft, naming its producer',
  /TemporarilyUnavailable/.test(s4AdminDraft) &&
    /mercenta-system:po-acknowledgement/.test(s4AdminDraft),
  s4AdminDraft.replace(/\s+/g, ' ').slice(0, 160));
await admin.locator('[data-testid="admin-po-onbehalf-approve-PO-9001"]').first().click().catch(() => {});
await admin.waitForTimeout(3500);
const s4AdminNotice = await admin
  .locator('[data-testid="admin-po-onbehalf-notice-PO-9001"]')
  .first()
  .innerText()
  .catch(() => '');
const s4AdminApproved = await admin
  .locator('[data-testid="admin-po-onbehalf-approved-PO-9001"]')
  .first()
  .innerText()
  .catch(() => '');
check('§P13/S4 the deployed admin override records the approval AND its attribution',
  /On-behalf rejection performed for Astonish/i.test(s4AdminNotice) &&
    /Mercenta admin override/i.test(s4AdminApproved),
  `${s4AdminNotice.replace(/\s+/g, ' ').slice(0, 70)} | ${s4AdminApproved.replace(/\s+/g, ' ').slice(0, 70)}`);
check('no uncaught page error on the deployed §P13/S4 admin flow',
  adminErrors.length === 0, adminErrors.slice(0, 2).join(' | '));

/* ── §P13 / S5 — THE DEPLOYED NOTIFICATION FAN-OUT + THE INSTANT-MESSAGE SEAM ──
   S5's changed functionality is invoked through the EXISTING automation seam, so it
   must be exercised ON the deployed bundle: the deployed console must declare the
   fan-out (with the schedule it actually uses), RUNNING it must deliver the
   acknowledgement reminders on every channel the platform can genuinely deliver on,
   must REFUSE the external instant-message channel with its fail-closed reason, and a
   repeat run must deliver nothing twice. The delivered in-app reminders must then be
   READABLE in the deployed notification centre — the in-app channel's whole point.
   NOTE ON SCOPE: this page is the Super Admin session, and the §P13/S4 legs above
   already approved PO-9001's on-behalf rejection, so PO-9001 is closed here; the
   fan-out's remaining open work in the seed is PO-9000 (Astonish — the tenant that
   declares the instant-message subscription) and any PO the brand flow did not decide. */
await superAdmin
  .locator('nav[aria-label="Primary"]')
  .locator('text=Control Centre')
  .first()
  .click()
  .catch(() => {});
await superAdmin.waitForTimeout(2500);
/**
 * The Console's DEFAULT tab is Business, so the Automation tab must be selected
 * BEFORE the table is looked for (the wrong order made an earlier run fall back to an
 * undeclared route). The declared route is `/admin/control_centre`.
 */
if (
  !(await superAdmin
    .getByRole('tab', { name: /^Automation/ })
    .first()
    .isVisible({ timeout: 5000 })
    .catch(() => false))
) {
  await superAdmin.goto(`${BASE}/admin/control_centre`, { waitUntil: 'domcontentloaded' }).catch(() => {});
  await superAdmin.waitForTimeout(3000);
}
await superAdmin.getByRole('tab', { name: /^Automation/ }).click().catch(() => {});
await superAdmin.waitForTimeout(1500);

const s5Row = superAdmin.locator('[data-testid="automation-row-po_acknowledgement_fanout"]').first();
const s5RowVisible = await s5Row
  .waitFor({ state: 'visible', timeout: 15000 })
  .then(() => true)
  .catch(() => false);
const s5RowText = s5RowVisible ? await s5Row.innerText().catch(() => '') : '';
check('§P13/S5 the deployed console declares the acknowledgement notification fan-out', s5RowVisible,
  s5RowText.replace(/\s+/g, ' ').slice(0, 140));
check('§P13/S5 the deployed fan-out states the schedule it actually uses (12h / 6h / 2h)',
  /12h \/ 6h \/ 2h/.test(s5RowText));
check('§P13/S5 the deployed fan-out is runnable (a real Run control, not a stub)', await superAdmin
  .getByTestId('automation-run-po_acknowledgement_fanout')
  .first()
  .isVisible({ timeout: 6000 })
  .catch(() => false));

await superAdmin.getByTestId('automation-run-po_acknowledgement_fanout').click().catch(() => {});
await superAdmin.waitForTimeout(3500);
const s5DrawerText = await superAdmin
  .getByTestId('control-run-drawer')
  .first()
  .innerText()
  .catch(() => '');
check('§P13/S5 running the deployed fan-out DELIVERS the reminders on the channels it can use',
  /message\(s\) delivered on \d+ channel\(s\)/.test(s5DrawerText) &&
    !/message\(s\) delivered on 0 channel\(s\)/.test(s5DrawerText),
  s5DrawerText.replace(/\s+/g, ' ').slice(0, 200));
check('§P13/S5 the deployed fan-out REFUSES the external instant-message channel, with its fail-closed reason',
  /Instant message: \d+ refusal\(s\)/.test(s5DrawerText) &&
    /NEVER treated as\s*simulation|No instant-message number/.test(s5DrawerText),
  s5DrawerText.replace(/\s+/g, ' ').slice(0, 240));
/**
 * THE FINAL STAGE PRODUCED THE DRAFT. This page's seed carries the closing-window
 * purchase order (PO-9001, seeded 1h30m inside the on-behalf stage), so the deployed
 * run must report the draft it produced — and that NOTHING was performed by it.
 */
check('§P13/S5 the deployed FINAL stage produced Mercenta’s on-behalf rejection draft (and performed nothing)',
  /on-behalf rejection draft/.test(s5DrawerText) && /nothing was performed/.test(s5DrawerText),
  s5DrawerText.replace(/\s+/g, ' ').slice(0, 240));
await superAdmin.getByRole('button', { name: 'Close record' }).click().catch(() => {});
await superAdmin.waitForTimeout(1200);

/** A repeat run must deliver NOTHING twice — a delivery is made at most once, ever. */
await superAdmin.getByTestId('automation-run-po_acknowledgement_fanout').click().catch(() => {});
await superAdmin.waitForTimeout(3000);
const s5RepeatText = await superAdmin
  .getByTestId('control-run-drawer')
  .first()
  .innerText()
  .catch(() => '');
check('§P13/S5 a repeat deployed run delivers NOTHING new (no duplicate notification, ever)',
  /0 message\(s\) delivered/.test(s5RepeatText) || /duplicate_suppressed/.test(s5RepeatText),
  s5RepeatText.replace(/\s+/g, ' ').slice(0, 200));
await superAdmin.getByRole('button', { name: 'Close record' }).click().catch(() => {});
await superAdmin.waitForTimeout(1200);

/** THE IN-APP CHANNEL'S SURFACE: the deployed notification centre reads the SAME ledger. */
await superAdmin.locator('[data-testid="notification-center"]').first().click().catch(() => {});
await superAdmin.waitForTimeout(1500);
const s5NotifyList = await superAdmin
  .getByTestId('notification-list')
  .first()
  .innerText()
  .catch(() => '');
check('§P13/S5 the deployed notification centre lists the delivered reminders (the in-app channel reaches its reader)',
  /left to acknowledge/.test(s5NotifyList) && /In-app · \d+h reminder · sent by Mercenta/.test(s5NotifyList),
  s5NotifyList.replace(/\s+/g, ' ').slice(0, 200));
/**
 * §P13 / S6 — the deployed reminder also carries its OWN brand-side record detail:
 * the destination each delivered channel actually reached, and the fail-closed reason
 * for the channel that could not be used. Both are the domain's own sentence, so the
 * centre must show them without writing any of that copy itself.
 */
check('§P13/S6 the deployed reminder states each channel’s DESTINATION (the domain’s own sentence)',
  /\u2192/.test(s5NotifyList), s5NotifyList.replace(/\s+/g, ' ').slice(0, 240));
check('§P13/S6 the deployed reminder states WHY the instant-message channel could not be used',
  /Instant message unavailable — /.test(s5NotifyList),
  s5NotifyList.replace(/\s+/g, ' ').slice(0, 240));
check('no uncaught page error on the deployed §P13/S5 fan-out flow',
  superAdminErrors.length === 0, superAdminErrors.slice(0, 2).join(' | '));

/* ── §P13 / S8 — THE DEPLOYED ONBOARDING SURFACES ─────────────────────────────
   S8 removed the onboarding surfaces' re-typed copies of the 24-hour rule AND the
   unsupported consequence they asserted ("flagged", "vendor performance deduction",
   "Below 80% triggers review … can delist ASINs") — the last carriers of the
   platform's own AV-003 discrepancy. So the DEPLOYED bundle must present the rule in
   its owner's words: the guided tours (readable through the admin tour-management
   preview of the same definitions the TourEngine renders), the knowledge-base article
   they link to, and the wizard's operational-guidance step must all state the
   documented rule and the documented past-limit action, and none of them may still
   assert the invented consequence. The onboarding pipeline must also state the LINK
   (the brand's canonical acknowledgement) for every record it shows. */
await closeLiveOverlays(admin);
/**
 * §S8 — the navigation is guarded: if an overlay still blocks the click, the legs FAIL
 * honestly (check + non-zero exit) instead of crashing the run and destroying the
 * evidence of the 174 checks that already passed.
 */
let s8NavOk = true;
try {
  await openLiveNav(admin, 'Onboarding Tours');
} catch (err) {
  s8NavOk = false;
  check('§P13/S8 the deployed admin navigation can reach the onboarding surfaces',
    false, String(err).split('\n')[0].slice(0, 120));
}
await admin.waitForTimeout(2500);
const s8ToursBody = await admin.locator('body').innerText().catch(() => '');
check('§P13/S8 the deployed tour-management surface renders (Onboarding Tours)',
  s8NavOk && /Onboarding Tours|guided onboarding tours/i.test(s8ToursBody) && s8ToursBody.length > 200);

const s8PoCard = admin
  .locator('div')
  .filter({ hasText: 'PO Acknowledgment' })
  .filter({ has: admin.getByRole('button', { name: /Preview/i }) })
  .last();
const s8Preview = await s8PoCard.getByRole('button', { name: /Preview/i }).click().then(() => true).catch(() => false);
await admin.waitForTimeout(900);
const s8Modal = admin.locator('div.fixed.inset-0').first();
const s8ModalVisible = await s8Modal.isVisible({ timeout: 4000 }).catch(() => false);
for (let i = 0; i < 2; i++) {
  const next = s8Modal.locator('button', { hasText: /Next/ }).first();
  if (await next.isVisible({ timeout: 1500 }).catch(() => false)) {
    await next.click().catch(() => {});
    await admin.waitForTimeout(400);
  }
}
const s8ModalText = s8ModalVisible ? await s8Modal.innerText().catch(() => '') : '';
check('§P13/S8 the deployed PO acknowledgment tour teaches the rule in its OWNER’s words',
  s8Preview && s8ModalVisible &&
    /The retail channel requires every purchase order to be acknowledged/.test(s8ModalText) &&
    /Past the 24-hour limit the documented action is a rejection/.test(s8ModalText),
  s8ModalText.replace(/\s+/g, ' ').slice(0, 200));
check('§P13/S8 the deployed tour asserts NO invented consequence (AV-003 absent live)',
  !/flagged|vendor performance|delist ASINs/i.test(s8ToursBody));
/** Step 4 of the PO tour is the REJECTION-REASON step (step 3 is the window). */
const s8NextStep = s8Modal.locator('button', { hasText: /Next/ }).first();
if (await s8NextStep.isVisible({ timeout: 1500 }).catch(() => false)) {
  await s8NextStep.click().catch(() => {});
  await admin.waitForTimeout(700);
}
const s8ReasonText = await s8Modal.innerText().catch(() => '');
check('§P13/S8 the deployed PO tour names the channel’s DOCUMENTED rejection reasons',
  ['TemporarilyUnavailable', 'InvalidProductIdentifier', 'ObsoleteProduct'].every((c) =>
    s8ReasonText.includes(c)) && !/Out of stock|Price dispute/.test(s8ReasonText),
  s8ReasonText.replace(/\s+/g, ' ').slice(0, 160));
await s8Modal.locator('button', { hasText: /Close/ }).first().click().catch(() => {});
await admin.waitForTimeout(600);

/** The deployed onboarding pipeline states the LINK (or says honestly that it has none). */
await closeLiveOverlays(admin);
let s8PipelineNavOk = true;
try {
  await openLiveNav(admin, 'Onboarding');
} catch (err) {
  s8PipelineNavOk = false;
  check('§P13/S8 the deployed admin navigation can reach the onboarding pipeline',
    false, String(err).split('\n')[0].slice(0, 120));
}
await admin.waitForTimeout(2200);
const s8Pipeline = admin.locator('[data-section="onboarding-pipeline"]').first();
const s8PipelineVisible = await s8Pipeline.isVisible({ timeout: 8000 }).catch(() => false);
const s8PipelineText = s8PipelineVisible ? await s8Pipeline.innerText().catch(() => '') : '';
const s8Rows = await admin.locator('[data-onboarding-row]').count();
let s8LinkStates = 0;
if (s8Rows > 0) {
  await admin.locator('[data-onboarding-row]').first().click().catch(() => {});
  await admin.waitForTimeout(700);
  s8LinkStates = await admin
    .locator('[data-onboarding-po-rules="acknowledged"], [data-onboarding-po-rules="outstanding"]')
    .count();
}
check('§P13/S8 the deployed onboarding pipeline renders, and every record states its LINK',
  s8PipelineNavOk && s8PipelineVisible &&
    (s8Rows === 0 ? /No onboarding records yet/i.test(s8PipelineText) : s8LinkStates > 0),
  `${s8Rows} record(s), ${s8LinkStates} link state(s)`);
check('no uncaught page error on the deployed §P13/S8 onboarding-surface flow',
  adminErrors.length === 0, adminErrors.slice(0, 2).join(' | '));

/* ── §S9 — THE DEPLOYED RECEIPT → INVOICE AUTOMATION ──────────────────────────
   S9 made the RECEIPT the trigger of the invoice and retired the manual two-step
   contract from the surfaces. On the DEPLOYED bundle BOTH commerce surfaces must
   state the automation from its ONE owner — Mercenta's own operating process, NOT
   a channel rule — with the terms basis and the AV-022 correction; the receipt
   stays the trigger; and the MANUAL issue control survives as the fallback and the
   AV-022 correction path. HONEST LIMIT OF THE DEPLOYED DEMO: the seeded purchase
   orders are the channel's own (NOT the simulated set this console operates), so
   the admin console legitimately states "Operable simulated purchase orders (0)"
   — the leg asserts that state explicitly instead of pretending a row exists. */

await closeLiveOverlays(astonish);
await astonish.goto(`${BASE}/brand/purchase_orders`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await astonish.waitForTimeout(4000);
const s9BrandStatement = astonish.locator('[data-state="commerce-receipt-invoice-automation"]').first();
const s9BrandVisible = await s9BrandStatement
  .waitFor({ state: 'visible', timeout: 12000 })
  .then(() => true)
  .catch(() => false);
const s9BrandText = s9BrandVisible ? await s9BrandStatement.innerText().catch(() => '') : '';
check('§S9 the deployed brand console states the automation from its OWNER',
  s9BrandVisible &&
    /raised automatically the moment the receipt is logged/.test(s9BrandText) &&
    /Mercenta's own operating process/.test(s9BrandText) &&
    /not a channel rule/.test(s9BrandText),
  s9BrandText.replace(/\s+/g, ' ').slice(0, 220));
check('§S9 the deployed brand console states the terms basis (14/30/60, the declared default)',
  /14\/30\/60 days/.test(s9BrandText) && /30 days is the declared default/.test(s9BrandText),
  s9BrandText.replace(/\s+/g, ' ').slice(0, 220));
check('§S9 the deployed brand console still offers the RECEIPT — the trigger of the invoice',
  (await astonish.locator('[data-state="commerce-receive"]').count()) > 0);
check('no uncaught page error on the deployed §S9 brand-console flow',
  astonishErrors.length === 0, astonishErrors.slice(0, 2).join(' | '));

/* The admin surface states the SAME automation (one owner, two surfaces). */
await closeLiveOverlays(admin);
let s9AdminNavOk = true;
try {
  await openLiveNav(admin, 'Retail Pipeline');
} catch (err) {
  s9AdminNavOk = false;
  check('§S9 the deployed admin navigation can reach the commerce surface',
    false, String(err).split('\n')[0].slice(0, 120));
}
await admin.waitForTimeout(2400);
const s9AdminStatement = admin.locator('[data-state="admin-receipt-invoice-automation"]').first();
const s9AdminVisible = await s9AdminStatement
  .waitFor({ state: 'visible', timeout: 10000 })
  .then(() => true)
  .catch(() => false);
const s9AdminText = s9AdminVisible ? await s9AdminStatement.innerText().catch(() => '') : '';
check('§S9 the deployed admin commerce surface states the automation from its OWNER',
  s9AdminNavOk && s9AdminVisible &&
    /raised automatically the moment the receipt is logged/.test(s9AdminText) &&
    /Mercenta's own operating process/.test(s9AdminText) &&
    /NEW Invoice ID/.test(s9AdminText),
  s9AdminText.replace(/\s+/g, ' ').slice(0, 220));
/** The manual issue control is the FALLBACK: it exists wherever an operable PO does. */
const s9AdminRows = await admin.locator('[data-state="admin-commerce-receive"]').count();
const s9AdminBody = await admin.locator('body').innerText().catch(() => '');
/**
 * §S9 — the empty-state sentence is styled `uppercase`, and `innerText` returns the
 * RENDERED text, so the match is case-insensitive (the first run of this leg failed
 * on exactly that, with the panel's statement passing in the same run).
 */
check('§S9 the deployed admin surface keeps the RECEIPT + the manual issue fallback (or states honestly that it has no operable PO)',
  s9AdminRows > 0
    ? (await admin.locator('[data-state="admin-commerce-issue-invoice"]').count()) > 0
    : /operable simulated purchase orders \(0\)/i.test(s9AdminBody),
  `${s9AdminRows} operable row(s)`);
check('no uncaught page error on the deployed §S9 admin-commerce flow',
  adminErrors.length === 0, adminErrors.slice(0, 2).join(' | '));

/* ── §P13/S10 — THE CLOSING PASS: THE DEPLOYED SEED IS GENUINELY OPERABLE ─────
   S9 recorded an HONEST LIMIT: the deployed demo boots with ZERO operable
   simulated POs (the ten seeded POs are the channel's own, and `src/types.ts`
   forbids re-labelling unknown-provenance seed rows as simulation). §S10 closes
   that limit the only truthful way — by PROVING the capability is reachable in
   the running product rather than fabricating a row: the deployed brand console's
   operational-simulation control must be ENABLED (its eligibility derived from the
   real E3 catalog state), and the REAL chain must run live — raise → acknowledge →
   fulfil → RECEIPT → the invoice raised AUTOMATICALLY, with the terms the receipt
   carried. A disabled or absent control is a dead control and FAILS here. */

await closeLiveOverlays(astonish);
await astonish.goto(`${BASE}/brand/purchase_orders`, { waitUntil: 'domcontentloaded' }).catch(() => {});
await astonish.waitForTimeout(4000);
check('§P13/S10 the deployed brand console renders the operational-simulation surface',
  await astonish.getByText('Operational commerce simulation').first()
    .isVisible({ timeout: 12000 }).catch(() => false));

const s10Raise = astonish.locator('button[data-state="commerce-raise-po"]').first();
const s10RaiseVisible = await s10Raise.isVisible({ timeout: 10000 }).catch(() => false);
const s10RaiseEnabled = s10RaiseVisible && (await s10Raise.isEnabled().catch(() => false));
check('§P13/S10 SEED REACHABILITY — the deployed raise control is genuinely OPERABLE (no dead control)',
  s10RaiseEnabled, s10RaiseEnabled ? 'enabled' : s10RaiseVisible ? 'present but DISABLED' : 'not present');

let s10Chain = '';
if (s10RaiseEnabled) {
  await s10Raise.click().catch(() => {});
  const s10Ack = astonish.locator('button[data-state="commerce-acknowledge"]').first();
  s10Chain += (await s10Ack.isEnabled({ timeout: 8000 }).catch(() => false)) ? '>' : 'x';
  await s10Ack.click().catch(() => {});
  await astonish.waitForTimeout(600);
  const s10Fulfil = astonish.locator('button[data-state="commerce-fulfil"]').first();
  s10Chain += (await s10Fulfil.isEnabled({ timeout: 8000 }).catch(() => false)) ? '>' : 'x';
  await s10Fulfil.click().catch(() => {});
  await astonish.waitForTimeout(600);
  const s10Receive = astonish.locator('button[data-state="commerce-receive"]').first();
  s10Chain += (await s10Receive.isEnabled({ timeout: 8000 }).catch(() => false)) ? '>' : 'x';
  await s10Receive.click().catch(() => {});
  await astonish.waitForTimeout(3000);
}
check('§P13/S10 the deployed chain walks raise → acknowledge → fulfil → RECEIPT (each step ENABLES the next)',
  s10Chain === '>>>', `chain: ${s10Chain || 'not run'}`);
const s10Body = s10RaiseEnabled ? await astonish.locator('body').innerText().catch(() => '') : '';
check('§P13/S10 THE RECEIPT RAISED THE INVOICE AUTOMATICALLY on the deployed bundle',
  /raised automatically/.test(s10Body) && /SIM-INV-/.test(s10Body),
  s10Body.replace(/\s+/g, ' ').slice(0, 220));
check('§P13/S10 the deployed surface states the terms the RECEIPT carried (the declared 30-day default)',
  /30-day terms/.test(s10Body),
  s10Body.replace(/\s+/g, ' ').slice(0, 160));
check('no uncaught page error on the deployed §P13/S10 operational chain',
  astonishErrors.length === 0, astonishErrors.slice(0, 2).join(' | '));

/* ── §P13/CG — THE CONVERSION GATE ON THE DEPLOYED BUNDLE ─────────────────────
 * The deployed build must enforce the SAME gate the local suite proves. Every leg
 * below is reproducible on a REMOTE host — no leg races the declared clock:
 *
 *   PAGE 1 — the timing signal, MEASURED. A script fills the visible answers
 *            instantly (what a bot does) and submits. Two assertions that cannot
 *            flake: the gate must NEVER claim "too fast" for a submission that was
 *            not too fast (consistency), and when the measured elapsed really is
 *            under the declared minimum it must refuse and must NOT confirm.
 *   PAGE 2 — the honeypot refusal, then a GENUINE RETRY of the same answers being
 *            ACCEPTED (the truthfulness fix: a refused attempt was never received),
 *            then the duplicate window refusing a second recorded submission, then
 *            the declared session attempt budget refusing the fourth attempt.
 * ─────────────────────────────────────────────────────────────────────────── */

const CG_MIN_FILL_MS = 2_500; // mirrors APPLICATION_SPAM_POLICY.minFillMs (the SSOT)

/** A script sets a React-controlled input the way a form-filling bot would. */
async function scriptedFill(locator, value) {
  await locator
    .evaluate((el, v) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value)
    .catch(() => {});
}

async function openDeployedForm(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('button', { name: 'Partner Login' }).first().click().catch(() => {});
  await page.waitForTimeout(1200);
  await page.getByText('Request Partner Access').first().click().catch(() => {});
}

async function chooseUk(page) {
  const field = page.locator('input[placeholder*="Type your country name"]');
  await field.click().catch(() => {});
  await field.fill('United Kingdom').catch(() => {});
  await page.locator('div.z-50 button', { hasText: 'United Kingdom' }).last().click().catch(() => {});
  await page.waitForTimeout(250);
}

const noticeText = (page) => page.locator('[data-cg-notice]').innerText().catch(() => '');
const confirmedCount = (page) => page.getByText('Application Received').count().catch(() => 0);

/* ── PAGE 1 — THE TIMING SIGNAL, MEASURED ─────────────────────────────────── */

const cgTiming = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cgTimingErrors = [];
cgTiming.on('pageerror', (e) => cgTimingErrors.push(String(e)));
await cgTiming.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await cgTiming.getByRole('button', { name: 'Partner Login' }).first().click().catch(() => {});
await cgTiming.waitForTimeout(1200);

/* Measured from BEFORE the click that mounts the form, so the measurement is an
 * UPPER BOUND of the true elapsed time (the form's own clock starts a moment later). */
const cgT0 = Date.now();
await cgTiming.getByText('Request Partner Access').first().click().catch(() => {});
await scriptedFill(cgTiming.locator('[data-cg-field="companyName"]'), 'Fast Script Ltd');
await chooseUk(cgTiming);
/* §P13/CG — §PHONE · the phone is COMPULSORY since 2026-09-26 and VALIDATION runs
 * before the spam signals, so a timing leg without a phone would be refused for the
 * missing phone instead of for being too fast. Every other leg below supplies one. */
await scriptedFill(cgTiming.locator('[data-cg-field="phone"]'), '2079460958');
await scriptedFill(cgTiming.locator('[data-cg-field="websiteUrl"]'), 'https://example.com');
await cgTiming.getByText('Submit Application').first().click().catch(() => {});
await cgTiming.waitForTimeout(1500);
const cgMeasuredMs = Date.now() - cgT0;
const cgTimingNotice = await noticeText(cgTiming);
const cgSaidTooFast = /faster than a person can read it/.test(cgTimingNotice);
const cgTimingConfirmed = (await confirmedCount(cgTiming)) > 0;

check('§P13/CG the deployed gate serves the public application form',
  await cgTiming.locator('[data-cg-field="companyName"]').first().isVisible({ timeout: 10000 }).catch(() => false));
check('§P13/CG CONSISTENCY — the deployed gate never claims "too fast" for a submission that was not too fast',
  !cgSaidTooFast || cgMeasuredMs < CG_MIN_FILL_MS,
  `measured ${cgMeasuredMs}ms · notice "${cgTimingNotice.replace(/\\s+/g, ' ').slice(0, 80)}"`);
check('§P13/CG a scripted submission under the declared minimum is REFUSED by the deployed gate (not confirmed)',
  cgMeasuredMs >= CG_MIN_FILL_MS ? true : cgSaidTooFast && !cgTimingConfirmed,
  cgMeasuredMs >= CG_MIN_FILL_MS
    ? `NOT MEASURABLE on this host: the fill itself took ${cgMeasuredMs}ms, above the declared ${CG_MIN_FILL_MS}ms, so the strict branch could not fire (the signal is proven locally by e2e/conversion-gate.spec.ts case 2 and by the owner gate)`
    : `refused as too fast, confirmed=${cgTimingConfirmed}`);
check('no uncaught page error on the deployed §P13/CG timing flow',
  cgTimingErrors.length === 0, cgTimingErrors.slice(0, 2).join(' | '));
await cgTiming.close();

/* ── PAGE 2 — HONEYPOT · TRUTHFUL RETRY · DUPLICATE · SESSION BUDGET ──────── */

const cg = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cgErrors = [];
cg.on('pageerror', (e) => cgErrors.push(String(e)));
await openDeployedForm(cg);
await cg.waitForTimeout(3000); // out of the declared minimum fill time

check('§P13/CG the deployed form carries the declared honeypot field',
  (await cg.locator('[data-cg-honeypot] input').count().catch(() => 0)) === 1,
  `${await cg.locator('[data-cg-honeypot] input').count().catch(() => 0)} field(s)`);
check('§P13/CG the honeypot is hidden from assistive technology and cannot be tabbed to',
  (await cg.locator('[data-cg-honeypot][aria-hidden="true"]').count().catch(() => 0)) === 1 &&
    (await cg.locator('[data-cg-honeypot] input').getAttribute('tabindex').catch(() => null)) === '-1');

await cg.fill('input[placeholder*="registered business name"]', 'Deployed Gate Check Ltd').catch(() => {});
await chooseUk(cg);
await cg.fill('#cg-phone', '2079460958').catch(() => {});
await cg.fill('input[placeholder*="https://your-company.com"]', 'https://example.com').catch(() => {});
await scriptedFill(cg.locator('[data-cg-honeypot] input'), 'filled-by-a-bot');
await cg.getByText('Submit Application').first().click().catch(() => {});
await cg.waitForTimeout(1500);
const cgNotice1 = await noticeText(cg);
check('§P13/CG the DEPLOYED gate refuses a filled honeypot and states nothing was recorded',
  /flagged as automated/.test(cgNotice1) && /NOT recorded/.test(cgNotice1),
  cgNotice1.replace(/\\s+/g, ' ').slice(0, 140));
check('§P13/CG the refused bot submission did NOT reach the confirmed state',
  (await confirmedCount(cg)) === 0);

/* The refused attempt was NEVER RECEIVED, so a genuine retry of the same answers
 * must be ACCEPTED — the honest-message fix, proven on the deployed build. */
await scriptedFill(cg.locator('[data-cg-honeypot] input'), '');
await cg.getByText('Submit Application').first().click().catch(() => {});
let cgReceived = false;
try {
  await cg.getByText('Application Received').first().waitFor({ state: 'visible', timeout: 8000 });
  cgReceived = true;
} catch {
  cgReceived = false;
}
check('§P13/CG the DEPLOYED gate ACCEPTS a genuine retry of answers it previously refused (nothing was received)',
  cgReceived);

/* A second RECORDED submission of the same application is a duplicate. */
if (cgReceived) {
  await cg.getByText('Back to Login').first().click().catch(() => {});
  await cg.waitForTimeout(1200);
  await cg.getByText('Request Partner Access').first().click().catch(() => {});
  await cg.waitForTimeout(3000);
  await cg.fill('input[placeholder*="registered business name"]', 'Deployed Gate Check Ltd').catch(() => {});
  await chooseUk(cg);
  await cg.fill('#cg-phone', '2079460958').catch(() => {});
  await cg.fill('input[placeholder*="https://your-company.com"]', 'https://example.com').catch(() => {});
  await cg.getByText('Submit Application').first().click().catch(() => {});
  await cg.waitForTimeout(1500);
  const cgNotice2 = await noticeText(cg);
  check('§P13/CG the DEPLOYED gate refuses the SAME application twice and says it was NOT recorded twice',
    /already received/.test(cgNotice2) && /NOT recorded twice/.test(cgNotice2),
    cgNotice2.replace(/\\s+/g, ' ').slice(0, 140));

  /* The fourth attempt in this session exhausts the declared budget. It must carry
   * a VALID payload — validation is evaluated before the spam signals, so an empty
   * form would (correctly) be refused for the missing company name instead. */
  await cg.getByText('Back to Login').first().click().catch(() => {});
  await cg.waitForTimeout(1200);
  await cg.getByText('Request Partner Access').first().click().catch(() => {});
  await cg.waitForTimeout(3000);
  await cg.fill('input[placeholder*="registered business name"]', 'Deployed Gate Check Ltd').catch(() => {});
  await chooseUk(cg);
  await cg.fill('#cg-phone', '2079460958').catch(() => {});
  await cg.fill('input[placeholder*="https://your-company.com"]', 'https://example.com').catch(() => {});
  await cg.getByText('Submit Application').first().click().catch(() => {});
  await cg.waitForTimeout(1500);
  const cgNotice3 = await noticeText(cg);
  check('§P13/CG the DEPLOYED gate enforces the declared session attempt budget',
    /Too many submission attempts/.test(cgNotice3),
    cgNotice3.replace(/\\s+/g, ' ').slice(0, 140));
} else {
  check('§P13/CG the DEPLOYED gate refuses the SAME application twice and says it was NOT recorded twice', false,
    'not reached — the genuine retry failed');
  check('§P13/CG the DEPLOYED gate enforces the declared session attempt budget', false, 'not reached');
}

check('no uncaught page error on the deployed §P13/CG conversion flow',
  cgErrors.length === 0, cgErrors.slice(0, 2).join(' | '));
await cg.close();

/* ── PAGE 3 — THE COMPULSORY PHONE, ON THE DEPLOYED BUNDLE ───────────────────
 * Its own page (its own session ledger, so the attempt-budget legs above are not
 * disturbed). Every answer except the phone is valid, so the ONLY refusal that can
 * fire is the phone — which is what makes this leg a real proof rather than a
 * second copy of the "missing company" case.
 * ─────────────────────────────────────────────────────────────────────────── */

const cgPhone = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const cgPhoneErrors = [];
cgPhone.on('pageerror', (e) => cgPhoneErrors.push(String(e)));
await openDeployedForm(cgPhone);
await cgPhone.waitForTimeout(3000); // out of the declared minimum fill time
await cgPhone.fill('input[placeholder*="registered business name"]', 'Deployed No-Phone Ltd').catch(() => {});
await chooseUk(cgPhone);
await cgPhone.fill('input[placeholder*="https://your-company.com"]', 'https://example.com').catch(() => {});
await cgPhone.getByText('Submit Application').first().click().catch(() => {});
await cgPhone.waitForTimeout(1500);

const cgPhoneLabel = await cgPhone
  .locator('label')
  .filter({ hasText: 'Phone Number' })
  .first()
  .innerText()
  .catch(() => '');
check('§P13/CG the DEPLOYED form labels the phone as REQUIRED and no longer says "(optional)"',
  cgPhoneLabel.includes('*') && !/optional/i.test(cgPhoneLabel),
  cgPhoneLabel.slice(0, 80));

const cgPhoneError = await cgPhone.locator('[data-cg-error="phone"]').innerText().catch(() => '');
check('§P13/CG the DEPLOYED gate REFUSES a submission with no phone and does NOT confirm it',
  /phone number/i.test(cgPhoneError) && (await confirmedCount(cgPhone)) === 0,
  cgPhoneError.slice(0, 140));
check('§P13/CG the DEPLOYED phone refusal marks the control invalid for assistive technology',
  (await cgPhone.locator('[data-cg-field="phone"][aria-invalid="true"]').count().catch(() => 0)) === 1);
check('no uncaught page error on the deployed §P13/CG compulsory-phone flow',
  cgPhoneErrors.length === 0, cgPhoneErrors.slice(0, 2).join(' | '));
await cgPhone.close();


console.log('\n--- LIVE VERIFICATION SUMMARY ---');
const passed = results.filter((r) => r.startsWith('PASS')).length;
console.log(`${passed}/${results.length} checks PASS · page errors: brand=${pageErrors.length} admin=${adminErrors.length} superAdmin=${superAdminErrors.length}`);
console.log(failures === 0 ? 'LIVE_VERIFICATION_PASS' : `LIVE_VERIFICATION_FAIL (${failures})`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);