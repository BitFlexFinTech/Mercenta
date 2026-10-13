/**
 * §PHASE C1 (2026-10-13) — THE FIVE THEMES MUST BE GENUINELY DISTINCT AND READABLE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The audit measured a real defect and this gate turns the measurement into a
 * permanent requirement. Before this phase the five declared themes were, in
 * practice, about TWO distinguishable looks:
 *
 *   · minimal-light  bg #F6F7F9  accent #C9A15A
 *   · professional   bg #EEF1F6  accent #C9A15A   ← SAME ACCENT
 *   · fun            bg #F7F5F2  accent #C9A15A   ← SAME ACCENT
 *   · bold           bg #0B0C0F  accent #D4B36A   ← near-identical to serious
 *   · serious        bg #0E0F11  accent #B89B5E   ← near-identical to bold
 *
 * Three themes shared one accent and two differed by ~1% in background, so a
 * user switching themes saw almost nothing change — which is exactly why "the
 * themes look broken" was a fair complaint.
 *
 * WHAT IT ASSERTS
 * ---------------
 * 1. NO TWO THEMES SHARE AN ACCENT — the specific defect above, forbidden.
 * 2. EVERY PAIR IS PERCEPTIBLY DIFFERENT — measured on background AND accent,
 *    using relative luminance (WCAG maths) so the test is arithmetic, not taste.
 * 3. EVERY THEME IS READABLE — body text, muted text and the on-accent text each
 *    clear their WCAG contrast floor, and so does `--mr-on-palette` against every
 *    one of the eight domain palette colours (the gated CTA contract).
 * 4. LIGHT STAYS LIGHT AND DARK STAYS DARK — mode and measured luminance agree,
 *    so a theme cannot claim `light` while painting a dark surface.
 *
 * The numbers are printed as a matrix, so a reviewer can see the measurement
 * rather than trust a verdict.
 */
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

