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

const IDS = ['minimal-light', 'professional', 'bold', 'fun', 'serious'];
const blocks = {};
for (const id of IDS) {
  const start = THEMES.indexOf(`    id: '${id}',`);
  const after = THEMES.slice(start + 12);
  const next = after.indexOf("    id: '");
  const end = next === -1 ? THEMES.indexOf('};', start) : start + 12 + next;
  blocks[id] = start === -1 ? '' : THEMES.slice(start, end);
}
check(
  'the five theme blocks were DISCOVERED from src/config/themes.ts (a check that finds nothing is a FAILURE)',
  Object.values(blocks).every((b) => b.length > 200),
  Object.entries(blocks).map(([id, b]) => `${id}:${b.length}`).join(' ')
);

const tokenValue = (id, token) => {
  const m = blocks[id].match(new RegExp(`'${token}':\\s*'([^']*)'`));
  return m ? m[1] : null;
};
const surfaceRaised = (id) => tokenValue(id, '--mr-surface-raised');

/* ── 2. The contract: reference values for the four non-Bold themes, `bold`
       unchanged by mechanism ─────────────────────────────────────────────── */

const CONTRACT = {
  '--mr-card-border': (id) => (id === 'bold' ? 'rgba(255,255,255,0.06)' : 'transparent'),
  '--mr-card-nested': (id) => (id === 'bold' ? '#17181D' : id === 'serious' ? '#080808' : '#FAFAFA'),
  '--mr-hover-tint': (id) =>
    id === 'bold'
      ? 'rgba(255,255,255,0.04)'
      : id === 'serious'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(0,0,0,0.05)',
};

for (const [token, expected] of Object.entries(CONTRACT)) {
  for (const id of IDS) {
    const want = expected(id);
    const got = tokenValue(id, token);
    check(`${id}: ${token} is ${want}`, got === want, `found ${got === null ? 'NOT DECLARED' : `'${got}'`}`);
  }
}

for (const id of IDS) {
  if (id === 'bold') continue;
  check(
    `${id}: the card is BORDERLESS (the reference's own rule, spec §2.7)`,
    tokenValue(id, '--mr-card-border') === 'transparent'
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
    `${id}: a nested card cannot VANISH (its fill differs from the card fill${id === 'bold' ? ', except in bold where it is identical by design' : ''})`,
    nested !== null &&
      card !== null &&
      (id === 'bold'
        ? nested.toUpperCase() === card.toUpperCase()
        : nested.toUpperCase() !== card.toUpperCase()),
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
const controls = UI_CODE.match(/className="w-full bg-ink-900 border border-white\/\[0\.08\] rounded-ds-md[^"]*"/g) ?? [];
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
 * the menu surface, not the header chrome). The region starts at the translucent
 * surface class this batch introduced and runs to the end of the file.
 */
const menuRegion = (src) => {
  const c = code(src);
  const i = c.indexOf('bg-ink-800/70');
  return i === -1 ? '' : c.slice(i);
};
for (const [file, label] of DROPDOWNS) {
  const src = read(file);
  const region = menuRegion(src);
  check(
    `${label} is TRANSLUCENT (bg-ink-800/70) with the reference's backdrop blur (spec §7.6)`,
    src.includes('bg-ink-800/70') && src.includes('backdrop-blur-xl'),
    file
  );
  check(
    `${label}'s rows take their hover from the theme (hover:bg-tint), not the near-white legacy shim`,
    region.length > 0 && region.includes('hover:bg-tint') && !region.includes('hover:bg-white/[0.04]'),
    file
  );
}

console.log(
  failures === 0
    ? `SHARED_SURFACES_VALIDATION_PASS (${checks} checks)`
    : `SHARED_SURFACES_VALIDATION_FAIL (${failures} of ${checks} checks)`
);
if (failures > 0) process.exit(1);


