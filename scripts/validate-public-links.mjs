#!/usr/bin/env node
/**
 * §PUBLIC NAVIGATION GATE (2026-11-20) — EVERY MENU LINK MUST REACH A REAL PAGE.
 *
 * WHY THIS EXISTS
 * ---------------
 * The live site carried 27 menu links that went nowhere. Seventeen of them
 * landed on a COMPLETELY BLANK SCREEN: `PUBLIC_NAV` declared page ids that had
 * no entry in `PUBLIC_CONTENT_PAGES`, so `renderPublicPageBody` returned `null`,
 * the component returned `null`, and React painted nothing at all.
 *
 * Nothing caught it. `validate:nav-destinations` only checks the ADMIN and BRAND
 * menus. `validate:seo` checks that the route table is well-formed, not that the
 * menu points into it. So the public menu could rot freely, and did.
 *
 * WHAT IT ASSERTS
 * ---------------
 *   1. It parsed the menu at all (a check that finds nothing is a FAILURE).
 *   2. Every link in PUBLIC_NAV resolves to a declared page.
 *   3. Every link in PUBLIC_FOOTER_COLUMNS resolves to a declared page.
 *   4. No duplicate destination appears twice under different ids.
 *   5. The removed "Platform Tools" ids are gone (absence guard).
 *
 * Run: node scripts/validate-public-links.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

let failures = 0;
let checks = 0;
function test(label, ok, detail) {
  checks++;
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.log(`  ✗ ${label}`);
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 600)}`);
  }
}

const POSITIONING = read('src/config/positioning.ts');
const PAGES = read('src/config/publicPages.ts');
const ROUTES = read('src/lib/seo/publicRoutes.ts');

/* ── 1. THE DECLARED PAGES — id → path, discovered from their owners ────────── */

/** Content pages: `id: 'x'` immediately followed by `path: '/y'`. */
const contentPages = new Map();
for (const m of PAGES.matchAll(/\bid:\s*'([a-z0-9-]+)',\s*\n\s*path:\s*'([^']+)'/g)) {
  contentPages.set(m[1], m[2]);
}

/** Hand-declared routes in publicRoutes.ts: `page: 'x'` with a `path:` nearby. */
const handRoutes = new Map();
for (const m of ROUTES.matchAll(/path:\s*([^,\n]+),\s*\n\s*page:\s*'([a-z0-9-]+)'/g)) {
  handRoutes.set(m[2], m[1].trim().replace(/^'|'$/g, ''));
}

const declared = new Map([...handRoutes, ...contentPages]);

test(
  'the page model was discovered (a vacuous discovery is a FAILURE)',
  contentPages.size >= 20 && declared.size >= 20,
  `content pages ${contentPages.size}, total declared ${declared.size}`
);

/* ── 2. THE MENU — every PUBLIC_LINK entry, then every reference to it ──────── */

const linkBlock = POSITIONING.slice(
  POSITIONING.indexOf('export const PUBLIC_LINK'),
  POSITIONING.indexOf('} as const satisfies Record<string, PublicNavLink>')
);
test('the PUBLIC_LINK map was found', linkBlock.length > 100, `block length ${linkBlock.length}`);

const linkToPage = new Map();
for (const m of linkBlock.matchAll(
  /* The label may be a quoted literal — which can itself contain a comma
     ("UK Import, Compliance & Replenishment") — or a constant
     (`label: EXPLORE_UK_MARKET_FIT_CTA`). Both forms are accepted. */
  /([A-Za-z][A-Za-z0-9]*):\s*\{\s*label:\s*(?:'[^']*'|[^,\n]+),\s*page:\s*'([a-z0-9-]+)'/g
)) {
  linkToPage.set(m[1], m[2]);
}
test(
  'every PUBLIC_LINK entry was parsed',
  linkToPage.size >= 25,
  `${linkToPage.size} links: ${[...linkToPage.keys()].join(', ').slice(0, 300)}`
);

/** Every `PUBLIC_LINK.<name>` reference anywhere in the file (nav groups + footer). */
const referenced = new Set(
  [...POSITIONING.matchAll(/PUBLIC_LINK\.([A-Za-z][A-Za-z0-9]*)/g)].map((m) => m[1])
);
test(
  'the navigation references PUBLIC_LINK entries',
  referenced.size >= 20,
  `${referenced.size} references`
);

/* ── 3. EVERY REFERENCE MUST REACH A DECLARED PAGE — THE WHOLE POINT ────────── */

const unresolved = [];
for (const name of referenced) {
  const page = linkToPage.get(name);
  if (!page) {
    unresolved.push(`${name} → (no page declared in PUBLIC_LINK)`);
    continue;
  }
  if (!declared.has(page)) {
    unresolved.push(`${name} → '${page}' has no page and no route`);
  }
}
test(
  'every menu and footer link reaches a declared page',
  unresolved.length === 0,
  unresolved.join('\n      ')
);

/* ── 4. NO DUPLICATE DESTINATION UNDER A SECOND ID ──────────────────────────── */

const seen = new Map();
const duplicates = [];
for (const name of referenced) {
  const page = linkToPage.get(name);
  if (!page) continue;
  const path = declared.get(page);
  if (!path) continue;
  if (seen.has(path)) {
    duplicates.push(`${seen.get(path)} and ${name} both point at ${path}`);
  } else {
    seen.set(path, name);
  }
}
test(
  'no two menu entries point at the same page',
  duplicates.length === 0,
  duplicates.join('\n      ')
);

/* ── 5. ABSENCE GUARD — the deleted "Platform Tools" ids must not come back ─── */

/**
 * Comments are stripped before this check: a removal RECORD that names the ids
 * it removed (which both this repo's rules and readability require) is not the
 * same thing as a live pointer to them. Only CODE counts.
 */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const CODE_POSITIONING = stripComments(POSITIONING);
const CODE_PAGES = stripComments(PAGES);

const REMOVED = [
  'order-automation-page',
  'client-portal-page',
  'listing-health-page',
  'reporting-analytics-page',
];
const resurrected = REMOVED.filter(
  (id) => CODE_POSITIONING.includes(id) || CODE_PAGES.includes(id)
);
test(
  'the four removed "Platform Tools" ids are gone from CODE (absence guard)',
  resurrected.length === 0,
  resurrected.join(', ')
);

const platformToolsGroup = /label:\s*'Platform Tools'/.test(CODE_POSITIONING);
test('the duplicate "Platform Tools" group is gone', !platformToolsGroup);

/* ── RESULT ─────────────────────────────────────────────────────────────────── */

console.log('');
if (failures === 0) {
  console.log(
    `PUBLIC_LINKS_PASS — ${checks} assertions, ${declared.size} declared pages, ${referenced.size} menu/footer links, all reachable`
  );
  process.exit(0);
}
console.error(`PUBLIC_LINKS_FAIL — ${checks} assertions, ${failures} failure(s)`);
process.exit(1);