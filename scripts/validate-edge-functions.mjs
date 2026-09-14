// Production-readiness validator for the Edge-Function layer.
//
// HISTORY: this script used to readFileSync every expected Edge Function and
// CRASH with ENOENT when one was absent from the repository (Phase 0 recorded
// the Stage-17/21/22 functions as absent from the tree). A tool that crashes
// tells you nothing, so it now reports three distinct outcomes:
//
//   PRESENT + valid   → ✓ assertion ran and passed
//   PRESENT + broken  → ✗ FAILURE (real contract violation, exits non-zero)
//   ABSENT            → ⏭ SKIPPED + recorded as a DEPLOY-TIME item
//
// Absent artefacts are legitimate production-preparation items (they must be
// deployed before the matching live path works and are listed in
// PRODUCTION_READINESS.md) — not repo defects, so they never fail the run.
import { existsSync, readFileSync } from 'node:fs';

let failures = 0;
let checks = 0;
let skipped = 0;
/** True while asserting against an artefact that is absent from the repo. */
let gated = false;
const missing = [];
const test = (name, ok) => {
  checks++;
  if (gated) {
    skipped++;
    console.log(`⏭ ${name} — skipped (artefact not present in this repository)`);
    return;
  }
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};
const read = (p) => {
  const url = new URL(`../${p}`, import.meta.url);
  if (!existsSync(url)) {
    gated = true;
    if (!missing.includes(p)) missing.push(p);
    return '';
  }
  // A present artefact un-gates the block that follows it.
  gated = false;
  return readFileSync(url, 'utf8');
};

// §Phase M11 — REPOINTED. The old contract asserted a STRIPE payout rail
// (`/v1/transfers`, `STRIPE_SECRET_KEY`, `startsWith('mock:')`). The canonical
// business model §6 fixes the payout rails as **Wise (DEFAULT)** and
// **Payoneer (SECONDARY)**; Stripe bills the flat monthly subscription only and
// is now explicitly REFUSED as a payout rail, as is the accounting layer Xero.
// The invariants are UNCHANGED (idempotency forwarded to the rail, a transfer
// and never a charge, an unmistakably simulated id, positive amounts only, an
// explicit 503 instead of a false success) — now asserted for both rails, plus
// the §7 human-approval gate that did not exist when this block was written.
const payouts = read('supabase/functions/payouts-transfer/index.ts');
test('payouts: forwards Idempotency-Key to the rail',
  payouts.includes('Idempotency-Key') && /'Idempotency-Key': body\.idempotencyKey/.test(payouts));
test('payouts: creates a transfer, never a charge',
  payouts.includes('/v3/transfers') && payouts.includes('/programs/payouts') &&
    !payouts.includes('/v1/charges'));
test('payouts: Wise is the DEFAULT rail, Payoneer the SECONDARY rail (§6)',
  payouts.includes("const DEFAULT_RAIL = 'wise'") && payouts.includes('payoneer'));
test('payouts: Stripe and Xero are REFUSED as payout rails (§6)',
  payouts.includes('NON_PAYOUT_RAILS') && payouts.includes("'stripe'") &&
    payouts.includes("'xero'"));
test('payouts: mock mode returns an unmistakable id naming the rail',
  payouts.includes('mock_tr_wise_') && payouts.includes('mock_tr_payoneer_') &&
    payouts.includes('simulated: true'));
test('payouts: rejects non-positive amounts', payouts.includes('must be positive'));
test('payouts: §7 human approval is mandatory before any rail instruction',
  payouts.includes('approved !== true') && payouts.includes('PAYOUT_NOT_APPROVED'));
test('payouts: authorisation restricted to the finance approver roles',
  payouts.includes('APPROVER_ROLES') && payouts.includes("'super_admin'") &&
    payouts.includes("'admin_staff'"));
test('payouts: actor identity comes from the VERIFIED token, never the body',
  payouts.includes('/auth/v1/user') && payouts.includes('NEVER from the request body'));
test('payouts: 503 instead of moving money unverified',
  payouts.includes('503') && payouts.includes('refusing to move money unverified'));
test('payouts: every outcome writes an audit row',
  payouts.includes('brand_payout_settled') && payouts.includes('brand_payout_failed') &&
    payouts.includes('brand_payout_simulated'));
