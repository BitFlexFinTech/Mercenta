#!/usr/bin/env node
/**
 * §PUBLIC SURFACES BATCH 5 PART 3 (2026-11-27) — THE TWO PICTURES THE PAGES NEEDED.
 *
 * WHY THIS EXISTS. Batch 5 Part 2 gave the seven Retail Infrastructure pages an opening picture from
 * the homepage set. LOOKING at the rendered pages showed two of those choices were wrong:
 * `shelves-stock` (a supermarket mid-refit, with an empty freezer and cardboard on the floor) was the
 * opening picture of the price-governance page, where it reads as a closed shop; and `desk-notebook`
 * (a near-empty dark desk) opened the creative-assets page, whose subject is producing photography.
 * Both were licensed, both were the right size, both were the wrong picture — the same failure
 * `probe-category-imagery.mjs` records, and it has the same fix: look at a labelled contact sheet,
 * choose by eye, and PIN the choice so the set is reproducible.
 *
 * HOW THE TWO WERE CHOSEN. A six-theme contact sheet was built and looked at. The chosen studio
 * photograph came from the "photographic studio softbox lights" row and the chosen display photograph
 * from the "products arranged on shelves" row; the wedding, lens and street pictures in the same
 * sheet were rejected by eye.
 *
 * LICENCE BAR — unchanged and identical to the other two fetchers: **Openverse** (openverse.org)
 * filtered to `license=cc0,pdm` — CC0 and Public Domain Mark only, the licences that permit
 * commercial use with no attribution obligation. Downloaded ONCE, converted to WebP at two widths,
 * and COMMITTED, so the live site makes no third-party requests.
 *
 * NEVER UPSCALED: `withoutEnlargement` keeps the free pool's real resolution.
 *
 * A SEPARATE CREDITS FILE, for the reason `fetch-category-imagery.mjs` documents: each fetcher
 * rewrites ITS OWN credits file in full, so no run can silently wipe another set's provenance.
 *
 * USAGE
 *   node scripts/fetch-public-page-imagery.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEST = resolve(ROOT, 'public/imagery');
const SIZES = [
  ['lg', 1400],
  ['sm', 700],
];
const MIN_WIDTH = 600;

/**
 * role → [pinned URL, subject as recorded in CREDITS-PAGES.md].
 *
 * Both are PINNED, so this script performs no search at all: re-running it reproduces exactly the two
 * pictures that were reviewed, and changing a picture is one edited line.
 */
const CURATED = {
  'page-product-display': [
    'https://live.staticflickr.com/65535/54965677527_8820a923ab_b.jpg',
    'Chocolate and confectionery in a retail display unit',
  ],
  'page-photo-studio': [
    'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTA1L3Vwd2s2MjE2MDcwMS13aWtpbWVkaWEtaW1hZ2Uta293Z3lpcWIuanBn.jpg',
    'A photographic studio: backdrop, softbox and ceiling light',
  ],
};

const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'mercenta-imagery/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
};

mkdirSync(DEST, { recursive: true });
const credits = [];
let failed = 0;

for (const [role, [url, subject]] of Object.entries(CURATED)) {
  try {
    const buf = Buffer.from(await (await get(url)).arrayBuffer());
    const src = await sharp(buf).metadata();
    if ((src.width ?? 0) < MIN_WIDTH) {
      console.log(`  SKIP ${role} — source is only ${src.width}px wide`);
      failed += 1;
      continue;
    }
    const made = [];
    for (const [suffix, target] of SIZES) {
      const out = resolve(DEST, `${role}-${suffix}.webp`);
      await sharp(buf)
        .resize(target, null, { withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(out);
      const m = await sharp(out).metadata();
      made.push(`${suffix}=${m.width}px`);
    }
    credits.push(`| \`${role}\` | ${subject} | ${src.width}x${src.height} | CC0 / Public Domain | ${url} |`);
    console.log(`  OK   ${role.padEnd(22)} -> ${made.join('  ')}`);
  } catch (err) {
    console.log(`  SKIP ${role} — ${String(err.message).slice(0, 90)}`);
    failed += 1;
  }
}

writeFileSync(
  resolve(DEST, 'CREDITS-PAGES.md'),
  [
    '# Public page imagery — sources and licences',
    '',
    'The page-level photographs used as the opening picture of a public content page, and possibly in',
    'one of its blocks. Every one is **CC0 or Public Domain Mark**: commercial use permitted, no',
    'attribution legally required. Fetched once by `scripts/fetch-public-page-imagery.mjs` from',
    'Openverse (openverse.org), then committed so the live site makes no third-party requests.',
    '',
    '**Each was chosen by LOOKING at a labelled contact sheet, then pinned in the script**, so the set',
    'is reproducible and a change to a picture is one reviewed edit. Replace a file in place, keeping',
    'its name, and no component changes.',
    '',
    '| Name | Subject | Original | Licence | Source |',
    '|---|---|---|---|---|',
    ...credits,
    '',
  ].join('\n')
);

console.log(`\nwrote ${credits.length}/${Object.keys(CURATED).length} page images (${failed} skipped) + CREDITS-PAGES.md`);
process.exit(failed === 0 ? 0 : 1);
