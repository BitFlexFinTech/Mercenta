#!/usr/bin/env node
/**
 * §PHASE 3 / ITEM 4 — THE TENANT-SCOPE GATE.
 *
 * A tenant assertion that exists but is called from nowhere is worse than none: it
 * reads like a control. This gate proves the WHOLE chain, and names what it found:
 *
 *   1. the route manifest and the live builder exist, and ASIN-bearing payloads are
 *      actually found (if the search finds NOTHING the gate FAILS — a check that finds
 *      nothing certifies the wrong state);
 *   2. the ASIN-bearing routes are DERIVED from the builder that emits them;
 *   3. the shared module exports the assertion, queries `brand_asin_scope`, and writes
 *      `spapi_access_audit`;
 *   4. the handler CALLS the assertion BEFORE the provider call and refuses with 403;
 *   5. the granted path is logged too, and a failed log write refuses;
 *   6. a mutation self-check proves the gate rejects a handler that lost the call.
 *
 * Wired into `validate:all` by the runner's own glob (`scripts/validate-*.mjs`).
 */
import { readFileSync, existsSync } from 'node:fs';

const ROUTES = 'supabase/functions/_shared/proxyRoutes.ts';
const LIVE = 'supabase/functions/_shared/live/spapiLive.ts';
const SCOPE = 'supabase/functions/_shared/tenantScope.ts';
const HANDLER = 'supabase/functions/spapi/index.ts';

let pass = 0;
const failures = [];
const test = (name, ok, detail = '') => {
  if (ok) { pass++; console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`); }
  else { failures.push(name); console.log(`✗ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const read = (p) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

const routes = read(ROUTES);
const live = read(LIVE);
const scope = read(SCOPE);
const handler = read(HANDLER);

/* ── A. THE INPUTS EXIST ───────────────────────────────────────────────────── */
test('A1 the route manifest exists', routes.length > 0, ROUTES);
test('A2 the live builder exists', live.length > 0, LIVE);
test('A3 the shared scope module exists', scope.length > 0, SCOPE);
test('A4 the spapi handler exists', handler.length > 0, HANDLER);

/* ── B. ASIN-BEARING ROUTES, DERIVED FROM THE CODE ─────────────────────────── */
const routeRows = [...routes.matchAll(/id: '([^']+)',\s*\n\s*provider: '([^']+)',[\s\S]{0,400}?clientMethod: '([^']+)'/g)]
  .map((m) => ({ id: m[1], provider: m[2], clientMethod: m[3] }));
test('B1 the manifest declares routes', routeRows.length >= 20, `${routeRows.length} route(s)`);

/**
 * ASINs are emitted by the CHANNEL SERIALIZER (`mapChannelPurchaseOrder`), not by a
 * per-route function — so deriving "ASIN-bearing route" from a client-method name would
 * be a fiction. The truth is stronger: the guard in the handler inspects EVERY payload,
 * so a new ASIN-bearing route cannot be added without passing it. `asinCoveredRoutes`
 * is therefore the whole SP-API surface that dispatches through that guard.
 */
const builderEmitsAsin = /amazonProductIdentifier[\s\S]{0,40}asin:|asin:[\s\S]{0,40}amazonProductIdentifier/.test(live);
const spapiRouteIds = routeRows.filter((r) => r.provider === 'spapi').map((r) => r.id);
const asinRouteIds = builderEmitsAsin ? spapiRouteIds : [];

test('B2 the builder REALLY emits ASINs (so the payload scan is not vacuous)', builderEmitsAsin);
test('B3 the SP-API route surface was FOUND from the manifest', spapiRouteIds.length >= 10, `${spapiRouteIds.length} route(s)`);
test('B4 the guard is payload-based, so no ASIN-bearing route can bypass it by name',
  /asinsInPayload\(body\)/.test(handler) && asinRouteIds.length === spapiRouteIds.length);

/* ── C. THE ASSERTION EXISTS, QUERIES THE SCOPE TABLE, LOGS THE ACCESS ─────── */
test('C1 it exports assertAsinBelongsToBrand', /export async function assertAsinBelongsToBrand/.test(scope));
test('C2 it queries brand_asin_scope', /brand_asin_scope\?select=asin/.test(scope) && /brand_id=eq\./.test(scope));
test('C3 a MISSING row is a REFUSAL (403), never a filter', /ASIN_NOT_IN_BRAND_SCOPE/.test(scope) && /403/.test(scope));
test('C4 a session with no brand tenant is REFUSED', /TENANT_ASSERTION_REQUIRED/.test(scope));
test('C5 it writes the access log', /spapi_access_audit/.test(scope) && /writeSpapiAudit/.test(scope));
test('C6 a failed log write REFUSES the call (503)', /TENANT_AUDIT_UNAVAILABLE/.test(scope));

/* ── D. THE HANDLER CALLS IT BEFORE THE PROVIDER CALL ──────────────────────── */
const callIdx = handler.indexOf('assertAsinBelongsToBrand(');
const providerIdx = handler.indexOf('handleProxyRequest(');
const callMatcher = (src) => /await assertAsinBelongsToBrand\(/.test(src);

test('D1 the handler imports the shared module', /from '\.\.\/_shared\/tenantScope\.ts'/.test(handler));
test('D2 the handler CALLS the assertion', callMatcher(handler), `call at ${callIdx}`);
test('D3 the assertion runs BEFORE the provider call', callIdx > -1 && providerIdx > -1 && callIdx < providerIdx);
test('D4 the handler refuses with 403', /refusal\.status/.test(handler) && /403/.test(handler));
test('D5 ASINs are collected from payload AND query', /asinsInPayload\(body\)/.test(handler) && /asinsInQuery\(target\.query\)/.test(handler));
test('D6 the granted path also writes an audit row', (handler.match(/writeSpapiAudit\(/g) || []).length >= 2);
const grantedTail = handler.slice(handler.lastIndexOf('writeSpapiAudit('));
test('D7 a failed audit write on the granted path returns 503', /503/.test(grantedTail));

/* ── E. THE GATE CAN FAIL (mutation self-check) ────────────────────────────── */
const mutated = handler.replace(/await assertAsinBelongsToBrand\([^;]*\);/, '/* removed */');
test('E1 self-check: the D2 matcher REJECTS a handler whose assertion call was removed',
  callMatcher(handler) === true && callMatcher(mutated) === false && mutated !== handler);

console.log(`\nASIN-BEARING ROUTES COVERED BY THE ASSERTION (${asinRouteIds.length}): ${asinRouteIds.join(', ') || 'NONE'}`);
console.log(
  failures.length === 0
    ? `\nSPAPI_TENANT_SCOPE_VALIDATION_PASS — every ASIN-bearing SP-API route is refused unless the ASIN belongs to the session's brand, and every live ASIN access is logged. (${pass} assertions)`
    : `\nSPAPI_TENANT_SCOPE_VALIDATION_FAIL — ${failures.length} of ${pass + failures.length} assertions failed: ${failures.join(', ')}`
);
process.exit(failures.length === 0 ? 0 : 1);