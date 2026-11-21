/**
 * §OPENSHIP BATCH 4 — THE SHARED-SURFACE AND CONTROL GATE.
 *
 * WHY THIS EXISTS
 * ---------------
 * BATCH 3 pinned the CTA gradient in `validate-theme-distinctness.mjs` (§6) and in
 * `e2e/theme-visual.spec.ts`. BATCH 4 changes the four SHARED SURFACES — the card,
 * the input and its label, the modal scrim and the dropdown — and that contract had
 * no gate at all: reverting a card to `border-white/[0.06]`, putting the modal's
 * scrim back to `bg-black/70`, or dropping the nested-card rule would have been
 * invisible to every check in the corpus while the screens silently lost their
 * treatment (a nested card with no border and no recess VANISHES on the four
 * non-Bold themes).
 *
 * WHAT IT ASSERTS
 * ---------------
 *  1. The three role tokens exist in ALL FIVE themes, with the values the reference
 *     specifies for the four non-Bold themes and the values that REPRODUCE what
 *     `bold` renders today (so "Bold is preserved" is proven, not asserted).
 *  2. The nested-card rule is FUNCTIONAL: in the four non-Bold themes the nested
 *     fill differs from the card fill (otherwise the inner card disappears); in
 *     `bold` it is deliberately the SAME value (the rule is a no-op there).
 *  3. The primitives are WIRED: `Card` carries `.ds-card` and no longer its old
 *     hardcoded border; the modal scrim consumes the theme token and a real blur
 *     and no `bg-black/70` remains; the input/select carry the 44px control height
 *     and the three control labels share the reference's 14px step.
 *  4. The utilities the markup depends on REALLY EXIST in the generated stylesheet.
 *     Tailwind 3.4 SILENTLY DROPS the `/opacity` modifier on a CSS-variable colour,
 *     so `bg-ink-800/70` paints nothing unless `src/theme-alpha-shims.css` declares
 *     it — a silent no-op is exactly the defect class this check ends.
 *
 * Run: node scripts/validate-shared-surfaces.mjs   (`npm run validate:all` runs it)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let checks = 0;
let failures = 0;
function check(name, ok, detail = '') {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail) console.log(`      ${detail}`);
  }
}

const THEMES = read('src/config/themes.ts');
const UI = read('src/components/ui.tsx');
const CSS = read('src/index.css');
const TW = read('tailwind.config.js');
const SHIMS = read('src/theme-alpha-shims.css');
/**
 * An ABSENCE GUARD must assert against CODE, not prose: the primitives deliberately
 * RECORD the retired value in a `§… REPOINTED` comment (the project's convention for
 * preserving an old contract), so a raw-source search would forbid the record the
 * rules require. This strips comments only — nothing else.
 */
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const UI_CODE = code(UI);

/* ── 1. DISCOVER the five theme blocks from their own owner ───────────────── */

const IDS = ['brand-dark', 'brand-light'];
const blocks = {};
for (const id of IDS) {
  const start = THEMES.indexOf(`    id: '${id}',`);
  const after = THEMES.slice(start + 12);
  const next = after.indexOf("    id: '");
  const end = next === -1 ? THEMES.indexOf('};', start) : start + 12 + next;
  blocks[id] = start === -1 ? '' : THEMES.slice(start, end);
}
check(
  'the two appearance blocks were DISCOVERED from src/config/themes.ts (a check that finds nothing is a FAILURE)',
  Object.values(blocks).every((b) => b.length > 200),
  Object.entries(blocks).map(([id, b]) => `${id}:${b.length}`).join(' ')
);

/* §BRAND REDESIGN (2026-11-19) — the owner declares the brand colours ONCE
   (`BRAND_PALETTE`) and each appearance READS them, so a token value can be an
   identifier (`BRAND_PALETTE.darkBorder`) rather than a quoted literal. */
const BRAND_PALETTE = (() => {
  const from = THEMES.indexOf('export const BRAND_PALETTE');
  const to = THEMES.indexOf('} as const', from);
  const block = from === -1 || to === -1 ? '' : THEMES.slice(from, to);
  const out = {};
  for (const m of block.matchAll(/([A-Za-z]+):\s*'([^']*)'/g)) out[m[1]] = m[2];
  return out;
})();
check(
  'the brand palette was DISCOVERED from its owner (a check that finds nothing is a FAILURE)',
  Object.keys(BRAND_PALETTE).length >= 5,
  Object.keys(BRAND_PALETTE).join(', ')
);
const tokenValue = (id, token) => {
  const re = new RegExp("'" + token + "':\\s*(?:'([^']*)'|BRAND_PALETTE\\.(\\w+))");
  const m = blocks[id].match(re);
  if (!m) return null;
  return m[1] !== undefined ? m[1] : (BRAND_PALETTE[m[2]] ?? null);
};
const surfaceRaised = (id) => tokenValue(id, '--mr-surface-raised');

/* ── 2. The contract: reference values for the four non-Bold themes, `bold`
       unchanged by mechanism ─────────────────────────────────────────────── */

/* §OPENSHIP MAPPING (2026-10-15) — REPOINTED, NOT WEAKENED. The same four tokens, now
   resolved from each theme PLACE in the Owner mapping rather than from the old grouping of
   three light slots plus serious: minimal-light and serious implement OpenShip Light,
   professional implements DIM, fun implements DARK, and bold is preserved exactly. */
