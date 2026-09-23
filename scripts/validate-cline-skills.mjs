#!/usr/bin/env node
/**
 * §ADDITIVE CLINE SKILL SYSTEM (2026-09-23) — SKILL CONTRACT VALIDATOR.
 *
 * Installs a triage + specialist skill layer next to the Mercenta rules. The
 * layer is only real if Cline can actually load each skill and if the upstream
 * skills have not been silently edited into local imitations. This validator
 * fails when either is untrue:
 *
 *   1. .agents/skills/ contains a stray file, or a directory with no SKILL.md
 *      (Cline scans this directory — a malformed member is a dead skill);
 *   2. any SKILL.md lacks YAML frontmatter, or declares a frontmatter field
 *      Cline rejects (allowed set: name, description, license, compatibility,
 *      metadata, allowed-tools — the installed 4.1.x skill loader);
 *   3. a skill's `name` does not exactly match its directory name;
 *   4. a skill's `description` is missing or over 1024 characters;
 *   5. an adapter skill (upstream body moved to SKILL.upstream.md so Cline
 *      would accept the frontmatter) is missing its upstream body;
 *   6. a vendored upstream file no longer matches the recorded SHA-256 in
 *      UPSTREAM-PROVENANCE.json — i.e. an upstream skill was edited locally;
 *   7. the router names a skill that does not exist, or a skill exists that the
 *      router never routes (drift in either direction);
 *   8. skills-lock.json does not record the upstream source for a vendored skill.
 *
 * Run:               node scripts/validate-cline-skills.mjs
 * Regenerate provenance (only after a deliberate upstream install):
 *                    node scripts/validate-cline-skills.mjs --write-provenance
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKILLS_DIR = path.join(ROOT, '.agents', 'skills');
const ROUTER = 'skill-router';
const PROVENANCE = path.join(SKILLS_DIR, 'UPSTREAM-PROVENANCE.json');
const WRITE_PROVENANCE = process.argv.includes('--write-provenance');

/** Frontmatter fields the installed Cline skill loader accepts. */
const ALLOWED_FRONTMATTER = ['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools'];

/** Files at the skills root that are documentation, not skills. */
const ROOT_FILES = ['CLINE-COMPAT.md', 'UPSTREAM-PROVENANCE.json'];

/** Vendored upstream skills: directory -> upstream coordinates. */
const UPSTREAM = {
  'frontend-design': { source: 'anthropics/skills', url: 'https://github.com/anthropics/skills', skillPath: 'skills/frontend-design/SKILL.md' },
  'apple-design': { source: 'emilkowalski/skills', url: 'https://github.com/emilkowalski/skills', skillPath: 'skills/apple-design/SKILL.md' },
  'emil-design-eng': { source: 'emilkowalski/skills', url: 'https://github.com/emilkowalski/skills', skillPath: 'skills/emil-design-eng/SKILL.md' },
  'beautiful-shadows': { source: 'MengTo/Skills', url: 'https://github.com/MengTo/Skills', skillPath: 'agent-skills/web-design/beautiful-shadows/SKILL.md' },
  accessibility: { source: 'addyosmani/web-quality-skills', url: 'https://github.com/addyosmani/web-quality-skills', skillPath: 'skills/accessibility/SKILL.md' },
  'design-review': { source: 'Superfuture/design-review', url: 'https://github.com/Superfuture/design-review', skillPath: 'design-review/skills/design-review/SKILL.md' },
  shadcn: { source: 'shadcn-ui/ui', url: 'https://github.com/shadcn-ui/ui', skillPath: 'skills/shadcn/SKILL.md' },
  impeccable: { source: 'pbakaus/impeccable', url: 'https://github.com/pbakaus/impeccable', skillPath: 'skills/impeccable/SKILL.md' },
  'better-interface': { source: 'jakubkrehel/skills', url: 'https://github.com/jakubkrehel/skills', skillPath: 'skills/better-interface/SKILL.md' },
  'interaction-design': { source: 'wshobson/agents', url: 'https://github.com/wshobson/agents', skillPath: 'plugins/ui-design/skills/interaction-design/SKILL.md' },
};

