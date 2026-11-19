#!/usr/bin/env node
/**
 * SECTION: CLICKUP AUTOMATION - MERCENTA ZERO-COST PROJECT REPORTING.
 *
 * WHY THIS EXISTS. ClickUp Free has NO dashboards and NO automations, so every
 * automation runs HERE, on this machine, using tools already installed and free:
 * Node.js, the ClickUp REST API, macOS launchd, the GitHub CLI and the existing
 * Google Drive sync script.
 *
 * SAFETY RULES BUILT IN:
 *  - IDEMPOTENT: every run OVERWRITES its output file. Re-running never duplicates.
 *  - READS ARE RETRIED, WRITES ARE NOT: a timed-out write may have succeeded, so
 *    a write is never blindly repeated.
 *  - NO SECRETS: the token is read from a file OUTSIDE this project and is never
 *    printed, logged or committed.
 *  - NO FALSE SUCCESS: a failure exits non-zero and records a FAILED health entry.
 *
 * USAGE
 *   node scripts/clickup/report.mjs report     daily markdown + html report
 *   node scripts/clickup/report.mjs alerts     overdue and blocked only
 *   node scripts/clickup/report.mjs health     synchronisation health record
 *   node scripts/clickup/report.mjs self-test  offline, needs NO token
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

/**
 * NOTE: the project folder name contains a SPACE, and `new URL(import.meta.url).pathname`
 * returns it PERCENT-ENCODED ("1.%20Mercenta"), which would create a stray folder beside the
 * real one. `fileURLToPath` decodes it correctly. This was found by the offline self-test.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'reports');
const TOKEN_FILE = path.join(os.homedir(), '.config', 'mercenta', 'clickup.env');
const WORKSPACE = '1200400000014349';
const SPACE = '1200400000053894';
const API = 'https://api.clickup.com/api/v2';
const HEALTH = path.join(OUT, 'sync-health.json');
const DAY = 86400000;

/* ---------- the token: read from OUTSIDE the project, never printed ---------- */
function readToken() {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  const txt = fs.readFileSync(TOKEN_FILE, 'utf8');
  const m = txt.match(/^\s*(?:CLICKUP_API_TOKEN|CLICKUP_TOKEN)\s*=\s*(\S+)\s*$/m);
  return m ? m[1] : null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- reads are retried; 429 is waited out; never a blind write ---------- */
async function apiGet(pathname, token) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(API + pathname, {
        headers: { Authorization: token, 'Content-Type': 'application/json' },
      });
      if (res.status === 429) { await sleep(1500 * attempt); continue; }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (attempt < 3) await sleep(800 * attempt);
    }
  }
  throw lastErr;
}

/* ---------- fetch every task in the space, list by list ---------- */
async function fetchAllTasks(token) {
  const lists = [];
  const folders = await apiGet('/space/' + SPACE + '/folder?archived=false', token);
  for (const f of folders.folders || []) {
    for (const l of f.lists || []) lists.push({ id: l.id, name: l.name, folder: f.name });
  }
  const folderless = await apiGet('/space/' + SPACE + '/list?archived=false', token);
  for (const l of folderless.lists || []) lists.push({ id: l.id, name: l.name, folder: '(none)' });
  const tasks = [];
  for (const l of lists) {
    const r = await apiGet('/list/' + l.id + '/task?archived=false&subtasks=true', token);
    for (const t of r.tasks || []) tasks.push({ ...t, _list: l.name, _folder: l.folder });
  }
  return { lists, tasks };
}

/* ---------- classify: overdue, due soon, blocked, awaiting, active ---------- */
function analyse(tasks, now) {
  const a = { overdue: [], dueSoon: [], blocked: [], awaiting: [], active: [] };
  for (const t of tasks) {
    const st = String(t.status && t.status.status ? t.status.status : '').toLowerCase();
    const due = t.due_date ? Number(t.due_date) : null;
    if (st === 'blocked') a.blocked.push(t);
    else if (st === 'awaiting approval') a.awaiting.push(t);
    else if (st !== 'complete') a.active.push(t);
    if (due && st !== 'complete') {
      if (due < now) a.overdue.push(t);
      else if (due - now <= 7 * DAY) a.dueSoon.push(t);
    }
  }
  return a;
}

