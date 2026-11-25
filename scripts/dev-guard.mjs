#!/usr/bin/env node
/**
 * §unique-dev-port-per-project — THE DEV-SERVER PREFLIGHT (2026-11-25).
 *
 * WHY THIS EXISTS (the Owner's report, and the half of the rule it exposes)
 * -----------------------------------------------------------------------
 * The Owner ran `npm run dev` and got:
 *     Error: Port 5182 is already in use
 * The PIN was working exactly as designed: `vite.config.ts` declares
 * `server: { port: 5182, strictPort: true }`, so Vite STOPS with a clear error instead
 * of silently sliding to another port — which is the defect the global rule exists to
 * stop, because two projects on one port means the address you typed can show a
 * DIFFERENT project's page.
 *
 * What the pin did NOT fix is the other half. A dev server left running by an
 * interrupted command — a test run cut off at a timeout, a closed terminal, a killed
 * parent — goes on holding the port, and the next `npm run dev` fails with a message
 * that does not say WHAT is holding it or HOW to clear it. MEASURED on this machine:
 * one such stray had been listening for 4h 40m, started by the Playwright harness in an
 * earlier session, and every `npm run dev` afterwards refused to start.
 *
 * WHAT THIS DOES — AND WHAT IT REFUSES TO DO
 * -----------------------------------------
 * It runs BEFORE vite (wired as the `predev` script). If the port is free it says
 * nothing and gets out of the way. If the port is held it says WHO holds it, and:
 *   · a holder that is THIS project's own vite dev server is cleared, and that is said
 *     out loud (a stray is the actual defect, and reusing it would leave a server
 *     attached to a dead terminal);
 *   · a holder that is ANYTHING ELSE stops this run with a FAILURE that names the
 *     process. It never kills a process that is not ours: doing so would be a worse
 *     defect than the one being fixed.
 *
 * The port is DISCOVERED from `vite.config.ts` — its owner — and never retyped here, so
 * moving the pin moves this with it. A discovery that comes back empty is a FAILURE,
 * never a silent pass (standing rule 10 §5).
 *
 * Run: node scripts/dev-guard.mjs   (via `npm run dev`, which runs it first)
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ── 1. THE PIN, READ FROM ITS OWNER ───────────────────────────────────────── */
const viteConfig = readFileSync(path.join(ROOT, 'vite.config.ts'), 'utf8');
const pin =
  /server:\s*\{[^}]*port:\s*(\d+)[^}]*strictPort:\s*(true|false)/.exec(viteConfig) ||
  /port:\s*(\d+)[\s\S]{0,120}?strictPort:\s*(true|false)/.exec(viteConfig);
if (!pin) {
  console.error(
    'DEV-GUARD: could not read the pinned dev port from vite.config.ts.\n' +
      '           Refusing to guess — a guessed port is how two projects end up sharing one.'
  );
  process.exit(1);
}
const PORT = Number(pin[1]);
const STRICT = pin[2] === 'true';

/** Synchronous pause, so this stays a plain script with no async ordering to get wrong. */
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/* ── 2. WHO, IF ANYONE, IS LISTENING ───────────────────────────────────────── */
/**
 * `lsof` exits 1 when nothing matches, which IS the free case — not an error. A missing
 * `lsof` is different: it is reported honestly rather than treated as "free", because a
 * check that cannot run must never report a comfortable green.
 */
