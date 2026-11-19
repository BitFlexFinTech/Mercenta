#!/usr/bin/env node
/**
 * RULES-APPLICATION GATE — `npm run validate:rules-application`
 *
 * WHY THIS EXISTS (Founder directive, 2026-09-29)
 * ----------------------------------------------
 * The Founder found that rules were being READ but not APPLIED: a question would be
 * answered without first classifying it and without bringing in the specialist that
 * rule requires. Fixing the plain-English rule alone would have repeated the mistake,
 * so this gate covers the whole rule set, and the session itself:
 *
 *   1  every rule declared in `RULES-MANIFEST.json` is installed in every rules folder
 *      the assistant reads, and no UNDECLARED rule is loose in one of them;
 *   2  two copies of the same rule are byte-identical (a drift means two reads of "the
 *      same rule" disagree);
 *   3  no rule has LOST a required part declared in the manifest (how a rule gets
 *      silently weakened);
 *   4  the project's own copy of a shared-owner rule IS the global rule;
 *   5  `PROJECT_STATUS.md` records WHICH MODE and WHICH SPECIALIST the session applied
 *      — so "I read the rules" is not accepted as evidence of applying them.
 *
 * A rules folder that does not exist on this machine (a fresh clone, a build server)
 * is SKIPPED with a warning rather than failed: absence there is not a drift.
 *
 * Run: node scripts/validate-rules-application.mjs
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOME = os.homedir();

let pass = 0;
let fail = 0;
const errors = [];
function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    errors.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const read = (p) => fs.readFileSync(p, 'utf8');
const MANIFEST = path.join(HOME, '.cline/rules/RULES-MANIFEST.json');

/* ── 1-3. the rule set on this machine ────────────────────────────────────── */

console.log('§ 1. Every declared rule is installed, and nothing undeclared is loose\n');
let manifest = null;
let installed = [];
if (!fs.existsSync(MANIFEST)) {
  console.log(`  SKIP  ${MANIFEST} — the global rules are not installed here (not a drift)`);
} else {
  manifest = JSON.parse(read(MANIFEST));
  for (const rel of manifest.folders) {
    const dir = path.join(HOME, rel);
    if (!fs.existsSync(dir)) {
      console.log(`  SKIP  ${rel} — not installed on this machine (not a drift)`);
      continue;
    }
    const present = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
    const missing = manifest.rules.filter((r) => !present.includes(r));
    const undeclared = present.filter((p) => !manifest.rules.includes(p));
    check(`${rel} holds every declared rule (${manifest.rules.length})`, missing.length === 0, missing.length ? `MISSING: ${missing.join(', ')}` : '');
    check(`${rel} holds NO undeclared rule`, undeclared.length === 0, undeclared.length ? `UNDECLARED: ${undeclared.join(', ')}` : '');
    installed.push({ rel, dir, present });
  }
}

if (installed.length > 0 && manifest) {
  console.log('\n§ 2. Two copies of one rule are never allowed to differ\n');
  const drifted = [];
  const texts = new Map();
  for (const folder of installed) {
    for (const rule of manifest.rules) {
      const file = path.join(folder.dir, rule);
      if (!fs.existsSync(file)) continue;
      const text = read(file);
      if (!texts.has(rule)) texts.set(rule, []);
      texts.get(rule).push({ rel: folder.rel, text });
    }
  }
  for (const [rule, copies] of texts) {
    if (copies.length > 1 && copies.some((c) => c.text !== copies[0].text)) {
      drifted.push(`${rule} (${copies.map((c) => c.rel).join(' vs ')})`);
    }
  }
  check(
    `every rule in more than one folder is byte-identical (${texts.size} rules read)`,
    drifted.length === 0,
    drifted.length ? `DIFFERENT: ${drifted.join('; ')}` : ''
  );

  console.log('\n§ 3. No rule has lost a required part\n');
  for (const [rule, markers] of Object.entries(manifest.requiredMarkers ?? {})) {
    const copies = texts.get(rule);
    if (!copies || copies.length === 0) {
      check(`${rule} is present so its required parts can be checked`, false, 'MISSING');
      continue;
    }
    const lost = markers.filter((m) => !copies[0].text.includes(m));
    check(`${rule} still carries its ${markers.length} required part(s)`, lost.length === 0, lost.length ? `LOST: ${lost.join(' | ')}` : '');
  }

  console.log('\n§ 4. The project agrees with the global rules\n');
  for (const rule of manifest.mirroredInProjects ?? []) {
    const globalCopy = texts.get(rule)?.[0];
    const projectCopy = path.join(ROOT, '.clinerules', rule);
    const exists = fs.existsSync(projectCopy);
    check(`${rule} is present in the project`, exists, projectCopy);
    if (exists && globalCopy) {
      check(`${rule} in the project IS the global rule`, read(projectCopy) === globalCopy.text);
    }
  }
  for (const [rel, marker] of Object.entries(manifest.projectPointers ?? {})) {
    const file = path.join(ROOT, rel);
    check(
      `${rel} points at the rule`,
      fs.existsSync(file) && read(file).includes(marker)
    );
  }
} else {
  console.log('\n§ 2-4 SKIPPED — the global rules are not installed on this machine.');
}

