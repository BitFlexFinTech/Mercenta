/**
 * SECTION: THE INTEGRATION LAYER — SYNC, HEALTH, REPORT.
 *
 * WHAT THIS IS, HONESTLY: a READ-ONLY reconciliation and reporting layer. It reads four systems,
 * detects what changed since the last run, records an audit trail, and reports. It does NOT write
 * to any system, so there is no uncontrolled bidirectional overwrite — because there is no
 * overwrite at all. Directions needing a write are listed as limitations, never claimed.
 *
 * Where each required property lives:
 *   incremental sync      — only fingerprints that CHANGED are reported as changes
 *   idempotency           — every item is keyed; re-running a run changes nothing
 *   retry / recovery      — lib/core.mjs `request()` retries 429/5xx/network with jittered backoff
 *   rate-limit awareness  — Retry-After is honoured; ClickUp lists are walked sequentially
 *   conflict detection    — duplicate refs, ClickUp status regressions, workflow regressions
 *   audit trail           — appendAudit(), one redacted JSONL record per action
 *   cached state          — state.json holds fingerprints, idempotency keys and last-sync times
 *   health monitoring     — check() per system, reported centrally
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendAudit, loadState, saveState, remember, markSynced, refFor, newRunId, nowIso, OUT_DIR, ensureOutDir } from './lib/core.mjs';
import { clickup, github, penpot } from './connectors.mjs';
import * as drive from './drive.mjs';

export const SYSTEMS = ['clickup', 'github', 'penpot', 'drive'];

/* ================= change detection ================= */

/** A stable fingerprint per item, so "changed" is a comparison and never a guess. */
export function fingerprintOf(system, item) {
  if (system === 'clickup') return [item.id, item.name || '', item.status || '', item.dueDate || '', item.list || ''].join('|');
  if (system === 'github') return [item.sha || item.number, item.message || item.title || '', item.author || ''].join('|');
  if (system === 'drive') return item.fingerprint || [item.id, item.modifiedTime || '', item.size || ''].join('|');
  return String(item.id || '');
}

/** The items a snapshot contributes, each with a stable key and a fingerprint. */
export function itemsOf(system, snap) {
  if (!snap || !snap.ok) return [];
  if (system === 'clickup') {
    return (snap.tasks || []).map((t) => ({ key: 'clickup:task:' + t.id, ref: t.ref || refFor('clickup', t.id), fp: fingerprintOf('clickup', t), item: t }));
  }
  if (system === 'github') {
    return [
      ...(snap.commits || []).map((c) => ({ key: 'github:commit:' + c.sha, ref: c.ref || refFor('github', c.sha), fp: fingerprintOf('github', c), item: c })),
      ...(snap.pullRequests || []).map((p) => ({ key: 'github:pr:' + p.number, ref: p.ref || refFor('github-pr', p.number), fp: fingerprintOf('github', p), item: p })),
      ...(snap.issues || []).map((i) => ({ key: 'github:issue:' + i.number, ref: i.ref || refFor('github-issue', i.number), fp: fingerprintOf('github', i), item: i })),
      ...(snap.workflowRuns || []).map((r) => ({ key: 'github:run:' + r.id, ref: refFor('github-run', r.id), fp: [r.id, r.status, r.conclusion].join('|'), item: r })),
    ];
  }
  if (system === 'drive') {
    return (snap.files || []).map((f) => ({ key: 'drive:file:' + f.id, ref: refFor('drive', f.id), fp: fingerprintOf('drive', f), item: f }));
  }
  return [];
}

/**
 * Compare a snapshot against the recorded fingerprints. `added`/`changed`/`removed` come only
 * from fingerprints, so an unchanged system reports ZERO changes on a repeated run — which is
 * exactly what makes the run idempotent.
 */
export function diffSnapshot(system, snap, state) {
  const items = itemsOf(system, snap);
  const prev = state.refs[system] || {};
  const next = {};
  const added = [];
  const changed = [];
  const unchanged = [];

  for (const it of items) {
    next[it.key] = it.fp;
    if (!Object.prototype.hasOwnProperty.call(prev, it.key)) added.push(it);
    else if (prev[it.key] !== it.fp) changed.push(it);
    else unchanged.push(it);
  }
  const removed = Object.keys(prev).filter((k) => !Object.prototype.hasOwnProperty.call(next, k));
  return { added, changed, unchanged, removed, next };
}

/* ================= conflict detection (only what is genuinely detectable) ================= */

