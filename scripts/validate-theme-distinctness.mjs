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
    /**
     * §OPENSHIP BATCH 3 (2026-10-14) — REPOINTED, NOT WEAKENED.
     *
     * The canonical SOMEONE changed: the four non-bold themes now carry
     * OpenShip's own designs (docs/OPENSHIP_REFERENCE_SPEC.md §13), and
     * OpenShip has exactly ONE light design — so Mercenta's three light slots
     * deliberately share one page background (#F9F9F9). The old rule demanded
     * that EVERY pair differ in background AND accent, which makes that mapping
     * impossible and would have forced either a false failure or a silently
     * weakened gate.
     *
     * The INTENT is unchanged — a theme switch must change something a user can
     * MEASURE — so the rule now reads:
     *   · the ACCENT must differ by ≥ 30 for EVERY pair (unchanged, all pairs);
     *   · a SHARED page background is permitted ONLY when it is the declared
     *     OpenShip light page; any other identical background still fails;
     *   · the new §5 assertion bounds the sharing: at least three DISTINCT page
     *     backgrounds must exist across the five themes, so this cannot become a
     *     licence for collapsing the palettes together.
     */
    const pageA = String(readVar(a, '--mr-bg') ?? '').toLowerCase();
    const pageB = String(readVar(b, '--mr-bg') ?? '').toLowerCase();
    const OP_DECLARED_LIGHT_PAGE = '#f9f9f9';
    const shared = bgDist < 12;
    const declaredLightShare =
      shared && pageA === OP_DECLARED_LIGHT_PAGE && pageB === OP_DECLARED_LIGHT_PAGE;
    if (acDist < 30 || (shared && !declaredLightShare)) {
      tooSimilar.push(
        `${a} ↔ ${b}: bg Δ${bgDist} (a shared background must be the declared OpenShip light page ${OP_DECLARED_LIGHT_PAGE}), accent Δ${acDist} (need ≥30)`
      );
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

  /* ── 5. §OPENSHIP BATCH 3 — THE REFERENCE DESIGN IS ACTUALLY IN PLACE, AND ──
        `bold` IS ACTUALLY UNTOUCHED.

     Both assertions are REQUIRED by the Owner's BATCH 3 instruction
     ("implement OpenShip's actual colours … across the four non-Bold themes"
     and "Preserve the existing Bold theme exactly"). They are pinned HERE
     rather than described in a document, so a later session cannot drift from
     either one without this gate failing.

     The reference VALUES are owned by docs/OPENSHIP_REFERENCE_SPEC.md §2.3/§2.5;
     they are repeated as constants here the same way e2e/theme-visual.spec.ts
     repeats the accent values — and a change to the spec must change them here. */

  console.log('\n§ 5. The OpenShip reference design is in place, and `bold` is preserved\n');

  const OP = {
    lightPage: '#f9f9f9',
    lightCard: '#ffffff',
    lightBorder: '#e8e8e8',
    lightOverlay: 'rgba(0,0,0,0.45)',
    darkPage: '#000000',
    darkCardOnPage: '#0d0d0d',
    darkOverlay: 'rgb(20 20 20 / 60%)',
  };
  const LIGHT_SLOTS = ['minimal-light', 'professional', 'fun'];
  const eq = (v, want) => String(v ?? '').trim().toLowerCase() === want;

  const distinctPages = new Set(ids.map((id) => String(readVar(id, '--mr-bg') ?? '').toLowerCase()));
  test(
    `at least three DISTINCT page backgrounds exist across the ${ids.length} themes (measured ${distinctPages.size}: ${[...distinctPages].join(', ')})`,
    distinctPages.size >= 3,
    `only ${distinctPages.size} distinct page backgrounds — the themes have collapsed together`
  );

  for (const id of LIGHT_SLOTS) {
    test(
      `${id}: carries OpenShip's light page ${OP.lightPage} (spec §2.5)`,
      eq(readVar(id, '--mr-bg'), OP.lightPage),
      String(readVar(id, '--mr-bg'))
    );
    test(
      `${id}: carries OpenShip's light card ${OP.lightCard} and border ${OP.lightBorder}`,
      eq(readVar(id, '--mr-surface'), OP.lightCard) && eq(readVar(id, '--mr-hairline'), OP.lightBorder),
      `card ${readVar(id, '--mr-surface')}, border ${readVar(id, '--mr-hairline')}`
    );
    test(
      `${id}: carries OpenShip's light scrim ${OP.lightOverlay}`,
      eq(readVar(id, '--mr-overlay-tint'), OP.lightOverlay),
      String(readVar(id, '--mr-overlay-tint'))
    );
    test(
      `${id}: cards are SHADOWLESS like the reference (--mr-shadow-subtle is none)`,
      eq(readVar(id, '--mr-shadow-subtle'), 'none'),
      String(readVar(id, '--mr-shadow-subtle'))
    );
  }
  test(
    `serious: carries OpenShip's dark page ${OP.darkPage} with the composited card ${OP.darkCardOnPage}`,
    eq(readVar('serious', '--mr-bg'), OP.darkPage) && eq(readVar('serious', '--mr-surface'), OP.darkCardOnPage),
    `page ${readVar('serious', '--mr-bg')}, surface ${readVar('serious', '--mr-surface')}`
  );
  test(
    `serious: carries the reference's INVERTED scrim ${OP.darkOverlay} (on a black page a black scrim is invisible)`,
    eq(readVar('serious', '--mr-overlay-tint'), OP.darkOverlay),
    String(readVar('serious', '--mr-overlay-tint'))
  );
  test(
    'serious: cards are SHADOWLESS like the reference (--mr-shadow-subtle is none)',
    eq(readVar('serious', '--mr-shadow-subtle'), 'none'),
    String(readVar('serious', '--mr-shadow-subtle'))
  );

  /* `bold` is NOT one of the four: its measured values must be EXACTLY the ones
     it carried before BATCH 3, so "preserved exactly" is a fact, not a claim. */
  const BOLD_UNTOUCHED = {
    '--mr-bg': '#120b1f',
    '--mr-surface': '#121318',
    '--mr-accent': '#7c3aed',
    '--mr-on-accent': '#ffffff',
    '--mr-text-strong': '#f5f6f8',
    '--mr-shadow-subtle': '0 1px 3px rgba(0,0,0,0.4)',
    '--mr-shadow-raised': '0 6px 20px rgba(0,0,0,0.5)',
    '--mr-accent-300': '#a98bf5',
    '--mr-accent-600': '#6a2bd6',
    '--mr-accent-image': 'none',
    '--mr-accent-image-hover': 'none',
  };
  for (const [name, want] of Object.entries(BOLD_UNTOUCHED)) {
    test(`bold: ${name} is unchanged (${want})`, eq(readVar('bold', name), want), String(readVar('bold', name)));
  }

  /* The CTA gradient must be REAL for the four non-bold themes and ABSENT for
     `bold` (`none`), so its primary button keeps both its flat accent and its
     own hover colour. Both tokens are complete `background-image` values, so
     the hover state is carried inside the same property the rest state uses —
     an image layer paints over the flat colour, which is exactly why the hover
     cannot be left to `hover:bg-brass-600` alone on those four themes. */
  for (const id of ids) {
    const image = String(readVar(id, '--mr-accent-image') ?? '');
    const hover = String(readVar(id, '--mr-accent-image-hover') ?? '');
    if (id === 'bold') {
      test(
        'bold: the CTA gradient is ABSENT (both tokens are none), so its primary button is untouched',
        eq(image, 'none') && eq(hover, 'none'),
        `${image} / ${hover}`
      );
    } else {
      const isGradient = (v) => v.includes('linear-gradient(') && v.includes('radial-gradient(');
      test(
        `${id}: the CTA carries a REAL gradient (highlight + gradient, spec §2.6)`,
        isGradient(image),
        image.slice(0, 90)
      );
      test(
        `${id}: the CTA has its OWN hover state (the gradient must not swallow the hover)`,
        isGradient(hover) && hover !== image,
        hover.slice(0, 90)
      );
    }
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

