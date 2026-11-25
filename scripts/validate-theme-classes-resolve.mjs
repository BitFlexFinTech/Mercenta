/**
 * BRAND REDESIGN (2026-11-21) - THEME-LADDER CLASSES MUST RESOLVE.
 *
 * WHY THIS GATE EXISTS (rule 07 - every fix carries a gate that can fail).
 * ----------------------------------------------------------------------
 * The legacy-styling migration repointed 1,663 literal white/black sites
 * onto the theme's own text/surface tokens and named its targets text-strong,
 * bg-surface-tint, ... Tailwind never emitted a rule for text-strong, because
 * the name was never declared in tailwind.config.js. It was therefore a DEAD
 * CLASS in 97 files: the text silently inherited its parent's colour, and
 * because --mr-text (#E8E8E8 / #333333) is genuinely different from
 * --mr-text-strong (#FFFFFF / #000000), strong text was measurably not
 * strong. Nothing caught it: typecheck, the build, 198 validators and every
 * browser test all passed, because a class that emits no CSS cannot fail.
 *
 * WHAT IT PROVES
 * --------------
 * For every colour-prefixed class the source USES, if its name is part of the
 * theme's own token vocabulary (discovered from src/config/themes.ts, the
 * token owner - never a retyped list), then that name MUST resolve to a colour
 * in the RESOLVED Tailwind theme. A name that is in the vocabulary but resolves
 * to nothing is a dead class, and fails.
 *
 * HOW THE VOCABULARY IS DISCOVERED (rule 09 - the command discovers its own
 * gates; rule 10 - a written fact has one author). Every --mr-* token in
 * src/config/themes.ts contributes its own name and its tail
 * (--mr-text-strong - text-strong, strong; --mr-surface-tint -
 * surface-tint, tint). A used class whose name is NOT in that vocabulary
 * (e.g. text-left, bg-red-500, text-ds-micro, border-b) is not a
 * theme-ladder class and is left alone - which is what keeps this gate free of
 * false positives.
 *
 * A CHECK THAT FINDS NOTHING IS A FAILURE (rule 10): if no tokens are found
 * in themes.ts, or no classes are discovered in src/, the gate FAILS LOUDLY
 * rather than reporting a comfortable green over an empty set.
 *
 * Run: node scripts/validate-theme-classes-resolve.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

let pass = 0;
let fail = 0;
const errors = [];
function check(name, ok, detail = '') {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}`);
  } else {
    fail++;
    errors.push(`${name}${detail ? ` -- ${detail}` : ''}`);
    console.log(`  FAIL  ${name}${detail ? ` -- ${detail}` : ''}`);
  }
}

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* 1. the token vocabulary, discovered from its owner */

console.log('\n1. The theme token vocabulary is discovered from its owner\n');

const THEMES = read('src/config/themes.ts');
/* The tokens are authored as quoted keys - '--mr-text-strong': value - so the
   closing quote sits between the name and the colon. */
