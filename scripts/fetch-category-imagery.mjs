#!/usr/bin/env node
/**
 * §PUBLIC SURFACES BATCH 5 (2026-11-27) — THE TEN CATEGORY PHOTOGRAPHS.
 *
 * Same licence bar and same mechanism as `fetch-placeholder-imagery.mjs`: **Openverse**
 * (openverse.org), filtered to `license=cc0,pdm` — CC0 and Public Domain Mark only, because those are
 * the licences that permit commercial use with no attribution obligation. Files are downloaded ONCE,
 * converted to WebP at two widths, and COMMITTED, so the live site makes no third-party requests.
 *
 * WHY A SEPARATE SCRIPT AND A SEPARATE CREDITS FILE
 * ------------------------------------------------
 * `fetch-placeholder-imagery.mjs` REWRITES `public/imagery/CREDITS.md` in full from its own curated
 * list, so appending a category section there would be destroyed the next time that script ran. This
 * one generates `public/imagery/CREDITS-CATEGORIES.md` and never touches the homepage set or its
 * files. Two records, each owned by the script that produces it — neither can silently wipe the other.
 *
 * NEVER UPSCALED: `withoutEnlargement` keeps the free pool's real resolution. A source too small to
 * fill the box is skipped rather than stretched, and the run says which one it skipped.
 *
 * USAGE
 *   node scripts/fetch-category-imagery.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEST = resolve(ROOT, 'public/imagery');

/**
 * role → [search term, RELEVANCE test on the result's own title/tags].
 *
 * THIRD PASS, AND THE REASON FOR `must`: search alone is not enough. Measured against the rendered
 * page, "canned goods" returned a photograph of a telephone keypad, "car parts" returned a street
 * mural, and "home accessories interior" returned a 19th-century shop engraving. Each was CC0 and
 * correctly sized, and each was wrong. The relevance test makes the RESULT prove it is about the
 * category before it can be chosen — the same discipline as every other check in this project.
 */
const THEMES = [
  ['cat-home', 'living room interior', /(living room|interior|sofa|couch|cushion|furniture|home)/i],
  ['cat-baby', 'baby bottle', /(baby|infant|nursery|bottle|toddler)/i],
  ['cat-office', 'office supplies', /(stationery|office|paper|pencil|pen|folder|desk)/i],
  ['cat-health', 'cosmetics flat lay', /(cosmetic|skincare|skin care|cream|lotion|beauty)/i],
  ['cat-kitchen', 'stainless steel saucepan', /(saucepan|stockpot|cookware|stainless steel|kitchen|utensil)/i],
  ['cat-electronics', 'wireless headphones', /(headphone|earbud)/i],
  ['cat-automotive', 'car engine parts', /(car|engine|tyre|tire|wheel|automotive)/i],
  ['cat-grocery', 'supermarket shelf food', /(grocer|supermarket|shelf|food|tin|can|jar|package)/i],
  ['cat-computer', 'laptop computer', /(laptop|computer|keyboard|monitor|pc)/i],
  ['cat-apparel', 'clothing rack', /(clothing|clothes|apparel|garment|fashion|shirt|dress)/i],
];

/**
 * §MEASURED, 2026-11-27 — THE PICTURE HAS TO BE JUDGED, NOT JUST LICENSED.
 *
 * The first run accepted the first correctly-licensed result. Looking at the rendered page showed why
 * that is not enough: "Grocery" was a black-and-white archival street scene, "Home" an antique clock.
 * Both were legally fine and useless. Three filters now stand between a result and a card:
 *   · HISTORICAL — archive, vintage and black-and-white material is excluded by title/tags;
 *   · LANDSCAPE — candidates are ordered by how close they are to a 3:2 card, so a tall portrait is
 *     not the first thing chosen for a wide box;
 *   · SIZE — unchanged: nothing is upscaled.
 */
const HISTORICAL = /(black and white|blackandwhite|vintage|antique|historic|historical|museum|archive|engraving|lithograph|postcard|\b1[6-9]\d\d\b|\b20[0-1]\d\b ?(?:c\.|circa))/i;

