/**
 * §UI/UX Wave 1 — GENERATES src/theme-alpha-shims.css.
 *
 * Tailwind 3.4 cannot compute the `/opacity` modifier for colours that are
 * CSS variables (it silently drops `bg-ink-900/50`, `bg-brass-500/15`,
 * `bg-state-danger/10`, …). Rather than rewriting ~215 call sites, this
 * generator emits explicit shim rules using `color-mix(in srgb, <var>, <alpha>, transparent)`
 * for the variable-based palette classes that appear in src. Regenerate
 * whenever a new alpha class enters the tree: `node scripts/gen-theme-alpha-shims.mjs`.
 * The emitted file is committed (single source stays in the table below).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'src', 'theme-alpha-shims.css');
const SRC = path.join(ROOT, 'src');

/**
 * class-prefix (component + tone) → CSS variable. The alpha values shipped
 * are enumerated directly from the tree (do not invent new ones).
 */
const TARGETS = [
  // brass / accent tints
  { prefix: 'bg-brass-500/', var: 'var(--mr-accent)' },
  { prefix: 'bg-brass/', var: 'var(--mr-accent)' },
  { prefix: 'border-brass-500/', var: 'var(--mr-accent)' },
  { prefix: 'border-brass/', var: 'var(--mr-accent)' },
  { prefix: 'bg-brass-300/', var: 'var(--mr-accent-300)' },
  { prefix: 'border-brass-300/', var: 'var(--mr-accent-300)' },
  { prefix: 'bg-brass-600/', var: 'var(--mr-accent-600)' },
  { prefix: 'border-brass-600/', var: 'var(--mr-accent-600)' },
  { prefix: 'bg-brass-700/', var: 'var(--mr-accent-700)' },
  { prefix: 'border-brass-700/', var: 'var(--mr-accent-700)' },
  { prefix: 'text-brass-200/', var: 'var(--mr-accent-300)' },
  { prefix: 'text-brass-300/', var: 'var(--mr-accent-300)' },
  { prefix: 'text-brass-400/', var: 'var(--mr-accent-400)' },
  // §BATCH 5 (2026-11-21) — the CANONICAL accent name, an exact mirror of `brass`
  // above (same tokens), so a `brass` → `accent` rename moves no pixel.
  { prefix: 'bg-accent-500/', var: 'var(--mr-accent)' },
  { prefix: 'bg-accent/', var: 'var(--mr-accent)' },
  { prefix: 'border-accent-500/', var: 'var(--mr-accent)' },
  { prefix: 'border-accent/', var: 'var(--mr-accent)' },
  { prefix: 'bg-accent-300/', var: 'var(--mr-accent-300)' },
  { prefix: 'border-accent-300/', var: 'var(--mr-accent-300)' },
  { prefix: 'bg-accent-600/', var: 'var(--mr-accent-600)' },
  { prefix: 'border-accent-600/', var: 'var(--mr-accent-600)' },
  { prefix: 'bg-accent-700/', var: 'var(--mr-accent-700)' },
  { prefix: 'border-accent-700/', var: 'var(--mr-accent-700)' },
  { prefix: 'text-accent-300/', var: 'var(--mr-accent-300)' },
  { prefix: 'text-accent-400/', var: 'var(--mr-accent-400)' },
  // semantic state soft tones
  { prefix: 'bg-state-success/', var: 'var(--mr-state-success)' },
  { prefix: 'border-state-success/', var: 'var(--mr-state-success)' },
  { prefix: 'bg-state-warning/', var: 'var(--mr-state-warning)' },
  { prefix: 'border-state-warning/', var: 'var(--mr-state-warning)' },
  { prefix: 'bg-state-info/', var: 'var(--mr-state-info)' },
  { prefix: 'border-state-info/', var: 'var(--mr-state-info)' },
  { prefix: 'bg-state-danger/', var: 'var(--mr-state-critical)' },
  { prefix: 'border-state-danger/', var: 'var(--mr-state-critical)' },
  { prefix: 'bg-state-muted/', var: 'var(--mr-state-muted)' },
  { prefix: 'border-state-muted/', var: 'var(--mr-state-muted)' },
  // §UI/UX Wave 2 — saturated feature palette (tints + hairline borders)
  { prefix: 'bg-palette-indigo/', var: 'var(--mr-palette-indigo)' },
  { prefix: 'border-palette-indigo/', var: 'var(--mr-palette-indigo)' },
  { prefix: 'bg-palette-cyan/', var: 'var(--mr-palette-cyan)' },
  { prefix: 'border-palette-cyan/', var: 'var(--mr-palette-cyan)' },
  { prefix: 'bg-palette-green/', var: 'var(--mr-palette-green)' },
  { prefix: 'border-palette-green/', var: 'var(--mr-palette-green)' },
  { prefix: 'bg-palette-amber/', var: 'var(--mr-palette-amber)' },
  { prefix: 'border-palette-amber/', var: 'var(--mr-palette-amber)' },
  { prefix: 'bg-palette-orange/', var: 'var(--mr-palette-orange)' },
  { prefix: 'border-palette-orange/', var: 'var(--mr-palette-orange)' },
  { prefix: 'bg-palette-pink/', var: 'var(--mr-palette-pink)' },
  { prefix: 'border-palette-pink/', var: 'var(--mr-palette-pink)' },
  { prefix: 'bg-palette-violet/', var: 'var(--mr-palette-violet)' },
  { prefix: 'border-palette-violet/', var: 'var(--mr-palette-violet)' },
  { prefix: 'bg-palette-red/', var: 'var(--mr-palette-red)' },
  { prefix: 'border-palette-red/', var: 'var(--mr-palette-red)' },
  // §UI/UX Wave 2 — feature identity colours used as tints
  { prefix: 'bg-feature-intel/', var: 'var(--mr-feature-intel)' },
  { prefix: 'border-feature-intel/', var: 'var(--mr-feature-intel)' },
  { prefix: 'bg-feature-orders/', var: 'var(--mr-feature-orders)' },
  { prefix: 'border-feature-orders/', var: 'var(--mr-feature-orders)' },
  // ink overlays
  { prefix: 'bg-ink/', var: 'var(--mr-surface)' },
  { prefix: 'bg-ink-900/', var: 'var(--mr-surface)' },
  { prefix: 'bg-ink-850/', var: 'var(--mr-surface-raised)' },
  { prefix: 'bg-ink-800/', var: 'var(--mr-surface-overlay)' },
  { prefix: 'bg-ink-700/', var: 'var(--mr-surface-hover)' },
  { prefix: 'bg-ink-2/', var: 'var(--mr-surface-raised)' },
];