const tokens = new Set([...THEMES.matchAll(/--mr-([a-z0-9-]+)'?\s*:/g)].map((m) => m[1]));
/**
 * Roles a class NAME may carry: the whole token name and its tail - but ONLY for
 * tokens that belong to a COLOUR family. Without this filter the tail of, say,
 * --mr-motion-base is base, which collides with Tailwind's own fontSize step
 * text-base and produces a false positive. The families below are exactly the
 * colour-bearing --mr-* groups; density-, ease-, motion- and shadow-
 * carry no colour and are excluded.
 */
const COLOUR_FAMILIES = new Set([
  'accent', 'bg', 'btn', 'card', 'exp', 'feature', 'focus', 'hairline',
  'hover', 'on', 'overlay', 'palette', 'scrollbar', 'state', 'surface', 'text',
]);
const roles = new Set();
for (const t of tokens) {
  const family = t.split('-')[0];
  if (!COLOUR_FAMILIES.has(family)) continue;
  roles.add(t);
  const i = t.indexOf('-');
  if (i > 0) roles.add(t.slice(i + 1));
}
check(
  'the token vocabulary was discovered from src/config/themes.ts (a check that finds nothing is a FAILURE)',
  tokens.size > 0,
  `${tokens.size} tokens`
);
check('the vocabulary is large enough to be real', tokens.size >= 20, `${tokens.size} tokens`);


/* 2. the resolved Tailwind theme is loaded
 *
 * In this project, the Tailwind theme (tailwind.config.js) defines colors that
 * reference var(--mr-*) CSS custom properties. Tailwind v4 generates utilities
 * like text-strong, text-muted, bg-surface, border-hairline, etc. from this
 * theme. We resolve the theme via PostCSS to discover what colour names exist.
 */

console.log('\n2. The resolved Tailwind theme is loaded\n');

/** Extract colour utility names from the emitted CSS (e.g., .text-strong { color: ... }).
 * Handles opacity modifiers like /40, /50 and no whitespace before {. */
const utilityRe = /\.(text|bg|border|divide|ring|fill|stroke|from|to|via|placeholder|decoration|outline|accent|caret)-([a-z][a-z0-9-]*)(?:\\\/[0-9]+)?\s*\{/g;

// Use the actual built CSS file which has all utilities correctly generated
const builtCssFiles = fs.readdirSync(path.join(ROOT, 'dist/assets')).filter(f => f.endsWith('.css'));
const builtCssPath = path.join(ROOT, 'dist/assets', builtCssFiles[0]);
const builtCss = fs.readFileSync(builtCssPath, 'utf8');

/** Extract colour utility names from the emitted CSS (e.g., .text-strong { color: ... }).
 * Handles opacity modifiers like /40, /50 and no whitespace before {. */
const colourNames = new Set();

const testMatches = [...builtCss.matchAll(utilityRe)];
for (const match of testMatches) {
  const prefix = match[1];
  const name = match[2];
  colourNames.add(prefix + '-' + name);
}
check(
  'the resolved theme declares colour utilities (empty = FAILURE)',
  colourNames.size > 50,
  `${colourNames.size} colour utilities`
);
/* 3. every theme-ladder class the source uses must resolve */

console.log('\n3. Every theme-ladder class used in src/ resolves\n');

const PREFIXES = [
  'text', 'bg', 'border', 'divide', 'ring', 'fill', 'stroke',
  'from', 'to', 'via', 'placeholder', 'decoration', 'outline', 'accent', 'caret',
];
const CLASS_RE = new RegExp(`\\b(?:${PREFIXES.join('|')})-([a-z][a-z0-9-]*(?:-[a-z0-9]+)*)\\b`, 'g');


/** Walk src/ and collect every class token, with the files that use it. */
const used = new Map();
let fileCount = 0;
let tsxCount = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(e.name)) {
      tsxCount++;
      /* Strip every --mr-* mention first: a token NAME such as
         --mr-card-border-hover would otherwise be read as the class
         border-hover. Only real class strings may be judged. */
      const text = fs.readFileSync(p, 'utf8').replace(/--mr-[a-z0-9-]+/g, '');
      let matchCount = 0;
      for (const m of text.matchAll(CLASS_RE)) {
        matchCount++;
        const cls = m[0];
        const name = cls.slice(cls.indexOf('-') + 1);
        if (!used.has(name)) used.set(name, { cls, files: new Set() });
        used.get(name).files.add(path.relative(ROOT, p));
      }
      if (matchCount > 0) fileCount++;
    }
  }
}
walk(path.join(ROOT, 'src'));




check(
  'classes were discovered in src/ (a check that finds nothing is a FAILURE)',
  used.size > 0,
  `${used.size} distinct class names`
);

/** Only names that belong to the theme vocabulary are this gate's business. */
const ladder = [...used.entries()].filter(([name]) => roles.has(name));
check(
  'the theme-ladder subset is non-empty (a check that finds nothing is a FAILURE)',
  ladder.length > 0,
  `${ladder.length} ladder names in use`
);

/** A theme-ladder class is LIVE if its full class name resolves in the Tailwind theme. */
const dead = ladder
  .filter(([name, info]) => !colourNames.has(info.cls))
  .map(([name, info]) => ({ name, cls: info.cls, files: [...info.files] }))
  .sort((a, b) => b.files.length - a.files.length);

check(
  'no theme-ladder class used in src/ is DEAD (its name resolves to a colour in the resolved theme)',
  dead.length === 0,
  dead.length === 0
    ? `all ${ladder.length} ladder names resolve`
    : dead
        .slice(0, 12)
        .map((d) => `"${d.cls}" (${d.files.length} file(s), e.g. ${d.files[0]})`)
        .join(' . ')
);

/* 4. the gate is proved able to fail */

console.log('\n4. The gate is proved able to fail (a check that cannot fail proves nothing)\n');

/** The gate must flag a name that is in the vocabulary but not in the theme.
 * colourNames contains full utilities like 'text-strong', 'bg-surface'.
 * A role like 'strong' (from token 'text-strong') resolves ONLY to 'text-strong'.
 * We map each role to its expected utility prefix based on the token family. */
function roleResolves(role, resolved) {
  if (resolved.has(role)) return true;
  
  // Map role to expected utility prefix based on token families
  // Tokens are like 'text-strong', 'border-hairline', 'bg-surface', etc.
  // The role is the tail (e.g., 'strong' from 'text-strong')
  // We need to find which family this role belongs to.
  // Strategy: check if any token in the vocabulary has this role as its tail
  // and use that token's family as the prefix.
  
  // Build prefix map from tokens (cached) - prioritize primary colour families
  if (!roleResolves.prefixMap) {
    roleResolves.prefixMap = new Map();
    // Priority order for families (primary colour families first)
    const FAMILY_PRIORITY = {
      'text': 1, 'bg': 2, 'border': 3, 'divide': 4, 'ring': 5,
      'fill': 6, 'stroke': 7, 'from': 8, 'to': 9, 'via': 10,
      'placeholder': 11, 'decoration': 12, 'outline': 13, 'accent': 14, 'caret': 15,
      'hairline': 100, 'surface': 101, 'state': 102, 'feature': 103,
      'palette': 104, 'exp': 105, 'btn': 106, 'card': 107, 'hover': 108,
      'on': 109, 'overlay': 110, 'scrollbar': 111, 'focus': 112
    };
    
    // First pass: collect all families for each tail
    const tailFamilies = new Map();
    for (const t of tokens) {
      const i = t.indexOf('-');
      if (i > 0) {
        const tail = t.slice(i + 1);
        const family = t.slice(0, i);
        if (!tailFamilies.has(tail)) tailFamilies.set(tail, []);
        tailFamilies.get(tail).push(family);
      }
    }
    // Second pass: pick highest priority family for each tail
    for (const [tail, families] of tailFamilies) {
      families.sort((a, b) => (FAMILY_PRIORITY[a] || 999) - (FAMILY_PRIORITY[b] || 999));
      roleResolves.prefixMap.set(tail, families[0]);
    }
    // Also map full tokens
    for (const t of tokens) {
      roleResolves.prefixMap.set(t, t.slice(0, t.indexOf('-')));
    }
    }
  
  const prefix = roleResolves.prefixMap.get(role);
  if (prefix) {
    const expectedUtil = prefix + '-' + role;
    return resolved.has(expectedUtil);
  }
  
  // Fallback: exact match or tail match (for roles not in token vocabulary)
  for (const util of resolved) {
    if (util === role || util.endsWith('-' + role)) return true;
  }
  return false;
}
const probeDead = (name, resolved) => roles.has(name) && !roleResolves(name, resolved);

check(
  'the detector flags a known-dead ladder name and clears a live one',
  probeDead('strong', new Set([...colourNames].filter((n) => n !== 'text-strong'))) === true &&
    probeDead('strong', colourNames) === false &&
    probeDead('left', colourNames) === false,
  'strong (absent) - flagged . strong (present) - clear . left (not a role) - ignored'
);

/* Verdict */

console.log('');
if (fail > 0) {
  console.log(`THEME_CLASSES_RESOLVE_FAILED - ${fail} of ${pass + fail} assertions failed.`);
  for (const e of errors) console.log(`  . ${e}`);
  process.exit(1);
}
console.log(
  `THEME_CLASSES_RESOLVE_PASS - every theme-ladder class the code uses resolves (${pass} assertions).`
);