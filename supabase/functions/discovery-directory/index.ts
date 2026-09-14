/**
 * §Canonical model §22 — DISCOVERY DIRECTORY Edge Function.
 *
 * The live twin of `src/lib/discovery/engine.ts → RealDirectoryClient`. Public
 * exporter/trade directories publish static listings with no JSON API, so a
 * browser cannot read them (CORS + robots). This function fetches and parses
 * them SERVER-side, respecting an explicit opt-in flag.
 *
 * SAFETY / TRUTHFULNESS CONTRACT:
 *   1. SIMULATION FIRST — with no credentials the function serves a
 *      deterministic in-function MOCK_POOL and declares `mode: 'mock'`, so the
 *      discovery pipeline is fully navigable with zero network calls.
 *   2. LIVE IS OPT-IN — a real outbound fetch only happens when the operator
 *      explicitly sets DIRECTORY_FETCH to 'enabled'. Absent or any other value
 *      keeps the function on the simulated pool.
 *   3. NOTHING IS INVENTED — the parser accepts only structured list data; a
 *      page it cannot parse yields no leads rather than fabricated ones.
 *   4. NO SOCIAL-MEDIA SCRAPING — the function touches trade/export directories
 *      only. Social platforms are never fetched, and their domains appear
 *      nowhere in this file (asserted by the validator).
 *   5. AUTHORISATION — discovery is a Mercenta staff capability, not a brand one.
 *
 * Deploy: supabase functions deploy discovery-directory
 */

/** Deterministic simulated directory leads — no network of any kind. */
const MOCK_POOL = [
  {
    companyName: 'Harvest Lane Organics',
    country: 'Zimbabwe',
    segment: 'Grocery',
    sourceDirectory: 'ZimTrade exporter directory',
    website: 'harvestlane.co.zw',
  },
  {
    companyName: 'Sahara Threads Ltd',
    country: 'Ghana',
    segment: 'Apparel',
    sourceDirectory: 'GEPA directory',
    website: 'saharathreads.com',
  },
  {
    companyName: 'Pixel Perch Electronics',
    country: 'United States',
    segment: 'Consumer Electronics',
    sourceDirectory: 'US CS trade leads',
    website: 'pixelperch.io',
  },
  {
    companyName: 'Voltaic Home Appliance Co',
    country: 'Kenya',
    segment: 'Home',
    sourceDirectory: 'KEPROBA exporter register',
    website: 'voltaic.co.ke',
  },
  {
    companyName: 'ApexDrive Accessories GmbH',
    country: 'Germany',
    segment: 'Automotive',
    sourceDirectory: 'US CS trade leads',
    website: 'apexdrive.de',
  },
];

/** Directory URLs the operator has approved for server-side retrieval. */
const APPROVED_DIRECTORY_HOSTS = [
  'zimtrade.co.zw',
  'gepa.org.gh',
  'keproba.go.ke',
  'trade.gov',
];

const STAFF_ROLES = ['super_admin', 'admin_staff'];

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders() });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { segments?: string[]; urls?: string[] };
  try {
    body = (await req.json()) as { segments?: string[]; urls?: string[] };
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const segments = Array.isArray(body.segments) ? body.segments : [];

  // ── (2) LIVE IS OPT-IN — absence of the flag keeps us SIMULATED ─────────
  const liveFetchEnabled = (Deno.env.get('DIRECTORY_FETCH') ?? 'disabled').toLowerCase() === 'enabled';

  if (!liveFetchEnabled) {
    const seg = new Set(segments.map((s) => s.toLowerCase()));
    const leads = MOCK_POOL.filter((l) => seg.size === 0 || seg.has(l.segment.toLowerCase()));
    return json(
      {
        ok: true,
        mode: 'mock',
        simulated: true,
        leads,
        detail:
          'Simulated directory leads — DIRECTORY_FETCH is not set to "enabled", so NO outbound request was made and nothing here came from a live directory.',
      },
      200
    );
  }

  // ── (5) AUTHORISATION — discovery is a Mercenta staff capability ────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!supabaseUrl || !serviceKey) {
    return json(
      {
        error:
          'DIRECTORY_FETCH is enabled but the project is not configured on the server (SUPABASE_URL unset) — refusing to fetch unverified',
      },
      503
    );
  }
  if (!token) return json({ error: 'Authorization bearer token required' }, 401);

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${token}` },
  });
  if (!userRes.ok) return json({ error: 'Invalid or expired session' }, 401);
  const user = (await userRes.json()) as {
    app_metadata?: { role?: string };
    user_metadata?: { role?: string };
  };
  const role = user.app_metadata?.role ?? user.user_metadata?.role ?? 'unverified';
  if (!STAFF_ROLES.includes(role)) {
    return json({ error: 'Directory discovery is restricted to Mercenta staff' }, 403);
  }

  const urls = Array.isArray(body.urls) ? body.urls : [];
  if (urls.length === 0) {
    return json({ error: 'urls must be a non-empty array when live fetching is enabled' }, 400);
  }

  const leads: Array<Record<string, unknown>> = [];
  for (const url of urls) {
    let host: string;
    try {
      host = new URL(url).host;
    } catch {
      return json({ error: `Not a valid URL: ${url}` }, 400);
    }
    // Only operator-approved directory hosts are ever retrieved.
    if (!APPROVED_DIRECTORY_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      return json(
        { error: `Host "${host}" is not an approved discovery directory source` },
        403
      );
    }
    try {
      const page = await fetch(url, { headers: { 'User-Agent': 'MercentaDiscovery/1.0' } });
      if (!page.ok) continue;
      const html = await page.text();
      // (3) Conservative structured extraction only — a page we cannot parse
      // contributes NO leads rather than invented ones.
      for (const row of extractStructuredRows(html)) leads.push(row);
    } catch {
      /* A single unreachable directory must not abort the whole run. */
    }
  }

  return json(
    { ok: true, mode: 'live', simulated: false, leads, detail: `Retrieved ${leads.length} structured lead row(s) from ${urls.length} approved source(s).` },
    200
  );
});

/**
 * (3) Conservative parse: only rows shaped as a company + country pair in a
 * table/list are accepted. Anything ambiguous is dropped — the engine would
 * rather return fewer leads than fabricate one.
 */
function extractStructuredRows(html: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  for (const match of html.matchAll(rowRe)) {
    const cells = [...match[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) =>
      c[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    );
    if (cells.length >= 2 && cells[0].length > 1 && cells[1].length > 1) {
      out.push({ companyName: cells[0], country: cells[1], segment: '', sourceDirectory: '', website: '' });
    }
  }
  return out;
}
