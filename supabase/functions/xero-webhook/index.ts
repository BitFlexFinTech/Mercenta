/** §Xero — Webhook endpoint for Xero event notifications.
 *
 * POST /functions/v1/xero-webhook
 *
 * - Validates the HMAC-SHA256 signature from the `x-xero-signature` header
 *   (timing-safe comparison). The secret is REQUIRED — see below.
 * - Parses event type and queues the relevant sync operation.
 * - Returns 200 within 5 seconds (Xero retries if no response).
 *
 * §PHASE B (2026-10-13) — TWO AUTHENTICATION DEFECTS FIXED HERE.
 *
 * 1. THE SECRET HAD A PUBLISHED FALLBACK. `getWebhookSecret()` returned
 *    `Deno.env.get('XERO_WEBHOOK_SECRET') ?? 'demo-webhook-secret'`, and that
 *    literal is committed to this repository. The handler then computed
 *    `const isDemo = secret === 'demo-webhook-secret'` and SKIPPED the signature
 *    check when it matched — which is what happened whenever the environment
 *    variable was unset. Anyone could post a forged Xero event body and have sync
 *    jobs created. A published fallback secret is not a weaker secret; it is no
 *    authentication at all.
 *
 * 2. THE SIGNATURE CHECK IS NO LONGER OPTIONAL. With `XERO_WEBHOOK_SECRET` unset
 *    the function REFUSES with 503 rather than accepting a body it cannot verify.
 *    Setting the same value in Xero's webhook settings and in this function's
 *    environment turns it on — no code change.
 *
 * Deploy: Xero cannot present a Supabase JWT, so this endpoint authenticates its
 * caller by HMAC signature instead — that is why `--no-verify-jwt` is correct
 * here and ONLY here. Never copy that flag onto a function that reads Vault or
 * mutates data on a user's behalf.
 *   supabase functions deploy xero-webhook --no-verify-jwt
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createHmac, timingSafeEqual } from 'https://deno.land/std@0.177.0/crypto/mod.ts';
import { rateLimitGuard } from '../_shared/rateLimit.ts';

interface WebhookEvent {
  resourceId: string;
  resourceUrl: string;
  resourceType: string;
  eventType: string;
  eventDateUTC: string;
  tenantId: string;
  tenantType: string;
}

interface WebhookPayload {
  events: WebhookEvent[];
  lastEventDateUTC?: string;
  firstEventDateUTC?: string;
  entropy?: string;
  eventNotificationId?: string;
}

interface SyncQueueItem {
  partnerId: string;
  operation: 'full_resync' | 'contact_sync';
  triggerEvent: string;
}

// In-memory queue (for demo — in production, use a proper queue like PG-Queue)
const syncQueue: SyncQueueItem[] = [];

/**
 * §PHASE B — the webhook secret, or `null` when it is not configured.
 *
 * THERE IS DELIBERATELY NO FALLBACK VALUE. A fallback committed to a public
 * repository is known to every reader, so it authenticates nobody. Returning
 * `null` forces the caller to fail closed.
 */
function getWebhookSecret(): string | null {
  const secret = (Deno.env.get('XERO_WEBHOOK_SECRET') ?? '').trim();
  return secret.length > 0 ? secret : null;
}

function isValidSignature(body: string, signature: string): boolean {
  const secret = getWebhookSecret();
  /* No configured secret means no signature can be valid. Fail closed. */
  if (!secret) return false;
  const hmac = createHmac('sha256', new TextEncoder().encode(secret));
  const digest = hmac.update(new TextEncoder().encode(body)).digest();
  const expected = new TextEncoder().encode(
    Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  );
  const actual = new TextEncoder().encode(signature);

  // Timing-safe comparison
  if (expected.byteLength !== actual.byteLength) return false;
  return timingSafeEqual(expected, actual);
}

async function processEvent(event: WebhookEvent): Promise<void> {
  const partnerId = event.tenantId; // Xero tenant ID maps to our partner_id
  const eventType = event.eventType; // 'CREATE', 'UPDATE', 'DELETE'
  const resourceType = event.resourceType; // 'INVOICE', 'CONTACT'

  console.log(`[xero-webhook] ${eventType} ${resourceType} resourceId=${event.resourceId} tenantId=${event.tenantId}`);

  // Queue the appropriate sync operation
  if (resourceType === 'INVOICE' && (eventType === 'CREATE' || eventType === 'UPDATE')) {
    syncQueue.push({ partnerId, operation: 'full_resync', triggerEvent: `${eventType}_${resourceType}` });
  } else if (resourceType === 'CONTACT' && (eventType === 'CREATE' || eventType === 'UPDATE')) {
    syncQueue.push({ partnerId, operation: 'contact_sync', triggerEvent: `${eventType}_${resourceType}` });
  }

  // In production, queue to a persistent job queue instead of in-memory
}

serve(async (req: Request) => {
  const startTime = Date.now();

  // Only accept POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }
  const limited = rateLimitGuard(req, 'xero-webhook', {});
  if (limited) return limited;

  // Read body
  const bodyText = await req.text();
  const signature = req.headers.get('x-xero-signature') ?? '';

  /* §PHASE B — REFUSE when the secret is not configured. The previous condition
     compared the secret against the published fallback literal and SKIPPED the
     check when it matched, so an unconfigured deployment accepted any body. */
  if (!getWebhookSecret()) {
    console.error('[xero-webhook] XERO_WEBHOOK_SECRET is not configured — refusing');
    return new Response(
      JSON.stringify({
        error:
          'XERO_WEBHOOK_SECRET is not configured on the server, so this webhook cannot authenticate its caller and is refusing the request.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!isValidSignature(bodyText, signature)) {
    console.error('[xero-webhook] Invalid signature');
    return new Response('Invalid signature', { status: 401 });
  }

  // Parse payload
  let payload: WebhookPayload;
  try {
    payload = JSON.parse(bodyText) as WebhookPayload;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Process events (don't await — queue them)
  for (const event of payload.events ?? []) {
    processEvent(event).catch((err) => console.error('[xero-webhook] Error processing event:', err));
  }

  const elapsed = Date.now() - startTime;
  console.log(`[xero-webhook] Processed ${payload.events?.length ?? 0} events in ${elapsed}ms`);

  // Must return 200 within 5 seconds
  return new Response(JSON.stringify({ received: payload.events?.length ?? 0 }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});