/* ── 5. the session must RECORD the mode and the specialist it applied ────── */

console.log('\n§ 5. The session records WHICH mode and WHICH specialist it applied\n');
const MODES = ['QUESTION', 'ANALYZE', 'PLAN', 'IMPLEMENT'];

/**
 * Read the declaration the routing rule requires. Kept as a small, testable parser so
 * §6 can prove it REJECTS a session that skipped the rule.
 */
function parseRulesApplied(line) {
  const mode = /\bMODE:\s*(QUESTION|ANALYZE|PLAN|IMPLEMENT)\b/i.exec(line);
  const experts = /\bEXPERTS:\s*([^·|]+)/i.exec(line);
  const names = experts
    ? experts[1]
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1)
    : [];
  return { mode: mode ? mode[1].toUpperCase() : null, experts: names };
}

const resumeBlock = read(path.join(ROOT, 'PROJECT_STATUS.md')).split('## CURRENT PLATFORM POSITION')[0];
const appliedMatch = /^RULES APPLIED THIS SESSION:([^\n]*)$/m.exec(resumeBlock);
check('PROJECT_STATUS.md records RULES APPLIED THIS SESSION in its resume block', Boolean(appliedMatch));
const applied = parseRulesApplied(appliedMatch ? appliedMatch[1] : '');
check(
  `it names ONE valid mode (${MODES.join(' / ')})`,
  Boolean(applied.mode) && MODES.includes(applied.mode),
  appliedMatch ? appliedMatch[1].slice(0, 120) : 'field missing'
);
check(
  'it names at least ONE specialist the session actually applied',
  applied.experts.length > 0,
  appliedMatch ? appliedMatch[1].slice(0, 120) : 'field missing'
);

/* ── 5c. UI WORK MUST NAME A DESIGN SKILL (Owner directive, 2026-10-13) ──────────────
 *
 * The owner's finding: the design skills were INSTALLED and the routing table already
 * said which to load for which design problem — and the work still happened without
 * them. "the designer should actually use the skills". Reading a rule had already
 * proved insufficient, exactly as it did for the plain-English rule, so this is the
 * mechanism instead of another instruction: if the working tree changes anything a
 * user SEES, the session that made the change must NAME the design skill(s) it applied
 * in its `RULES APPLIED THIS SESSION` line.
 *
 * It does not (and cannot) inspect the model's process. What it can do — and does — is
 * make an undeclared UI change FAIL the build, so "I forgot to load the design skill"
 * cannot pass unnoticed. */
