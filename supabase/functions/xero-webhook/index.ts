/** §Xero — Webhook endpoint for Xero event notifications.
 *
 * POST /functions/v1/xero-webhook
 *
 * - Validates HMAC-SHA256 signature from x-xero-signature header
 *   (timing-safe comparison).  In demo mode, accepts any signature.
 * - Parses event type and queues the relevant sync operation.
 * - Returns 200 within 5 seconds (Xero retries if no response).
 *
 * This is a Supabase Edge Function — deploy as:
 *   supabase functions deploy xero-webhook --no-verify-jwt
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createHmac, timingSafeEqual } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

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

function getWebhookSecret(): string {
  return Deno.env.get('XERO_WEBHOOK_SECRET') ?? 'demo-webhook-secret';
}

function isValidSignature(body: string, signature: string): boolean {
  const secret = getWebhookSecret();
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

  // Read body
  const bodyText = await req.text();
  const signature = req.headers.get('x-xero-signature') ?? '';

  // Validate signature (in demo mode, accept any)
  const secret = getWebhookSecret();
  const isDemo = secret === 'demo-webhook-secret';
  if (!isDemo && !isValidSignature(bodyText, signature)) {
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