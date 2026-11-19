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
 * A "class SITE" = one occurrence of a class token matching a family below **inside a string literal
 *   or a template-literal part** (a `className` attribute, a `cn()` argument, a class map in a `.ts`
 *   config) — read from the TypeScript AST, never from the raw file text.
 * A FILE is "carrying" a family when it holds at least one match in that family.
 *
 * §OPENSHIP BATCH 10, SUB-BATCH 2 — "FOUND ANYWHERE IN THE FILE" WAS THE DEFECT (fixed at source).
 * ---------------------------------------------------------------------------------------------------
 * The first version of this method matched the RAW FILE TEXT, so a class NAMED IN A COMMENT counted as
 * a call site. Measured when this was fixed (2026-10-16): **13** of the grey family's sites — and
 * **13** of the literal `white`/`black` family's, i.e. every one of them — were prose, including a
 * class that exists ONLY as prose (`bg-white/[0.0x]`, written inside a comment in `ThemeSelector.tsx`).
 * Worse, `classSites()` feeds the gate's "is this shim rule still used?" verdict, and it held **100**
 * prose mentions (`bg-card`, `bg-tint`, `bg-ink-900`, `border-white/[0.06]`, …) — so a component that
 * merely MENTIONED a class in a comment could certify a DEAD force-patch rule as live, which is exactly
 * how dead weight survives a gate. A number that counts prose is not a measurement of the product.
 *
 * THE FIX: read the strings the TypeScript parser sees. A comment is not a string literal, so prose is
 * excluded BY CONSTRUCTION rather than by a regex that guesses where comments end (a path glob such as
 * `'src/**` + slash-star + `.tsx'`, or a `//` inside `https://…`, are both real in this codebase and
 * both break naive stripping). `authoredStrings()` below is that reader, and the gate (T7) proves a
 * comment mention is NOT counted.
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
import ts from 'typescript';

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

/**
 * THE AUTHORED STRINGS OF A FILE — every string literal and template-literal part the TypeScript
 * parser sees, in source order. Comments, JSX text and prose are NOT strings and are therefore
 * excluded BY CONSTRUCTION (see the header: this is the fix for the prose-counting defect).
 *
 * Returns `{ value, start, end, fileName }` per string, so a caller that needs CONTEXT (which other
 * classes share this string — the classifications the migration's decisions need) has it.
 */
export function authoredStrings(src, fileName = 'inline.tsx') {
  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(fileName, src, ts.ScriptTarget.Latest, true, kind);
  const out = [];
  const push = (node) => {
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      out.push({ value: node.text, start: node.getStart(sf), end: node.getEnd(), fileName });
    } else if (ts.isStringLiteral(node)) {
      out.push({ value: node.text, start: node.getStart(sf), end: node.getEnd(), fileName });
    }
  };
  const walk = (node) => {
    if (ts.isTemplateExpression(node)) {
      /**
       * A template WITH substitutions: the literal PARTS are the authored text (`text-${x}` cannot
       * carry a whole class across the hole, so only a part that itself names a class counts).
       */
      for (const part of [node.head, ...node.templateSpans.map((s) => s.literal)]) {
        if (part && part.text.includes('-')) out.push({ value: part.text, start: part.getStart(sf), end: part.getEnd(), fileName });
      }
    } else {
      push(node);
    }
    ts.forEachChild(node, walk);
  };
  walk(sf);
  return out;
}

/** Every class-like token authored inside the given text, using the family regexes' own pattern. */
export function tokensIn(re, text) {
  return text.match(re) || [];
}

/** Every string a subject file authors (AST read). */
export function subjectStrings(files = subjectFiles()) {
  const out = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const s of authoredStrings(src, f)) out.push({ ...s, file: path.relative(ROOT, f) });
  }
  return out;
}

/** Measure one family over the subject set: site count, file count, per-token map, per-file map.
 *  A site is a match INSIDE an authored string — never a mention in a comment (see the header). */