/** Names the router may hold that are not a skill directory of their own. */
const ROUTER_ALIASES = {
  adapt: 'ui-skills lists `npx skills add pbakaus/impeccable --skill adapt`, but the publisher consolidated adapt into the single `impeccable` skill (skills/impeccable/reference/adapt.md) — routing it to `impeccable` keeps the upstream body unmodified.',
};

let pass = 0;
let fail = 0;
const errors = [];
const check = (label, ok, detail) => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}`); return true; }
  fail += 1;
  errors.push(detail ? `${label} — ${detail}` : label);
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  return false;
};

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const frontmatterOf = (text) => {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return match ? match[1] : null;
};
const topLevelKeys = (fm) => fm.split('\n').filter((l) => /^[A-Za-z0-9_-]+:/.test(l)).map((l) => l.split(':')[0]);
const scalar = (fm, key) => {
  const m = fm.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'));
  return m ? m[1].trim() : '';
};

/** Every file that belongs to the vendored upstream body of a skill. */
const upstreamFiles = (dir) => {
  const adapter = fs.existsSync(path.join(dir, 'SKILL.upstream.md'));
  const out = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) { walk(abs); continue; }
      const rel = path.relative(dir, abs);
      if (rel === 'CLINE-COMPAT.md') continue;
      if (adapter && rel === 'SKILL.md') continue;
      out.push(rel);
    }
  };
  walk(dir);
  return out.sort();
};

/* ── 1. Directory sanity ─────────────────────────────────────────────────── */

console.log('CLINE SKILL SYSTEM VALIDATION');
if (!check('.agents/skills exists (a directory Cline scans)', fs.existsSync(SKILLS_DIR))) {
  console.error('CLINE_SKILLS_VALIDATION_FAIL (1 of 1)');
  process.exit(1);
}

const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
for (const entry of entries) {
  if (entry.isDirectory()) continue;
  check(`.agents/skills/${entry.name} is documentation, not a stray skill file`, ROOT_FILES.includes(entry.name));
}
const skillNames = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
check(`the skills directory holds ${skillNames.length} skill(s)`, skillNames.length >= 15, `found ${skillNames.length}`);

/* ── 2. Frontmatter contract (what Cline actually loads) ─────────────────── */

for (const name of skillNames) {
  const dir = path.join(SKILLS_DIR, name);
  const skillFile = path.join(dir, 'SKILL.md');
  if (!check(`${name}/SKILL.md exists`, fs.existsSync(skillFile))) continue;
  const text = fs.readFileSync(skillFile, 'utf8');
  const fm = frontmatterOf(text);
  if (!check(`${name}: SKILL.md starts with YAML frontmatter`, fm !== null)) continue;
  const bad = topLevelKeys(fm).filter((k) => !ALLOWED_FRONTMATTER.includes(k));
  check(`${name}: frontmatter declares only Cline-accepted fields`, bad.length === 0, bad.join(', '));
  const declared = scalar(fm, 'name');
  check(`${name}: frontmatter name matches the directory`, declared === name, `declared "${declared}"`);
  const description = scalar(fm, 'description');
  check(`${name}: description present and <= 1024 chars`, description.length > 0 && description.length <= 1024, `${description.length} chars`);
  if (fs.existsSync(path.join(dir, 'SKILL.upstream.md'))) {
    const upstreamText = fs.readFileSync(path.join(dir, 'SKILL.upstream.md'), 'utf8');
    check(`${name}: adapter keeps the upstream body at SKILL.upstream.md`, frontmatterOf(upstreamText) !== null && upstreamText.length > 500);
    check(`${name}: SKILL.md declares itself an adapter`, text.includes('CLINE ADAPTER'));
  }
}

/* ── 3. Router coverage (no drift in either direction) ───────────────────── */

const routerPath = path.join(SKILLS_DIR, ROUTER, 'SKILL.md');
check(`router ${ROUTER}/SKILL.md exists`, fs.existsSync(routerPath));
check('CLINE-COMPAT.md (the compatibility layer) exists', fs.existsSync(path.join(SKILLS_DIR, 'CLINE-COMPAT.md')));
if (fs.existsSync(routerPath)) {
  const router = fs.readFileSync(routerPath, 'utf8');
  const routed = [...new Set([...router.matchAll(/\*\*([a-z][a-z0-9-]*)\*\*/g)].map((m) => m[1]))];
  for (const name of routed) {
    if (ROUTER_ALIASES[name]) {
      check(`router names "${name}" -> implemented by ${ROUTER_ALIASES[name].split(' ')[0]}`, skillNames.includes(name) || skillNames.includes('impeccable'));
      continue;
    }
    check(`router names "${name}" and that skill exists`, skillNames.includes(name), 'routed but not installed');
  }
  for (const name of skillNames) {
    if (name === ROUTER) continue;
    check(`skill "${name}" is routed by the router`, router.includes(`**${name}**`), 'installed but never routed');
  }
}

/* ── 4. Upstream provenance (byte-identity of vendored skills) ───────────── */

const buildProvenance = () => {
  const out = {};
  for (const [name, meta] of Object.entries(UPSTREAM)) {
    const dir = path.join(SKILLS_DIR, name);
    if (!fs.existsSync(dir)) continue;
    out[name] = { ...meta, files: upstreamFiles(dir).map((rel) => ({ path: rel, sha256: sha256(path.join(dir, rel)) })) };
  }
  return out;
};

const currentProvenance = buildProvenance();
if (WRITE_PROVENANCE) {
  fs.writeFileSync(PROVENANCE, `${JSON.stringify(currentProvenance, null, 2)}\n`);
  console.log(`  • wrote ${path.relative(ROOT, PROVENANCE)} (${Object.keys(currentProvenance).length} vendored skills)`);
}
check('UPSTREAM-PROVENANCE.json exists', fs.existsSync(PROVENANCE));
if (fs.existsSync(PROVENANCE)) {
  const recorded = JSON.parse(fs.readFileSync(PROVENANCE, 'utf8'));
  for (const [name, meta] of Object.entries(recorded)) {
    const dir = path.join(SKILLS_DIR, name);
    if (!check(`provenance: ${name} is installed`, fs.existsSync(dir))) continue;
    const live = new Map(upstreamFiles(dir).map((rel) => [rel, sha256(path.join(dir, rel))]));
    const changed = meta.files.filter((f) => live.get(f.path) !== f.sha256).map((f) => f.path);
    const added = [...live.keys()].filter((rel) => !meta.files.some((f) => f.path === rel));
    check(`provenance: ${name} upstream files are byte-identical`, changed.length === 0 && added.length === 0,
      [changed.length ? `modified: ${changed.join(', ')}` : '', added.length ? `added: ${added.join(', ')}` : ''].filter(Boolean).join(' · '));
  }
  const missing = Object.keys(UPSTREAM).filter((name) => !recorded[name]);
  check('provenance: every vendored upstream skill is recorded', missing.length === 0, missing.join(', '));
}

/* ── 5. The installer's own lock file still names the sources ────────────── */

const lockPath = path.join(ROOT, 'skills-lock.json');
check('skills-lock.json exists (the installer\'s record of upstream sources)', fs.existsSync(lockPath));
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8')).skills || {};
  for (const [name, meta] of Object.entries(UPSTREAM)) {
    const entry = lock[name];
    check(`skills-lock.json records ${name} -> ${meta.source}`, Boolean(entry) && entry.source === meta.source,
      entry ? `says ${entry.source}` : 'absent');
  }
}

/* ── Report ─────────────────────────────────────────────────────────────── */

if (fail > 0) {
  console.error(`CLINE_SKILLS_VALIDATION_FAIL (${fail} of ${pass + fail})`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`CLINE_SKILLS_VALIDATION_PASS (${pass} assertions, 0 network calls)`);