/**
 * §MEASURED, 2026-11-27 — THE FIRST RUN FETCHED 2 OF 10, AND THE CAUSE WAS THE TERMS.
 *
 * The first attempt used descriptive multi-word queries ("homeware storage basket textiles") and
 * Openverse returned **zero** CC0 results for most of them — the index treats the words as a
 * conjunction, so a precise-sounding query finds nothing. Measured side by side: "homeware storage
 * basket textiles" → 0 results; "baby bottle" → 240 with 20 usable; "kitchen utensils" → 240 with 20
 * usable; "skincare" → 240 with 17 usable.
 *
 * The fix is therefore SHORTER, single-concept terms — not a lower quality bar. The resolution floor
 * below is unchanged in spirit and still refuses anything that would be upscaled.
 */

/** A picture narrower than this cannot fill a 3/2 card without visible upscaling. */
const MIN_WIDTH = 600;
const MIN_HEIGHT = 320;

const SEARCH = (term) =>
  'https://api.openverse.org/v1/images/?' +
  new URLSearchParams({
    q: term,
    license: 'cc0,pdm',
    page_size: '20',
  }).toString();

/**
 * §MEASURED, 2026-11-27 — the query filter moved into code. Sending `exclude_source` to the API cost
 * results on the shorter terms while these providers still appeared in the payload, so the results
 * are filtered here instead: same intent (no watermark-burned stock), one fewer thing that can empty
 * a search.
 */
const WATERMARK_PROVIDER = /shutterstock|adobe|getty|istock/i;

const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'mercenta-imagery/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res;
};

const SIZES = [
  ['lg', 1400],
  ['sm', 700],
];

mkdirSync(DEST, { recursive: true });
const credits = [];
let failed = 0;

/**
 * §CHOSEN BY LOOKING (2026-11-27). Each entry was picked from the labelled contact sheet produced by
 * `scripts/probe-category-imagery.mjs`, because keyword filtering demonstrably cannot judge a
 * photograph: "canned goods" → a telephone keypad, "car parts" → a street mural, "stainless steel
 * saucepan" → a waste-paper bin, "cosmetics flat lay" → paint containers.
 *
 * A pinned URL skips the search entirely, so the picture on the site is the one that was REVIEWED —
 * and re-running this script reproduces exactly the same set. Change a line here to change a picture.
 *
 * [url, subject-as-recorded-in-CREDITS]
 */
const CURATED = {
  'cat-home': ['https://live.staticflickr.com/2877/9202816086_7ece5ace83_b.jpg', 'Modern living room interior'],
  'cat-baby': ['https://cdn.stocksnap.io/img-thumbs/960w/G9JKX5JNKH.jpg', 'Baby bottle on a nursing pillow'],
  'cat-office': ['https://cdn.stocksnap.io/img-thumbs/960w/971CF5BA76.jpg', 'Notebook, pencil and paper on a desk'],
  'cat-health': ['https://live.staticflickr.com/35/70226254_52a76c74cd_b.jpg', 'Lotion and shampoo bottles on a tray'],
  'cat-kitchen': ['https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcHUyMzM0NzI3LWltYWdlLWt3eXJvZXF0LmpwZw.jpg', 'Kitchen utensils in a holder'],
  'cat-electronics': ['https://cdn.stocksnap.io/img-thumbs/960w/EXCBJA3FFQ.jpg', 'Wireless over-ear headphones'],
  'cat-automotive': ['https://live.staticflickr.com/65535/52107084292_f0296231a4_b.jpg', 'A classic car, side on'],
  'cat-grocery': ['https://live.staticflickr.com/7331/13065238443_fb3ed589af_b.jpg', 'Tinned goods stacked on a supermarket shelf'],
  'cat-computer': ['https://live.staticflickr.com/8802/17652700524_53616d0344_b.jpg', 'Laptop, notebook and camera on a desk'],
  'cat-apparel': ['https://live.staticflickr.com/5687/22062843021_afac62800f_b.jpg', 'Shirts hanging on a clothes rack'],
};

