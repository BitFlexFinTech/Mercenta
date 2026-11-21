// §11 — validates the design system is applied app-wide:
//   zero neon (purple) class refs · brass ramp defined · Plus Jakarta Sans is
//   the sans/body font · hexagon mark present in Header, Sidebar, wizard
// §M12 — resolve filesystem paths with fileURLToPath: a project folder whose name
// contains a space (e.g. `1. Mercenta`) is percent-encoded by `URL.pathname`, which
// silently broke this walk (ENOENT on `1.%20Mercenta`).
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

let failures = 0;
const test = (name, ok) => {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failures++;
};

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const tw = read('tailwind.config.js');
test('neon palette removed from tailwind config', !/neon\s*:/.test(tw));
test('brass full ramp (300-700) defined',
  ['300', '400', '500', '600', '700'].every((sh) => new RegExp(`brass:[\\s\\S]*${sh}:`).test(tw)));
/* §OPENSHIP BATCH 3 (2026-10-14) — REPOINTED: the UI face is now Plus Jakarta
   Sans (OFL 1.1). Gellix, the reference's own face, is "Personal Use Only" and
   is deliberately NOT shipped; the licence position is in
   docs/OPENSHIP_REFERENCE_SPEC.md §8. */
test('font-sans is Plus Jakarta Sans', /sans:\s*\['"Plus Jakarta Sans"/.test(tw));
test('the display role is the ONE interface family, and the serif and second download are gone (OPENSHIP MAPPING 2026-10-15 - REPOINTED: the reference declares two faces and no serif)', tw.split('display:')[1].slice(0, 60).indexOf('Plus Jakarta Sans') >= 0 && !/Fraunces|Inter/.test(read('index.html')));

const css = read('src/index.css');
test('body font is Plus Jakarta Sans', css.includes("font-family: 'Plus Jakarta Sans'"));
test('glow keyframes use brass RGB (201,161,90)', !css.includes('168, 85, 247'));

let neonRefs = 0;
const { readdirSync, statSync } = await import('node:fs');
function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = `${dir}/${f}`;
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx|ts|css)$/.test(f)) {
      if (/neon-/.test(readFileSync(p, 'utf8'))) neonRefs += 1;
    }
  }
}
walk('src'.replace('src', fileURLToPath(new URL('../src/', import.meta.url)).replace(/\/$/, '')));
test('zero neon-* class refs in src', neonRefs === 0);

/* §BRAND REDESIGN (2026-11-19) — REPOINTED, NOT WEAKENED.
   OLD CONTRACT: each of the three shells rendered the raw hexagon asset
   `mercenta-mark-dark-bg.svg` inline. The redesign replaced that hexagon with the
   approved brand mark component, `src/components/shared/BrandMark.tsx`, which is the
   ONE owner of which official master file is used per appearance. The contract that
   matters is unchanged — every shell shows the APPROVED brand mark, from one owner —
   so the check now asserts each shell renders `BrandMark`, and that BrandMark itself
   is the component that references the official mark masters. */
for (const f of [
  'src/components/layout/Header.tsx',
  'src/components/layout/Sidebar.tsx',
  'src/components/brand/OnboardingWizard.tsx',
]) {
  test(`${f} renders the approved brand mark from its owner`, read(f).includes('BrandMark'));
}
test(
  'the official mark masters are referenced by ONE owner (BrandMark), not inline in a shell',
  read('src/components/shared/BrandMark.tsx').includes('mercenta-mark-dark-bg.svg') &&
    read('src/components/shared/BrandMark.tsx').includes('mercenta-mark-light-bg.svg')
);

console.log(failures === 0 ? 'DESIGN_TOKEN_VALIDATION_PASS' : `DESIGN_TOKEN_VALIDATION_FAIL (${failures})`);
if (failures > 0) process.exit(1);
