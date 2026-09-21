#!/usr/bin/env node
/**
 * §UI/UX Wave 3 — TYPOGRAPHY SCALE CONTRACT VALIDATOR.
 *
 * Locks the canonical operational type scale so the measured taste debt cannot
 * silently return. Finding D-2 of docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md
 * recorded 1,202 arbitrary sub-12px sizes across 113 component files. This
 * validator fails if:
 *
 *   1. any arbitrary micro size (`text-[8px]`/`[9px]`/`[10px]`) reappears in src/
 *   2. any arbitrary `text-[11px]` reappears (it must be `text-ds-label`)
 *   3. the five canonical tokens are not declared in tailwind.config.js
 *   4. the scale's FLOOR drops below 11px (the readable minimum)
 *   5. the tokens are declared but never actually consumed by the shell and the
 *      workspace primitives — a declaration nobody uses is not a design system
 *   6. docs/DESIGN_SYSTEM.md does not document the scale
 *
 * Run: node scripts/validate-typography-scale.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
const errors = [];

function check(name, ok, detail = '') {
  if (ok) pass++;
  else {
    fail++;
    errors.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

/**
 * Scanned extensions — must match scripts/migrate-micro-typography.mjs exactly.
 * `.jsx` is included deliberately: the scale gate must cover every file the app
 * can render, not only `.tsx`. (The blind spot this closed was a `.jsx` file that
 * survived the first migration while the first validator reported PASS — see
 * §UIUX Wave 3. That orphan, `PublicFooterTmp1.jsx`, was REMOVED as obsolete in
 * the 2026-09-21 clean-slate reconciliation; the extension coverage stays.)
 */
const EXT = new Set(['.ts', '.tsx', '.jsx', '.js', '.css']);
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (EXT.has(path.extname(entry.name))) out.push(p);
  }
  return out;
}

const SRC_FILES = walk(path.join(ROOT, 'src'));

/* ── 1. No arbitrary micro sizes remain ─────────────────────────────────── */

const MICRO = /text-\[(8|9|10)px\]/g;
const ELEVEN = /text-\[11px\]/g;

const microHits = [];
const elevenHits = [];
for (const f of SRC_FILES) {
  const src = fs.readFileSync(f, 'utf8');
  const rel = path.relative(ROOT, f);
  const m = src.match(MICRO);
  if (m) microHits.push(`${rel} (${m.length})`);
  const e = src.match(ELEVEN);
  if (e) elevenHits.push(`${rel} (${e.length})`);
}

check(
  'no arbitrary sub-12px size remains in src/ (text-[8px]|[9px]|[10px])',
  microHits.length === 0,
  microHits.slice(0, 5).join(', ')
);
check(
  'no arbitrary text-[11px] remains in src/ (use text-ds-label)',
  elevenHits.length === 0,
  elevenHits.slice(0, 5).join(', ')
);

/* ── 2. The canonical scale is declared, with the right sizes ───────────── */

const TW = read('tailwind.config.js');
check('tailwind declares a fontSize scale', /fontSize:\s*\{/.test(TW));

const TOKENS = {
  'ds-micro': 11,
  'ds-label': 12,
  'ds-body': 13,
  'ds-title': 15,
  'ds-page': 20,
};

for (const [token, px] of Object.entries(TOKENS)) {
  const declared = new RegExp(`'${token}':\\s*\\['${px}px'`).test(TW);
  check(`token ${token} declared at ${px}px`, declared);
}

/* ── 3. The floor is 11px — nothing smaller may be declared ─────────────── */

const declaredSizes = [...TW.matchAll(/'ds-[a-z]+':\s*\['(\d+)px'/g)].map((m) => Number(m[1]));
check('a type scale was actually parsed', declaredSizes.length === TOKENS ? true : declaredSizes.length > 0);
check(
  'the operational type scale floor is 11px (nothing smaller)',
  declaredSizes.length > 0 && Math.min(...declaredSizes) >= 11,
  `min=${declaredSizes.length ? Math.min(...declaredSizes) : 'n/a'}`
);

/* ── 4. Declared AND consumed (a declaration nobody uses is not a system) ─ */

const CONSUMERS = [
  'src/components/layout/Sidebar.tsx',
  'src/components/layout/Header.tsx',
  'src/components/layout/EnvironmentRouter.tsx',
  'src/components/shared/workspace.tsx',
  'src/components/shared/dashboard.tsx',
];
for (const f of CONSUMERS) {
  const src = read(f);
  check(`${f} consumes the canonical type tokens`, src.includes('text-ds-micro') || src.includes('text-ds-label'));
}

/* ── 5. Documented ──────────────────────────────────────────────────────── */

const DOC = read('docs/DESIGN_SYSTEM.md');
check('docs/DESIGN_SYSTEM.md documents the operational type scale', DOC.includes('text-ds-micro'));
check('docs/DESIGN_SYSTEM.md states the 11px floor', /11px/.test(DOC));

/* ── Report ─────────────────────────────────────────────────────────────── */

if (fail > 0) {
  console.error(`TYPOGRAPHY_SCALE_VALIDATION_FAIL (${fail} of ${pass + fail})`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`TYPOGRAPHY_SCALE_VALIDATION_PASS (${pass} assertions, 0 network calls)`);