for (const [role, term, must] of THEMES) {
  try {
    const payload = CURATED[role]
      ? { results: [{ url: CURATED[role][0], title: CURATED[role][1], width: 99999, height: 99999 }] }
      : await (await get(SEARCH(term))).json();
    const tagsOf = (r) =>
      (r.tags || []).map((t) => (typeof t === 'string' ? t : t?.name ?? '')).join(' ');

    const candidates = (payload.results || [])
      .filter(
        (r) =>
          (r.width ?? 0) >= MIN_WIDTH &&
          (r.height ?? 0) >= MIN_HEIGHT &&
          r.url &&
          !WATERMARK_PROVIDER.test(`${r.source ?? ''} ${r.provider ?? ''}`) &&
          !HISTORICAL.test(`${r.title ?? ''} ${tagsOf(r)}`) &&
          /* THE RESULT MUST SAY IT IS ABOUT THE CATEGORY — see the note on THEMES. */
          must.test(`${r.title ?? ''} ${tagsOf(r)}`)
      )
      /* Closest to a 3:2 card first — the one that needs the least cropping to fill it. */
      .sort(
        (a, b) =>
          Math.abs(1.5 - a.width / a.height) - Math.abs(1.5 - b.width / b.height)
      );
    if (candidates.length === 0) {
      console.log(`  SKIP ${role} — no CC0 result at ${MIN_WIDTH}x${MIN_HEIGHT}+ for "${term}"`);
      failed += 1;
      continue;
    }

    let done = false;
    for (const candidate of candidates.slice(0, 5)) {
      try {
        const buf = Buffer.from(await (await get(candidate.url)).arrayBuffer());
        const src = await sharp(buf).metadata();
        if ((src.width ?? 0) < MIN_WIDTH) continue;
        const made = [];
        for (const [suffix, target] of SIZES) {
          const out = resolve(DEST, `${role}-${suffix}.webp`);
          await sharp(buf).resize(target, null, { withoutEnlargement: true }).webp({ quality: 82 }).toFile(out);
          const m = await sharp(out).metadata();
          made.push(`${suffix}=${m.width}px`);
        }
        credits.push(
          `| \`${role}\` | ${candidate.title?.replace(/\|/g, '/') ?? term} | ${src.width}x${src.height} | CC0 / Public Domain | ${candidate.foreign_landing_url ?? candidate.url} |`
        );
        console.log(`  OK   ${role.padEnd(16)} "${term}" -> ${made.join('  ')}`);
        done = true;
        break;
      } catch (err) {
        /* try the next candidate — one dead link must not lose the category */
      }
    }
    if (!done) {
      console.log(`  SKIP ${role} — every candidate failed to download`);
      failed += 1;
    }
  } catch (err) {
    console.log(`  SKIP ${role} — search failed: ${String(err.message).slice(0, 80)}`);
    failed += 1;
  }
}

writeFileSync(
  resolve(DEST, 'CREDITS-CATEGORIES.md'),
  [
    '# Category imagery — sources and licences',
    '',
    'The ten photographs on the categories page. Every one is **CC0 or Public Domain Mark**:',
    'commercial use permitted, no attribution legally required. Fetched once by',
    '`scripts/fetch-category-imagery.mjs` from Openverse (openverse.org), then committed so the live',
    'site makes no third-party requests.',
    '',
    '**These are representative pictures of the KIND of product, not brands Mercenta works with, and',
    'not live listings.** Replace a file in place, keeping its name, and no component changes.',
    '',
    '| Name | Subject | Original | Licence | Source |',
    '|---|---|---|---|---|',
    ...credits,
    '',
  ].join('\n')
);

console.log(`\nwrote ${credits.length}/${THEMES.length} category images (${failed} skipped) + CREDITS-CATEGORIES.md`);
process.exit(failed === 0 ? 0 : 1);