/**
 * COLOUR KEY → CSS VARIABLE. This is the resolver that lets the generator map a
 * class name to its canonical token WITHOUT a hand-written list per class. The
 * LEGACY HUE FAMILIES map to the same tokens their Tailwind scales map to in
 * tailwind.config.js, so a shim and a scale can never disagree.
 */
const VAR_BY_KEY = {
  // brand accent (brass = the historical accent name)
  brass: 'var(--mr-accent)',
  'brass-500': 'var(--mr-accent)',
  'brass-300': 'var(--mr-accent-300)',
  'brass-400': 'var(--mr-accent-400)',
  'brass-600': 'var(--mr-accent-600)',
  'brass-700': 'var(--mr-accent-700)',
  accent: 'var(--mr-accent)',
  // semantic states
  'state-success': 'var(--mr-state-success)',
  'state-warning': 'var(--mr-state-warning)',
  'state-info': 'var(--mr-state-info)',
  'state-danger': 'var(--mr-state-critical)',
  'state-critical': 'var(--mr-state-critical)',
  'state-muted': 'var(--mr-state-muted)',
  // saturated feature palette
  'palette-indigo': 'var(--mr-palette-indigo)',
  'palette-cyan': 'var(--mr-palette-cyan)',
  'palette-green': 'var(--mr-palette-green)',
  'palette-amber': 'var(--mr-palette-amber)',
  'palette-orange': 'var(--mr-palette-orange)',
  'palette-pink': 'var(--mr-palette-pink)',
  'palette-violet': 'var(--mr-palette-violet)',
  'palette-red': 'var(--mr-palette-red)',
  // per-domain identity colours
  'feature-intel': 'var(--mr-feature-intel)',
  'feature-orders': 'var(--mr-feature-orders)',
  'feature-finance': 'var(--mr-feature-finance)',
  'feature-compliance': 'var(--mr-feature-compliance)',
  'feature-ops': 'var(--mr-feature-ops)',
  // ink surfaces
  ink: 'var(--mr-surface)',
  'ink-900': 'var(--mr-surface)',
  'ink-850': 'var(--mr-surface-raised)',
  'ink-800': 'var(--mr-surface-overlay)',
  'ink-700': 'var(--mr-surface-hover)',
  /**
   * §BATCH 5 (2026-11-21) — THE CANONICAL SURFACE LADDER.
   *
   * The migration renames `bg-ink-850` → `bg-surface-raised` and so on, because
   * the token has always been `--mr-surface*`. The resolver must therefore know
   * those names: without them an ALPHA utility such as `bg-surface-overlay/70`
   * resolves to nothing and the shim is never emitted, so the class would go
   * dark. This generator REFUSES to allow that (it fails on an unresolved key),
   * which is how the omission was caught rather than shipped.
   */
  surface: 'var(--mr-surface)',
  'surface-raised': 'var(--mr-surface-raised)',
  'surface-overlay': 'var(--mr-surface-overlay)',
  'surface-hover': 'var(--mr-surface-hover)',
  'surface-tint': 'var(--mr-surface-tint)',
  // zinc neutrals — mirrors the zinc scale in tailwind.config.js exactly
  'zinc-100': 'var(--mr-text-200)',
  'zinc-200': 'var(--mr-text-200)',
  'zinc-300': 'var(--mr-text-active)',
  'zinc-400': 'var(--mr-text-muted)',
  'zinc-500': 'var(--mr-text-muted)',
  'zinc-600': 'var(--mr-text-faint)',
  'zinc-700': 'var(--mr-hairline)',
  'zinc-800': 'var(--mr-surface-overlay)',
  'zinc-900': 'var(--mr-surface-raised)',
  // shadcn-style semantic keys — mirrors tailwind.config.js
  brand: 'var(--mr-accent)',
  popover: 'var(--mr-surface-overlay)',
  card: 'var(--mr-surface-raised)',
  border: 'var(--mr-hairline)',
  background: 'var(--mr-bg)',
  foreground: 'var(--mr-text-strong)',
  muted: 'var(--mr-text-muted)',
  canvas: 'var(--mr-bg)',
  stamp: 'var(--mr-state-critical)',
  // LEGACY HUE FAMILIES — same tokens as the Tailwind scales in tailwind.config.js
  emerald: 'var(--mr-state-success)',
  green: 'var(--mr-state-success)',
  teal: 'var(--mr-state-success)',
  lime: 'var(--mr-state-success)',
  blue: 'var(--mr-state-info)',
  sky: 'var(--mr-state-info)',
  cyan: 'var(--mr-state-info)',
  indigo: 'var(--mr-state-info)',
  red: 'var(--mr-state-critical)',
  rose: 'var(--mr-state-critical)',
  amber: 'var(--mr-accent)',
  yellow: 'var(--mr-accent)',
  orange: 'var(--mr-accent)',
  purple: 'var(--mr-state-muted)',
  violet: 'var(--mr-state-muted)',
  fuchsia: 'var(--mr-state-muted)',
  pink: 'var(--mr-state-muted)',
};