/**
 * Conflicts this layer CAN prove, and no others:
 *   · duplicate-ref       — one reference appears twice in a snapshot (a data-integrity problem)
 *   · clickup-regression  — a task that was `complete` is no longer complete
 *   · workflow-regression — a workflow that SUCCEEDED for a commit now FAILS for the same commit
 *
 * Cross-system SEMANTIC conflicts (e.g. a task marked done while its PR is still open) need an
 * explicit link between the two objects, which does not exist yet. That is recorded as a
 * limitation rather than faked.
 */
export function detectConflicts({ snapshots, state }) {
  const conflicts = [];

  for (const system of SYSTEMS) {
    const seen = new Set();
    for (const it of itemsOf(system, snapshots[system])) {
      if (seen.has(it.ref)) conflicts.push({ kind: 'duplicate-ref', system, ref: it.ref, detail: 'the same reference appears twice in one snapshot' });
      seen.add(it.ref);
    }
  }

  const prevClickup = (state.statusMemory && state.statusMemory.clickup) || {};
  for (const t of (snapshots.clickup && snapshots.clickup.tasks) || []) {
    if (prevClickup[t.id] === 'complete' && t.status !== 'complete') {
      conflicts.push({ kind: 'clickup-regression', system: 'clickup', ref: t.ref, detail: 'was complete, now ' + t.status });
    }
  }

  const prevRuns = (state.statusMemory && state.statusMemory.githubRuns) || {};
  for (const r of (snapshots.github && snapshots.github.workflowRuns) || []) {
    if (prevRuns[r.id] === 'success' && r.conclusion && r.conclusion !== 'success') {
      conflicts.push({ kind: 'workflow-regression', system: 'github', ref: refFor('github-run', r.id), detail: 'was success, now ' + r.conclusion });
    }
  }

  return conflicts;
}

/** Remember the statuses the conflict rules compare against on the next run. */
export function rememberStatuses(state, snapshots) {
  state.statusMemory = state.statusMemory || {};
  state.statusMemory.clickup = Object.fromEntries(((snapshots.clickup && snapshots.clickup.tasks) || []).map((t) => [t.id, t.status]));
  state.statusMemory.githubRuns = Object.fromEntries(((snapshots.github && snapshots.github.workflowRuns) || []).map((r) => [r.id, r.conclusion]));
  return state;
}

/* ================= health ================= */

/** Per-system health: is a credential present, and does the remote answer? */
export async function healthAll({ fetchImpl = fetch, env = process.env } = {}) {
  const out = {};
  out.clickup = clickup.isConfigured(env) ? await clickup.check(fetchImpl, env) : { ok: false, reason: 'no-credential' };
  /**
   * GitHub is NOT gated on the environment: locally the token comes from the already-authenticated
   * `gh` CLI, and only CI supplies GITHUB_TOKEN. `check()` resolves the token itself, so gating
   * here would silently report GitHub as unconfigured on the owner's machine.
   */
  out.github = await github.check(fetchImpl, env);
  out.penpot = penpot.isConfigured(env) ? await penpot.check(fetchImpl) : { ok: false, reason: 'no-credential' };
  out.drive = drive.loadServiceAccount() ? { ok: true, reason: 'credential-present' } : { ok: false, reason: 'no-credential' };
  return out;
}

/* ================= the run ================= */

/**
 * ONE synchronisation run. Reads every system, diffs it against the recorded state, records an
 * audit trail, and returns the result. Running it twice with unchanged remotes produces ZERO
 * changes and ZERO new audit writes beyond the run markers — that is the idempotency guarantee.
 */
export async function runSync({ fetchImpl = fetch, env = process.env, stateFile = undefined, auditFile = undefined, clock = () => Date.now() } = {}) {
  const run = newRunId(clock);
  const state = loadState(stateFile);
  const snapshots = {};
  const results = {};

  for (const system of SYSTEMS) {
    const conn = { clickup, github, penpot, drive }[system];
    let snap;
    try {
      snap = await conn.snapshot(fetchImpl, env);
    } catch (e) {
      snap = { ok: false, reason: 'threw: ' + String((e && e.message) || e) };
    }
    snapshots[system] = snap;

    const diff = diffSnapshot(system, snap, state);
    results[system] = {
      ok: Boolean(snap.ok),
      reason: snap.reason || null,
      counts: { added: diff.added.length, changed: diff.changed.length, unchanged: diff.unchanged.length, removed: diff.removed.length },
      added: diff.added.slice(0, 50).map((x) => ({ ref: x.ref, label: x.item.name || x.item.title || x.item.message || x.item.sha || x.item.id })),
      changed: diff.changed.slice(0, 50).map((x) => ({ ref: x.ref, label: x.item.name || x.item.title || x.item.message || x.item.sha || x.item.id })),
      removed: diff.removed.slice(0, 50),
      total: itemsOf(system, snap).length,
    };

    if (snap.ok) {
      state.refs[system] = diff.next;
      markSynced(state, system, nowIso(clock));
    }
    appendAudit({
      at: nowIso(clock), run, system, action: 'snapshot',
      outcome: snap.ok ? 'ok' : 'failed',
      detail: snap.ok ? null : (snap.reason || 'unknown'),
    }, auditFile);

    for (const it of diff.added) remember(state, it.key, nowIso(clock));
    for (const it of diff.changed) remember(state, it.key + ':changed:' + it.fp, nowIso(clock));
  }

  const conflicts = detectConflicts({ snapshots, state });
  for (const c of conflicts) {
    appendAudit({ at: nowIso(clock), run, system: c.system, action: 'conflict', ref: c.ref, outcome: 'needs-review', detail: c.kind + ' — ' + c.detail }, auditFile);
  }
  rememberStatuses(state, snapshots);
  saveState(state, stateFile);

  return { run, at: nowIso(clock), results, conflicts, snapshots, state };
}