/* §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED. The old contract pinned
   the four retired OpenShip slots (three light + `bold`). The owner now declares TWO
   appearances, so the contract pins THOSE, read from `src/config/themes.ts`. */
const CONTRACT = {
  ['--mr-card-border']: (id) => (id === 'brand-dark' ? BRAND_PALETTE.darkBorder : BRAND_PALETTE.lightBorder),
  ['--mr-card-nested']: (id) => (id === 'brand-dark' ? '#161616' : BRAND_PALETTE.lightSurface),
  ['--mr-hover-tint']: (id) => (id === 'brand-dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
  ['--mr-card-border-hover']: (id) => (id === 'brand-dark' ? '#3D3D3D' : '#BFBFBF'),
};


for (const [token, expected] of Object.entries(CONTRACT)) {
  for (const id of IDS) {
    const want = expected(id);
    const got = tokenValue(id, token);
    check(`${id}: ${token} is ${want}`, got === want, `found ${got === null ? 'NOT DECLARED' : `'${got}'`}`);
  }
}

/* §BRAND REDESIGN — REPOINTED, NOT WEAKENED. The retired reference design made the
   card BORDERLESS; the approved brand ladder separates cards with its own hairline.
   The property that matters is unchanged: the card border is not a second colour — it
   IS the appearance's own `--mr-hairline`. */
for (const id of IDS) {
  check(
    `${id}: the card border IS the appearance's own hairline (one owned value, not a second colour)`,
    tokenValue(id, '--mr-card-border') !== null &&
      tokenValue(id, '--mr-card-border') === tokenValue(id, '--mr-hairline'),
    `border=${tokenValue(id, '--mr-card-border')} hairline=${tokenValue(id, '--mr-hairline')}`
  );
}

/* ── 3. The nested-card rule is FUNCTIONAL, not decorative ──────────────────
   With the outer border transparent, an inner card is the SAME fill as its outer
   card and disappears — which is exactly why the reference states the rule. So the
   assertion is not "a token exists": it is "the inner fill differs". */

for (const id of IDS) {
  const nested = tokenValue(id, '--mr-card-nested');
  const card = surfaceRaised(id);
  check(
    `${id}: a nested card cannot VANISH (its fill differs from the card fill)`,
    nested !== null && card !== null && nested.toUpperCase() !== card.toUpperCase(),
    `nested=${nested} card=${card}`
  );
}

/* ── 4. The primitives are WIRED to the tokens ───────────────────────────── */

check(
  'the `Card` primitive carries `.ds-card` (the token is applied by that class, not by a hardcoded colour)',
  /'ds-card bg-ink-850 border rounded-ds-lg shadow-ds-subtle'/.test(UI_CODE)
);
check(
  'ABSENCE GUARD — the `Card` primitive no longer carries the retired `border-white/[0.06]`',
  !/'bg-ink-850 border border-white\/\[0\.06\][^']*shadow-ds-subtle'/.test(UI_CODE)
);
check(
  'src/index.css declares `.ds-card` (border colour from the token)',
  /\.ds-card\s*\{\s*border-color:\s*var\(--mr-card-border\)/.test(CSS)
);
check(
  'src/index.css declares the NESTED rule against `--mr-card-nested`',
  /\.ds-card \.ds-card\s*\{\s*background-color:\s*var\(--mr-card-nested\)/.test(CSS)
);
check(
  '`.ds-card` sits in the `components` layer, so a caller-supplied border still wins (26 call sites supply one)',
  /@layer components\s*\{\s*\.ds-card/.test(CSS)
);
check(
  'the NESTED rule sits OUTSIDE the layers, so it beats the element\'s own `bg-ink-*` utility',
  /@layer components\s*\{[^}]*\}[^@]*\.ds-card \.ds-card/.test(CSS)
);

/* The modal scrim: the theme token + a real blur, with the retired hardcode gone. */
check(
  'the modal scrim consumes the theme\'s own scrim token (the reference\'s mechanism, spec §7.5)',
  UI_CODE.includes("background: 'var(--mr-overlay-tint)'")
);
check(
  'the modal scrim carries a real backdrop blur (the reference\'s defining trait)',
  /className="absolute inset-0 backdrop-blur-lg"/.test(UI)
);
check('ABSENCE GUARD — no hardcoded `bg-black/70` scrim remains in the primitives', !UI_CODE.includes('bg-black/70'));

/* The control metrics the reference measures (spec §7.3/§7.4 and §12). */
/* Post-migration: literal border-white/* migrated to border-hairline/border-hairline-strong */
const controls = UI_CODE.match(/className="w-full bg-ink-900 border border-hairline(?:-strong)? rounded-ds-md[^"]*"/g) ?? [];
const byMarker = (m) => controls.find((c) => c.includes(m)) ?? '';
const inputCls = byMarker('placeholder-zinc-600'); // the single-line `<input>`
const textareaCls = byMarker('resize-none'); // the multi-line `<textarea>`
const selectCls = byMarker('appearance-none'); // the `<select>`
check(
  'the three control class strings were DISCOVERED in the primitives (a check that finds nothing is a FAILURE)',
  controls.length === 3 && inputCls && textareaCls && selectCls,
  `found ${controls.length}: ${controls.map((c) => c.slice(0, 40)).join(' | ')}`
);
check(
  'the input carries the reference\'s metrics: 44px height and the 14px padding step',
  inputCls.includes('h-11') && inputCls.includes('px-3.5')
);
check('the select carries the SAME 44px height (a form row cannot mix control heights)', selectCls.includes('h-11'));
check(
  'the textarea stays multi-line (no fixed height is imposed on it)',
  textareaCls.length > 0 && !/ h-11\b/.test(textareaCls)
);
const labelClasses = UI.match(/className="block [^"]*font-medium text-zinc-400 mb-1\.5"/g) ?? [];
check(
  'all three control labels (Input · Select · Textarea) share ONE 14px label step',
  labelClasses.length === 3 && labelClasses.every((c) => c.includes('text-ds-body')),
  `matched ${labelClasses.length} label class strings`
);

/* ── 5. The floating-surface hover tint, and the dropdown treatment ──────── */

check(
  'tailwind declares the named `tint` colour against the one owner of its value',
  /tint:\s*\{\s*DEFAULT:\s*'var\(--mr-hover-tint\)'/.test(TW)
);
check(
  'the generated shim declares `bg-ink-800/70` (Tailwind alone SILENTLY DROPS an /opacity modifier on a CSS variable)',
  SHIMS.includes(
    '.bg-ink-800\\/70{background-color:color-mix(in srgb, var(--mr-surface-overlay) 70%, transparent)}'
  )
);
check(
  'the generated shim declares `bg-ink-700/60` (the selected theme row)',
  SHIMS.includes(
    '.bg-ink-700\\/60{background-color:color-mix(in srgb, var(--mr-surface-hover) 60%, transparent)}'
  )
);

const DROPDOWNS = [
  ['src/components/layout/Header.tsx', 'the shell profile menu'],
  ['src/components/shared/ThemeSelector.tsx', 'the theme menu'],
  ['src/components/marketing/PublicNav.tsx', 'the public nav dropdown'],
];
/**
 * The ROWS of a menu are asserted inside the menu REGION only: the file also holds
 * the trigger CONTROL, whose own hover legitimately stays as it was (this batch is
 * the menu surface, not the header chrome). The region starts at the menu surface
 * class and runs to the end of the file.
 *
 * §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED. The design-system migration
 * replaced the legacy `ink`/`tint` utility shims with theme tokens, so a menu surface
 * is expressed EITHER as the legacy translucent `bg-ink-800/70` OR as the token form
 * `bg-[var(--mr-surface-overlay)]/<alpha>`. Both name the SAME thing — a translucent,
 * theme-derived surface — and the two requirements that matter still fail
 * independently: the surface must be TRANSLUCENT and it must carry the reference's
 * `backdrop-blur-xl`; and its rows must take a THEME hover, never the near-white
 * legacy shim. The PublicNav dropdown was MEASURED to use an OPAQUE token surface, so
 * it was brought back to the peers' translucent treatment in the same change.
 */
const MENU_SURFACE = /bg-ink-800\/70|bg-\[var\(--mr-surface-overlay\)\]\/\d+/;
const menuSurface = (src) => {
  const m = code(src).match(MENU_SURFACE);
  return m ? m[0] : '';
};
const menuRegion = (src) => {
  const c = code(src);
  const m = c.match(MENU_SURFACE);
  return m && m.index !== undefined ? c.slice(m.index) : '';
};
for (const [file, label] of DROPDOWNS) {
  const src = read(file);
  const region = menuRegion(src);
  check(
    `${label} is TRANSLUCENT (a theme surface at partial opacity) with the reference's backdrop blur (spec §7.6)`,
    menuSurface(src).length > 0 && src.includes('backdrop-blur-xl'),
    file
  );
  check(
    `${label}'s rows take their hover from the theme (hover:bg-tint or the token form), not the near-white legacy shim`,
    region.length > 0 &&
      (region.includes('hover:bg-tint') || region.includes('hover:bg-[var(--mr-hover-tint)]')) &&
      !region.includes('hover:bg-white/[0.04]'),
    file
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   §OPENSHIP BATCH 5 (2026-10-15) — THE NAVIGATION RAIL IS A FLOATING CARD.

   BATCH 4's contract covered the SHARED surfaces; the rail is a surface of its
   own — the reference's biggest single visual change (spec §3.2/§3.3, §12) — and
   nothing above checks it. Without this section, reverting the rail to
   `h-full w-full border-r` or dropping the 12px inset would leave every screen
   looking like the old shell while every other check still passed.
   ══════════════════════════════════════════════════════════════════════════ */

const RAIL = read('src/components/layout/Sidebar.tsx');
const RAIL_CODE = code(RAIL);
const SHELL = read('src/components/layout/AppShell.tsx');
const ENV = read('src/components/layout/EnvironmentRouter.tsx');
const ENV_CODE = code(ENV);
/** The legacy hardcoded hover this batch repointed (its remap is invisible on light). */
const LEGACY_HOVER = 'hover:bg-white/[0.04]';

/** DISCOVER the card's own class string rather than retyping it. */
const railCardClass = (RAIL_CODE.match(/className="ds-rail[^"]*"/) ?? [''])[0];
check(
  'the rail card class string was DISCOVERED in the shell source (a check that finds nothing is a FAILURE)',
  railCardClass.length > 0,
  'no `ds-rail` class string found in src/components/layout/Sidebar.tsx'
);
check(
  'the rail FLOATS: a 12px inset on the top and start sides (the reference `my-3 ms-3`, spec §3.2)',
  railCardClass.includes('my-3') && railCardClass.includes('ms-3'),
  railCardClass
);
check(
  'the rail is a CONTAINER: the 16px radius step and its own edge',
  railCardClass.includes('rounded-ds-lg') && /\bborder\b/.test(railCardClass),
  railCardClass
);
check(
  'the rail CLIPS its own corners, so the navigation scrolls inside the rounded card',
  railCardClass.includes('overflow-hidden'),
  railCardClass
);
check(
  'the rail keeps the theme surface role as its fill (no new colour role was invented)',
  railCardClass.includes('bg-ink-900'),
  railCardClass
);
check(
  'ABSENCE GUARD — the rail is no longer a FULL-HEIGHT rail: no `h-full`, no `w-full`, no `border-r`',
  !/\bh-full\b/.test(railCardClass) && !/\bw-full\b/.test(railCardClass) && !/\bborder-r\b/.test(railCardClass),
  railCardClass
);
const drawerClasses = SHELL.match(/fixed top-0 z-50 flex h-full flex-col[^']*'/g) ?? [];
check(
  'the rail WRAPPER class string was DISCOVERED (exactly one)',
  drawerClasses.length === 1,
  drawerClasses.join(' | ')
);
check(
  'ABSENCE GUARD — the wrapper paints nothing: no full-height fill, edge border or raised shadow behind the card',
  drawerClasses.every((c) => !/border-r|bg-ink-900|shadow-ds-raised/.test(c)),
  drawerClasses.join(' | ')
);

/**
 * The widths are DERIVED, not retyped: the reference's CARD is 260px / 72px
 * (spec §3.2) and the wrapper carries it plus the 12px start inset, so 272 / 84
 * are the only correct wrapper values. Declaring 260 would render a 248px card.
 */
const lgWidths = [...SHELL.matchAll(/lg:w-\[(\d+)px\]/g)].map((m) => Number(m[1]));
check(
  'the shell declares exactly TWO lg rail widths (expanded + collapsed)',
  lgWidths.length === 2,
  `found ${lgWidths.join(', ') || 'none'}`
);
check(
  "the EXPANDED card is the reference's 260px (the wrapper is 260 + the 12px inset)",
  lgWidths.includes(260 + 12),
  `widths=${lgWidths.join(', ')}`
);
check(
  "the COLLAPSED card is the reference's 72px (the wrapper is 72 + the 12px inset)",
  lgWidths.includes(72 + 12),
  `widths=${lgWidths.join(', ')}`
);

/** The edge: the theme's own border token, halved — with ONE owner and a fallback. */
check(
  '`.ds-rail` sits in the `components` layer, like `.ds-card`',
  /@layer components\s*\{[\s\S]*?\.ds-rail\s*\{/.test(CSS)
);
check(
  '`.ds-rail` DERIVES its edge from the theme (50% of `--mr-hairline`) instead of declaring a second border value',
  /\.ds-rail\s*\{[^}]*color-mix\(in srgb, var\(--mr-hairline\) 50%, transparent\)/.test(CSS)
);
check(
  '`.ds-rail` declares the full-strength hairline FIRST, so a browser without `color-mix` degrades to a real edge (not `currentColor`)',
  /\.ds-rail\s*\{\s*border-color:\s*var\(--mr-hairline\);\s*border-color:\s*color-mix/.test(CSS)
);
const themesWithoutHairline = IDS.filter((id) => !blocks[id].includes("'--mr-hairline'"));
check(
  "every appearance declares `--mr-hairline`, so the rail's derived edge is a real value in both",
  themesWithoutHairline.length === 0,
  `missing in: ${themesWithoutHairline.join(', ')}`
);

/** The measured nav geometry (spec §3.3) — each value from the reference's table. */
const RAIL_GEOMETRY = [
  [
    "the nav row is the reference's 12px radius, 12px gap, 15px-equivalent body step and 12/10px padding",
    RAIL_CODE.includes(
      "'flex w-full items-center gap-3 rounded-ds-md text-ds-body font-medium transition-ds duration-ds-fast'"
    ),
  ],
  [
    'the nav row keeps ONE padding rule for both modes (compact is icon-only, centred)',
    RAIL_CODE.includes("compact ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'"),
  ],
  [
    "the nav row's hover is the floating-surface tint from the theme (`hover:bg-tint`)",
    RAIL_CODE.includes("'text-zinc-500 hover:bg-tint hover:text-zinc-200'"),
  ],
  ['ABSENCE GUARD — no legacy `hover:bg-white/[0.04]` remains in the rail', !RAIL_CODE.includes(LEGACY_HOVER)],
  ["the nav icon takes the reference's 20px step", RAIL_CODE.includes('className="h-5 w-5 flex-shrink-0"')],
  [
    "the rail introduces NO unnamed text size (the type scale is the single owner — the reference's 15px is NOT adopted)",
    (RAIL_CODE.match(/text-\[(1[1-9]|20)px\]/g) ?? []).length === 0,
  ],
  ["the section gap is the reference's 20px (`mt-5`)", RAIL_CODE.includes('className="mt-5 first:mt-0"')],
  ["the item list takes the reference's 4px rhythm (`gap-1`)", RAIL_CODE.includes('className="flex flex-col gap-1"')],
  [
    "the nav scroll region takes the reference's padding (`px-3 pb-12 pt-3`)",
    RAIL_CODE.includes('className="h-full overflow-y-auto px-3 pb-12 pt-3"'),
  ],
  [
    "the header takes the reference's `px-5` / `pt-6` geometry and its 26px mark",
    RAIL_CODE.includes("'flex items-center gap-3 px-5 pt-6'") && RAIL_CODE.includes('h-[26px] w-[26px]'),
  ],
  [
    "the account area takes the reference's type pair (a 14px name over a 12px second line)",
    RAIL_CODE.includes('text-ds-body font-semibold leading-tight text-strong') &&
      RAIL_CODE.includes('text-ds-label leading-tight text-zinc-500'),
  ],
  [
    'the scroll fade is present, never intercepts a pointer and is hidden from assistive tech',
    RAIL_CODE.includes('data-testid="nav-scroll-fade"') &&
      RAIL_CODE.includes('pointer-events-none absolute inset-x-0 bottom-0 h-14') &&
      /data-testid="nav-scroll-fade"[\s\S]{0,120}from-ink-900/.test(RAIL_CODE),
  ],
];
for (const [name, ok] of RAIL_GEOMETRY) check(name, ok);

/**
 * NOTHING MAY BE LOST BY A STYLING BATCH (spec §16 guardrail 1). Every affordance
 * the rail carried before this batch still exists, by its own test id or contract.
 */
const RAIL_PRESERVED = [
  ['the rail keeps the id the tour engine and the header both target', 'id="app-sidebar"'],
  ['the compact state is still announced', 'data-nav-compact='],
  ['the collapse control still exists', 'data-testid="nav-compact-toggle"'],
  ['the navigation filter still exists', 'data-testid="nav-filter"'],
  ['the empty-filter message still exists', 'data-testid="nav-filter-empty"'],
  ['pinning a destination still exists', 'data-testid={`nav-pin-'],
  ['the active destination is still exposed to assistive tech', 'aria-current='],
  ['the rail still renders its shell-supplied footer slot', '{footer}'],
];
for (const [name, needle] of RAIL_PRESERVED) check(name, RAIL_CODE.includes(needle));

/*
 * §OPENSHIP BATCH 5 — ACCESSIBILITY (better-accessibility, "one landmark, one name").
 * The `<aside>` and the `<nav>` inside it BOTH carried `aria-label="Primary"`, so the
 * landmark list offered the SAME name twice — ambiguous to navigate by a screen reader.
 * The label now belongs to the navigation landmark alone. This asserts exactly one.
 */
check(
  'exactly ONE "Primary" landmark label exists in the rail (a duplicate name makes the landmark ambiguous)',
  (RAIL_CODE.match(/aria-label="Primary"/g) || []).length === 1,
  `found ${(RAIL_CODE.match(/aria-label="Primary"/g) || []).length}`
);
check(
  'the surviving "Primary" label sits on the `<nav>` landmark, not on the `<aside>` wrapper',
  /<nav aria-label="Primary"/.test(RAIL_CODE)
);
check(
  'the demo environment switcher is still MOUNTED in the footer slot (by the shell, which owns it)',
  code(SHELL).includes('footer={<EnvironmentRouter'),
  'src/components/layout/AppShell.tsx no longer passes EnvironmentRouter as the rail footer'
);

/**
 * A REAL DEFECT, FIXED AT SOURCE AND HELD SHUT BY A DERIVATION (rule 07): the
 * environment grid declared THREE columns while its own list holds TWO entries, so
 * a third of the card sat empty. It was a leftover of §P9 (the carrier entry was
 * removed and the grid was not). The count is read from the ENTRIES, so the two
 * cannot drift again: adding a third environment without a third column fails
 * here, and so does re-hardcoding 3.
 */
const envEntries = (ENV_CODE.match(/^\s*\{\s*id:\s*'(brand|admin)'/gm) ?? []).length;
const gridCols = Number((ENV_CODE.match(/grid-cols-(\d+)/) ?? [])[1] ?? 0);
check(
  'the environment list was DISCOVERED (a check that finds nothing is a FAILURE)',
  envEntries > 0,
  'no environment entries parsed from EnvironmentRouter.tsx'
);
check(
  "the environment grid's column count EQUALS the number of environments it renders",
  gridCols === envEntries,
  `entries=${envEntries} grid-cols=${gridCols}`
);
check(
  'the environment rows take their hover from the theme (`hover:bg-tint`) — the legacy near-white hover was invisible on the light shells',
  ENV_CODE.includes('hover:bg-tint') && !ENV_CODE.includes(LEGACY_HOVER)
);
check(
  'the ACTIVE environment uses a theme surface step (`bg-ink-700`), so it stays legible on all five themes',
  ENV_CODE.includes('bg-ink-700')
);

/* ══════════════════════════════════════════════════════════════════════════
   §OPENSHIP BATCH 6 (2026-10-15) — THE TOP BAR: SURFACE AND TYPE.

   The reference has NO desktop top bar (§3.1), so this contract is what a DERIVED
   top bar must hold to: the reference's own MOBILE header (`h-14`, a bottom edge
   at 40% of the theme's border, no fill of its own) plus its control language
   (icon controls at the reference's 36px square / 12px radius, control type at
   14px, small meta at 12px). Without it, putting `bg-ink-900` and `px-3 sm:px-5`
   back — or dropping the derived edge — would be invisible to every other check.
   ══════════════════════════════════════════════════════════════════════════ */

const HEADER = read('src/components/layout/Header.tsx');
const HEADER_CODE = code(HEADER);
const THEME_SEL = read('src/components/shared/ThemeSelector.tsx');
const NOTIF = read('src/components/shared/NotificationCenter.tsx');

const headerClass = (HEADER_CODE.match(/<header className="([^"]*)"/) ?? [])[1] ?? '';
check(
  'the top bar class string was DISCOVERED in the shell source (a check that finds nothing is a FAILURE)',
  headerClass.length > 0,
  'no `<header className=…>` found in src/components/layout/Header.tsx'
);
check(
  "the bar keeps the reference's 56px band height (`h-14`, its own mobile header's value, spec §3.1)",
  headerClass.includes('h-14')
);
check(
  "the bar no longer paints a fill of its own — it sits on the page, as the reference's header does (no `bg-ink-*`)",
  !/\bbg-(ink|surface)\b/.test(headerClass),
  headerClass
);
check(
  "the bar's only separation is its derived bottom edge (`.ds-bar` plus `border-b`)",
  headerClass.includes('ds-bar') && /\bborder-b\b/.test(headerClass),
  headerClass
);
/*
 * §OPENSHIP BATCH 7 (2026-10-15) — REPOINTED, not weakened. This check used to read the
 * padding from the `<header>` itself; BATCH 7 moved it (with the cap) onto the bar's INNER
 * ROW so the bar and the page content share one leading edge at every width, and the
 * measured requirement is unchanged — `px-4 sm:px-6 lg:px-8`, now the FULL reference ladder.
 */
const barRowClass = (HEADER_CODE.match(/<div className="mx-auto flex w-full max-w-\[1600px\][^"]*"/) ?? [''])[0];
check(
  "the bar's INNER ROW was DISCOVERED in the shell source (a check that finds nothing is a FAILURE)",
  barRowClass.length > 0,
  barRowClass || 'no capped inner row found in Header.tsx'
);
check(
  "the bar's inner row takes the reference's FULL container ladder (`px-4 sm:px-6 lg:px-8`)",
  barRowClass.includes('px-4') && barRowClass.includes('sm:px-6') && barRowClass.includes('lg:px-8'),
  barRowClass
);
check(
  '`.ds-bar` sits in the `components` layer, like `.ds-card` and `.ds-rail`',
  /@layer components\s*\{[\s\S]*?\.ds-bar\s*\{/.test(CSS)
);
check(
  "`.ds-bar` DERIVES 40% of the theme's own border token (the reference's `border-border/40`)",
  /\.ds-bar\s*\{[^}]*color-mix\(in srgb, var\(--mr-hairline\) 40%, transparent\)/.test(CSS)
);
check(
  '`.ds-bar` declares the full-strength hairline FIRST, so a browser without `color-mix` degrades to a real edge',
  /\.ds-bar\s*\{\s*border-bottom-color:\s*var\(--mr-hairline\);\s*border-bottom-color:\s*color-mix/.test(CSS)
);

/** The reference's control language: a 36px icon control, a 40px default button, 14/12px type. */
check(
  "the command bar takes the reference's default button height (`h-10` = 40px) instead of a ~34px pill",
  /data-testid="app-search-trigger"[\s\S]{0,400}?className="hidden h-10 /.test(HEADER)
);
check(
  "the command bar takes the reference's button type step (`text-ds-body`, 14px)",
  /app-search-trigger[\s\S]{0,400}?text-ds-body/.test(HEADER)
);
check(
  "the `kbd` hint stays inside the project's type floor (12px `ds-label`) — the reference's 10px has no step here",
  /<kbd[^>]*text-ds-label/.test(HEADER)
);
check(
  "the drawer toggle is the reference's 36px square icon control (`h-9 w-9`), and is the only control hidden above `lg`",
  /className="flex h-9 w-9 items-center justify-center[^"]*lg:hidden"/.test(HEADER)
);
check(
  "the account control is the reference's 36px-high control (`h-9`)",
  /aria-controls="profile-menu"[\s\S]{0,260}?className="flex h-9 /.test(HEADER)
);
check(
  "the notification trigger is the reference's 36px square icon control (`h-9 w-9`)",
  /'relative flex h-9 w-9 items-center justify-center rounded-ds-md/.test(NOTIF)
);
check(
  "the theme trigger is the reference's 36px-high control (`h-9`)",
  /className="inline-flex h-9 items-center/.test(THEME_SEL)
);

/** ONE hover mechanism in chrome: the theme's floating-surface tint (BATCH 4's token). */
for (const [file, label, src] of [
  ['src/components/layout/Header.tsx', 'the top bar', HEADER],
  ['src/components/shared/ThemeSelector.tsx', 'the theme trigger', THEME_SEL],
]) {
  const c = code(src);
  check(
    `${label} takes every hover from the theme (\`bg-tint\`) and leaves NO legacy near-white hover in the control`,
    c.includes('hover:bg-tint') && !/hover:bg-white\/\[0\.0\d\]/.test(c),
    file
  );
}
/*
 * The notification trigger is checked at its OWN class string, not file-wide: this batch
 * owns the chrome CONTROL, while the panel's rows inside that file are the shared surface
 * BATCH 8 owns (the same boundary BATCH 4 recorded for the floating panels).
 */
const notifTriggerClass = (code(NOTIF).match(/'(relative flex h-9[\s\S]{0,160}?)'/) ?? [])[1] ?? '';
check(
  'the notification trigger was DISCOVERED (a check that finds nothing is a FAILURE)',
  notifTriggerClass.length > 0,
  'no `relative flex h-9 …` class string found in NotificationCenter.tsx'
);
check(
  'the notification TRIGGER takes its hover from the theme (`hover:bg-tint`) and keeps no legacy near-white hover',
  notifTriggerClass.includes('hover:bg-tint') && !/hover:bg-white\/\[0\.0\d\]/.test(notifTriggerClass),
  notifTriggerClass
);
check(
  'the top bar introduces NO unnamed text size (the type scale is the single owner)',
  (HEADER_CODE.match(/text-\[(1[1-9]|20)px\]/g) ?? []).length === 0,
  (HEADER_CODE.match(/text-\[(1[1-9]|20)px\]/g) ?? []).join(', ')
);

/** NOTHING MAY BE LOST BY A RESTYLING BATCH. */
const HEADER_PRESERVED = [
  ['the mobile drawer toggle and its aria wiring survive', 'data-testid="app-menu-toggle"'],
  ['the toggle still tells assistive tech what it controls', 'aria-controls="app-sidebar"'],
  ['the toggle still announces its expanded state', 'aria-expanded={navOpen}'],
  ['the command-bar trigger survives (the palette entry point)', 'data-testid="app-search-trigger"'],
  ['the command bar keeps its accessible name', 'aria-label="Search records and destinations"'],
  ['the command-bar key hint survives', 'kbd'],
  ['the account menu keeps its four real actions', "'Account Settings'"],
  ['the account menu keeps its billing route', "'Billing & Payouts'"],
  ['the account menu keeps its API-keys route', "'API Keys'"],
  ['the account menu keeps signing out', 'onClick={signOut}'],
  ['the route back to the public site survives (four specs depend on its title)', 'title="Back to homepage"'],
  ['the exit label is still hidden below `sm` rather than the control being lost', 'hidden sm:inline'],
  ['the notification centre is still mounted', '<NotificationCenter onNavigate={onNavNotification} />'],
  ['the theme selector is still mounted', '<ThemeSelector compact />'],
  ['shell-supplied chrome actions still render', '{extraActions}'],
];
for (const [name, needle] of HEADER_PRESERVED) check(name, HEADER_CODE.includes(needle));

/* ══════════════════════════════════════════════════════════════════════════
   §OPENSHIP BATCH 7 (2026-10-15) — PAGE LAYOUTS: THE SHARED CONTAINER, THE
   HEADERS AND THE 340px RAIL.

   The reference caps and centres its page content and defines a per-screen right
   rail (spec §4.1–§4.3). Nothing above checks either: a surface could reintroduce
   an edge-to-edge container, or a 320px rail, and every other gate would still pass
   while pages drifted apart from the chrome above them.
   ══════════════════════════════════════════════════════════════════════════ */

const WORKSPACE = read('src/components/shared/workspace.tsx');
const WORKSPACE_CODE = code(WORKSPACE);

const frameClass = (WORKSPACE_CODE.match(/'mx-auto w-full max-w-\[1600px\][^']*'/) ?? [''])[0];
check(
  'the page container class string was DISCOVERED in the workspace primitives (a check that finds nothing is a FAILURE)',
  frameClass.length > 0,
  frameClass || 'no capped container found in src/components/shared/workspace.tsx'
);
check(
  "the page container is the reference's own (spec §4.1): capped at 1600px and centred",
  frameClass.includes('max-w-[1600px]') && frameClass.includes('mx-auto')
);
check(
  "the page container takes the reference's padding ladder (`px-4 sm:px-6 lg:px-8`) and its 24px vertical step (`py-6`)",
  frameClass.includes('px-4') &&
    frameClass.includes('sm:px-6') &&
    frameClass.includes('lg:px-8') &&
    frameClass.includes('py-6')
);
check(
  'ABSENCE GUARD — the retired ladder (`sm:px-5`, `lg:px-6`, `py-4 sm:py-5`) is gone from the frame',
  !/sm:px-5|lg:px-6|px-4 py-4/.test(frameClass),
  frameClass
);

/*
 * THE ALIGNMENT IS DERIVED, not retyped: the bar's inner row and the page container must
 * carry the SAME cap and the SAME padding ladder, or the page title and the first control in
 * the bar sit on different leading edges. Comparing the two class strings is what makes the
 * "one leading edge" claim checkable instead of a comment.
 */
const sharedTokens = ['max-w-[1600px]', 'mx-auto'];
const ladderTokens = ['px-4', 'sm:px-6', 'lg:px-8'];
const missingShared = [...sharedTokens, ...ladderTokens].filter(
  (t) => !(frameClass.includes(t) && barRowClass.includes(t))
);
check(
  'the app bar and the page container share ONE cap and ONE padding ladder (the leading edges cannot drift apart)',
  missingShared.length === 0,
  `missing in one of the two: ${missingShared.join(', ')}`
);

check(
  "the context rail takes the reference's 340px measure with its 24px gap (spec §4.3)",
  /xl:grid-cols-\[minmax\(0,1fr\)_340px\]/.test(WORKSPACE_CODE) && /grid-cols-1 gap-6 xl:grid/.test(WORKSPACE_CODE)
);
check(
  'the context rail KEEPS the project\'s `xl` switch (the reference\'s `lg` is not transferable to a dense ops table)',
  WORKSPACE_CODE.includes('xl:grid-cols-[minmax(0,1fr)_340px]')
);
check(
  "the page description takes the reference's 6px gap under the title (`mt-1.5`, spec §4.2)",
  /<p className="mt-1\.5[^"]*text-ds-body/.test(WORKSPACE_CODE)
);
check(
  'the rail keeps its COMPLEMENTARY landmark (never a second `<aside>` — the shell asserts exactly one)',
  /role="complementary"/.test(WORKSPACE_CODE)
);

/* ══════════════════════════════════════════════════════════════════════════
   §OPENSHIP BATCH 8 (2026-10-15) — COMPONENT STATES.

   The state OWNERS live in `src/components/ui.tsx` and are gated by
   `validate-state-coverage.mjs` (§C) — that gate owns "one owner per state" and
   "the owner is wired". This section owns what belongs to THIS contract: the
   one INTERACTION trait the batch added (the card's hover edge), and the two
   floating panels BATCH 4 and BATCH 6 deliberately left to it. Without it,
   reverting a panel to `border-white/[0.08]`, or dropping the hover token from
   one theme, would leave every screen looking pre-batch while every other check
   still passed.
   ══════════════════════════════════════════════════════════════════════════ */

/** §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED. The retired `bold`
   exemption is gone with the theme it described. For BOTH appearances the card hover
   edge is a REAL interaction state: it differs from the rest border. */
for (const id of IDS) {
  check(
    `${id}: the card hover edge is a VISIBLE change from its rest border (the reference's own interaction state)`,
    tokenValue(id, '--mr-card-border-hover') !== null &&
      tokenValue(id, '--mr-card-border-hover') !== tokenValue(id, '--mr-card-border'),
    `hover=${tokenValue(id, '--mr-card-border-hover')} border=${tokenValue(id, '--mr-card-border')}`
  );
}

check(
  "src/index.css applies the hover through the reference's own mechanism (`.ds-card:has(a:hover)`)",
  /\.ds-card:has\(a:hover\)/.test(CSS)
);
check(
  'the hover edge has a SECOND selector for a click target without an anchor (this project writes links both ways)',
  /\.ds-card-interactive:hover/.test(CSS)
);
check(
  'both selectors consume the ONE token (no second border value is declared for a hover)',
  /\.ds-card:has\(a:hover\),\s*\n?\s*\.ds-card-interactive:hover\s*\{\s*border-color:\s*var\(--mr-card-border-hover\)/.test(
    CSS
  )
);
check(
  "the card carries the reference's own transition for that edge (`border-color .2s`, spec §2.7)",
  /\.ds-card\s*\{\s*transition:\s*border-color 0\.2s;/.test(CSS)
);
check(
  'the hand-rolled card hover is GONE from the surfaces (it declared a legacy colour of its own)',
  !read('src/components/brand/SalesAnalytics.tsx').includes('hover:border-white/[0.14]') &&
    read('src/components/brand/SalesAnalytics.tsx').includes('ds-card-interactive')
);

/** ── The two floating PANELS (§9's surfaces BATCH 4/6 left open) ─────────── */
const PANELS = [
  ['src/components/shared/NotificationCenter.tsx', 'the notification panel', 'w-[380px]'],
  ['src/components/shared/LiveChatWidget.tsx', 'the live-chat panel', 'w-[360px]'],
];
for (const [file, label, width] of PANELS) {
  const src = read(file);
  const cls = (src.match(new RegExp(`className="[^"]*${width.replace(/[[\]]/g, '\\$&')}[^"]*"`)) ?? [''])[0];
  check(
    `${label}'s surface class string was DISCOVERED (a check that finds nothing is a FAILURE)`,
    cls.length > 0,
    file
  );
  check(
    `${label} takes its edge from the THEME (\`.ds-card\`) instead of a hardcoded near-white border`,
    cls.includes('ds-card') && !/border-white\//.test(cls),
    cls
  );
  check(
    `${label} keeps the container radius and the theme's overlay elevation`,
    cls.includes('rounded-ds-lg') && cls.includes('shadow-ds-overlay'),
    cls
  );
  check(
    `ABSENCE GUARD — ${label} is NOT given the dropdown's translucency (the reference evidences it for its dropdown only; copying it onto a panel would be invention)`,
    !/backdrop-blur/.test(cls) && !/bg-ink-800\/70/.test(cls),
    cls
  );
}
check(
  "the notification panel's rows take their hover from the ONE theme tint (no legacy near-white hover remains)",
  !read('src/components/shared/NotificationCenter.tsx').includes('hover:bg-white/[0.05]')
);
check(
  'the live-chat trigger is the SAME 36px chrome control as its neighbours (it was 32px beside three 36px controls)',
  read('src/components/shared/LiveChatWidget.tsx').includes(
    'flex h-9 w-9 items-center justify-center rounded-ds-md text-zinc-500 transition-ds duration-ds-fast hover:bg-tint'
  )
);
check(
  'an actionable queue row takes the list-row hover, and a non-actionable row does NOT advertise one (spec §9.4)',
  /r\.onOpen && 'hover:bg-tint'/.test(WORKSPACE_CODE)
);

console.log(
  failures === 0
    ? `SHARED_SURFACES_VALIDATION_PASS (${checks} checks)`
    : `SHARED_SURFACES_VALIDATION_FAIL (${failures} of ${checks} checks)`
);
if (failures > 0) process.exit(1);