/** Literal colours Tailwind already compiles — these need no shim. */
const LITERAL_KEYS = new Set(['white', 'black', 'transparent', 'current', 'inherit']);

/** Utility prefix → the CSS property Tailwind's own rule would set. */
const PROPERTY_BY_PREFIX = {
  bg: 'background-color',
  border: 'border-color',
  text: 'color',
  ring: '--tw-ring-color',
  divide: 'border-color',
  fill: 'fill',
  stroke: 'stroke',
  outline: 'outline-color',
  decoration: 'text-decoration-color',
  accent: 'accent-color',
  caret: 'caret-color',
};

/**
 * Resolve a colour key to its theme variable. Exact keys win; otherwise the
 * trailing numeric step is stripped (`emerald-500` → `emerald`, `ink-800` →
 * `ink`). Returns null for a literal colour and throws for an unknown key, so a
 * new utility can never go dark without the run failing.
 */
function resolveVar(key) {
  if (LITERAL_KEYS.has(key)) return null;
  if (VAR_BY_KEY[key]) return VAR_BY_KEY[key];
  const stripped = key.replace(/-\d{2,3}$/, '');
  if (VAR_BY_KEY[stripped]) return VAR_BY_KEY[stripped];
  return undefined;
}

/** Walk src/ and collect every `/alpha` utility whose colour is a theme token. */
function discoverUtilities() {
  const found = new Map();
  const unresolved = new Set();
  const pattern =
    /\b(bg|border|text|ring|divide|fill|stroke|outline|decoration|accent|caret)-([a-z][a-z0-9-]*?)\/(\d{1,3})\b/g;

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        const source = fs.readFileSync(full, 'utf8');
        for (const match of source.matchAll(pattern)) {
          const [, prefix, key, alpha] = match;
          const prop = PROPERTY_BY_PREFIX[prefix];
          if (!prop) continue;
          const variable = resolveVar(key);
          if (variable === null) continue;
          if (variable === undefined) {
            unresolved.add(`${prefix}-${key}/${alpha}`);
            continue;
          }
          found.set(`${prefix}-${key}/${alpha}`, { prop, variable, alpha: Number(alpha) });
        }
      }
    }
  };
  walk(SRC);
  return { found, unresolved };
}