/* ---------- renderers ---------- */
const iso = (ms) => new Date(Number(ms)).toISOString().slice(0, 10);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mdLine = (t) =>
  '- **' + t.name + '** — `' + (t.status ? t.status.status : '') + '`' +
  (t.due_date ? ' · due ' + iso(t.due_date) : '') + ' · ' + t._list + ' · ' + t.url;

function renderMarkdown(a, meta) {
  const L = [];
  L.push('# Mercenta — ClickUp progress report');
  L.push('');
  L.push('Generated ' + new Date(meta.now).toISOString() + ' · total tasks **' + meta.total + '** · space "' + meta.space + '"');
  L.push('');
  const sec = (title, arr) => {
    L.push('## ' + title + ' (' + arr.length + ')');
    L.push('');
    L.push(arr.length ? arr.map(mdLine).join('\n') : '_none_');
    L.push('');
  };
  sec('OVERDUE', a.overdue);
  sec('DUE WITHIN 7 DAYS', a.dueSoon);
  sec('BLOCKED', a.blocked);
  sec('AWAITING OWNER APPROVAL', a.awaiting);
  sec('ACTIVE WORK', a.active);
  return L.join('\n');
}

function renderHtml(a, meta) {
  const card = (t) =>
    '<li><strong>' + esc(t.name) + '</strong><br><small>' +
    esc(t.status ? t.status.status : '') + (t.due_date ? ' · due ' + iso(t.due_date) : '') +
    ' · ' + esc(t._list) + '</small></li>';
  const sec = (title, arr, colour) =>
    '<section><h2 style="color:' + colour + '">' + title + ' <span>(' + arr.length + ')</span></h2><ul>' +
    (arr.length ? arr.map(card).join('') : '<li><em>none</em></li>') + '</ul></section>';
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Mercenta — ClickUp report</title>' +
    '<style>body{font:14px/1.5 system-ui,sans-serif;margin:2rem;max-width:1100px;color:#111}h1{margin:0 0 .25rem}' +
    'h2{font-size:1rem;text-transform:uppercase;letter-spacing:.04em;margin:1.5rem 0 .5rem}ul{margin:0;padding-left:1.1rem}' +
    'li{margin:.35rem 0}small{color:#666}.meta{color:#666;margin-bottom:1rem}' +
    '.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1.25rem}</style></head><body>' +
    '<h1>Mercenta — ClickUp progress report</h1><p class="meta">Generated ' + new Date(meta.now).toISOString() +
    ' · ' + meta.total + ' tasks · space "' + esc(meta.space) + '"</p><div class="grid">' +
    sec('Overdue', a.overdue, '#b91c1c') + sec('Due within 7 days', a.dueSoon, '#b45309') +
    sec('Blocked', a.blocked, '#b91c1c') + sec('Awaiting owner approval', a.awaiting, '#a16207') +
    sec('Active work', a.active, '#15803d') + '</div></body></html>';
}

/* ---------- idempotent writes + the health record ---------- */
function writeOut(name, text) {
  fs.mkdirSync(OUT, { recursive: true });
  const p = path.join(OUT, name);
  fs.writeFileSync(p, text, 'utf8');
  return p;
}

function recordHealth(entry) {
  fs.mkdirSync(OUT, { recursive: true });
  let h = { lastRun: null, systems: {}, history: [] };
  if (fs.existsSync(HEALTH)) {
    try { h = JSON.parse(fs.readFileSync(HEALTH, 'utf8')); } catch { /* rebuild from scratch */ }
  }
  h.lastRun = new Date().toISOString();
  h.systems = { ...h.systems, ...(entry.systems || {}) };
  h.history = [entry, ...(h.history || [])].slice(0, 30);
  fs.writeFileSync(HEALTH, JSON.stringify(h, null, 2), 'utf8');
}