function listeners() {
  try {
    const out = execFileSync('lsof', ['-nP', `-iTCP:${PORT}`, '-sTCP:LISTEN', '-t'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return out.split('\n').map((s) => s.trim()).filter(Boolean).map(Number);
  } catch (err) {
    if (err && err.status === 1) return [];
    if (err && err.code === 'ENOENT') {
      console.error(
        `DEV-GUARD: \`lsof\` is not available, so I cannot tell whether port ${PORT} is free.\n` +
          '           Refusing to report a clean start I have not verified.'
      );
      process.exit(1);
    }
    throw err;
  }
}

const commandOf = (pid) => {
  try {
    return execFileSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

/**
 * §FIXED AT SOURCE (2026-11-25, rule 10 — a describer must match reality). The first
 * version of this guard tested liveness with `commandOf(pid) !== ''`, and a process that
 * has died but not yet been reaped (a ZOMBIE) still reports its command — so the guard
 * printed "did not stop on SIGTERM — sending SIGKILL" about processes that had ALREADY
 * stopped, which is a false statement in its own output. It now asks the process table
 * for the state and treats `Z` as dead. A signal sent to a zombie is a no-op, so the
 * earlier version caused no harm — but it LIED, and a report that lies is the defect.
 */
const isAlive = (pid) => {
  try {
    const state = execFileSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).trim();
    return state !== '' && !state.startsWith('Z');
  } catch {
    return false;
  }
};

/**
 * §FIXED AT SOURCE (2026-11-25) — THE GUARD MUST NEVER KILL ITSELF.
 *
 * Testing found this, and it is the reason a run appeared to "start and vanish". `npm run
 * dev` runs `predev`, so the guard's OWN ANCESTOR is an `npm run dev` process whose
 * working directory IS this project — and the any-port sweep below matched it and killed
 * it, taking the whole run down before vite ever started. Two consecutive runs died that
 * way and the only symptom was a log that stopped mid-sentence after "clearing it".
 *
 * The ancestor chain (guard → sh → npm → shell) is therefore collected and excluded, for
 * BOTH sweeps, so the guard can only ever clear a server that is genuinely not its own.
 */
function ancestorPids() {
  const chain = new Set([process.pid]);
  let pid = process.ppid;
  for (let depth = 0; depth < 12 && pid > 1; depth += 1) {
    chain.add(pid);
    try {
      pid = Number(
        execFileSync('ps', ['-o', 'ppid=', '-p', String(pid)], { encoding: 'utf8' }).trim()
      );
    } catch {
      break;
    }
  }
  return chain;
}
const SELF = ancestorPids();

const pids = listeners();
/* NB: no early exit on a free port — the ANY-PORT sweep below must still run, because a
   `--port` override can leave this project's server on a port this guard never inspects
   otherwise. A clean run stays quiet because every message below is conditional. */

const holders = pids.map((pid) => ({ pid, cmd: commandOf(pid) }));
/** OURS = this project's own vite dev server. Anything else is never touched. */
const isOurs = (h) => h.cmd.includes(ROOT) && /vite/.test(h.cmd);
const own = holders.filter(isOurs);
const foreign = holders.filter((h) => !isOurs(h));

/* ── 3. A HOLDER THAT IS NOT OURS: FAIL LOUDLY, TOUCH NOTHING ──────────────── */
if (foreign.length > 0) {
  console.error(
    `\nDEV-GUARD: port ${PORT} is held by a process that is NOT this project's dev server:\n` +
      foreign.map((h) => `  pid ${h.pid}: ${h.cmd || '(command not readable)'}\n`).join('') +
      '\nThis run is NOT starting a server, deliberately: that process belongs to something\n' +
      'else, and killing it would be a worse fault than a port that will not open.\n' +
      "  · If it is another project's dev server, stop THAT project, or give it its own port\n" +
      '    per the global rule (~/.cline/DEV_PORTS.md) — two projects must never share one.\n' +
      `  · If it is a stale copy of this project's server, clear it with:  kill ${foreign[0].pid}\n`
  );
  process.exit(1);
}

/* ── 4. THIS PROJECT'S OWN dev servers, ON ANY PORT — CLEAR THEM ALL ───────── */
/**
 * §THE ONE-PORT RULE, ENFORCED (2026-11-25, second cause — measured, not theorised).
 *
 * The pin above only governs the port vite CONFIGURES. An explicit `--port <n>` on the
 * command line OVERRIDES it, so `npm run dev --port 3000` starts this project's server
 * on somebody else's port and the pin never sees it. MEASURED on this machine: THREE
 * such servers were running at once — on 3000, 3004 and 3001 — the oldest for 2 days
 * 11 hours, and one of them squatting 3000, a port `latency-scalper` OWNS in the
 * registry. That is precisely the fault the global rule exists to prevent, in reverse.
 *
 * So the guard also finds THIS PROJECT'S OWN vite processes whatever port they are on
 * and clears them. It clears only processes whose command line names this project's own
 * `node_modules/.bin/vite`, so it can never touch another project's server.
 */
function ownDevServerPids() {
  try {
    const out = execFileSync('ps', ['-ax', '-o', 'pid=,command='], { encoding: 'utf8' });
    return out
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.includes(`${ROOT}/node_modules/.bin/vite`))
      .map((line) => Number(line.split(/\s+/)[0]))
      .filter((pid) => Number.isInteger(pid) && pid > 0 && !SELF.has(pid));
  } catch {
    return [];
  }
}

/** The `npm run dev` parent whose working directory is THIS project, if it is idle. */
function ownNpmDevPids() {
  try {
    const out = execFileSync('ps', ['-ax', '-o', 'pid=,command='], { encoding: 'utf8' });
    return out
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /(?:^|\s)npm(?:-cli\.js)?\s+run\s+dev(?:\s|$)/.test(line))
      .map((line) => Number(line.split(/\s+/)[0]))
      .filter((pid) => {
        if (!Number.isInteger(pid) || pid <= 0 || SELF.has(pid)) return false;
        try {
          const cwd = execFileSync('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn'], {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
          })
            .split('\n')
            .find((l) => l.startsWith('n'));
          return cwd ? cwd.slice(1) === ROOT : false;
        } catch {
          return false;
        }
      });
  } catch {
    return [];
  }
}