/** Alpha values shipped for the legacy table (kept for its non-obvious overrides). */
const ALPHAS = [5, 10, 12, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 95];

/** Escape a Tailwind class-name fragment for use inside a selector. */
function escapeClass(s) {
  return s.replace(/[/\\[\].:]/g, (c) => `\\${c}`);
}

/** Emit one shim rule for a resolved utility. */
function emit(prop, selector, variable, alpha) {
  const decl =
    alpha >= 100 ? variable : `color-mix(in srgb, ${variable} ${alpha}%, transparent)`;
  return `.${selector}{${prop}:${decl}}`;
}

const { found, unresolved } = discoverUtilities();

/* A check that finds nothing must FAIL LOUDLY, never pass quietly. */
if (unresolved.size > 0) {
  console.error(`FAILED: ${unresolved.size} alpha utility(ies) use a colour key with no theme token:`);
  for (const key of [...unresolved].sort()) console.error(`  ${key}`);
  console.error('Add the key to VAR_BY_KEY, or to LITERAL_KEYS if it is a literal colour.');
  process.exit(1);
}
if (found.size === 0) {
  console.error('FAILED: no alpha utilities discovered in src/ — the scan found nothing, which means the lookup is broken, not that the tree is clean.');
  process.exit(1);
}

const rules = new Map();

/* 1. Every discovered utility FIRST — complete by construction, so a new hue
      family can never go dark without failing this run. */
for (const [name, { prop, variable, alpha }] of found) {
  rules.set(name, emit(prop, escapeClass(name), variable, alpha));
}

/* 2. The legacy table LAST, so its non-obvious overrides win over the generic
      resolver — e.g. `bg-ink-800/70` must paint `--mr-surface-overlay`, not the
      `--mr-surface` the step-stripped `ink` key would give it. */
for (const { prefix, var: v } of TARGETS) {
  const prop = prefix.startsWith('bg')
    ? 'background-color'
    : prefix.startsWith('border')
      ? 'border-color'
      : 'color';
  for (const a of ALPHAS) {
    rules.set(prefix + a, emit(prop, escapeClass(prefix + a), v, a));
  }
}

const lines = [
  '/**',
  ' * AUTO-GENERATED by scripts/gen-theme-alpha-shims.mjs — DO NOT EDIT BY HAND.',
  ' * Recreates `/opacity` utilities for CSS-variable palette colours that',
  ' * Tailwind 3.4 drops at build time. Semantics match the canonical tokens.',
  ' */',
  ...[...rules.values()],
];
fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`wrote ${OUT} (${rules.size} rules; ${found.size} discovered utilities)`);