/* ---------- the commands ---------- */
async function cmdReport(token, mode) {
  const now = Date.now();
  const { lists, tasks } = await fetchAllTasks(token);
  const a = analyse(tasks, now);
  const meta = { now, total: tasks.length, space: 'Software Development' };
  writeOut('clickup-report.md', renderMarkdown(a, meta));
  writeOut('clickup-report.html', renderHtml(a, meta));
  console.log('reports written: reports/clickup-report.md, reports/clickup-report.html');
  console.log('overdue=' + a.overdue.length + ' dueSoon=' + a.dueSoon.length +
    ' blocked=' + a.blocked.length + ' awaiting=' + a.awaiting.length + ' active=' + a.active.length);
  recordHealth({
    at: new Date().toISOString(), ok: true, mode, lists: lists.length, tasks: tasks.length,
    overdue: a.overdue.length, blocked: a.blocked.length, awaiting: a.awaiting.length,
    systems: { clickup: 'ok at ' + new Date().toISOString() },
  });
  if (a.overdue.length || a.blocked.length) {
    console.log('ALERT: ' + a.overdue.length + ' overdue, ' + a.blocked.length + ' blocked.');
  }
  return a;
}

/* ---------- offline self-test: proves the logic WITHOUT a token ---------- */
function selfTest() {
  const now = Date.now();
  const fixture = [
    { id: 'a', name: 'Overdue item', status: { status: 'to do' }, due_date: String(now - 3 * DAY), url: 'u', _list: 'L' },
    { id: 'b', name: 'Due soon item', status: { status: 'in progress' }, due_date: String(now + 2 * DAY), url: 'u', _list: 'L' },
    { id: 'c', name: 'Blocked item', status: { status: 'blocked' }, due_date: null, url: 'u', _list: 'L' },
    { id: 'd', name: 'Awaiting item', status: { status: 'awaiting approval' }, due_date: null, url: 'u', _list: 'L' },
    { id: 'e', name: 'Done item', status: { status: 'complete' }, due_date: String(now - 9 * DAY), url: 'u', _list: 'L' },
  ];
  const a = analyse(fixture, now);
  const checks = [
    ['overdue detected', a.overdue.length === 1],
    ['due-soon detected', a.dueSoon.length === 1],
    ['blocked detected', a.blocked.length === 1],
    ['awaiting detected', a.awaiting.length === 1],
    ['a completed task is NOT counted overdue', !a.overdue.some((t) => t.id === 'e')],
    ['active excludes blocked, awaiting and complete', a.active.length === 2 && a.active.every((t) => t.id === 'a' || t.id === 'b')],
    ['markdown renders', renderMarkdown(a, { now, total: fixture.length, space: 'S' }).includes('OVERDUE (1)')],
    ['html renders', renderHtml(a, { now, total: fixture.length, space: 'S' }).startsWith('<!doctype html>')],
    ['the token file lives OUTSIDE the project', !TOKEN_FILE.startsWith(ROOT)],
  ];
  let bad = 0;
  for (const [name, ok] of checks) { console.log((ok ? 'PASS  ' : 'FAIL  ') + name); if (!ok) bad++; }
  console.log(bad === 0 ? 'SELF_TEST_PASS (' + checks.length + ' checks)' : 'SELF_TEST_FAIL (' + bad + ' failed)');
  process.exit(bad === 0 ? 0 : 1);
}

async function main() {
  const cmd = process.argv[2] || 'report';
  if (cmd === 'self-test') return selfTest();
  const token = readToken();
  if (!token) {
    recordHealth({
      at: new Date().toISOString(), ok: false, mode: cmd,
      error: 'no ClickUp API token found at the configured path',
      systems: { clickup: 'not configured' },
    });
    console.error('FAILED: no ClickUp API token found. Create ' + TOKEN_FILE + ' containing CLICKUP_API_TOKEN=...');
    process.exit(2);
  }
  try {
    if (cmd === 'health') {
      const { lists, tasks } = await fetchAllTasks(token);
      recordHealth({
        at: new Date().toISOString(), ok: true, mode: 'health',
        lists: lists.length, tasks: tasks.length,
        systems: { clickup: 'ok at ' + new Date().toISOString() },
      });
      console.log('health recorded: ' + lists.length + ' lists, ' + tasks.length + ' tasks');
      return;
    }
    await cmdReport(token, cmd);
  } catch (e) {
    recordHealth({
      at: new Date().toISOString(), ok: false, mode: cmd,
      error: String(e && e.message ? e.message : e),
      systems: { clickup: 'FAILED at ' + new Date().toISOString() },
    });
    console.error('FAILED: ' + (e && e.message ? e.message : e));
    process.exit(1);
  }
}

main();


