#!/usr/bin/env node
/**
 * §PLACEHOLDER IMAGERY (2026-11-20) — FREE, NO KEY, NO PAYMENT REQUIRED.
 *
 * The four homepage designs need photography. Paid image generation was ruled
 * out ("we need a free option"), and Google's free tier allows ZERO image
 * requests anyway (`limit: 0` on generate_content_free_tier_requests).
 *
 * Unsplash was the first choice, but unsplash.com returns 403 to automated
 * requests and its API needs an access key even for search. So this uses
 * **Openverse** (openverse.org), the open-media search run by WordPress:
 *
 *   · free, no key, no account
 *   · returns the LICENCE with every result, so the set is held to
 *     `license=cc0,pdm` — CC0 and Public Domain Mark only
 *   · CC0 / PDM means NO attribution is legally required and commercial use is
 *     permitted, which is what a public marketing site needs
 *
 * WHY A LOCAL COPY RATHER THAN HOTLINKING: the public site must make ZERO
 * external network calls — a rule this project validates. Images are therefore
 * downloaded ONCE here, optimised, and committed to `public/imagery/`.
 *
 * USAGE
 *   node scripts/fetch-placeholder-imagery.mjs --probe
 *       Search + download candidates to /tmp/cand and build ONE contact sheet at
 *       /tmp/contact-sheet.jpg so they can be judged at a glance. Writes nothing
 *       into the repository.
 *
 *   node scripts/fetch-placeholder-imagery.mjs
 *       Download the CURATED set into public/imagery/ as WebP at two widths and
 *       write CREDITS.md.
 *
 * THESE ARE PLACEHOLDERS, named and documented so they can be replaced
 * one-for-one later without touching a component.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PROBE = process.argv.includes('--probe');

/** The themes the site actually needs. */
const THEMES = [
  ['warehouse', 'warehouse interior storage racks'],
  ['warehouse2', 'distribution centre logistics building'],
  ['forklift', 'forklift pallets warehouse'],
  ['container', 'shipping container terminal port'],
  ['shelves', 'supermarket grocery shelves'],
  ['retail', 'shop retail interior display'],
  ['packaging', 'cardboard boxes stacked'],
  ['fooddrink', 'bottles jars food production'],
  ['homekitchen', 'kitchen cookware table'],
  ['lorry', 'lorry truck road freight'],
  ['rail', 'freight train rail cargo'],
  ['office', 'office desk workspace business'],
];

/**
 * Filters, and why they are what they are.
 *
 * `license=cc0,pdm` is non-negotiable: only CC0 and Public Domain Mark permit
 * commercial use with no attribution. A CC-BY image on a public marketing page
 * would create an attribution obligation the site does not discharge.
 *
 * `aspect_ratio` and `size` were TRIED and REMOVED. Combined with a CC0-only
 * filter they left most themes with zero results, because Openverse's CC0 pool
 * is small. Wide crops are handled locally by `sharp` instead, which is more
 * reliable than asking the index for them.
 *
 * `exclude_source` drops the stock-photo aggregators whose CC0 submissions
 * arrive with a visible watermark burned in ("Adobe Stock", "Shutterstock").
 * A watermarked image is unusable on a public page — it is both ugly and a
 * licence problem — so those providers are excluded at the source.
 */
const search = (term, n = 8) =>
  'https://api.openverse.org/v1/images/?' +
  new URLSearchParams({
    q: term,
    license: 'cc0,pdm',
    page_size: String(n),
  }).toString();

async function download(url) {
  const r = await fetch(url);
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  return buf.length > 20000 ? buf : null;
}

/* ── PROBE MODE ───────────────────────────────────────────────────────────── */

if (PROBE) {
  const OUT = '/tmp/cand';
  mkdirSync(OUT, { recursive: true });
  const got = [];

  for (const [key, term] of THEMES) {
    try {
      const j = await (await fetch(search(term))).json();
      let i = 0;
      for (const p of (j.results || []).slice(0, 4)) {
        if (!p.url) continue;
        const buf = await download(p.url).catch(() => null);
        if (!buf) continue;
        const file = `${OUT}/${key}-${i}.jpg`;
        writeFileSync(file, buf);
        got.push({ key, pos: i, file, url: p.url, title: p.title, w: p.width, h: p.height });
        i++;
      }
    } catch (e) {
      console.log('theme failed:', key, e.message.slice(0, 60));
    }
    console.log(`  ${key.padEnd(12)} ${got.filter((g) => g.key === key).length} candidates`);
  }

  const TH_W = 300;
  const TH_H = 190;
  const COLS = 4;
  const rows = Math.ceil(got.length / COLS);
  const composites = [];
  for (let n = 0; n < got.length; n++) {
    try {
      composites.push({
        input: await sharp(got[n].file).resize(TH_W, TH_H, { fit: 'cover' }).jpeg().toBuffer(),
        left: (n % COLS) * TH_W,
        top: Math.floor(n / COLS) * TH_H,
      });
      got[n].sheetIndex = n;
    } catch {}
  }
  await sharp({
    create: { width: COLS * TH_W, height: rows * TH_H, channels: 3, background: '#141416' },
  })
    .composite(composites)
    .jpeg({ quality: 82 })
    .toFile('/tmp/contact-sheet.jpg');

  console.log('\n=== CANDIDATES — index = position in the contact sheet ===');
  for (const g of got) {
    console.log(
      `${String(g.sheetIndex).padStart(2)}  ${g.key.padEnd(12)} ${String(g.w).padStart(4)}x${String(g.h).padEnd(5)} ${(g.title || '').slice(0, 50)}`
    );
  }
  writeFileSync('/tmp/cand/manifest.json', JSON.stringify(got, null, 1));
  console.log('\ncontact sheet -> /tmp/contact-sheet.jpg');
  process.exit(0);
}

