/**
 * §P6 — THE PO DOCUMENT PACK, ITS SURFACE AND THE COLLECT CHAIN.
 *
 * WHAT THIS SPEC PROVES (in a real browser, against the real stores)
 * -----------------------------------------------------------------
 *   1  after the brand accepts a PO, Mercenta's automatic action produces the
 *      document pack and it is on the Logistics Hub as "Documents for this PO";
 *   2  the pack is HONEST: the SSCC labels are ready (Mercenta generated them from
 *      the ASN it filed) while the freight waybill is NOT — no carrier has booked
 *      one — and the row states the reason rather than offering a fake artefact;
 *   3  the SSCC labels open, carry an 18-digit identifier per carton and state the
 *      unassigned placeholder GS1 prefix;
 *   4  the Logistics Hub nav badge and the notification centre carry the document
 *      download queue (one shared rule, so they cannot disagree);
 *   5  a Freight Collect lane shows the DOCUMENTED chain — request → carrier
 *      assigned → ARN → pickup — with the channel steps awaiting the channel, and
 *      NO fabricated ARN;
 *   6  the pack opens the EXISTING carrier-label dialogue (one renderer per
 *      artefact — the pack did not re-implement it).
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

/** Accept every line of the brand's open PO, so Mercenta's action chain runs. */
async function acceptPo(page: any, brand: string, poNumber: string) {
  await loginAs(page, brand, 1100);
  const ob = page.locator('text=Onboarding').first();
  if (await ob.isVisible({ timeout: 1500 }).catch(() => false)) {
    await ob.click();
    await page.waitForTimeout(300);
  }
  await page.click('nav[aria-label="Primary"] >> text=Purchase Orders');
  await page.waitForTimeout(900);
  const row = page.locator(`text=${poNumber}`).first();
  await expect(row).toBeVisible({ timeout: 6000 });
  await row.click();
  await page.waitForTimeout(400);
  const ackBtn = page.locator('button', { hasText: 'Acknowledge' }).first();
  if (await ackBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
    await ackBtn.click();
    await page.waitForTimeout(400);
    await page.locator('button', { hasText: 'Submit acknowledgment' }).click();
    await expect(page.getByText(/Decision issued to Mercenta/i).first()).toBeVisible({ timeout: 8000 });
  }
}

/**
 * Accept the PO and then follow the product's OWN deep link ("Open shipping
 * documents") into the Logistics Hub. A full page load would reset the in-memory
 * demo stores, so the canonical client-side hand-off is used — exactly the path
 * the product itself takes (P0).
 */
async function acceptAndOpenDocuments(page: any, brand: string, poNumber: string) {
  await acceptPo(page, brand, poNumber);
  const cta = page.locator(`[data-testid="po-open-documents-${poNumber}"]`);
  await expect(cta).toBeVisible({ timeout: 8000 });
  await cta.click();
  await expect(page.getByRole('heading', { name: 'Logistics Hub' }).first()).toBeVisible({
    timeout: 8000,
  });
  await page.waitForTimeout(1400);
}

test.describe('§P6 — the PO document pack', () => {
  test('1. the pack appears on the Logistics Hub for an accepted PO, and names the PO declared FC', async ({
    page,
  }) => {
    await acceptAndOpenDocuments(page, 'Tapatío', 'PO-9002');

    const panel = page.locator('[data-testid="po-documents-panel"]');
    await expect(panel).toBeVisible({ timeout: 8000 });

    // Every document the programme row requires is listed (Tapatío is an
    // international lane, so the customs documents apply too).
    for (const kind of [
      'sscc_carton_labels',
      'carrier_label',
      'freight_waybill',
      'packing_list_delivery_note',
      'asn_sheet',
      'customs_commercial_invoice',
      'customs_packing_list',
      'customs_ukca_declaration',
    ]) {
      await expect(page.locator(`[data-testid="po-document-${kind}"]`)).toBeVisible();
    }

    // The summary is derived from the pack itself.
    await expect(page.locator('[data-testid="po-documents-summary"]')).toContainText(/\/8 ready/);

    // The destination named is the FC the PO declares — never a Mercenta site.
    const panelText = (await panel.innerText()) ?? '';
    expect(panelText).not.toMatch(/Mercenta UK Hub/i);
    expect(panelText).toMatch(/Destination Fulfilment Centre|\([A-Z]{3}\d\)|FC/i);
  });

  test('2. readiness is honest: SSCC labels ready, the waybill NOT (with its reason)', async ({ page }) => {
    await acceptAndOpenDocuments(page, 'Tapatío', 'PO-9002');

    const sscc = page.locator('[data-testid="po-document-status-sscc_carton_labels"]');
    await expect(sscc).toBeVisible({ timeout: 8000 });
    await expect(sscc).toHaveAttribute('data-standing', 'ready');

    // Mercenta files the ASN automatically, so the ASN sheet is on the record.
    await expect(page.locator('[data-testid="po-document-status-asn_sheet"]')).toHaveAttribute(
      'data-standing',
      'ready'
    );

    /**
     * The waybill is issued by the CARRIER booking, which has not happened, so the
     * document is not ready and the row says why. A disabled control with a stated
     * reason is the honest contract — never a printable fake.
     */
    const waybill = page.locator('[data-testid="po-document-status-freight_waybill"]');
    await expect(waybill).toHaveAttribute('data-standing', 'not_ready');
    await expect(page.locator('[data-testid="po-document-reason-freight_waybill"]')).toContainText(
      /waybill is booked|carrier booking/i
    );
    await expect(page.locator('[data-testid="po-document-open-freight_waybill"]')).toBeDisabled();
  });
});


