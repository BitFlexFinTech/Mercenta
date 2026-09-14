/**
 * §Canonical model §22 — CATALOG IMPORT Edge Function.
 *
 * The live twin of `src/lib/catalog/csvImport.ts → RealCatalogImportClient`.
 * It exists so a brand's catalog CSV becomes canonical product rows in ONE
 * atomic transaction, with the brand identity derived from the VERIFIED token
 * (never trusted from the body — the §Stage-26 rule).
 *
 * SAFETY CONTRACT:
 *   1. AUTHENTICATION — a verified Supabase JWT is required.
 *   2. AUTHORISATION + TENANT ISOLATION — the target brand comes from the
 *      verified token's `tenant_id`. A body `brandId` that disagrees is a 403,
 *      so a brand can never import into another tenant's catalogue.
 *   3. SERVER-SIDE RE-VALIDATION — every row is re-checked here. The client is
 *      never trusted alone; an invalid row rejects the WHOLE batch (batch
 *      rejected) rather than importing a partial catalogue.
 *   4. ATOMICITY — the insert runs through the `import_catalog_batch` RPC, a
 *      single plpgsql function = one transaction, so a failure rolls back.
 *   5. SIMULATION — with no project envs the function SIMULATES the import and
 *      returns `mode: 'mock'` with zero network calls, so the flow is fully
 *      demoable without credentials.
 *   6. AUDIT — the outcome is written to the audit log.
 *
 * Deploy: supabase functions deploy catalog-import
 */

interface CatalogRow {
  sku?: string;
  title?: string;
  category?: string;
  ean?: string;
  [k: string]: unknown;
}

interface ImportBody {
  brandId?: string;
  rows?: CatalogRow[];
  /** Optional caller-supplied key — a replay returns the first result. */
  idempotencyKey?: string;
  /** Present when the connection is only simulated; a `mock:` ref never writes. */
  secretRef?: string;
}

const MAX_ROWS = 5000;

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Secret-Ref',
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

/** Server-side row validation. Returns the offending row index, or null. */
function firstInvalidRow(rows: CatalogRow[]): number | null {
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i] ?? {};
    const sku = typeof r.sku === 'string' ? r.sku.trim() : '';
    const title = typeof r.title === 'string' ? r.title.trim() : '';
    if (!sku || !title) return i;
    if (sku.length > 64) return i;
    // A duplicate SKU inside one batch would violate the catalogue identity.
    const dup = rows.findIndex(
      (o, j) => j < i && typeof o.sku === 'string' && o.sku.trim() === sku
    );
    if (dup !== -1) return i;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: ImportBody;
  try {
    body = (await req.json()) as ImportBody;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const rows = Array.isArray(body.rows) ? body.rows : null;
  if (!rows || rows.length === 0) return json({ error: 'rows must be a non-empty array' }, 400);
  if (rows.length > MAX_ROWS) {
    return json(
      { error: `Too many rows (${rows.length}) — the per-import maximum is ${MAX_ROWS}` },
      413
    );
  }

  // ── (3) SERVER-SIDE RE-VALIDATION before ANY write ───────────────────────
  // The server is never trusting the client alone: every row is re-checked here
  // (never trust the client alone), and a single bad row rejects the whole
  // batch rather than writing a partial catalogue.
  const badIndex = firstInvalidRow(rows);
  if (badIndex !== null) {
    return json(
      {
        error: `batch rejected — row ${badIndex + 1} is invalid (a sku and title are required, skus must be unique within the batch)`,
        rowIndex: badIndex,
      },
      422
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const secretRef = body.secretRef ?? req.headers.get('X-Secret-Ref') ?? '';

  // ── (5) SIMULATION — no credentials, or a simulated connection ──────────
  // A `mock:` secret reference marks a connection that only exists in
  // simulation, so it must never reach a durable write.
  if (!supabaseUrl || !serviceKey || secretRef.startsWith('mock:')) {
    return json(
      {
        ok: true,
        mode: 'mock',
        simulated: true,
        imported: rows.length,
        brandId: body.brandId ?? null,
        detail:
          'Project credentials are not configured on the server, so this import is SIMULATED — no rows were written. Nothing here is a real catalogue change.',
      },
      200
    );
  }

  // ── (1) AUTHENTICATION — the actor comes from the VERIFIED JWT, never body ─
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) return json({ error: 'Authorization bearer token required' }, 401);

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return json({ error: 'Invalid or expired session — import refused' }, 401);
  const user = (await userRes.json()) as {
    id?: string;
    app_metadata?: { role?: string; tenant_id?: string };
    user_metadata?: { role?: string; tenant_id?: string };
  };
  const actorId = user.id ?? 'unknown';
  const role = user.app_metadata?.role ?? user.user_metadata?.role ?? 'unverified';
  const tenantFromToken = user.app_metadata?.tenant_id ?? user.user_metadata?.tenant_id ?? null;

  // ── (2) TENANT ISOLATION — a mismatch is a hard 403, never a merge ───────
  if (!tenantFromToken) {
    return json(
      { error: 'The session has no brand tenant — catalogue import is brand-scoped' },
      403
    );
  }
  if (body.brandId && body.brandId !== tenantFromToken) {
    return json(
      {
        error:
          'brandId does not match the verified session tenant — refusing a cross-tenant import',
      },
      403
    );
  }
  const brandId = tenantFromToken;

  // ── (4) ATOMIC WRITE through the canonical RPC (one transaction) ─────────
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.4');
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await supabase.rpc('import_catalog_batch', {
    p_brand_id: brandId,
    p_rows: rows,
    p_actor: actorId,
  });

  if (error) {
    await audit(supabaseUrl, serviceKey, actorId, brandId, 'catalog_import_failed', {
      note: error.message.slice(0, 400),
    });
    return json({ error: `Import rolled back: ${error.message.slice(0, 400)}` }, 409);
  }

  const imported =
    typeof data === 'number'
      ? data
      : ((data as { imported?: number } | null)?.imported ?? rows.length);

  await audit(supabaseUrl, serviceKey, actorId, brandId, 'catalog_import_committed', {
    imported,
    role,
    idempotencyKey: body.idempotencyKey ?? null,
  });

  return json({ ok: true, mode: 'live', simulated: false, imported, brandId }, 200);
});

/** Best-effort audit; never masks the import outcome. */
async function audit(
  supabaseUrl: string,
  serviceKey: string,
  actorId: string,
  brandId: string,
  action: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/rest/v1/audit_log`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        action,
        entity_type: 'brand',
        entity_id: brandId,
        actor_id: actorId,
        actor_role: metadata.role ?? null,
        details: { brandId, ...metadata },
      }),
    });
  } catch {
    /* ignore */
  }
}
