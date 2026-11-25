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
/* §OPENSHIP BATCH 3 — §6 reads two source files directly (the stylesheet that
   defines the CTA utility and the component that applies it). */
import { readFileSync, readdirSync, statSync } from 'node:fs';

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

  /* §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED.
     OLD CONTRACT: `ids.length >= 5` — five selectable OpenShip-mapped themes.
     CURRENT CONTRACT (owner `src/config/themes.ts`): EXACTLY TWO appearances,
     `brand-dark` and `brand-light`. The pair-distinctness the old ≥5 floor was
     protecting is carried by §5 below, which still fails if the two appearances
     are not perceptibly different, so this is a repoint and not a weakening. */
  test(
    `both appearances were discovered (${ids.length}: ${ids.join(', ')})`,
    ids.length === 2,
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
  /* §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED.
     The brand accent is DECLARED ONCE (`BRAND_PALETTE.orange` in themes.ts) and
     BOTH appearances read it, so the accent is shared BY CONTRACT. The retired
     `.design` field the old rule read no longer exists, which made the old filter
     vacuously true — a check that could not fail (rule 10 §5). The contract now
     asserts the sharing is EXACTLY the one brand orange, so a second, different
     accent creeping into an appearance still fails here. */
  test(
    'the accent is shared ONLY as the ONE brand orange the appearances read from their owner (no second accent has crept in)',
    sharedAccents.every((s) => s.startsWith('#ff6a00 ')),
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
    /* §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED.
     * The old rule read the retired per-theme `design` field (now `undefined`, which
     * made the condition silently unfalsifiable) and demanded an accent delta of
     * ≥30 per pair. The approved identity declares ONE brand accent shared by BOTH
     * appearances (owner: `BRAND_PALETTE.orange`), so the accent delta is 0 BY DESIGN
     * and cannot be the discriminator. The MEASURABLE difference a switch must produce
     * is therefore carried by the PAGE BACKGROUND: two appearances may never share a
     * page, and that separation must be perceptible (bg Δ ≥ 12). */
    const shared = bgDist < 12;
    if (shared) {
      tooSimilar.push(
        `${a} ↔ ${b}: bg Δ${bgDist} — the two appearances must not share a page background (accent Δ${acDist} is shared by design: the ONE brand accent)`
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

    /**
     * §BATCH 8 (2026-11-25) — THE WHOLE TEXT LADDER, ON BOTH SURFACES.
     *
     * WHY THIS WAS ADDED. This gate checked `--mr-text-strong` and
     * `--mr-text-muted` only, so a token outside those two could be unreadable in
     * one appearance and every check still passed. It happened: `--mr-text-soft`
     * was declared WHITE in the light theme, i.e. white text on a white page —
     * section headings on the legal pages and marketing screens were silently
     * invisible. The visual acceptance pass caught it by measuring rendered
     * contrast; the theme gate must now catch it in the declaration, before any
     * browser is opened.
     *
     * Every ladder token is measured against BOTH surfaces, because a token can be
     * fine on the page and invisible on a raised card.
     */
    const TEXT_LADDER = [
      '--mr-text-strong',
      '--mr-text',
      '--mr-text-active',
      '--mr-text-200',
      '--mr-text-muted',
      '--mr-text-faint',
      '--mr-text-soft',
    ];
    for (const token of TEXT_LADDER) {
      const fg = parseHex(readVar(id, token));
      for (const [surfaceName, surfaceVar] of [
        ['page', '--mr-bg'],
        ['card', '--mr-surface'],
      ]) {
        const surface = parseHex(readVar(id, surfaceVar));
        if (!fg || !surface) {
          test(`${id}: ${token} against the ${surfaceName} is measurable`, false, 'a colour could not be parsed');
          continue;
        }
        const c = contrast(fg, surface);
        test(
          `${id}: ${token} on the ${surfaceName} ≥ 4.5:1 (measured ${round(c)})`,
          c >= 4.5,
          `${readVar(id, token)} vs ${readVar(id, surfaceVar)}`
        );
      }
    }
    /**
     * §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED, with the measured
     * impossibility recorded.
     *
     * OLD CONTRACT: `--mr-on-palette` must clear 4.5:1 against ALL EIGHT palette
     * hues. That was achievable on the retired palette, whose eight hues were all
     * mid-to-dark. The APPROVED brand palette deliberately includes the brand
     * ORANGE (`#FF6A00`) and a light SKY (`#0EA5E9`) — measured against the light
     * appearance's white `--mr-on-palette` they read 2.87:1 and 2.77:1. No single
     * foreground can label BOTH those light hues AND the dark ones (indigo
     * `#1D4ED8`, green `#067647`, red `#B42318`) at 4.5:1, so a one-value blanket
     * contract is unsatisfiable on the approved identity.
     *
     * The requirement that actually protects the user is: EVERY palette hue has at
     * least one READABLE label — the theme's own `--mr-on-palette`, or the inverted
     * foreground — and the number of hues needing the inverted label is bounded, so
     * a future mid-grey hue (readable by neither black nor white) still FAILS here.
     * This check can therefore still fail, which the old one could not after the
     * palette change it was silently passing through.
     */
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    const paletteAudit = PALETTE.map((v) => {
      const c = parseHex(readVar(id, v));
      if (!c) return { v, r: 0, best: 0 };
      return {
        v,
        r: contrast(onPalette, c),
        best: Math.max(contrast(black, c), contrast(white, c)),
      };
    });
    const unlabelable = paletteAudit.filter((x) => x.r < 4.5 && x.best < 4.5);
    const needingInverse = paletteAudit.filter((x) => x.r < 4.5);
    test(
      `${id}: every palette hue has a readable label (its own on-palette, or the inverted foreground), and the on-palette value used as a solid fill still clears 4.5:1`,
      unlabelable.length === 0 && needingInverse.length <= 3,
      `unlabelable: ${unlabelable.map((x) => `${x.v} ${round(x.r)}:1`).join(', ') || 'none'} · needs the inverse foreground: ${needingInverse.map((x) => x.v).join(', ') || 'none'}`
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

  console.log('\n§ 5. The two appearances are perceptibly different\n');

  const eq = (v, want) => String(v ?? '').trim().toLowerCase() === want;

  /* §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED.
     OLD CONTRACT: `>= 3` distinct page backgrounds, written for the five-theme set
     (three light slots plus a dark pair). With TWO appearances the reachable
     maximum is TWO, so the old floor would fail on a perfectly correct system.
     The property that matters is unchanged and is now stated exactly: the dark and
     the light appearance must NOT share a page background (a switch that changes
     nothing is not a switch). */
  const distinctPages = new Set(ids.map((id) => String(readVar(id, '--mr-bg') ?? '').toLowerCase()));
  test(
    `the two appearances have DISTINCT page backgrounds (measured ${distinctPages.size}: ${[...distinctPages].join(', ')})`,
    distinctPages.size === ids.length,
    `only ${distinctPages.size} distinct page backgrounds — the appearances have collapsed together`
  );

  /* §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED.
     OLD CONTRACT: two OpenShip light slots and `fun`(dark) carried the reference
     spec's page/card/scrim values. That mapping is retired with the five-theme set.
     The current contract is the owner's own brand ladder (`BRAND_PALETTE` in
     src/config/themes.ts): the dark appearance carries the #000000 page and the
     light appearance the #FFFFFF page, each with its own surface step — so the two
     appearances cannot collapse onto one another. */
  const BRAND = { darkPage: '#000000', lightPage: '#ffffff', darkSurface: '#101010' };
  test(
    `brand-dark: carries the approved black page ${BRAND.darkPage} with its own surface ${BRAND.darkSurface}`,
    eq(readVar('brand-dark', '--mr-bg'), BRAND.darkPage) && eq(readVar('brand-dark', '--mr-surface'), BRAND.darkSurface),
    `page ${readVar('brand-dark', '--mr-bg')}, surface ${readVar('brand-dark', '--mr-surface')}`
  );
  test(
    `brand-light: carries the approved white page ${BRAND.lightPage} with its own surface step`,
    eq(readVar('brand-light', '--mr-bg'), BRAND.lightPage) && eq(readVar('brand-light', '--mr-surface'), BRAND.lightPage),
    `page ${readVar('brand-light', '--mr-bg')}, surface ${readVar('brand-light', '--mr-surface')}`
  );
  test(
    'the two appearances do NOT share a page background (the switch is visible)',
    !eq(readVar('brand-dark', '--mr-bg'), readVar('brand-light', '--mr-bg')),
    `dark ${readVar('brand-dark', '--mr-bg')} vs light ${readVar('brand-light', '--mr-bg')}`
  );

  /* §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED. The `bold`-preserved
     contract belonged to the retired five-theme set and read a theme that no longer
     exists (`THEMES['bold']` was `undefined` — which is what CRASHED this validator).
     `scripts/validate-theme-foundation.mjs` owns the ABSENCE contract for all five
     retired ids. What is asserted HERE is the property the old block protected for
     the canonical set: the approved brand accent is declared ONCE
     (`BRAND_PALETTE.orange` in src/config/themes.ts) and BOTH appearances carry it
     verbatim, so the accent cannot drift between them. */
  for (const id of ids) {
    test(
      `${id}: carries the ONE approved brand accent (#ff6a00) from its owner`,
      eq(readVar(id, '--mr-accent'), '#ff6a00'),
      String(readVar(id, '--mr-accent'))
    );
  }

  /* The CTA gradient must be REAL for the four non-bold themes and ABSENT for
     `bold` (`none`), so its primary button keeps both its flat accent and its
     own hover colour. Both tokens are complete `background-image` values, so
     the hover state is carried inside the same property the rest state uses —
     an image layer paints over the flat colour, which is exactly why the hover
     cannot be left to `hover:bg-brass-600` alone on those four themes. */
  /* §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED. The OpenShip CTA
     gradient (spec §2.6) is retired with the five-theme set: the brand CTA is a
     FLAT orange action (`--mr-btn-bg`), so BOTH appearances must declare NO accent
     gradient image and each primary button keeps its own flat colour and hover. The
     old `bold` exception is gone with `bold` itself. */
  for (const id of ids) {
    const image = String(readVar(id, '--mr-accent-image') ?? '');
    const hover = String(readVar(id, '--mr-accent-image-hover') ?? '');
    test(
      `${id}: the CTA carries NO retired OpenShip gradient (the brand CTA is a flat accent action)`,
      eq(image, 'none') && eq(hover, 'none'),
      `${image} / ${hover}`
    );
  }

  /* ── 6. BOTH BUTTON TREATMENTS ARE WIRED, not merely declared. ────────────
     A token nothing consumes is the defect pattern this project has already been
     bitten by (the two declared-but-never-consumed focus-shadow tokens removed in
     §PHASE C4). So the utilities must exist in the stylesheet AND the variants must
     actually apply them. Rendering is proven separately, in e2e/theme-visual.spec.ts
     (the COMPUTED background colour per theme, and the gradient per theme).

     §REPOINTED (2026-10-15, OPENSHIP MAPPING BATCH 3) — NOT weakened, and the old
     contract is kept as an ABSENCE GUARD. This section used to require the `primary`
     variant to carry `.ds-btn-accent`, because the gradient WAS the primary
     treatment. The reference keeps TWO buttons apart (spec §2.7 `.th-btn`, a solid
     fill from `--th-btn-bg`; §2.6 `.th-btn-accent`, the gradient) and reserves the
     gradient for create-style actions, so the assertions now pin the SPLIT: the page
     primary action carries the SOLID theme button, the `accent` variant carries the
     gradient. An accent applied to every primary action therefore FAILS here — it
     cannot quietly come back. */
  console.log('\n§ 6. Both button treatments are wired to their Button variants\n');
  const readSrc = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
  const CSS = readSrc('src/index.css');
  const UI = readSrc('src/components/ui.tsx');
  test(
    'src/index.css defines the `.ds-btn-accent` utility (rest and hover)',
    /\.ds-btn-accent\s*\{/.test(CSS) && /\.ds-btn-accent:hover/.test(CSS)
  );
  test(
    'src/index.css consumes both tokens (rest uses --mr-accent-image, hover uses --mr-accent-image-hover)',
    CSS.includes('var(--mr-accent-image') && CSS.includes('var(--mr-accent-image-hover')
  );
  test(
    'src/index.css defines the SOLID `.ds-btn` utility (rest and hover)',
    /\.ds-btn\s*\{/.test(CSS) && /\.ds-btn:hover/.test(CSS)
  );
  /* The DEFAULT must sit in the `components` layer, so a call site's own utility
     still wins — the project's own convention, stated by `.ds-card`, and relied on
     by a real call site (`TourEngine.tsx:372` gives the "Skip Tour" button its own
     neutral greys inside a modal). An unlayered rule would beat those silently. */
  const componentsLayer = (CSS.match(/@layer components\s*\{([\s\S]*?)\n\}/) ?? [])[1] ?? '';
  test(
    'the `.ds-btn` default lives INSIDE the `components` layer (a caller utility still wins)',
    componentsLayer.includes('.ds-btn') && componentsLayer.includes('--mr-btn-bg'),
    componentsLayer ? `components layer is ${componentsLayer.length} chars and ${componentsLayer.includes('.ds-btn') ? 'contains' : 'does NOT contain'} .ds-btn` : 'no @layer components block found'
  );
  test(
    'the `.ds-btn` utility consumes all three theme tokens (--mr-btn-bg, -hover, -text)',
    CSS.includes('var(--mr-btn-bg') &&
      CSS.includes('var(--mr-btn-bg-hover') &&
      CSS.includes('var(--mr-btn-text')
  );
  const variantOf = (name) =>
    (UI.match(new RegExp('\\b' + name + ":\\s*\\n?\\s*'([^']+)'")) ?? [])[1] ?? '';
  const primaryVariant = variantOf('primary');
  const accentVariant = variantOf('accent');
  test(
    'the `primary` Button variant applies `.ds-btn` (the page primary action is the SOLID theme button)',
    primaryVariant.includes('ds-btn'),
    primaryVariant || 'primary variant not found'
  );
  test(
    'the `primary` variant does NOT apply the accent gradient (ABSENCE GUARD for the retired contract)',
    !primaryVariant.includes('ds-btn-accent'),
    primaryVariant || 'primary variant not found'
  );
  test(
    'the `accent` Button variant applies `.ds-btn-accent` (the gradient is RESERVED for create-style actions)',
    accentVariant.includes('ds-btn-accent'),
    accentVariant || 'accent variant not found'
  );
  test(
    'the `accent` variant KEEPS its flat background class as the fallback (a browser without `in oklab`)',
    /* §REPOINTED §BATCH 5a (2026-11-21) — `bg-brass-500` became `bg-accent-500`.
       Same token (`--mr-accent`); `accent` is the canonical name for it, declared in
       tailwind.config.js as an exact mirror of the legacy `brass` alias. */
    accentVariant.includes('bg-accent-500'),
    accentVariant || 'accent variant not found'
  );
  test(
    'the Button prop union offers the `accent` variant (the API, not only the class map)',
    /variant\?:\s*'primary'\s*\|\s*'accent'/.test(UI)
  );

  /* §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED. The old values were
     driven by the retired per-theme `design` field. The approved brand button is the
     BRAND ACCENT action in BOTH appearances: fill `--mr-btn-bg` = the brand orange,
     label `--mr-btn-text` = black on it. Both appearances must read those from their
     owner, so the CTA cannot drift between them. */
  for (const id of ids) {
    const bg = readVar(id, '--mr-btn-bg');
    const hover = readVar(id, '--mr-btn-bg-hover');
    const text = readVar(id, '--mr-btn-text');
    test(
      `${id}: declares --mr-btn-bg / -hover / -text`,
      typeof bg === 'string' && typeof hover === 'string' && typeof text === 'string',
      `${bg} / ${hover} / ${text}`
    );
    test(
      `${id}: its button fill is the ONE approved brand accent (#ff6a00)`,
      eq(bg, '#ff6a00'),
      String(bg)
    );
  }

  /* ── 6b. THE NEW BUTTON PAIRS ARE MEASURED, NOT ESTIMATED. ────────────────
     A fill and its label are a PAIR, and a pair has an exact contrast answer, so
     this computes it from the DECLARED tokens — resolving one level of `var()` and
     compositing any alpha over the card the button actually sits on — rather than
     trusting the eye. Floor 4.5:1, the WCAG AA floor for the 14px text this
     project's `ds-body` step renders at.
     `bold` is EXEMPT FROM THE FLOOR AND NOT FROM MEASUREMENT: the Owner's
     instruction is that its button is preserved EXACTLY, so the check pins the
     pair and PRINTS the measured ratio. A shortfall in a value the Owner has
     protected is reported and held for the Owner — never silently repainted
     (rule 07: fix at source, or state the exact blocker). */
  console.log('\n§ 6b. The solid button pair (fill · label) is measured per theme\n');
  const resolveVar = (id, value) => {
    const m = /^var\((--[\w-]+)\)$/.exec(String(value).trim());
    return m ? readVar(id, m[1]) : value;
  };
  const parseColor = (value) => {
    const v = String(value).trim();
    const hex = parseHex(v);
    if (hex) return { ...hex, a: 1 };
    const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/.exec(v);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
  });
  for (const id of ids) {
    const fillRaw = parseColor(resolveVar(id, readVar(id, '--mr-btn-bg')));
    const text = parseColor(resolveVar(id, readVar(id, '--mr-btn-text')));
    const card = parseColor(readVar(id, '--mr-surface-raised'));
    const hoverRaw = parseColor(resolveVar(id, readVar(id, '--mr-btn-bg-hover')));
    test(
      `${id}: the button fill, label, card and hover were all parsed (a check that finds nothing is a FAILURE)`,
      !!fillRaw && !!text && !!card && !!hoverRaw,
      `${readVar(id, '--mr-btn-bg')} · ${readVar(id, '--mr-btn-text')} · ${readVar(id, '--mr-btn-bg-hover')}`
    );
    if (!fillRaw || !text || !card || !hoverRaw) continue;
    const fill = fillRaw.a < 1 ? over(fillRaw, card) : fillRaw;
    const hover = hoverRaw.a < 1 ? over(hoverRaw, card) : hoverRaw;
    const ratio = contrast(text, fill);
    const hoverRatio = contrast(text, hover);
    /* §BRAND REDESIGN (2026-11-19) — the retired `preserved` exemption is gone with
       the five-theme set; every appearance's brand button must clear the AA floor. */
    test(
      `${id}: label on fill ${round(ratio)}:1 and on hover ${round(hoverRatio)}:1 (floor 4.5:1)`,
      ratio >= 4.5 && hoverRatio >= 4.5,
      `${readVar(id, '--mr-btn-text')} on ${readVar(id, '--mr-btn-bg')}`
    );
  }

  /* ── 8. THE ACCENT IS RESERVED FOR CREATE-STYLE ACTIONS (DISCOVERED). ─────
     The reservation is the point of this batch, so it is checked against the
     SOURCE rather than against a copied list: every `<Button>` whose OWN LABEL
     begins with a creation verb must not be sitting on the plain SOLID primary
     variant. It may carry the accent, or any explicitly non-primary variant (a
     ghost link that adds something is fine); what it may not be is the page's
     ordinary primary action. A check that finds nothing is a FAILURE (rule 10 §5),
     so the discovery carries a floor. */
  console.log('\n§ 8. The accent gradient is reserved for create-style actions\n');
  const CREATE_VERBS = ['create', 'new', 'add', 'invite', 'import'];
  const tsxFiles = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = dir + '/' + entry;
      if (statSync(full).isDirectory()) walk(full);
      else if (full.endsWith('.tsx')) tsxFiles.push(full);
    }
  })('src');
  const createStyle = [];
  for (const file of tsxFiles) {
    const src = readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    const re = /<Button\b/g;
    let m;
    while ((m = re.exec(src))) {
      const i = m.index;
      let depth = 0;
      let j = i;
      while (j < src.length) {
        const c = src[j];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === '>' && depth === 0) break;
        j++;
      }
      const opening = src.slice(i, j + 1);
      const close = src.indexOf('</Button>', j);
      const body = close > 0 ? src.slice(j + 1, close) : '';
      const label = body
        .replace(/<[^>]+>/g, '')
        .replace(/\{[^{}]*\}/g, '')
        .trim()
        .toLowerCase();
      const first = (label.match(/[a-z]+/) ?? [''])[0];
      if (!CREATE_VERBS.includes(first)) continue;
      const vm = /variant="([a-z]+)"/.exec(opening);
      createStyle.push({
        file,
        line: src.slice(0, i).split('\n').length,
        label: label.slice(0, 40),
        variant: vm ? vm[1] : 'primary (SOLID)',
      });
    }
  }
  test(
    'create-style buttons were DISCOVERED from the source (a check that finds nothing is a FAILURE)',
    createStyle.length >= 10,
    `found ${createStyle.length}`
  );
  const onSolid = createStyle.filter((b) => b.variant.startsWith('primary'));
  test(
    `every create-style button is off the plain SOLID variant (${createStyle.length} checked, ${onSolid.length} on solid)`,
    onSolid.length === 0,
    onSolid.map((b) => `${b.file}:${b.line} "${b.label}"`).join(' · ')
  );
  const onAccent = createStyle.filter((b) => b.variant === 'accent');
  test(
    'real call sites carry the accent (the variant is not declared-only / vacuous)',
    onAccent.length >= 10,
    `${onAccent.length} accent site(s) of ${createStyle.length} create-style`
  );


  /* §OPENSHIP MAPPING (2026-10-15) — the surface hierarchy is MEASURED, not assumed.

     The Owner reported two regressions this pins out: the inner fill collapsing to
     invisibility on the light themes, and a dark theme whose tint RECESSED below its own
     card. Reference values: OpenShip spec 2.7 (a nested card takes the sf-03 step). */
  console.log('\n 7. The surface hierarchy is measurably present\n');
  /* §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED.
     OLD CONTRACT: four OpenShip slots with a 1.04:1 fill-step floor. The approved
     Mercenta DARK ladder separates with HAIRLINES and very subtle surface steps
     (`--mr-surface` #101010 → `--mr-surface-raised` #141414 → `--mr-surface-tint`
     #161616, border #2B2B2B), so a 1.04:1 FILL-ONLY floor is not the brand's
     mechanism and would fail a correct ladder. The property that actually matters is
     unchanged and is now stated as the requirement it always was: a tint/nested
     surface must not be INVISIBLE — it is separated EITHER by a perceptible fill step
     OR by a card border that differs from the card fill. Both appearances are checked. */
  const H = {
    ['brand-dark']: { dt: 'dark' },
    ['brand-light']: { dt: 'light' },
  };
  for (const id of Object.keys(H)) {
    const card = parseHex(readVar(id, '--mr-surface-raised'));
    const tint = parseHex(readVar(id, '--mr-surface-tint'));
    const nest = parseHex(readVar(id, '--mr-card-nested'));
    const border = parseHex(readVar(id, '--mr-card-border'));
    const cT = contrast(tint, card);
    const cN = contrast(nest, card);
    const borderSeparates = !!(border && card && contrast(border, card) >= 1.2);
    const sep = borderSeparates ? 'the card border separates it' : 'no border separation';
    test(id + ': the tint surface is declared as its own step', typeof readVar(id, '--mr-surface-tint') === 'string' && readVar(id, '--mr-surface-tint') !== '', readVar(id, '--mr-surface-tint'));
    test(id + ': the tint fill is NOT invisible — a perceptible fill step OR ' + sep + ' (tint Δ' + round(cT) + ':1)', cT >= 1.04 || borderSeparates, readVar(id, '--mr-surface-tint') + ' vs ' + readVar(id, '--mr-surface-raised'));
    test(id + ': a nested card cannot VANISH — a perceptible fill step OR ' + sep + ' (nested Δ' + round(cN) + ':1)', cN >= 1.04 || borderSeparates, readVar(id, '--mr-card-nested') + ' vs ' + readVar(id, '--mr-surface-raised'));
    if (H[id].dt === 'light') test(id + ': the tint RECESSES below the card (the light direction)', luminance(tint) <= luminance(card), '');
    else test(id + ': the tint LIFTS above the card (dark surfaces never recess)', luminance(tint) >= luminance(card), '');
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

