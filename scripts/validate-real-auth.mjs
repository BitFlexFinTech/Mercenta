/**
 * §PHASE B — REAL-AUTHENTICATION GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The second audit's central security finding was that the browser never obtained
 * a real identity, so every RLS policy was correct and unexercised. The fix
 * (`src/lib/auth/supabaseAuth.ts` + the `GlobalStateContext` wiring) introduces a
 * mapping from a VERIFIED Supabase claim onto the session the app already uses.
 * A mapping is exactly the kind of thing that drifts silently — so this gate
 * EXECUTES it (Vite `ssrLoadModule`, the same way `validate-environment.mjs`
 * proves the demo/live switch) instead of describing it.
 *
 * It proves:
 *   1  the role mapping is correct for every server vocabulary value;
 *   2  it FAILS CLOSED — an unknown role is a BRAND, never staff;
 *   3  a brand session with NO tenant is REFUSED outright;
 *   4  staff sessions carry no tenant (a staff account is never a brand tenant);
 *   5  the CLAIM VOCABULARY cannot drift from the Edge Functions' own lists
 *      (`OPERATOR_ROLES`, `APPROVER_ROLES`) — read from the server source;
 *   6  the client's claim name matches the RLS policy's claim name (`tenant_id`);
 *   7  real authentication is UNAVAILABLE without a Supabase project, so the
 *      platform stays fully usable in demo with no credential;
 *   8  the login screen shows the role picker ONLY in demo (source-pinned), so
 *      "select Super Admin" can never be offered in live.
 */
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