/* ================= the consolidated report ================= */

const dash = (n) => (n === 0 ? '0' : String(n));

/** Blocked and awaiting-approval counts, straight from the ClickUp snapshot. */
export function clickupHighlights(snap) {
  const tasks = (snap && snap.tasks) || [];
  const by = (s) => tasks.filter((t) => (t.status || '').toLowerCase() === s);
  return {
    total: tasks.length,
    blocked: by('blocked').length,
    awaiting: by('awaiting approval').length,
    inProgress: by('in progress').length,
    todo: by('to do').length,
    complete: by('complete').length,
    blockedList: by('blocked').slice(0, 20).map((t) => ({ ref: t.ref, name: t.name, list: t.list })),
    awaitingList: by('awaiting approval').slice(0, 20).map((t) => ({ ref: t.ref, name: t.name, list: t.list })),
  };
}

/**
 * Render the consolidated management report. ClickUp is presented as the command centre; the
 * other three systems sit alongside it. Every value comes from a snapshot taken in THIS run.
 */
export function renderReport(result, kind = 'daily') {
  const { run, at, results, conflicts, snapshots, state } = result;
  const L = [];
  L.push('# Mercenta — consolidated integration report (' + kind + ')');
  L.push('');
  L.push('Run `' + run + '` · generated **' + at + '** · read-only reconciliation across four systems.');
  L.push('');
  L.push('## Connection health');
  L.push('');
  L.push('| System | Reachable | Items | Added | Changed | Unchanged | Removed | Last successful sync |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const s of SYSTEMS) {
    const r = results[s] || {};
    const c = r.counts || {};
    L.push('| ' + s + ' | ' + (r.ok ? '**yes**' : 'no — ' + (r.reason || 'unknown')) + ' | ' + dash(r.total) + ' | ' +
      dash(c.added) + ' | ' + dash(c.changed) + ' | ' + dash(c.unchanged) + ' | ' + dash(c.removed) + ' | ' +
      ((state.lastSync && state.lastSync[s]) || 'never') + ' |');
  }
  L.push('');

  const cu = clickupHighlights(snapshots.clickup);
  L.push('## ClickUp — the command centre');
  L.push('');
  L.push('**' + cu.total + '** tasks · **' + cu.blocked + '** blocked · **' + cu.awaiting + '** awaiting approval · ' +
    cu.inProgress + ' in progress · ' + cu.todo + ' to do · ' + cu.complete + ' complete');
  L.push('');
  if (cu.blockedList.length) {
    L.push('### Blocked (' + cu.blocked + ')');
    L.push('');
    for (const t of cu.blockedList) L.push('- `' + t.ref + '` **' + t.name + '** — ' + t.list);
    L.push('');
  }
  if (cu.awaitingList.length) {
    L.push('### Awaiting owner approval (' + cu.awaiting + ')');
    L.push('');
    for (const t of cu.awaitingList) L.push('- `' + t.ref + '` **' + t.name + '** — ' + t.list);
    L.push('');
  }

  const gh = snapshots.github || {};
  L.push('## GitHub');
  L.push('');
  if (gh.ok) {
    L.push('- Commits seen: **' + (gh.commits || []).length + '**');
    for (const c of (gh.commits || []).slice(0, 5)) L.push('  - `' + c.short + '` ' + c.message + ' — ' + (c.author || 'unknown'));
    L.push('- Open pull requests: **' + (gh.pullRequests || []).length + '**' + ((gh.pullRequests || []).length ? ' (untouched by this layer)' : ''));
    L.push('- Open issues: **' + (gh.issues || []).length + '**');
    L.push('- Recent workflow runs:');
    for (const r of (gh.workflowRuns || []).slice(0, 5)) L.push('  - ' + r.name + ' — **' + (r.conclusion || r.status) + '** on `' + (r.branch || '') + '` @ `' + r.sha + '`');
  } else {
    L.push('_Not reachable in this run: ' + (gh.reason || 'unknown') + '_');
  }
  L.push('');

  const pp = snapshots.penpot || {};
  L.push('## Penpot');
  L.push('');
  L.push('- Key accepted: **' + (pp.keyAccepted ? 'yes' : 'no') + '**');
  L.push('- Design file connected: **' + (pp.designConnected ? 'yes' : 'no') + '**');
  if (!pp.designConnected) L.push('- _A design file must be opened in Penpot and connected with **MCP → Connect**. Until then no design reference can be read — and none is invented._');
  L.push('');

  const dr = snapshots.drive || {};
  L.push('## Google Drive');
  L.push('');
  if (dr.ok) {
    L.push('- Folder: **' + (dr.folderName || 'unknown') + '** · **' + (dr.files || []).length + '** files · ' + dr.pages + ' page(s) read');
    for (const f of (dr.files || []).slice(0, 10)) L.push('  - ' + f.name + ' — modified ' + (f.modifiedTime || 'unknown'));
  } else {
    L.push('_Not reachable in this run: ' + (dr.reason || 'unknown') + '_');
  }
  L.push('');

  L.push('## Conflicts requiring a decision (' + conflicts.length + ')');
  L.push('');
  if (!conflicts.length) L.push('_None detected in this run._');
  for (const c of conflicts) L.push('- **' + c.kind + '** · `' + (c.ref || '') + '` — ' + c.detail);
  L.push('');

  L.push('## Limitations, stated honestly');
  L.push('');
  L.push('- This layer is **read-only**. It reports; it does not write to any of the four systems.');
  L.push('- **No bidirectional synchronisation is implemented**, so there is no uncontrolled overwrite — and no claim of one.');
  L.push('- Conflict detection covers duplicate references, ClickUp status regressions and workflow regressions. **Cross-system semantic conflicts need an explicit object link**, which does not exist yet.');
  L.push('- Penpot design references cannot be read until a design file is connected.');
  L.push('- Drive is read-only discovery; **no document is created, modified or deleted**.');
  L.push('');
  return L.join('\n');
}