let failures = 0;
let checks = 0;
const results = [];
const test = (name, ok, detail) => {
  checks++;
  results.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 600)}`);
  }
};

/* ── colour maths (WCAG 2.x) ────────────────────────────────────────────── */

function parseHex(hex) {
  const h = String(hex).trim().replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

/** WCAG relative luminance, 0 (black) … 1 (white). */
function luminance({ r, g, b }) {
  const chan = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b);
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Straight RGB distance — used only for "are these two colours different". */
function rgbDistance(a, b) {
  return Math.round(Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2));
}

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

const ROOT = new URL('../', import.meta.url);
const server = await createServer({
  root: fileURLToPath(ROOT),
  server: { middlewareMode: true },
  logLevel: 'error',
});

try {
  const { THEMES } = await server.ssrLoadModule('/src/config/themes.ts');
  const ids = Object.keys(THEMES);

  test(
    `all themes were discovered (${ids.length}: ${ids.join(', ')})`,
    ids.length >= 5,
    `found ${ids.length}`
  );

  /** Read one var per theme, and fail loudly if a required var is missing. */
  const readVar = (id, name) => {
    const raw = THEMES[id].vars[name];
    return typeof raw === 'string' ? raw : null;
  };
  const REQUIRED = [
    '--mr-bg',
    '--mr-surface',
    '--mr-text-strong',
    '--mr-text-muted',
    '--mr-accent',
    '--mr-on-accent',
    '--mr-on-palette',
  ];
  const PALETTE = [
    '--mr-palette-amber',
    '--mr-palette-cyan',
    '--mr-palette-green',
    '--mr-palette-indigo',
    '--mr-palette-orange',
    '--mr-palette-pink',
    '--mr-palette-red',
    '--mr-palette-violet',
  ];

  for (const id of ids) {
    const missing = [...REQUIRED, ...PALETTE].filter((v) => !readVar(id, v));
    test(`${id}: every required token is declared`, missing.length === 0, missing.join(', '));
  }

  /* ── 1. NO TWO THEMES MAY SHARE AN ACCENT (the specific defect) ──────── */
  const byAccent = new Map();
  for (const id of ids) {
    const accent = String(readVar(id, '--mr-accent') ?? '').toLowerCase();
    if (!accent) continue;
    byAccent.set(accent, [...(byAccent.get(accent) ?? []), id]);
  }
  const sharedAccents = [...byAccent.entries()]
    .filter(([, who]) => who.length > 1)
    .map(([accent, who]) => `${accent} shared by ${who.join(', ')}`);
  test(
    'NO two themes share an accent colour (three themes shared #C9A15A before this phase)',
    sharedAccents.length === 0,
    sharedAccents.join(' | ')
  );

  /* ── 2. EVERY PAIR MUST BE PERCEPTIBLY DIFFERENT ─────────────────────── */
  const pairs = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      pairs.push([ids[i], ids[j]]);
    }
  }
  const tooSimilar = [];
  const matrix = [];
  for (const [a, b] of pairs) {
    const bgA = parseHex(readVar(a, '--mr-bg'));
    const bgB = parseHex(readVar(b, '--mr-bg'));
    const acA = parseHex(readVar(a, '--mr-accent'));
    const acB = parseHex(readVar(b, '--mr-accent'));
    if (!bgA || !bgB || !acA || !acB) {
      tooSimilar.push(`${a} vs ${b}: unparseable colour`);
      continue;
    }
    const bgDist = rgbDistance(bgA, bgB);
    const acDist = rgbDistance(acA, acB);
    matrix.push(`${a} ↔ ${b}: bg Δ${bgDist} · accent Δ${acDist}`);
    /* Both dimensions must move: a different accent alone is not enough when
       the surface tone is identical, and vice versa. */
    if (bgDist < 12 || acDist < 30) {
      tooSimilar.push(`${a} ↔ ${b}: bg Δ${bgDist} (need ≥12), accent Δ${acDist} (need ≥30)`);
    }
  }
  test(
    `every theme PAIR is perceptibly different (${pairs.length} pairs measured)`,
    tooSimilar.length === 0,
    tooSimilar.join('\n      ')
  );
  console.log('      measured: ' + matrix.join('\n      '));

  /* ── 3. CONTRAST FLOORS ─────────────────────────────────────────────── */
  for (const id of ids) {
    const bg = parseHex(readVar(id, '--mr-bg'));
    const strong = parseHex(readVar(id, '--mr-text-strong'));
    const muted = parseHex(readVar(id, '--mr-text-muted'));
    const accent = parseHex(readVar(id, '--mr-accent'));
    const onAccent = parseHex(readVar(id, '--mr-on-accent'));
    const onPalette = parseHex(readVar(id, '--mr-on-palette'));
    if (!bg || !strong || !muted || !accent || !onAccent || !onPalette) {
      test(`${id}: contrast measurable`, false, 'a required colour could not be parsed');
      continue;
    }
    const cStrong = contrast(strong, bg);
    const cMuted = contrast(muted, bg);
    const cAccent = contrast(onAccent, accent);
    test(
      `${id}: primary text on background ≥ 7:1 (measured ${round(cStrong)})`,
      cStrong >= 7,
      `measured ${round(cStrong)}:1`
    );
    test(
      `${id}: muted text on background ≥ 4.5:1 (measured ${round(cMuted)})`,
      cMuted >= 4.5,
      `measured ${round(cMuted)}:1`
    );
    test(
      `${id}: on-accent text on the accent ≥ 4.5:1 (measured ${round(cAccent)})`,
      cAccent >= 4.5,
      `measured ${round(cAccent)}:1`
    );
    const badPalette = PALETTE.map((v) => {
      const c = parseHex(readVar(id, v));
      return c ? { v, r: contrast(onPalette, c) } : { v, r: 0 };
    }).filter((x) => x.r < 4.5);
    test(
      `${id}: on-palette text clears 4.5:1 against ALL 8 domain palette colours (the gated CTA contract)`,
      badPalette.length === 0,
      badPalette.map((x) => `${x.v} ${round(x.r)}:1`).join(', ')
    );
  }

  /* ── 4. THE DECLARED MODE MUST MATCH THE MEASURED LIGHTNESS ─────────── */
  for (const id of ids) {
    const bg = parseHex(readVar(id, '--mr-bg'));
    if (!bg) continue;
    const L = luminance(bg);
    const mode = THEMES[id].mode;
    const ok = mode === 'light' ? L >= 0.5 : L <= 0.2;
    test(
      `${id}: declared mode '${mode}' agrees with the measured surface lightness (L=${round(L, 3)})`,
      ok,
      `L=${round(L, 3)} is not a '${mode}' surface`
    );
  }

  console.log(
    failures === 0
      ? `THEME_DISTINCTNESS_PASS (${checks} checks)`
      : `THEME_DISTINCTNESS_FAIL (${failures} of ${checks} checks)`
  );
  if (failures > 0) process.exitCode = 1;
} finally {
  await server.close();
}