let failures = 0;
let checks = 0;
const test = (name, ok, detail) => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 400)}`);
  }
};

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });

try {
  const auth = await server.ssrLoadModule('/src/lib/auth/supabaseAuth.ts');

  /* ── 1. the role mapping ─────────────────────────────────────────────── */
  test(
    "claim 'super_admin' maps to the 'Super Admin' session role",
    auth.roleForClaim('super_admin') === 'Super Admin',
    auth.roleForClaim('super_admin')
  );
  test(
    "claim 'admin_staff' maps to the 'Mercenta Admin' session role",
    auth.roleForClaim('admin_staff') === 'Mercenta Admin',
    auth.roleForClaim('admin_staff')
  );
  test(
    "claim 'brand' maps to the 'Brand Partner' session role",
    auth.roleForClaim('brand') === 'Brand Partner',
    auth.roleForClaim('brand')
  );

  /* ── 2. FAIL CLOSED on an unknown role ───────────────────────────────── */
  for (const bad of ['root', '', null, undefined, 'SUPER_ADMIN_FAKE', 'owner']) {
    test(
      `an unrecognised claim (${JSON.stringify(bad)}) fails closed to Brand Partner`,
      auth.roleForClaim(bad) === 'Brand Partner',
      auth.roleForClaim(bad)
    );
  }

  /* ── 3. a brand with no tenant is REFUSED ────────────────────────────── */
  test(
    'a BRAND claim with a tenant yields a tenant-pinned brand session',
    (() => {
      const s = auth.mapClaimsToSession({ role: 'brand', tenantId: 'brand-a' });
      return s && s.tier === 'brand' && s.tenantId === 'brand-a';
    })(),
    JSON.stringify(auth.mapClaimsToSession({ role: 'brand', tenantId: 'brand-a' }))
  );
  test(
    'a BRAND claim with NO tenant is REFUSED (null) — never an unscoped brand',
    auth.mapClaimsToSession({ role: 'brand', tenantId: null }) === null &&
      auth.mapClaimsToSession({ role: 'brand', tenantId: '' }) === null &&
      auth.mapClaimsToSession({ role: 'brand', tenantId: '   ' }) === null
  );

  /* ── 4. staff carry no tenant ────────────────────────────────────────── */
  test(
    'a super_admin session carries NO tenantId (staff is never a brand tenant)',
    (() => {
      const s = auth.mapClaimsToSession({ role: 'super_admin', tenantId: 'brand-a' });
      return s && s.tier === 'super_admin' && s.tenantId === undefined;
    })()
  );
  test(
    'an admin_staff session carries NO tenantId',
    (() => {
      const s = auth.mapClaimsToSession({ role: 'admin_staff', tenantId: 'brand-a' });
      return s && s.tier === 'admin_staff' && s.tenantId === undefined;
    })()
  );

  /* ── 5. claims are read from app_metadata ONLY ───────────────────────── */
  test(
    'claims are read from app_metadata (never from user_metadata, which a user can write)',
    (() => {
      const claims = auth.claimsFromUser({
        app_metadata: { role: 'admin_staff', tenant_id: 't-1' },
        user_metadata: { role: 'super_admin' },
      });
      return claims.role === 'admin_staff' && claims.tenantId === 't-1';
    })()
  );
  test(
    'a user with no app_metadata produces NO session at all (fail-closed end to end)',
    auth.claimsFromUser(null).role === '' &&
      auth.claimsFromUser(null).tenantId === null &&
      auth.mapClaimsToSession(auth.claimsFromUser(null)) === null &&
      auth.mapClaimsToSession(auth.claimsFromUser({})) === null
  );

  /* ── 6. the claim VOCABULARY cannot drift from the server's ──────────── */
  const operatorSrc = read('supabase/functions/_shared/operatorAuth.ts');
  const payoutSrc = read('supabase/functions/payouts-transfer/index.ts');
  /** Capture one bracketed role list. (A spread of a STRING would split it into
   *  characters — this was a real bug in the first draft of this gate.) */
  const grab = (src, re) => {
    const m = src.match(re);
    return m ? m[1] : '';
  };
  const rolesText =
    grab(operatorSrc, /OPERATOR_ROLES[^=]*=\s*\[([^\]]*)\]/) +
    ',' +
    grab(payoutSrc, /APPROVER_ROLES\s*=\s*\[([^\]]*)\]/);
  const uniqueServerRoles = [
    ...new Set((rolesText.match(/'([a-z_]+)'/g) || []).map((s) => s.replace(/'/g, ''))),
  ].sort();
  test(
    `the server's role vocabulary was discovered (${uniqueServerRoles.join(', ') || 'NONE'})`,
    uniqueServerRoles.length > 0,
    'a check that finds nothing is a FAILURE, not a pass'
  );
  test(
    'EVERY server operator/approver role maps to a STAFF tier (never a brand)',
    uniqueServerRoles.length > 0 &&
      uniqueServerRoles.every((r) => {
        const tier = auth.mapClaimsToSession({ role: r, tenantId: null })?.tier;
        return tier === 'super_admin' || tier === 'admin_staff';
      }),
    uniqueServerRoles
      .map((r) => `${r}->${JSON.stringify(auth.mapClaimsToSession({ role: r, tenantId: null }))}`)
      .join(' ')
  );

  /* ── 7. the client claim name matches the RLS policy's claim name ────── */
  const brandMigration = read('supabase/migrations/002_create_brands.sql');
  test(
    "RLS reads the tenant from the JWT claim 'tenant_id'",
    /auth\.jwt\(\)\s*->>\s*'tenant_id'/.test(brandMigration)
  );
  test(
    "the client reads the SAME claim name from app_metadata ('tenant_id')",
    /meta\.tenant_id/.test(read('src/lib/auth/supabaseAuth.ts')) ||
      /app_metadata\?\.tenant_id|app_metadata\.tenant_id/.test(read('src/lib/auth/supabaseAuth.ts')) ||
      /meta\.tenant_id/.test(read('src/lib/auth/supabaseAuth.ts'))
  );

  /* ── 8. real auth is UNAVAILABLE with no Supabase project ────────────── */
  test(
    'real authentication is UNAVAILABLE without a configured Supabase project (demo needs no credential)',
    auth.isRealAuthAvailable() === false,
    `isRealAuthAvailable=${auth.isRealAuthAvailable()}`
  );
  test(
    'sign-in with credentials REFUSES cleanly when the platform is not configured for it',
    (await auth.signInWithCredentials('a@b.c', 'pw')).ok === false
  );

  /* ── 9. the role picker can never be offered in live (source-pinned) ─── */
  const loginSrc = read('src/components/auth/Login.tsx');
  test(
    "Login renders the REAL sign-in only when authMode === 'real'",
    /authMode === 'real'/.test(loginSrc) && /<RealSignIn\s*\/>/.test(loginSrc)
  );
  test(
    'the demo role picker is PRESERVED (signIn is still called for the demo path)',
    /signIn\(login\.environment, login\.role\)/.test(loginSrc)
  );
  test(
    'the guard sits AFTER every hook in Login (Rules of Hooks)',
    (() => {
      const lastHook = Math.max(
        ...['useState', 'useEffect', 'useMemo', 'useCallback', 'useRef']
          .map((h) => loginSrc.lastIndexOf(`${h}(`))
          .filter((i) => i >= 0)
      );
      const guard = loginSrc.indexOf("if (authMode === 'real')");
      return guard > lastHook;
    })()
  );

  console.log(
    failures === 0 ? 'REAL_AUTH_VALIDATION_PASS' : `REAL_AUTH_VALIDATION_FAIL (${failures})`
  );
  if (failures > 0) process.exitCode = 1;
} finally {
  await server.close();
}