const strays = [...new Set([...ownDevServerPids(), ...ownNpmDevPids()])].filter(
  (pid) => !pids.includes(pid)
);
for (const pid of strays) {
  const cmd = commandOf(pid);
  console.log(
    `DEV-GUARD: this project had ANOTHER dev server left running — clearing it.` +
      `\n           pid ${pid}: ${cmd}` +
      `\n           (the project owns port ${PORT}; a server on any other port is a stray, ` +
      'and it can squat a port another project owns)'
  );
  try {
    process.kill(pid, 'SIGTERM');
  } catch {
    /* already gone */
  }
}
if (strays.length > 0) {
  for (let i = 0; i < 20 && strays.some(isAlive); i += 1) sleep(150);
  for (const pid of strays) {
    if (!isAlive(pid)) continue;
    console.log(`DEV-GUARD: pid ${pid} was still alive after SIGTERM — sending SIGKILL.`);
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
}

/* ── 5. THE PINNED PORT MUST NOW BE FREE, OR NOTHING STARTS ────────────────── */
for (const h of own) {
  console.log(
    `DEV-GUARD: a previous dev server was still holding port ${PORT} — clearing it.` +
      `\n           pid ${h.pid}: ${h.cmd}`
  );
  try {
    process.kill(h.pid, 'SIGTERM');
  } catch {
    /* already gone */
  }
}
for (let i = 0; i < 20 && listeners().length > 0; i += 1) sleep(150);
if (listeners().length > 0) {
  for (const h of own) {
    if (!isAlive(h.pid)) continue;
    console.log(`DEV-GUARD: pid ${h.pid} was still alive after SIGTERM — sending SIGKILL.`);
    try {
      process.kill(h.pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  for (let i = 0; i < 20 && listeners().length > 0; i += 1) sleep(150);
}
if (listeners().length > 0) {
  console.error(
    `DEV-GUARD: port ${PORT} is STILL held after clearing this project's server. ` +
      'Not starting a second one on a crowded port.'
  );
  process.exit(1);
}
if (own.length > 0 || strays.length > 0) {
  console.log(
    `DEV-GUARD: port ${PORT} is free${
      STRICT ? ' (strictPort is ON, so a stray can never be hidden)' : ''
    }. Starting.`
  );
}

