/**
 * §OPENSHIP BATCH 10 — THE LEGACY-STYLING MEASUREMENT (THE METHOD, IN ONE PLACE).
 *
 * WHY THIS FILE EXISTS — the defect it repairs
 * --------------------------------------------
 * `docs/OPENSHIP_REFERENCE_SPEC.md` §12 recorded **2,812** grey-family class sites across **119**
 * files and **857** `ink`/`surface`/`brass` sites across **115** files, and Batch 10 was planned to
 * migrate them. But NO METHOD was recorded anywhere: no script, no regex, no definition of "grey
 * family", no statement of which files were walked. So the migration's own STEP 1 — a re-measurement
 * — could not reproduce the figures, and two counts produced by two different methods sitting side by
 * side is exactly the drift `07-fix-defects-at-source.md` and rule 10 §2 forbid (a written fact must
 * be REPRODUCIBLE, not merely written).
 *
 * This module IS the method. The spec's table and the migration's gate both read it, so the document,
 * the gate and the code cannot drift apart: one method, one owner.
 *
 * THE METHOD, STATED EXACTLY
 * --------------------------
 * SUBJECT — every `src/**\/*.ts` and `src/**\/*.tsx` file (the files that AUTHOR a class string).
 *   Generated CSS is deliberately NOT the subject: `src/theme-alpha-shims.css` is emitted by
 *   `scripts/gen-theme-alpha-shims.mjs`, and `src/index.css` CARRIES the light-shell force-patch
 *   block rather than a class usage — counting either would count the instrument, not the call sites.
 * A "class SITE" = one occurrence of a class token matching a family below, found anywhere in the file
 *   (class strings, `cn()` arguments, template literals) — `String.match` with a global regex.
 * A FILE is "carrying" a family when it holds at least one match in that family.
 *
 * THE TWO FAMILIES (the spec's own two, made precise)
 * ---------------------------------------------------
 *   GREY      — the grey-scale/text family: `white`, `zinc-N`, `slate-N`, `gray-N`, `grey-N`,
 *               `neutral-N`, `steel`, `parchment`, on any Tailwind colour property prefix, with an
 *               optional opacity modifier (`/50` or `/[0.06]`).
 *   INK       — the legacy alias family: `ink-N`, `surface-*`, `brass-N`, same prefixes and modifiers.
 *
 * `white` IS in the grey family on purpose. It is the one family member whose VALUE is still a literal
 * (`tailwind.config.js` → `white: '#FFFFFF'`), which is precisely why the light-shell force-patch block
 * in `src/index.css` exists, and precisely what the migration must repoint.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');

/** The colour-property prefixes a class token may carry. */
const PREFIXES =
  'text|bg|border|divide|ring|placeholder|from|to|via|fill|stroke|decoration|shadow|outline|accent|caret';

/** Family GREY — the grey-scale family (see the header: `white` is a member). */
export const GREY =
  new RegExp(`\\b(?:${PREFIXES})-(?:white|zinc(?:-\\d{2,3})?|slate(?:-\\d{2,3})?|gray(?:-\\d{2,3})?|grey(?:-\\d{2,3})?|neutral(?:-\\d{2,3})?|steel|parchment)(?:\\/\\[[^\\]]+\\]|\\/\\d{1,3})?`, 'g');

/** Family INK — the legacy `ink`/`surface`/`brass` alias family. */
export const INK =
  new RegExp(`\\b(?:${PREFIXES})-(?:ink(?:-\\d{2,3})?|surface(?:-\\w+)?|brass(?:-\\d{2,3})?)(?:\\/\\[[^\\]]+\\]|\\/\\d{1,3})?`, 'g');

export const FAMILIES = { grey: GREY, ink: INK };

/** Every source file that AUTHORS a class string. A missing directory returns EMPTY rather than
 *  throwing, so the gate can REPORT that it found nothing (rule 10 §5) instead of crashing. */
export function subjectFiles(dir = path.join(ROOT, 'src'), out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) subjectFiles(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out.sort();
}

/** Measure one family over the subject set: site count, file count, per-token map, per-file map. */
export function measureFamily(re, files = subjectFiles()) {
  const tokens = new Map();
  const byFile = new Map();
  let sites = 0;
  for (const f of files) {
    const found = fs.readFileSync(f, 'utf8').match(re) || [];
    if (!found.length) continue;
    sites += found.length;
    byFile.set(path.relative(ROOT, f), found.length);
    for (const t of found) tokens.set(t, (tokens.get(t) || 0) + 1);
  }
  return {
    sites,
    files: byFile.size,
    tokens: [...tokens].sort((a, b) => b[1] - a[1]),
    byFile: [...byFile].sort((a, b) => b[1] - a[1]),
  };
}

/** Both families, in one call — what the spec table and the gate both consume. */
export function measure() {
  const files = subjectFiles();
  return { filesWalked: files.length, grey: measureFamily(GREY, files), ink: measureFamily(INK, files) };
}

/** The literal-`white` subset — the class sites the light-shell force-patch block exists to remap. */
export function measureLiteralWhite(files = subjectFiles()) {
  const re = new RegExp(
    `\\b(?:text|bg|border|divide|ring|from|to|via|placeholder|decoration)-(?:white|black)(?:\\/\\[[^\\]]+\\]|\\/\\d{1,3})?`,
    'g',
  );
  return measureFamily(re, files);
}

/**
 * ANY CLASS TOKEN — every Tailwind class authored in the subject set, with its site count.
 *
 * This exists so "how many sites does this class have" has ONE owner. Its first version omitted the
 * VARIANT form (`hover:`, `group-hover:`, `disabled:` — a COLON, not a hyphen), so 69 real
 * `hover:text-white` sites measured as zero and the gate would have called a live shim rule dead.
 * The variant group is therefore explicit and repeatable.
 */
export const ANY_CLASS =
  /\b(?:(?:hover|group-hover|peer-hover|focus|focus-visible|focus-within|active|disabled|sm|md|lg|xl|2xl|dark):)*(?:text|bg|border|divide|ring|outline|from|to|via|placeholder|decoration|fill|stroke|accent|caret|shadow)-[A-Za-z0-9_[\]/.%$#-]+/g;

/** Class token → number of sites across the subject set. */
export function classSites(files = subjectFiles()) {
  const counts = new Map();
  for (const f of files) {
    for (const t of fs.readFileSync(f, 'utf8').match(ANY_CLASS) || []) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return counts;
}

/** True when this file is the one node was asked to run (`npm run measure:legacy`). */
const isEntry = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntry) {
  const m = measure();
  const w = measureLiteralWhite();
  console.log(`METHOD: scripts/measure-legacy-classes.mjs · subject src/**/*.{ts,tsx} · ${m.filesWalked} files walked`);
  console.log(`GREY family: ${m.grey.sites} sites across ${m.grey.files} files`);
  console.log(`INK family:  ${m.ink.sites} sites across ${m.ink.files} files`);
  console.log(`LITERAL white/black subset: ${w.sites} sites across ${w.files} files`);
  console.log('\nTOP GREY TOKENS (token · sites)');
  for (const [t, n] of m.grey.tokens.slice(0, 20)) console.log(`  ${String(n).padStart(5)}  ${t}`);
  console.log('\nTOP INK TOKENS (token · sites)');

  for (const [t, n] of m.ink.tokens.slice(0, 20)) console.log(`  ${String(n).padStart(5)}  ${t}`);
}
