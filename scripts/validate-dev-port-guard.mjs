#!/usr/bin/env node
/**
 * §unique-dev-port-per-project — THE DEV-PORT GATE (2026-11-25).
 *
 * WHY THIS EXISTS (standing rule 07 — every fix carries a gate that can fail)
 * -------------------------------------------------------------------------
 * The Owner ran `npm run dev` and got "Port 5182 is already in use". Two separate faults
 * were behind it, and both were fixed in `scripts/dev-guard.mjs`:
 *   1. a dev server left behind by an interrupted command went on holding the pinned port,
 *      and the error named neither the holder nor a way out;
 *   2. an explicit `--port <n>` OVERRIDES the pin, so this project's own server had been
 *      left running on 3000, 3004 and 3001 — the oldest for 2 days 11 hours — one of them
 *      squatting a port `latency-scalper` owns.
 * A fix with no gate comes back, so this pins the properties that make each fault
 * impossible, DISCOVERING each fact from its owner rather than retyping it:
 *
 *   · the pinned port, read from `vite.config.ts` (a discovery of none is a FAILURE);
 *   · `strictPort: true`, the setting that stops the server sliding to another port;
 *   · the `predev` wiring, so the guard cannot be quietly dropped from `npm run dev`;
 *   · the guard's TWO safety properties, asserted from its own source — it refuses a
 *     holder that is not ours, and it excludes its own ancestor chain (the bug that made
 *     a run kill itself);
 *   · every consumer agreeing on the port: `playwright.config.ts` must name the SAME one;
 *   · the port's registration in `~/.cline/DEV_PORTS.md`, and that NO other project there
 *     holds it — because a shared port is the fault the whole rule exists to stop.
 *
 * Run: node scripts/validate-dev-port-guard.mjs   (auto-discovered by `npm run validate:all`)
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) {
    pass += 1;
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    fail += 1;
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* ── 1. THE PIN, READ FROM ITS OWNER ───────────────────────────────────────── */
const viteConfig = read('vite.config.ts');
const pin =
  /server:\s*\{[^}]*port:\s*(\d+)[^}]*strictPort:\s*(true|false)/.exec(viteConfig) ||
  /port:\s*(\d+)[\s\S]{0,120}?strictPort:\s*(true|false)/.exec(viteConfig);
check(
  'D1 the dev port is DISCOVERED from vite.config.ts (a discovery of none is a FAILURE)',
  Boolean(pin),
  pin ? `port ${pin[1]}` : 'no `server: { port, strictPort }` block found'
);
if (!pin) {
  console.log(`\nDEV_PORT_GUARD: FAIL — ${pass} assertion(s), ${fail + 1} failure(s)`);
  process.exit(1);
}
const PORT = Number(pin[1]);
const STRICT = pin[2] === 'true';

check('D2 the port is a real port number', Number.isInteger(PORT) && PORT > 1024 && PORT < 65536, String(PORT));
check(
  'D3 strictPort is TRUE — the server must STOP, never slide to another port',
  STRICT,
  'a second project on the same port shows the WRONG project at a familiar address'
);

/* ── 2. THE GUARD IS WIRED INTO `npm run dev` ──────────────────────────────── */
const pkg = JSON.parse(read('package.json'));
const guardScript = 'scripts/dev-guard.mjs';
check(
  'D4 package.json has a `predev` hook (npm runs it before every `npm run dev`)',
  typeof pkg.scripts.predev === 'string' && pkg.scripts.predev.includes(guardScript),
  pkg.scripts.predev || '(no predev script)'
);
check('D5 the guard script EXISTS', fs.existsSync(path.join(ROOT, guardScript)), guardScript);

/* ── 3. THE GUARD'S TWO SAFETY PROPERTIES, READ FROM ITS OWN SOURCE ────────── */
const guard = fs.existsSync(path.join(ROOT, guardScript)) ? read(guardScript) : '';
check(
  'D6 the guard REFUSES a holder that is not this project\'s (never kills a stranger)',
  guard.includes('is NOT this project') && guard.includes('process.exit(1)')
);
check(
  'D7 the guard excludes its OWN ancestor chain (the bug that made a run kill itself)',
  guard.includes('ancestorPids') && guard.includes('SELF.has(pid)'),
  'without this, `npm run dev` kills the `npm run dev` that launched it'
);
check(
  'D8 the guard sweeps this project\'s dev servers on ANY port (`--port` overrides the pin)',
  guard.includes('ownDevServerPids') && guard.includes('node_modules/.bin/vite'),
  'an explicit --port bypasses vite.config entirely'
);

/* ── 4. EVERY CONSUMER AGREES ON THE PORT ──────────────────────────────────── */
const playwright = read('playwright.config.ts');
check(
  'D9 playwright.config.ts names the SAME port in both baseURL and its webServer url',
  playwright.includes(`localhost:${PORT}`) &&
    playwright.split(`localhost:${PORT}`).length - 1 >= 2,
  `expected two references to localhost:${PORT}`
);

/* ── 5. THE ONE REGISTRY — AND THIS PROJECT MUST OWN THE PORT ALONE ────────── */
const registryPath = path.join(os.homedir(), '.cline', 'DEV_PORTS.md');
const registryExists = fs.existsSync(registryPath);
check(
  'D10 the ONE dev-port registry exists (~/.cline/DEV_PORTS.md)',
  registryExists,
  registryPath
);
/**
 * A check that CANNOT RUN must never report a comfortable green (rule 10 §5). If the
 * registry is missing, D11 and D12 are reported as FAILURES rather than skipped.
 */
if (registryExists) {
  const registry = fs.readFileSync(registryPath, 'utf8');
  const rows = registry.split('\n').filter((line) => line.trim().startsWith('|'));
  const ours = rows.filter((line) => /Mercenta/i.test(line));
  check(
    `D11 the registry carries a row for THIS project naming port ${PORT}`,
    ours.some((line) => line.includes(String(PORT))),
    ours.length ? ours.map((l) => l.trim().slice(0, 90)).join(' | ') : '(no Mercenta row found)'
  );
  const others = rows.filter((line) => !/Mercenta/i.test(line) && line.includes(String(PORT)));
  check(
    'D12 NO other project holds this port (a shared port is the fault the rule stops)',
    others.length === 0,
    others.length ? others.slice(0, 3).map((l) => l.trim().slice(0, 80)).join(' | ') : 'sole owner'
  );
} else {
  check(
    `D11 the registry carries a row for THIS project naming port ${PORT}`,
    false,
    'registry UNREADABLE — not evaluated, and NOT passed'
  );
  check('D12 NO other project holds this port', false, 'registry UNREADABLE — not evaluated, and NOT passed');
}

console.log(
  `\nDEV_PORT_GUARD: ${fail === 0 ? 'PASS' : 'FAIL'} — ${pass} assertion(s), ${fail} failure(s)` +
    `\n  port ${PORT} · strictPort ${STRICT ? 'ON' : 'OFF'} · predev ${pkg.scripts.predev || '(none)'}`
);
process.exit(fail === 0 ? 0 : 1);