console.log('\n§ 5c. A change to what a user SEES names the design skill(s) it applied\n');
const { execSync } = await import('node:child_process');
/** Files whose change alters what a user sees or how the interface is styled. */
const UI_FILE = /^(src\/components\/|src\/index\.css$|src\/theme-alpha-shims\.css$|tailwind\.config\.js$|src\/config\/themes\.ts$|src\/config\/homepageContent\.ts$)/;
/** Every design skill this machine can load (installed upstream + the UX specialist). */
const DESIGN_SKILLS = [
  'frontend-design',
  'design-review',
  'ux-product-analyst',
  'better-interface',
  'better-layout',
  'better-colors',
  'better-typography',
  'better-ui',
  'beautiful-shadows',
  'accessibility',
  'interaction-design',
  'apple-design',
  'emil-design-eng',
  'impeccable',
  'make-interfaces-feel-better',
  'interface-review',
  'explain-interface',
  'prototype',
  'brandkit',
  'web-design-guidelines',
  'improve-animations',
  'review-animations',
  'find-animation-opportunities',
];
let changedFiles = [];
try {
  changedFiles = execSync('git status --porcelain', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .map((l) => l.slice(3).trim())
    .filter(Boolean);
} catch {
  /* git unavailable — checked elsewhere; this check simply cannot apply */
}
const changedUi = changedFiles.filter((f) => UI_FILE.test(f));
const expertsLower = applied.experts.join(' ').toLowerCase();
const namedDesignSkill = DESIGN_SKILLS.filter((s) => expertsLower.includes(s));
check(
  `when the change set touches the interface (${changedUi.length} UI file(s)), the session names a design skill`,
  changedUi.length === 0 || namedDesignSkill.length > 0,
  changedUi.length
    ? `UI files changed (${changedUi.slice(0, 4).join(', ')}${changedUi.length > 4 ? ', …' : ''}) but EXPERTS names none of: ${DESIGN_SKILLS.slice(0, 6).join(', ')}, …`
    : ''
);
/** Self-check: the detector must be able to REJECT a session that skipped it. */
check(
  'the UI-change detector is self-checked (a UI path matches; a docs path does not)',
  UI_FILE.test('src/components/marketing/Home.tsx') &&
    UI_FILE.test('tailwind.config.js') &&
    !UI_FILE.test('docs/DESIGN_SYSTEM.md') &&
    !UI_FILE.test('scripts/validate-uiux-redesign.mjs')
);
check(
  'the design-skill list is self-checked (a real skill is recognised; a made-up one is not)',
  DESIGN_SKILLS.includes('frontend-design') &&
    DESIGN_SKILLS.includes('design-review') &&
    !DESIGN_SKILLS.includes('not-a-real-design-skill')
);

/* ── 5b. RULE 10's OWN REQUIREMENT: this project must HAVE a describer check ─────────
 *
 * Global rule `10-describers-must-match-reality.md` §4 forbids a project that "has none",
 * and §5 forbids a check that finds nothing. Rather than TRUSTING that such a check exists
 * here, DISCOVER it: at least one `scripts/validate-*.mjs` must implement BOTH halves — the
 * deleted-path discovery read from the registry AND the vacuity guard. Delete the check, or
 * silence the guard, and this fails. (Added 2026-10-11 after the owner asked why a removed
 * carrier login was still being described: the project had the rule and no mechanism.) */

console.log('\n§ 5b. This project HAS a describer check (rule 10 §4–5), discovered not assumed\n');
const validatorFiles = fs.readdirSync(path.join(ROOT, 'scripts')).filter((f) => /^validate-.*\.mjs$/.test(f));
const describerChecks = validatorFiles.filter((f) => {
  const t = fs.readFileSync(path.join(ROOT, 'scripts', f), 'utf8');
  return /\(DELETED\)/.test(t) && /is not vacuous/i.test(t);
});
check(
  `a scripts/validate-*.mjs implements the deleted-file describer check (found: ${describerChecks.join(', ') || 'NONE'})`,
  describerChecks.length > 0
);
/**
 * §FIXED AT SOURCE (2026-11-19). This assertion used to be a bare `existsSync` on the OWNER'S
 * HOME paths, so it could NEVER pass on a fresh clone or a build server — CI failed on a
 * condition that says nothing about the repository, while the same file's own header states
 * that "a rules folder that does not exist on this machine (a fresh clone, a build server) is
 * SKIPPED with a warning rather than failed: absence there is not a drift."
 *
 * It now honours that guard. It is NOT weakened: when a rules folder IS present on this machine
 * the rule must still be there, so a genuine drift is still caught.
 */
const rule10Files = [
  path.join(HOME, '.cline/rules/10-describers-must-match-reality.md'),
  path.join(HOME, 'Documents/Cline/Rules/10-describers-must-match-reality.md'),
];
if (!rule10Files.some((f) => fs.existsSync(path.dirname(f)))) {
  console.log('  SKIP  the global rules are not installed on this machine (not a drift)');
} else {
  check(
    'the global rule 10-describers-must-match-reality.md is installed in every rules folder the assistant reads',
    rule10Files.every((f) => fs.existsSync(f)),
    rule10Files.filter((f) => !fs.existsSync(f)).map((f) => 'missing: ' + f.replace(HOME, '~')).join(', ')
  );
}

/* ── 6. the parser must be able to REJECT a skipped declaration ──────────── */

console.log('\n§ 6. The check is proved able to fail\n');
check(
  'a line with NO mode and NO specialist is rejected',
  parseRulesApplied('read the rules, applied them').mode === null &&
    parseRulesApplied('read the rules, applied them').experts.length === 0
);
check(
  'a mode word that is not one of the four is rejected',
  parseRulesApplied('MODE: OVERHAUL · EXPERTS: someone').mode === null
);
check(
  'a valid declaration is accepted',
  parseRulesApplied('MODE: IMPLEMENT · EXPERTS: senior-software-engineer, senior-software-architect · WHY: it changes the product').mode ===
    'IMPLEMENT' &&
    parseRulesApplied('MODE: IMPLEMENT · EXPERTS: senior-software-engineer, senior-software-architect · WHY: it changes the product')
      .experts.length === 2
);

console.log('');
if (fail === 0) {
  console.log(`RULES_APPLICATION_PASS (${pass} passed, 0 failed)`);
  process.exit(0);
}
console.log(`RULES_APPLICATION_FAIL (${pass} passed, ${fail} failed)`);
for (const error of errors) console.log(`  · ${error}`);
process.exit(1);