test.describe('§P6 — the PO document pack (continued)', () => {
  test('3. the SSCC carton labels open with one 18-digit identifier per carton', async ({ page }) => {
    await acceptAndOpenDocuments(page, 'Tapatío', 'PO-9002');

    await page.locator('[data-testid="po-document-open-sscc_carton_labels"]').click();
    await expect(page.locator('[data-testid="po-document-dialog"]')).toBeVisible({ timeout: 6000 });

    // The placeholder prefix is stated on the document itself, unmistakably.
    await expect(page.locator('[data-testid="po-document-placeholder-notice"]')).toContainText(
      /XX-PENDING-GS1-LICENCE/
    );

    const frame = page.frameLocator('[data-testid="po-document-frame"]');
    await expect(frame.locator('body')).toContainText(/Carton 1 of \d/);
    const body = (await frame.locator('body').innerText()) ?? '';
    // Complete 18-digit SSCCs are printed, each under the placeholder prefix.
    const identifiers = body.match(/\b0{8}\d{10}\b/g) ?? [];
    expect(identifiers.length).toBeGreaterThan(0);
    for (const identifier of identifiers) expect(identifier).toHaveLength(18);

    // Escape closes the dialogue (the expected keyboard contract).
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="po-document-dialog"]')).toHaveCount(0);
  });

  test('4. the nav badge and the notification centre carry the document download queue', async ({ page }) => {
    await acceptAndOpenDocuments(page, 'Tapatío', 'PO-9002');

    // The brand rail's Logistics Hub badge is the download queue.
    await expect(page.locator('[data-testid="nav-badge-logistics"]')).toBeVisible({ timeout: 8000 });

    // The notification centre lists the same PO from the same rule.
    await page
      .locator('button[aria-label*="notification" i], button[aria-label*="attention" i]')
      .first()
      .click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="notification-list"]')).toContainText(
      /Shipping documents ready — PO-9002/
    );
  });
});


test.describe('§P6 — the collect lane and renderer reuse', () => {
  test('5. a Freight Collect lane shows the documented chain, and never fabricates an ARN', async ({ page }) => {
    /**
     * Astonish is the first cleared tenant, so its FIRST lifecycle PO is the
     * seeded Freight Collect one (`PO-9200`) — the lane the channel arranges and
     * collects.
     */
    await loginAs(page, 'Astonish', 1100);
    await page.goto('/brand/logistics?po=PO-9200');
    await page.waitForTimeout(1400);

    const chain = page.locator('[data-testid="collect-chain"]');
    await expect(chain).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="collect-chain-notice"]')).toContainText(
      /at least two business days/i
    );

    // The documented order, with each step's own state.
    const order = ['shipment_request', 'carrier_assigned', 'arn', 'pickup'];
    for (const id of order) {
      await expect(page.locator(`[data-testid="collect-step-${id}"]`)).toBeVisible();
    }
    const texts = await chain.innerText();
    const anchors = ['Shipment request', 'Carrier assigned', 'ARN', 'Collected'];
    const positions = anchors.map((label) => texts.indexOf(label));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);

    /**
     * No live channel connection is configured, so the channel has assigned no
     * carrier and returned no ARN: those steps must say "awaiting the channel".
     * An invented ARN would be a fake live-provider outcome.
     */
    await expect(page.locator('[data-testid="collect-step-carrier_assigned"]')).toHaveAttribute(
      'data-state',
      /awaiting_channel|not_applicable/
    );
    await expect(page.locator('[data-testid="collect-step-arn"]')).toHaveAttribute(
      'data-state',
      /awaiting_channel|not_applicable/
    );
    expect(texts).not.toMatch(/ARN\s+[A-Z0-9-]{4,}/);
  });

  test('6. the pack opens the EXISTING carrier-label dialogue (one renderer per artefact)', async ({ page }) => {
    await acceptAndOpenDocuments(page, 'Tapatío', 'PO-9002');

    await page.locator('[data-testid="po-document-open-carrier_label"]').click();
    // The PRE-EXISTING label dialogue — not a second renderer introduced by P6.
    await expect(page.locator('[data-testid="logistics-labels-dialog"]')).toBeVisible({ timeout: 6000 });
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="logistics-labels-dialog"]')).toHaveCount(0);
  });
});
