// Stage-17 — validates the three new Edge Functions structurally:
//   payouts-transfer (mock path, idempotency, Stripe call shape)
//   catalog-import (server re-validation + RPC transaction)
//   discovery-directory (mock pool, live gating, no social scraping)
//   migration 0010 defines the atomic import_catalog_batch RPC
import { readFileSync } from 'node:fs';

let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const payouts = read('supabase/functions/payouts-transfer/index.ts');
test('payouts: forwards Idempotency-Key to Stripe', payouts.includes("'Idempotency-Key': idempotencyKey"));
test('payouts: creates a transfer, never a charge', payouts.includes('/v1/transfers') && !payouts.includes('/v1/charges'));
test('payouts: mock mode returns unmistakable id without Stripe', payouts.includes("startsWith('mock:')") && payouts.includes('mock_tr_'));
test('payouts: rejects non-positive amounts', payouts.includes('must be positive'));
test('payouts: 503 with clear message when STRIPE_SECRET_KEY unset',
  payouts.includes('STRIPE_SECRET_KEY') && payouts.includes('503'));

const imp = read('supabase/functions/catalog-import/index.ts');
test('import: server-side row re-validation before any write',
  imp.includes('never trust the client alone') && imp.includes('batch rejected'));
test('import: calls the atomic RPC', imp.includes("rpc('import_catalog_batch'"));
test('import: mock mode simulates imported count', imp.includes("startsWith('mock:')"));

const rpc = read('supabase/migrations/0010_rpc_catalog_import.sql');
test('RPC: single plpgsql function = one transaction', rpc.includes('language plpgsql') && rpc.includes('for v_row in'));
test('RPC: duplicate in-batch SKU aborts', rpc.includes('duplicate sku within batch'));
test('RPC: unknown brand aborts', rpc.includes('unknown brand'));
test('RPC: exception re-raise → full rollback', rpc.includes('exception') && rpc.includes('raise;'));

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

const email = read('supabase/functions/send-email/index.ts');
test('email: mock mode returns unmistakable id without provider call',
  email.includes("startsWith('mock:')") && email.includes('mock_msg_'));
test('email: validates provider allowlist (postmark/sendgrid)',
  email.includes("['postmark', 'sendgrid']") && email.includes('Unknown provider'));
test('email: 503 with clear message instead of throwing when Vault unwired',
  email.includes('503') && !email.includes('throw new Error'));
test('email: captures messageId from both providers',
  email.includes('MessageID') && email.includes('X-Message-Id'));

// Client paths match the flat deployed function names.
const mailClient = read('src/lib/mail/mail.ts');
const esignClient = read('src/lib/esign/esign.ts');
test('client/server path agreement: send-email + esign-envelope',
  mailClient.includes('${edgeFunctionBase}/send-email') &&
    esignClient.includes('${edgeFunctionBase}/esign-envelope'));

// ── Stage 22: instantly-reply-webhook + cron migration + Vault wiring ──
const webhook = read('supabase/functions/instantly-reply-webhook/index.ts');
const marketing = read('src/lib/marketing.ts');
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

const cron = read('supabase/migrations/0011_cron_daily_digest.sql');
test('cron migration: pg_cron + pg_net extensions enabled',
  cron.includes('pg_cron') && cron.includes('pg_net'));
test('cron migration: daily 07:00 schedule posting to daily-digest function',
  cron.includes("'0 7 * * *'") && cron.includes('/functions/v1/daily-digest'));
test('cron migration: deploy-time placeholders clearly marked',
  cron.includes('<PROJECT_REF>') && cron.includes('<SERVICE_ROLE_KEY>'));

test('esign/email: Vault resolveToken wired via service-role client',
  esign.includes("schema('vault')") && email.includes("schema('vault')") &&
    !/TODO.*vault/i.test(esign) && !/TODO.*vault/i.test(email));

console.log(failures === 0 ? 'EDGE_FUNCTIONS_VALIDATION_PASS' : `EDGE_FUNCTIONS_VALIDATION_FAIL (${failures})`);
if (failures > 0) process.exit(1);