export function measureFamily(re, files = subjectFiles()) {
  const tokens = new Map();
  const byFile = new Map();
  let sites = 0;
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const found = [];
    for (const s of authoredStrings(fs.readFileSync(f, 'utf8'), f)) {
      for (const t of tokensIn(re, s.value)) found.push(t);
    }
    if (!found.length) continue;
    sites += found.length;
    byFile.set(rel, found.length);
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
 *
 * §SUB-BATCH 2 — it now reads AUTHORED STRINGS, not raw text: as raw text it held **100** prose
 * mentions, so a comment naming a class could certify a dead force-patch rule as live (see header).
 */
export const ANY_CLASS =
  /\b(?:(?:hover|group-hover|peer-hover|focus|focus-visible|focus-within|active|disabled|sm|md|lg|xl|2xl|dark):)*(?:text|bg|border|divide|ring|outline|from|to|via|placeholder|decoration|fill|stroke|accent|caret|shadow)-[A-Za-z0-9_[\]/.%$#-]+/g;

/** Class token → number of sites across the subject set (authored strings only). */
export function classSites(files = subjectFiles()) {
  const counts = new Map();
  for (const f of files) {
    for (const s of authoredStrings(fs.readFileSync(f, 'utf8'), f)) {
      for (const t of tokensIn(ANY_CLASS, s.value)) counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return counts;
}

/** The literal `white`/`black` colour token WITH its variant kept (`hover:bg-white/[0.08]`). */
export const LITERAL_WHITE =
  /(?:(?:hover|group-hover|peer-hover|focus|focus-visible|focus-within|active|disabled|sm|md|lg|xl|2xl|dark):)*(?:text|bg|border|divide|ring|from|to|via|placeholder|decoration)-(?:white|black)(?:\/\[[^\]]+\]|\/\d{1,3})?/g;

/** A SATURATED FILL — a class that paints a surface of its own, on which text must stay readable. */
export const FILL_CLASS =
  /(?:bg|from|via|to)-(?:state-(?:success|warning|danger|info|muted)|crimson-accent|red-\d{2,3}|brass(?:-\d{2,3})?|emerald-\d{2,3}|green-\d{2,3}|amber-\d{2,3}|orange-\d{2,3}|sky-\d{2,3}|blue-\d{2,3}|indigo-\d{2,3}|violet-\d{2,3}|fuchsia-\d{2,3}|pink-\d{2,3}|cyan-\d{2,3}|teal-\d{2,3}|rose-\d{2,3}|purple-\d{2,3}|yellow-\d{2,3}|palette-[a-z]+)(?:\/\[[^\]]+\]|\/\d{1,3})?/g;

/**
 * §OPENSHIP BATCH 10, SUB-BATCH 2 — THE CLASSIFICATION THE MIGRATION'S TWO DECISIONS NEED.
 *
 * The two decisions (the border hairlines, and white text on a saturated fill) must be taken WITH the
 * numbers, so this function produces them from ONE owner. Every number below is a count of AUTHORED
 * class sites — never a figure typed into a document:
 *
 *   byToken   — the exact class string, variant included, e.g. `hover:bg-white/[0.08] 12`, and its sites.
 *   byBase    — the same with the variant stripped: the form the force-patch block remaps.
 *   byPrefix  — text · bg · border · divide · ring · … — WHICH property the literal is used on.
 *   byVariant — `(none)` · `hover` · … — a state variant needs its own shim selector.
 *   onFillSolid — a literal TEXT colour sharing one string with a SOLID saturated fill (`bg-brass-500`,
 *               `bg-state-danger`, `hover:bg-red-700`): the sites that must take an ON-FILL token rather
 *               than the strong text token (what the block's RESTORE rules do).
 *   onFillTint — the same, but the fill is a TINT (`bg-brass-500/10`): on a light shell the surface stays
 *               pale, so these sites must take the ORDINARY text token, NOT an on-fill one. Keeping the
 *               two apart is what stops a correct remap being "fixed" into white-on-white.
 */
export function classifyLiteralFamily(files = subjectFiles()) {
  const byToken = new Map();
  const byBase = new Map();
  const byPrefix = new Map();
  const byVariant = new Map();
  const onFillSolid = new Map();
  const onFillTint = new Map();
  const textSites = { total: 0, onFillSolid: 0, onFillTint: 0 };
  let sites = 0;
  for (const f of files) {
    for (const s of authoredStrings(fs.readFileSync(f, 'utf8'), f)) {
      const lit = tokensIn(LITERAL_WHITE, s.value);
      if (!lit.length) continue;
      const fills = [...new Set(tokensIn(FILL_CLASS, s.value))];
      const solid = fills.filter((x) => !x.includes('/'));
      const tint = fills.filter((x) => x.includes('/'));
      for (const t of lit) {
        sites++;
        byToken.set(t, (byToken.get(t) || 0) + 1);
        const base = t.replace(/^(?:[a-z-]+:)+/, '');
        byBase.set(base, (byBase.get(base) || 0) + 1);
        byPrefix.set(base.split('-')[0], (byPrefix.get(base.split('-')[0]) || 0) + 1);
        const variant = /^([a-z-]+):/.exec(t)?.[1] || '(none)';
        byVariant.set(variant, (byVariant.get(variant) || 0) + 1);
        if (/^text-/.test(base)) {
          textSites.total++;
          if (solid.length) {
            textSites.onFillSolid++;
            for (const fill of solid) onFillSolid.set(fill, (onFillSolid.get(fill) || 0) + 1);
          }
          if (tint.length) {
            textSites.onFillTint++;
            for (const fill of tint) onFillTint.set(fill, (onFillTint.get(fill) || 0) + 1);
          }
        }
      }
    }
  }
  const desc = (m) => [...m].sort((a, b) => b[1] - a[1]);
  return {
    sites,
    byToken: desc(byToken),
    byBase: desc(byBase),
    byPrefix: desc(byPrefix),
    byVariant: desc(byVariant),
    textSites,
    onFillSolid: desc(onFillSolid),
    onFillTint: desc(onFillTint),
  };
}

/** True when this file is the one node was asked to run (`npm run measure:legacy`). */
const isEntry = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntry) {
  const m = measure();
  const w = measureLiteralWhite();
  const c = classifyLiteralFamily();
  console.log(`METHOD: scripts/measure-legacy-classes.mjs · subject src/**/*.{ts,tsx} · ${m.filesWalked} files walked`);
  console.log('  a SITE = a class token inside an AUTHORED STRING (AST read) — a comment is never a site');
  console.log(`GREY family: ${m.grey.sites} sites across ${m.grey.files} files`);
  console.log(`INK family:  ${m.ink.sites} sites across ${m.ink.files} files`);
  console.log(`LITERAL white/black subset: ${w.sites} sites across ${w.files} files`);
  console.log('\nTOP GREY TOKENS (token · sites)');
  for (const [t, n] of m.grey.tokens.slice(0, 20)) console.log(`  ${String(n).padStart(5)}  ${t}`);
  console.log('\nTOP INK TOKENS (token · sites)');
  for (const [t, n] of m.ink.tokens.slice(0, 20)) console.log(`  ${String(n).padStart(5)}  ${t}`);

  console.log('\n§SUB-BATCH 2 — THE LITERAL FAMILY CLASSIFIED (the numbers the two decisions need)');
  console.log(`  by PREFIX: ${c.byPrefix.map(([k, n]) => `${k} ${n}`).join(' · ')}`);
  console.log(`  by VARIANT: ${c.byVariant.map(([k, n]) => `${k} ${n}`).join(' · ')}`);
  console.log('  by BASE CLASS (variant stripped) · sites');
  for (const [t, n] of c.byBase) console.log(`    ${String(n).padStart(5)}  ${t}`);
  console.log(`  TEXT sites: ${c.textSites.total} · with a SOLID fill in the same string: ${c.textSites.onFillSolid} · with only a TINT: ${c.textSites.onFillTint}`);
  console.log('    SOLID fill co-occurring with a literal text colour · sites (these need an ON-FILL token)');
  for (const [t, n] of c.onFillSolid) console.log(`      ${String(n).padStart(5)}  ${t}`);
  console.log('    TINT co-occurring with a literal text colour · sites (these need the ORDINARY text token)');
  for (const [t, n] of c.onFillTint) console.log(`      ${String(n).padStart(5)}  ${t}`);
}