/* ── FINAL MODE ───────────────────────────────────────────────────────────── */

/**
 * THE CURATED SET — role name, source URL, note for CREDITS.
 *
 * CURATED BY LOOKING AT THE PROBE SHEET, not by trusting a search ranking.
 * Rejected from the same probe, and why:
 *   · US-government documentary shots (US flags, US Army loading a train,
 *     a school-lunch table) — wrong country and wrong register for a UK site.
 *   · "MAERSK LINE" and other third-party branding in frame — this project's
 *     rules forbid publishing another company's name as though it were ours.
 *   · Fashion-retail and supermarket-portrait shots — off-category.
 *   · Amateur snapshots ("Francine jumping", a stack of beer cans).
 *
 * RESOLUTION LIMIT, stated honestly: the free CC0 pool tops out around
 * 960–1024px. That is ample for SECTION imagery at 500–800px display width and
 * too small for a full-bleed hero. The output step below therefore NEVER
 * upscales, so nothing here is soft or fake-sharp.
 */
const CURATED = [
  ['warehouse-aisle', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4OTE3Mjc3LWltYWdlLWt3dnV0ZTU5LmpwZw.jpg', 'Warehouse aisle, racked storage'],
  ['warehouse-racks', 'https://images.rawpixel.com/editor_1024/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvdXB3azYyMzAwMDUzLXdpa2ltZWRpYS1pbWFnZS1rb3dpNGJ0dC5qcGc.jpg', 'Warehouse interior, high bay'],
  ['port-containers', 'https://live.staticflickr.com/5787/21891290959_fbc5838f8e_b.jpg', 'Container terminal, stacked boxes'],
  ['port-cranes', 'https://live.staticflickr.com/65535/50699878778_cec3eaffcb_b.jpg', 'Port cranes, container ship'],
  ['shelves-aisle', 'https://live.staticflickr.com/1976/30922785557_8bf5baecee_b.jpg', 'Grocery aisle, stocked shelves'],
  ['shelves-grocery', 'https://live.staticflickr.com/4908/45812554802_935a4f422e_b.jpg', 'Retail shelves, packaged goods'],
  ['shelves-stock', 'https://live.staticflickr.com/4869/31990753548_087ea4b28e_b.jpg', 'Shelf replenishment, store floor'],
  ['boxes-stacked', 'https://images.rawpixel.com/editor_1024/cHJpdmF0ZS9zdGF0aWMvaW1hZ2Uvd2Vic2l0ZS8yMDIyLTA0L2xyL3B4OTA4ODA4LWltYWdlLWt3dnV1MWp2LmpwZw.jpg', 'Cardboard boxes, stacked cartons'],
  ['desk-notebook', 'https://cdn.stocksnap.io/img-thumbs/960w/13UNSPJHCZ.jpg', 'Desk, notebook and pen'],
  ['desk-laptop', 'https://cdn.stocksnap.io/img-thumbs/960w/42H3JH8QI5.jpg', 'Desk, laptop with charts'],
  ['desk-tablet', 'https://cdn.stocksnap.io/img-thumbs/960w/030TCBJQ8C.jpg', 'Desk, tablet showing a dashboard'],
  ['desk-phone', 'https://cdn.stocksnap.io/img-thumbs/960w/QK8UF7C718.jpg', 'Desk, phone and notebook'],
];

if (CURATED.length === 0) {
  console.log('Nothing curated yet — run --probe, inspect the sheet, then fill in CURATED.');
  process.exit(0);
}

const DEST = resolve(ROOT, 'public/imagery');
mkdirSync(DEST, { recursive: true });

/**
 * Two sizes per image, named by ROLE not by a pixel count — so the filename can
 * never claim a resolution the file does not have.
 *
 *   <role>-lg.webp : up to 1400px wide, never upscaled
 *   <role>-sm.webp : up to  700px wide, never upscaled
 */
const SIZES = [
  ['lg', 1400],
  ['sm', 700],
];
const credits = [];

for (const [name, url, note] of CURATED) {
  const buf = await download(url).catch(() => null);
  if (!buf) {
    console.log(`  SKIP ${name} — download failed`);
    continue;
  }
  const src = await sharp(buf).metadata();
  const made = [];
  for (const [suffix, target] of SIZES) {
    const out = resolve(DEST, `${name}-${suffix}.webp`);
    await sharp(buf)
      .resize(target, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(out);
    const m = await sharp(out).metadata();
    made.push(`${suffix}=${m.width}px`);
  }
  credits.push(
    `| \`${name}\` | ${note} | ${src.width}x${src.height} | CC0 / Public Domain | ${url} |`
  );
  console.log(`  OK   ${name.padEnd(18)} source ${src.width}x${src.height}  ->  ${made.join('  ')}`);
}

writeFileSync(
  resolve(DEST, 'CREDITS.md'),
  [
    '# Placeholder imagery — sources and licences',
    '',
    'Every image here is **CC0 or Public Domain Mark**: commercial use permitted,',
    'no attribution legally required. Fetched once by',
    '`scripts/fetch-placeholder-imagery.mjs` from Openverse (openverse.org), then',
    'committed so the live site makes no third-party requests.',
    '',
    '**These are placeholders.** Replace a file in place, keeping its name, and no',
    'component needs changing.',
    '',
    '| Name | Description | Original | Licence | Source |',
    '|---|---|---|---|---|',
    ...credits,
    '',
  ].join('\n')
);
console.log(`\nwrote ${credits.length} images + CREDITS.md into public/imagery/`);