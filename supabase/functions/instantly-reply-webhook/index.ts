/**
 * §Canonical model §19/§22 — INSTANTLY REPLY WEBHOOK Edge Function.
 *
 * Receives an outreach reply from Instantly.ai, classifies it through the SAME
 * intent rules as the client module, and routes it: a reply that wants a human
 * is flagged so it surfaces immediately, everything else is recorded quietly.
 *
 * ⚠️ CLASSIFIER PARITY: the keyword arrays below are duplicated from
 * `src/lib/marketing.ts` because Deno cannot import the `@/` alias. Keyword
 * parity is enforced by `scripts/validate-edge-functions.mjs`, so the two
 * copies cannot drift.
 *
 * SAFETY CONTRACT:
 *   1. OPTIONAL SHARED SECRET — when INSTANTLY_WEBHOOK_SECRET is set, the
 *      request must carry it; otherwise the call is rejected.
 *   2. SIMULATION — with no project envs the reply is classified and routed in
 *      memory (`mode: 'mock'`) and NOTHING is persisted. No false success.
 *   3. IDEMPOTENCY — the provider's message id is the row identity, so a
 *      replayed webhook updates in place instead of duplicating a reply.
 *   4. AUDITABILITY — a hot lead writes an audit row as well as the message.
 *
 * Deploy: supabase functions deploy instantly-reply-webhook --no-verify-jwt
 * (the shared secret is the authentication mechanism for this endpoint)
 */

import { rateLimitGuard } from '../_shared/rateLimit.ts';

const HOT_LEAD_INTENT_KEYWORDS = [
  'price', 'pricing', 'cost', 'quote',
  'call', 'talk', 'chat',
  'can we', 'interested in discussing',
];

const OBJECTION_KEYWORDS = [
  'too expensive', 'not interested', 'we already have', 'concern about',
];

interface ReplyClassification {
  wantsHuman: boolean;
  reason?: string;
}

function classifyInboundReply(body: string): ReplyClassification {
  const lower = body.toLowerCase();
  const intentHit = HOT_LEAD_INTENT_KEYWORDS.find((k) => lower.includes(k));
  if (intentHit) {
    return { wantsHuman: true, reason: `pricing/discussion intent (${intentHit})` };
  }
  const objectionHit = OBJECTION_KEYWORDS.find((k) => lower.includes(k));
  if (objectionHit) {
    return { wantsHuman: true, reason: `objection detected (${objectionHit})` };
  }
  return { wantsHuman: false };
}

interface WebhookBody {
  reply?: { id?: string; body?: string; from?: string; campaign?: string };
  lead?: { email?: string; brand_id?: string };
  /** Flat shape some Instantly webhook configurations post instead. */
  id?: string;
  text?: string;
  brand_id?: string;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
  };
  const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const limited = rateLimitGuard(req, 'instantly-reply-webhook', corsHeaders);
  if (limited) return limited;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ── (1) OPTIONAL SHARED-SECRET VERIFICATION ─────────────────────────────
  const expectedSecret = Deno.env.get('INSTANTLY_WEBHOOK_SECRET') ?? '';
  if (expectedSecret) {
    const supplied =
      req.headers.get('X-Webhook-Secret') ??
      (req.headers.get('Authorization') ?? '').replace(/^Bearer /, '');
    if (supplied !== expectedSecret) {
      return json({ error: 'Invalid webhook secret' }, 401);
    }
  }

  let body: WebhookBody;
  try {
    body = (await req.json()) as WebhookBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const text = (body.reply?.body ?? body.text ?? '').trim();
  if (!text) return json({ error: 'A reply body is required' }, 400);

  const providerMessageId = body.reply?.id ?? body.id ?? '';
  const brandId = body.lead?.brand_id ?? body.brand_id ?? null;
  const classification = classifyInboundReply(text);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  // ── (2) SIMULATION — no project envs → classify only, persist nothing ───
  if (!supabaseUrl || !serviceKey) {
    return json(
      {
        ok: true,
        mode: 'mock',
        simulated: true,
        requiresHuman: classification.wantsHuman,
        reason: classification.reason ?? null,
        persisted: false,
        detail:
          'Project credentials are not configured on the server, so this reply was CLASSIFIED but NOT persisted. Nothing was written.',
      },
      200
    );
  }

  if (!brandId) {
    // Without a brand tenant the reply cannot be routed. Refuse rather than
    // writing an orphan row that no brand would ever see.
    return json({ error: 'A brand_id is required to route the reply' }, 422);
  }

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // ── (3) IDEMPOTENCY — the provider message id is the row identity ───────
  const rowId = providerMessageId || `reply-${brandId}-${text.length}`;
  const row = {
    id: rowId,
    brand_id: brandId,
    sender_role: 'outreach_lead',
    content: text,
    // The client module's own marker for automation-authored traffic. Column
    // added by migration 026 (§22 message-routing columns).
    sent_by: 'automation',
    requires_human: classification.wantsHuman,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('messages').upsert(row, { onConflict: 'id' });
  if (error) {
    return json({ error: `Reply could not be persisted: ${error.message}` }, 502);
  }

  // ── (4) AUDITABILITY — a hot lead is a first-class audited event ────────
  if (classification.wantsHuman) {
    try {
      await supabase.from('audit_log').insert({
        actor_id: null,
        actor_role: 'automation',
        action: 'outreach_hot_lead',
        entity_type: 'brand',
        entity_id: brandId,
        details: { reason: classification.reason, providerMessageId: rowId },
      });
    } catch {
      /* An audit failure must not lose the reply that was already stored. */
    }
  }

  return json(
    {
      ok: true,
      mode: 'live',
      simulated: false,
      persisted: true,
      requiresHuman: classification.wantsHuman,
      reason: classification.reason ?? null,
    },
    200
  );
});