export function renderHealth(health, at) {
  const L = ['# Mercenta — integration health', '', 'Checked **' + at + '**.', '', '| System | Healthy | Reason |', '|---|---|---|'];
  for (const s of SYSTEMS) {
    const h = health[s] || {};
    L.push('| ' + s + ' | ' + (h.ok ? '**yes**' : 'no') + ' | ' + (h.reason || 'unknown') + (h.workspace ? ' (' + h.workspace + ')' : '') + ' |');
  }
  L.push('');
  return L.join('\n');
}

/* ================= CLI ================= */

function writeOut(name, text) {
  ensureOutDir(OUT_DIR);
  const f = path.join(OUT_DIR, name);
  fs.writeFileSync(f, text);
  return f;
}

async function main(args = process.argv.slice(2)) {
  const kind = (args.includes('--report') && args[args.indexOf('--report') + 1]) || 'daily';

  if (args.includes('--self-test')) { await import('./test.mjs'); return; }

  if (args.includes('--health')) {
    const at = new Date().toISOString();
    const health = await healthAll();
    const f = writeOut('health.md', renderHealth(health, at));
    for (const s of SYSTEMS) console.log('  ' + s.padEnd(8) + (health[s] && health[s].ok ? 'HEALTHY' : 'not healthy') + '  ' + ((health[s] && health[s].reason) || ''));
    console.log('written: ' + path.relative(process.cwd(), f));
    process.exit(0);
  }

  const result = await runSync();
  const md = renderReport(result, kind);
  const f = writeOut(kind + '-report.md', md);

  console.log('run: ' + result.run);
  for (const s of SYSTEMS) {
    const r = result.results[s];
    const c = r.counts;
    console.log('  ' + s.padEnd(8) + (r.ok ? 'ok ' : 'FAIL') + '  total=' + r.total + ' added=' + c.added + ' changed=' + c.changed + ' unchanged=' + c.unchanged + (r.ok ? '' : '  (' + r.reason + ')'));
  }
  console.log('  conflicts: ' + result.conflicts.length);
  console.log('written: ' + path.relative(process.cwd(), f));
  process.exit(0);
}

/**
 * Entry-point guard. `new URL(import.meta.url).pathname` PERCENT-ENCODES the project path (the
 * folder name contains a space, "1. Mercenta" → "1.%20Mercenta"), so the comparison silently
 * failed and the CLI did nothing at all — exit 0 with no output. `fileURLToPath` decodes it.
 */
const isEntry = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isEntry) main();


