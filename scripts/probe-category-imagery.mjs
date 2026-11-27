#!/usr/bin/env node
/**
 * §PUBLIC SURFACES BATCH 5 (2026-11-27) — LOOK AT THE CANDIDATES BEFORE CHOOSING ONE.
 *
 * WHY THIS EXISTS. Three automated passes produced licensed, correctly-sized, WRONG pictures:
 * a telephone keypad for "canned goods", a street mural for "car parts", a museum saucepan, a
 * waste-paper bin for "stainless steel saucepan", paint containers for "cosmetics flat lay". The
 * cause is structural: Openverse titles and tags are noisy, so no keyword filter can decide whether a
 * photograph actually shows the thing. That judgement needs eyes.
 *
 * So this builds ONE contact sheet — every category's shortlist, labelled with its index — and prints
 * the candidate URLs in the same order. Pick the number that is right, pin it in the CURATED map in
 * `fetch-category-imagery.mjs`, and the fetch becomes deterministic and reviewable.
 *
 * Writes nothing into the repository: the sheet goes to /tmp.
 */
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const THEMES = [
  ['h1', 'toothbrush'],
  ['h2', 'shampoo bottle'],
  ['h3', 'vitamins supplements'],
];

const HISTORICAL = /(black and white|blackandwhite|vintage|antique|historic|historical|museum|archive|engraving|lithograph|postcard|\b1[6-9]\d\d\b)/i;
const WATERMARK = /shutterstock|adobe|getty|istock/i;
const COLS = 6;
const CW = 240;
const CH = 160;
const LH = 18;

const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'mercenta-imagery/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
};

const label = (text) =>
  Buffer.from(
    `<svg width="${CW}" height="${LH}" xmlns="http://www.w3.org/2000/svg"><rect width="${CW}" height="${LH}" fill="#111"/><text x="6" y="13" font-family="monospace" font-size="12" fill="#fff">${text}</text></svg>`
  );

const rows = [];
const legend = [];

for (const [role, term] of THEMES) {
  const url =
    'https://api.openverse.org/v1/images/?' +
    new URLSearchParams({ q: term, license: 'cc0,pdm', page_size: '20' }).toString();
  let results = [];
  try {
    const payload = await (await fetch(url, { headers: { 'User-Agent': 'mercenta-imagery/1.0' } })).json();
    results = (payload.results || []).filter(
      (r) =>
        (r.width ?? 0) >= 600 &&
        (r.height ?? 0) >= 320 &&
        !WATERMARK.test(`${r.source ?? ''} ${r.provider ?? ''}`) &&
        !HISTORICAL.test(r.title ?? '')
    );
  } catch (err) {
    console.log(`${role}: search failed`);
  }
  const chosen = results.slice(0, COLS);
  legend.push(`\n${role.toUpperCase()} — "${term}"`);
  chosen.forEach((c, i) => legend.push(`  ${role} ${i + 1}: ${c.title ?? '(untitled)'} — ${c.url}`));
  const tiles = [];
  for (let i = 0; i < COLS; i += 1) {
    const c = chosen[i];
    if (!c) {
      tiles.push({ input: label(`${role.toUpperCase()} -`), left: i * CW, top: 0 });
      continue;
    }
    try {
      const buf = await get(c.thumbnail || c.url);
      const img = await sharp(buf).resize(CW, CH, { fit: 'cover' }).toBuffer();
      tiles.push({ input: img, left: i * CW, top: 0 });
      tiles.push({ input: label(`${role.toUpperCase()} ${i + 1}`), left: i * CW, top: CH });
    } catch {
      tiles.push({ input: label(`${role.toUpperCase()} ${i + 1} x`), left: i * CW, top: 0 });
    }
  }
  rows.push(tiles);
}

const rowH = CH + LH;
const sheetW = COLS * CW;
const sheetH = rows.length * rowH;
const base = sharp({
  create: { width: sheetW, height: sheetH, channels: 3, background: '#222' },
});

const composites = [];
rows.forEach((tiles, row) => {
  for (const t of tiles) {
    composites.push({ ...t, top: (t.top ?? 0) + row * rowH });
  }
});

await base.composite(composites).png().toFile('/tmp/category-contact-sheet.png');
console.log(legend.join('\n'));
console.log('\nsheet: /tmp/category-contact-sheet.png');