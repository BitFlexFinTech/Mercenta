// §11 — validates the design system is applied app-wide:
//   zero neon (purple) class refs · brass ramp defined · IBM Plex Sans is
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
test('font-sans is IBM Plex Sans', /sans:\s*\['"IBM Plex Sans"/.test(tw));
test('display font stays Fraunces', /display:\s*\['Fraunces'/.test(tw));

const css = read('src/index.css');
test('body font is IBM Plex Sans', css.includes("font-family: 'IBM Plex Sans'"));
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

for (const f of [
  'src/components/layout/Header.tsx',
  'src/components/layout/Sidebar.tsx',
  'src/components/brand/OnboardingWizard.tsx',
]) {
  test(`${f} uses the hexagon mark`, read(f).includes('mercenta-mark-dark-bg.svg'));
}

console.log(failures === 0 ? 'DESIGN_TOKEN_VALIDATION_PASS' : `DESIGN_TOKEN_VALIDATION_FAIL (${failures})`);
if (failures > 0) process.exit(1);
