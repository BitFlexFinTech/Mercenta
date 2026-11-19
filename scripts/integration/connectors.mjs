/**
 * SECTION: CONNECTORS — CLICKUP, GITHUB, PENPOT. ALL READ-ONLY.
 *
 * Each connector answers the same three questions, so the sync layer treats them identically:
 *   isConfigured()  — is a credential present at all?
 *   check()         — is the remote reachable and does the credential work?   (health)
 *   snapshot()      — what does it hold right now?                            (sync input)
 *
 * NONE of them writes. There is no create, update or delete call in this file.
 */
import { execFile } from 'node:child_process';
import { request, refFor, readEnvKey, CRED } from './lib/core.mjs';

export const CLICKUP_API = 'https://api.clickup.com/api/v2';
export const CLICKUP_WORKSPACE = '1200400000014349';
export const CLICKUP_SPACE = '1200400000053894';
export const GITHUB_REPO = 'BitFlexFinTech/Mercenta';
export const PENPOT_ENDPOINT = 'https://design.penpot.app/mcp/stream';

/* ================= ClickUp ================= */

/**
 * ClickUp accepts two token shapes with DIFFERENT headers: a personal token (`pk_...`) goes in
 * RAW, an OAuth access token as a `Bearer`. Detected, never guessed.
 */
export function clickupHeader(token) {
  const t = String(token || '');
  return t.startsWith('pk_') ? t : 'Bearer ' + t;
}

export function clickupToken(env = process.env) {
  return readEnvKey('CLICKUP_API_TOKEN', CRED.clickup, env);
}

export const clickup = {
  name: 'clickup',
  isConfigured(env = process.env) { return Boolean(clickupToken(env)); },

  /** READ-ONLY health: one cheap call that proves the credential works. */
  async check(fetchImpl = fetch, env = process.env) {
    const token = clickupToken(env);
    if (!token) return { ok: false, reason: 'no-credential' };
    const res = await request(CLICKUP_API + '/team', { headers: { Authorization: clickupHeader(token) }, fetchImpl });
    if (!res.ok) return { ok: false, reason: res.status === 401 ? 'unauthorized' : 'http-' + res.status, status: res.status, attempts: res.attempts };
    let json = null;
    try { json = JSON.parse(res.text); } catch { json = null; }
    const teams = (json && json.teams) || [];
    const found = teams.find((t) => String(t.id) === CLICKUP_WORKSPACE) || null;
    return { ok: Boolean(found), reason: found ? 'ok' : 'workspace-not-visible', workspace: found ? found.name : null, attempts: res.attempts };
  },

  /** READ-ONLY snapshot: folders, lists and every task in the space. */
  async snapshot(fetchImpl = fetch, env = process.env) {
    const token = clickupToken(env);
    if (!token) return { ok: false, reason: 'no-credential' };
    const headers = { Authorization: clickupHeader(token) };

    const foldersRes = await request(CLICKUP_API + '/space/' + CLICKUP_SPACE + '/folder?archived=false', { headers, fetchImpl });
    if (!foldersRes.ok) return { ok: false, reason: 'folders-' + foldersRes.status };
    const folderlessRes = await request(CLICKUP_API + '/space/' + CLICKUP_SPACE + '/list?archived=false', { headers, fetchImpl });
    if (!folderlessRes.ok) return { ok: false, reason: 'lists-' + folderlessRes.status };

    const parse = (r) => { try { return JSON.parse(r.text); } catch { return null; } };
    const foldersJson = parse(foldersRes);
    const listsJson = parse(folderlessRes);

    const lists = [];
    for (const f of (foldersJson && foldersJson.folders) || []) {
      for (const l of f.lists || []) lists.push({ id: l.id, name: l.name, folder: f.name });
    }
    for (const l of (listsJson && listsJson.lists) || []) lists.push({ id: l.id, name: l.name, folder: null });

    const tasks = [];
    for (const l of lists) {
      const r = await request(CLICKUP_API + '/list/' + l.id + '/task?archived=false&subtasks=true', { headers, fetchImpl });
      if (!r.ok) continue;
      const j = parse(r);
      for (const t of (j && j.tasks) || []) {
        tasks.push({
          id: t.id,
          ref: refFor('clickup', t.id),
          name: t.name,
          status: t.status && t.status.status ? t.status.status : null,
          list: l.name,
          folder: l.folder,
          priority: t.priority && t.priority.priority ? t.priority.priority : null,
          dueDate: t.due_date ? Number(t.due_date) : null,
          url: t.url || null,
        });
      }
    }
    return {
      ok: true,
      folders: ((foldersJson && foldersJson.folders) || []).map((f) => ({ id: f.id, name: f.name })),
      lists,
      tasks,
    };
  },
};

/* ================= GitHub ================= */

/**
 * A GitHub token, from the environment first (CI supplies `GITHUB_TOKEN`) and otherwise from the
 * already-authenticated `gh` CLI. The value is captured and returned — it is NEVER printed.
 */
export function githubToken(env = process.env) {
  return env.GH_TOKEN || env.GITHUB_TOKEN || null;
}

export function ghTokenFromCli() {
  return new Promise((resolve) => {
    execFile('gh', ['auth', 'token'], { encoding: 'utf8' }, (err, stdout) => {
      resolve(err ? null : String(stdout || '').trim() || null);
    });
  });
}

export async function resolveGithubToken(env = process.env) {
  return githubToken(env) || (await ghTokenFromCli());
}