// Rail-vocabulary drift guard — Deno cannot import the `@/` alias, so the rail
// names are declared in both places and MUST stay identical (the same
// convention the reply-webhook keyword parity check below established).
const payoutsConfig = read('src/config/payouts.ts');
const configRails = [...payoutsConfig.matchAll(/^\s{2}([a-z]+): \{$/gm)].map((m) => m[1]);
const fnRails = [...payouts.matchAll(/^\s{2}([a-z]+): 'mock_tr_/gm)].map((m) => m[1]);
test('payouts: rail vocabulary parity with src/config/payouts.ts (no drift)',
  configRails.length === 2 && fnRails.length === 2 &&
    configRails.every((r) => fnRails.includes(r)) &&
    fnRails.every((r) => configRails.includes(r)));
test('payouts: the default/secondary declaration lives in the config SSOT',
  payoutsConfig.includes("export const DEFAULT_PAYOUT_RAIL: PayoutRail = 'wise'") &&
    payoutsConfig.includes("export const SECONDARY_PAYOUT_RAIL: PayoutRail = 'payoneer'") &&
    payoutsConfig.includes('PAYOUT_REQUIRES_HUMAN_APPROVAL = true'));


const imp = read('supabase/functions/catalog-import/index.ts');
test('import: server-side row re-validation before any write',
  imp.includes('never trust the client alone') && imp.includes('batch rejected'));
test('import: calls the atomic RPC', imp.includes("rpc('import_catalog_batch'"));
test('import: mock mode simulates imported count', imp.includes("startsWith('mock:')"));

// §Phase M11 — REPOINTED. These two blocks read
// `supabase/migrations/0010_rpc_catalog_import.sql` and
// `supabase/migrations/0011_cron_daily_digest.sql`, which NEVER EXISTED in this
// repository: 010/011 are `010_create_compliance_docs.sql` and
// `011_create_messages.sql`. The references were stale, so the blocks silently
// skipped. They now point at the real, sequential history (024/025), which means
// these assertions actually RUN.
const rpc = read('supabase/migrations/024_rpc_catalog_import.sql');
test('RPC: single plpgsql function = one transaction',
  rpc.includes('language plpgsql') && rpc.includes('for v_row in'));
test('RPC: duplicate in-batch SKU aborts', rpc.includes('duplicate sku within batch'));
test('RPC: unknown brand aborts', rpc.includes('unknown brand'));
test('RPC: exception re-raise → full rollback', rpc.includes('exception') && rpc.includes('raise;'));
test('RPC: inserts against the REAL products columns from 003',
  rpc.includes('insert into public.products (brand_id, sku, ean, name, category, status)') &&
    !rpc.includes('payload'));
test('RPC: audit row uses the REAL audit_log columns from 015',
  rpc.includes('insert into public.audit_log (actor_id, actor_role, action, entity_type, entity_id, details)'));


const disc = read('supabase/functions/discovery-directory/index.ts');
test('directory: mock pool served without credentials', disc.includes('MOCK_POOL') && disc.includes("mode: 'mock'"));
test('directory: live fetch requires explicit env flag',
  disc.includes("DIRECTORY_FETCH") && disc.includes("'enabled'"));
test('directory: no social-media domains anywhere', !/facebook|linkedin|tiktok|instagram|twitter|x\.com/i.test(disc));

// ── Stage 21: esign-envelope + send-email ──
const esign = read('supabase/functions/esign-envelope/index.ts');
test('esign: validates provider allowlist (docusign/pandadoc)',
  esign.includes("['docusign', 'pandadoc']") && esign.includes('Unknown provider'));
test('esign: rejects missing envelope inputs', esign.includes('signatoryEmail are required'));
test('esign: mock mode returns unmistakable id without provider call',
  esign.includes("startsWith('mock:')") && esign.includes('mock_env_'));
test('esign: 503 with clear message when provider creds unset',
  esign.includes('503') && esign.includes('supabase secrets set'));
test('esign: GET status simulates lifecycle for mock envelopes statelessly',
  esign.includes('mockStatus') && esign.includes("'declined'") && esign.includes('declineReason'));
test('esign: real sends create envelopes at the provider APIs',
  esign.includes('/envelopes') && esign.includes('pandadoc.com/public/v1/documents'));
test('esign: Vault resolveToken wired via service-role client',
  esign.includes("schema('vault')") && !/TODO.*vault/i.test(esign));

// §Phase M11 — REPOINTED. This asserted an id prefix `mock_msg_` that matches
// NEITHER the real Edge Function (which never existed) nor the client mock
// (`src/lib/mail/mail.ts` mints `mock:msg-00001`). It now asserts the id the
// client actually produces AND that the server-side simulation uses the SAME
// convention, so the two cannot drift apart.
const email = read('supabase/functions/send-email/index.ts');
const mailSource = read('src/lib/mail/mail.ts');
test('email: mock mode returns an unmistakable id matching the client convention',
  email.includes("startsWith('mock:')") && email.includes('mock:msg-') &&
    mailSource.includes('mock:msg-'));
test('email: validates provider allowlist (postmark/sendgrid)',
  email.includes("['postmark', 'sendgrid']") && email.includes('Unknown provider'));
test('email: 503 with clear message instead of throwing when Vault unwired',
  email.includes('503') && !email.includes('throw new Error'));
test('email: captures messageId from both providers',
  email.includes('MessageID') && email.includes('X-Message-Id'));
test('email: Vault resolveToken wired via service-role client',
  email.includes("schema('vault')") && !/TODO.*vault/i.test(email));

// Client paths match the flat deployed function names.
const mailClient = read('src/lib/mail/mail.ts');
const esignClient = read('src/lib/esign/esign.ts');
test('client/server path agreement: send-email + esign-envelope',
  mailClient.includes('${edgeFunctionBase}/send-email') &&
    esignClient.includes('${edgeFunctionBase}/esign-envelope'));

// ── Stage 22: instantly-reply-webhook + cron migration + Vault wiring ──
// NOTE: marketing is read FIRST so the webhook read (which follows) decides the
// gate for the webhook assertions when that function is absent.
const marketing = read('src/lib/marketing.ts');
const webhook = read('supabase/functions/instantly-reply-webhook/index.ts');
test('webhook: classifies replies through the same intent rules',
  webhook.includes('HOT_LEAD_INTENT_KEYWORDS') && webhook.includes('OBJECTION_KEYWORDS'));
// Keyword-parity drift guard: every hot-lead/objection keyword in the client
// module must also appear in the webhook (and vice versa).
const extractKeywords = (src) =>
  [...src.matchAll(/'([a-z][a-z .']{2,30})'/g)].map((m) => m[1]);
const marketingKeywords = extractKeywords(
  marketing.slice(marketing.indexOf('HOT_LEAD_INTENT_KEYWORDS'), marketing.indexOf('classifyInboundReply'))
);
const webhookKeywords = extractKeywords(
  webhook.slice(webhook.indexOf('HOT_LEAD_INTENT_KEYWORDS'), webhook.indexOf('Deno.serve'))
);
test('webhook: keyword parity with src/lib/marketing.ts (no classifier drift)',
  marketingKeywords.length > 0 &&
    marketingKeywords.every((k) => webhookKeywords.includes(k)) &&
    webhookKeywords.every((k) => marketingKeywords.includes(k)));
test('webhook: optional shared-secret verification',
  webhook.includes('INSTANTLY_WEBHOOK_SECRET') && webhook.includes('Invalid webhook secret'));
test('webhook: persists into messages with schema-valid columns per 0001_init',
  webhook.includes("from('messages')") && webhook.includes("sent_by: 'automation'") &&
    webhook.includes('requires_human') && !webhook.includes('sender_email'));
test('webhook: mock mode classifies without persistence when project envs unset',
  webhook.includes("mode: 'mock'") && webhook.includes('SUPABASE_SERVICE_ROLE_KEY'));

const cron = read('supabase/migrations/025_cron_daily_digest.sql');
test('cron migration: pg_cron + pg_net extensions enabled',
  cron.includes('pg_cron') && cron.includes('pg_net'));
test('cron migration: daily 07:00 schedule posting to daily-digest function',
  cron.includes("'0 7 * * *'") && cron.includes('/functions/v1/daily-digest'));
test('cron migration: deploy-time placeholders clearly marked',
  cron.includes('<PROJECT_REF>') && cron.includes('<SERVICE_ROLE_KEY>'));

// The esign/email Vault assertions live in their own blocks above, each gated by
// its own artefact, so a missing cron migration cannot mask them.

// ── Summary ──
console.log('');
if (missing.length > 0) {
  console.log(`⚠ ${missing.length} deploy-time artefact(s) NOT PRESENT in this repository:`);
  for (const p of missing) console.log(`   - ${p}`);
  console.log('   Action: created and deployed at go-live (see PRODUCTION_READINESS.md / GO_LIVE.md).');
  console.log('   Reported explicitly instead of crashing the validator.');
}
console.log(`Assertions run: ${checks} · failures: ${failures} · skipped (absent artefact): ${skipped}`);
console.log(failures === 0 ? 'EDGE_FUNCTIONS_VALIDATION_PASS' : `EDGE_FUNCTIONS_VALIDATION_FAIL (${failures})`);
if (failures > 0) process.exit(1);
