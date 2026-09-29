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