export const github = {
  name: 'github',
  isConfigured(env = process.env) { return Boolean(githubToken(env)); },

  async check(fetchImpl = fetch, env = process.env, tokenOverride = null) {
    const token = tokenOverride || (await resolveGithubToken(env));
    if (!token) return { ok: false, reason: 'no-credential' };
    const res = await request('https://api.github.com/repos/' + GITHUB_REPO, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'mercenta-integration' },
      fetchImpl,
    });
    if (!res.ok) return { ok: false, reason: res.status === 401 ? 'unauthorized' : 'http-' + res.status, status: res.status, attempts: res.attempts };
    let json = null;
    try { json = JSON.parse(res.text); } catch { json = null; }
    return { ok: true, reason: 'ok', repo: json && json.full_name, private: json && json.private, defaultBranch: json && json.default_branch };
  },

  async snapshot(fetchImpl = fetch, env = process.env, tokenOverride = null) {
    const token = tokenOverride || (await resolveGithubToken(env));
    if (!token) return { ok: false, reason: 'no-credential' };
    const headers = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'mercenta-integration' };
    const base = 'https://api.github.com/repos/' + GITHUB_REPO;

    const commits = await request(base + '/commits?per_page=10', { headers, fetchImpl });
    const runs = await request(base + '/actions/runs?per_page=10', { headers, fetchImpl });
    const prs = await request(base + '/pulls?state=open&per_page=30', { headers, fetchImpl });
    const issues = await request(base + '/issues?state=open&per_page=30', { headers, fetchImpl });

    const parse = (r) => { try { return JSON.parse(r.text); } catch { return null; } };
    /* A snapshot that could not read ANYTHING is a FAILURE, not an empty success. Without this
       the run would report GitHub as healthy while it was unreachable — caught by the
       whole-run test, which stubs every request to 401. */
    if (![commits, runs, prs, issues].some((r) => r.ok)) {
      return { ok: false, reason: 'all-requests-failed', status: commits.status };
    }
    const commitsJson = commits.ok ? parse(commits) : [];
    const runsJson = runs.ok ? parse(runs) : null;
    const prsJson = prs.ok ? parse(prs) : [];
    const issuesJson = issues.ok ? parse(issues) : [];

    return {
      ok: true,
      commits: (commitsJson || []).map((c) => ({
        sha: c.sha,
        short: String(c.sha || '').slice(0, 7),
        ref: refFor('github', c.sha),
        message: String((c.commit && c.commit.message) || '').split('\n')[0],
        author: (c.commit && c.commit.author && c.commit.author.name) || null,
        date: (c.commit && c.commit.author && c.commit.author.date) || null,
        url: c.html_url || null,
      })),
      workflowRuns: ((runsJson && runsJson.workflow_runs) || []).map((r) => ({
        id: r.id,
        name: r.name,
        status: r.status,
        conclusion: r.conclusion,
        branch: r.head_branch,
        sha: String(r.head_sha || '').slice(0, 7),
        url: r.html_url || null,
        createdAt: r.created_at,
      })),
      pullRequests: (prsJson || []).map((p) => ({
        number: p.number,
        title: p.title,
        draft: Boolean(p.draft),
        branch: p.head && p.head.ref,
        ref: refFor('github-pr', p.number),
        url: p.html_url || null,
        updatedAt: p.updated_at,
      })),
      /* GitHub's issues endpoint ALSO returns pull requests; they are separated out here. */
      issues: (issuesJson || []).filter((i) => !i.pull_request).map((i) => ({
        number: i.number, title: i.title, ref: refFor('github-issue', i.number), url: i.html_url || null, updatedAt: i.updated_at,
      })),
    };
  },
};

/* ================= Penpot (hosted MCP) ================= */

export function penpotKey(env = process.env) {
  return readEnvKey('PENPOT_MCP_KEY', CRED.penpot, env);
}

export function penpotUrl(key) {
  return key ? PENPOT_ENDPOINT + '?userToken=' + encodeURIComponent(key) : PENPOT_ENDPOINT;
}

/** Classify Penpot's reply. The ONLY authenticated signal it gives is this error string. */
export function classifyPenpot(text) {
  const t = String(text || '');
  if (/No userToken found/i.test(t)) return { keyAccepted: false, designConnected: false, reason: 'key-rejected' };
  if (/No Penpot instance connected/i.test(t)) return { keyAccepted: true, designConnected: false, reason: 'no-design-connected' };
  return { keyAccepted: true, designConnected: true, reason: 'connected' };
}

const MCP_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };

export const penpot = {
  name: 'penpot',
  isConfigured(env = process.env) { return Boolean(penpotKey(env)); },

  /** The tool list needs no credential, so it proves only that the server is reachable. */
  async check(fetchImpl = fetch) {
    const res = await request(PENPOT_ENDPOINT, {
      method: 'POST', headers: MCP_HEADERS,
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }),
      fetchImpl,
    });
    if (!res.ok) return { ok: false, reason: 'http-' + res.status, status: res.status };
    const names = [...res.text.matchAll(/"name"\s*:\s*"([^"]+)"/g)].map((m) => m[1]).filter((n) => n !== 'penpot');
    return { ok: names.length > 0, reason: names.length ? 'ok' : 'no-tools', tools: names };
  },

  /**
   * READ-ONLY snapshot. Runs `return 1;` in the plugin context: it reads nothing from a design
   * and changes nothing. This is the ONLY honest way to tell whether a Penpot tab is connected —
   * and it never fabricates design access.
   */
  async snapshot(fetchImpl = fetch, env = process.env) {
    const key = penpotKey(env);
    if (!key) return { ok: false, reason: 'no-credential' };
    const res = await request(penpotUrl(key), {
      method: 'POST', headers: MCP_HEADERS,
      body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'execute_code', arguments: { code: 'return 1;' } } }),
      fetchImpl,
    });
    if (!res.ok) return { ok: false, reason: 'http-' + res.status, status: res.status };
    const verdict = classifyPenpot(res.text);
    return { ok: verdict.keyAccepted, ...verdict, designRefs: [] };
  },
};


