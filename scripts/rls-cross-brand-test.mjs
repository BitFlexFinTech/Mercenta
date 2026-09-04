/**
 * §7 Stage-7 RUNTIME cross-brand isolation test.
 *
 * Static policy audit (rls-audit.mjs) proves the SQL is right; this proves
 * the DATABASE enforces it: authenticated as brand A's user, a direct API
 * query for brand B's rows must return ZERO rows — not "UI hides it".
 *
 * Requires a live Supabase project + two seeded demo auth users:
 *   SUPABASE_URL, SUPABASE_ANON_KEY  (or VITE_ prefixed)
 *   BRAND_A_EMAIL / BRAND_A_PASSWORD, BRAND_B_EMAIL / BRAND_B_PASSWORD
 * Without them this script SKIPs with exit 0 and exact setup instructions —
 * it never fakes a pass.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log('SKIP: no Supabase configured. To run the real cross-brand test:');
  console.log('  1. supabase db push (applies migrations incl. demo seed)');
  console.log('  2. create two auth users, link each to a different brands row');
  console.log('     (brands.auth_user_id)');
  console.log('  3. SUPABASE_URL=… SUPABASE_ANON_KEY=… \\');
  console.log('     BRAND_A_EMAIL=… BRAND_A_PASSWORD=… \\');
  console.log('     BRAND_B_EMAIL=… BRAND_B_PASSWORD=… \\');
  console.log('     node scripts/rls-cross-brand-test.mjs');
  process.exit(0);
}

const aEmail = process.env.BRAND_A_EMAIL;
const bEmail = process.env.BRAND_B_EMAIL;
if (!aEmail || !bEmail || !process.env.BRAND_A_PASSWORD || !process.env.BRAND_B_PASSWORD) {
  console.error('FAIL: set BRAND_A_EMAIL/PASSWORD and BRAND_B_EMAIL/PASSWORD.');
  process.exit(1);
}

let failures = 0;
function check(name, ok, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failures++;
}

const admin = createClient(url, key);
const { data: brands } = await admin.from('brands').select('id, legacy_demo_id').limit(2);
if (!brands || brands.length < 2) {
  console.error('FAIL: need ≥2 seeded brands to test isolation.');
  process.exit(1);
}
const [, brandB] = brands; // we authenticate as brands[0], attack brands[1]

// Sign in as brand A only.
const a = createClient(url, key);
const { error: authErr } = await a.auth.signInWithPassword({
  email: aEmail,
  password: process.env.BRAND_A_PASSWORD,
});
check('brand A sign-in', !authErr, authErr?.message);
if (authErr) process.exit(1);

for (const table of ['products', 'purchase_orders', 'shipments', 'contracts', 'compliance_documents', 'messages']) {
  const { data, error } = await a.from(table).select('*').eq('brand_id', brandB.id);
  const blocked = !error && Array.isArray(data) && data.length === 0;
  check(`${table}: brand B rows invisible to brand A`, blocked,
    error ? `error: ${error.message}` : `${data?.length ?? '?'} rows`);
}

console.log(failures === 0 ? 'CROSS_BRAND_ISOLATION_PASS' : `CROSS_BRAND_ISOLATION_FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);
