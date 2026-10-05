/**
 * §PHASE 15 — HONEST HEALTH / READINESS GATE (database & infrastructure launch gate).
 *
 * The `phase15-database-infrastructure` gate declares "error monitoring and health
 * monitoring". Error monitoring is the Sentry seam; health monitoring had no
 * owner, and the admin dashboard FABRICATED it (`Math.random() > 0.2` plus an
 * invented "Database: ok … Response: 240ms" line). This gate pins the honest
 * replacement so the fabrication cannot return.
 *
 * It EXECUTES the owner (`src/lib/monitoring/health.ts`) via Vite and proves the
 * dashboard reads it.
 *
 * Usage: node scripts/validate-health-readiness.mjs  (exit 1 on any failure)
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

let checks = 0;
let failures = 0;
const test = (name, ok, detail = '') => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
/** Strip comments so source checks read CODE, not prose (my own comments name the
 *  removed literals on purpose). The line rule requires `//` not preceded by `:`. */
const stripComments = (code) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
try {
  const { computeReadiness } = await server.ssrLoadModule('/src/lib/monitoring/health.ts');

  /* A. deterministic — no clock, no randomness. */
  const a = computeReadiness('demo', [{ id: 'amazon', mode: 'simulation' }]);
  const b = computeReadiness('demo', [{ id: 'amazon', mode: 'simulation' }]);
  test('health: deterministic (same inputs ⇒ identical result)', JSON.stringify(a) === JSON.stringify(b));

  /* B. healthy case — honest wording, no invented probe. */
  const ok = computeReadiness('demo', [{ id: 'amazon', mode: 'simulation' }, { id: 'xero', mode: 'available' }]);
  test('health: healthy when NO integration needs attention', ok.healthy === true && ok.severity === 'info', ok.summary);
  test(
    'health: the healthy summary never claims a database / Edge-Function probe',
    /not probed/i.test(ok.summary) && !/Database:\s*ok/i.test(ok.summary),
    ok.summary
  );

  /* C. degraded — unhealthy, high, and it NAMES the provider. */
  const deg = computeReadiness('live', [{ id: 'amazon', mode: 'simulation' }, { id: 'xero', mode: 'degraded' }]);
  test('health: a `degraded` integration ⇒ unhealthy · high · NAMED', deg.healthy === false && deg.severity === 'high' && deg.summary.includes('xero'), deg.summary);

  /* D. error — critical, and it NAMES the provider. */
  const err = computeReadiness('live', [{ id: 'payoneer', mode: 'error' }]);
  test('health: an `error` integration ⇒ unhealthy · critical · NAMED', err.healthy === false && err.severity === 'critical' && err.summary.includes('payoneer'), err.summary);

  /* E. the dashboard no longer fabricates — read the SOURCE (comments stripped). */
  const dash = stripComments(readFileSync(new URL('../src/components/admin/MonitoringDashboard.tsx', import.meta.url), 'utf8'));
  test('health: the dashboard contains NO `Math.random(` fabrication', !/Math\.random\s*\(/.test(dash));
  test('health: the fabricated `MOCK_HEALTH_CHECKS` history is GONE', !/MOCK_HEALTH_CHECKS/.test(dash));
  test('health: the dashboard reads the honest owner', /computeReadiness/.test(dash));
  test('health: the dashboard never claims "Database: ok"', !/Database:\s*ok/i.test(dash));

  /* F. the owner is pure — no network, no randomness, no clock (comments stripped). */
  const owner = stripComments(readFileSync(new URL('../src/lib/monitoring/health.ts', import.meta.url), 'utf8'));
  test('health: the owner makes no network call', !/fetch\s*\(|XMLHttpRequest|axios/.test(owner));
  test('health: the owner uses no randomness or clock', !/Math\.random|Date\.now/.test(owner));
} finally {
  await server.close();
}

console.log('');
console.log(`HEALTH_READINESS_${failures ? 'FAIL' : 'PASS'} — ${checks - failures}/${checks} assertions`);
if (failures > 0) process.exit(1);
