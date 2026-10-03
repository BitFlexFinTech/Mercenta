/**
 * §BATCH 3c PART 2 — THE ON-BEHALF SPEC-AUTHORISATION GATE.
 *
 * WHY THIS EXISTS (the defect class it closes)
 * --------------------------------------------
 * The 2026-09-30 owner-reported fix introduced `src/lib/commerce/poOnBehalfAuthority.ts`
 * and made the WRITER (`src/data/api.ts → acknowledgePurchaseOrder`) REFUSE an
 * on-behalf ACCEPTANCE unless the brand authorised Mercenta for that order (or the
 * closing window is imminent and the submission is the rejection the channel
 * requires). Eleven browser specs predated that rule and drove an on-behalf
 * acceptance WITHOUT recording the authorisation, so they were REFUSED by the
 * product and failed. They were repointed at source in Batch 3c part 2 and the
 * whole suite went green (561 passed / 0 failed).
 *
 * This gate stops the class coming back: any spec that performs an ON-BEHALF
 * ACCEPTANCE must also record the brand's authorisation through the ONE canonical
 * writer (`authoriseOnBehalfDecisions`). "On-behalf acceptance" is detected by:
 *   1. the admin on-behalf UI copy — `Acknowledge on behalf of …` /
 *      `Submit On-Behalf Acknowledgment`; OR
 *   2. a direct `acknowledgeCommercePurchaseOrder(..., adminActor)` call (an admin
 *      actor carries NO `tenantId`, which is exactly what makes the decision
 *      ON-BEHALF — `commerceLifecycle.acknowledgeCommercePurchaseOrder` passes
 *      `actor.tenantId ? undefined : actor.staffId` to the writer).
 *
 * A spec that acknowledges as the BRAND (its actor carries `tenantId`) is a
 * self-action, not an on-behalf decision, and is correctly NOT required to
 * authorise. A spec that asserts the REFUSAL is likewise not this gate's business.
 *
 * Runs with no browser, no network, no clock. Mutation-proved: deleting the
 * `authoriseOnBehalfDecisions` call from any on-behalf spec fails it.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const E2E = fileURLToPath(new URL('../e2e/', import.meta.url));

/** The admin on-behalf ACCEPTANCE copy (both the trigger and the submit button). */
const ON_BEHALF_UI = /Acknowledge on behalf of|Submit On-Behalf Acknowledgment/;
/** A direct lifecycle call asking the ADMIN (no tenantId) to acknowledge. */
const ADMIN_ACK = /acknowledgeCommercePurchaseOrder\([^;]*\badminActor\b/;
/** The ONE canonical writer that records the brand's authorisation. */
const AUTHORISES = /authoriseOnBehalfDecisions/;

let failures = 0;
let checks = 0;
const onBehalfSpecs = [];

for (const file of readdirSync(E2E).filter((f) => f.endsWith('.spec.ts')).sort()) {
  const src = readFileSync(join(E2E, file), 'utf8');
  if (!ON_BEHALF_UI.test(src) && !ADMIN_ACK.test(src)) continue;
  onBehalfSpecs.push(file);
  checks++;
  const ok = AUTHORISES.test(src);
  console.log(`${ok ? '✓' : '✗'} ${file} — performs an ON-BEHALF acceptance AND records the brand's authorisation`);
  if (!ok) {
    failures++;
    console.log(
      '      missing `authoriseOnBehalfDecisions(...)`: the writer REFUSES an unauthorised ' +
      'on-behalf acceptance (src/lib/commerce/poOnBehalfAuthority.ts), so this spec would fail.'
    );
  }
}

checks++;
if (onBehalfSpecs.length === 0) {
  failures++;
  console.log('✗ expected at least one on-behalf acceptance spec — detection has rotted');
} else {
  console.log(`✓ detected ${onBehalfSpecs.length} on-behalf acceptance spec(s): ${onBehalfSpecs.join(', ')}`);
}

console.log(`\nON_BEHALF_SPEC_AUTHORISATION ${failures === 0 ? 'PASS' : 'FAIL'} (${checks - failures}/${checks})`);
process.exit(failures === 0 ? 0 : 1);
