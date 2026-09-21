#!/usr/bin/env node
/**
 * §UI/UX Wave 3 — MICRO-TYPOGRAPHY MIGRATION (idempotent).
 *
 * WHY THIS EXISTS
 * ---------------
 * The measured taste debt (docs/UNIFIED_PLATFORM_GAP_ANALYSIS_2026-09-20.md §D.2,
 * finding D-2) was 1,202 arbitrary sub-12px sizes across 113 component files:
 *
 *     text-[8px]   47
 *     text-[9px]  206
 *     text-[10px] 949
 *
 * plus 644 `text-[11px]`. docs/DESIGN_SYSTEM.md explicitly says to avoid the
 * micro sizes, but there was no NAMED operational size to use instead — so every
 * author invented one. That is a design-system failure, not 1,202 individual
 * mistakes, which is why the fix is a TOKEN FIRST and then a mechanical
 * migration (the analysis said exactly this: "a partial pass makes the
 * inconsistency worse").
 *
 * WHAT IT DOES
 * ------------
 * Rewrites ONLY those four arbitrary sizes to the canonical tokens declared in
 * tailwind.config.js → theme.extend.fontSize:
 *
 *     text-[8px] | text-[9px] | text-[10px]   →   text-ds-micro   (11px floor)
 *     text-[11px]                             →   text-ds-label   (12px = text-xs)
 *
 * WHAT IT DELIBERATELY DOES NOT TOUCH
 * -----------------------------------
 * `text-xs` (12px) and `text-sm` (14px) are already canonical per
 * docs/DESIGN_SYSTEM.md, so they are left alone. No colour, spacing, layout or
 * behaviour class is modified. This script is presentation-only.
 *
 * Idempotent: re-running it is a no-op. `--dry-run` reports without writing.
 *
 * Run: node scripts/migrate-micro-typography.mjs [--dry-run]
 * Gate: npm run validate:typography  (fails if a micro size reappears)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');

/** Arbitrary size → canonical operational type token. Order matters. */
const RULES = [
  { from: /text-\[8px\]/g, to: 'text-ds-micro', label: 'text-[8px]  → text-ds-micro' },
  { from: /text-\[9px\]/g, to: 'text-ds-micro', label: 'text-[9px]  → text-ds-micro' },
  { from: /text-\[10px\]/g, to: 'text-ds-micro', label: 'text-[10px] → text-ds-micro' },
  { from: /text-\[11px\]/g, to: 'text-ds-label', label: 'text-[11px] → text-ds-label' },
];

/**
 * Scanned extensions. `.jsx` is included deliberately: the first run of this
 * script missed a `.jsx` file and that blind spot was also present in the
 * validator, so the gate reported PASS while one micro size survived. Both now
 * scan the same set. (The orphan itself — `PublicFooterTmp1.jsx` — was REMOVED as
 * obsolete in the 2026-09-21 clean-slate reconciliation; coverage stays.)
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

const dryRun = process.argv.includes('--dry-run');
let filesChanged = 0;
let totalReplacements = 0;
const perRule = Object.fromEntries(RULES.map((r) => [r.label, 0]));

for (const file of walk(SRC)) {
  const before = fs.readFileSync(file, 'utf8');
  let after = before;
  for (const rule of RULES) {
    const hits = (after.match(rule.from) ?? []).length;
    if (hits === 0) continue;
    perRule[rule.label] += hits;
    totalReplacements += hits;
    after = after.replace(rule.from, rule.to);
  }
  if (after !== before) {
    filesChanged += 1;
    if (!dryRun) fs.writeFileSync(file, after);
  }
}

console.log(`${dryRun ? '[DRY RUN] ' : ''}MICRO-TYPOGRAPHY MIGRATION`);
for (const [label, n] of Object.entries(perRule)) {
  console.log(`  ${label.padEnd(28)} ${n}`);
}
console.log(`  files changed: ${filesChanged} · replacements: ${totalReplacements}`);
