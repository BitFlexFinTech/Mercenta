#!/usr/bin/env node
/**
 * §VERTICAL ISOLATION — BWS AND TALENT CANNOT SEE EACH OTHER, AND NEITHER SEES CORE.
 *
 * WHY THIS GATE EXISTS
 * --------------------
 * The owner's requirement is absolute: *"A BWS session sees only BWS data · a Talent session
 * sees only Talent data · neither sees CORE data unless they are supposed to."* Isolation that
 * depends on each screen remembering to filter is not isolation — and this project has already
 * paid for that class of mistake once, when four BWS/Talent screens were found reading CORE
 * hooks (`useBrands`, `useProducts`, `usePurchaseOrders`).
 *
 * WHAT IT PROVES
 * --------------
 * SOURCE (the import graph):
 *   S1 the BWS modules import neither CORE demo data nor anything from Talent;
 *   S2 the Talent modules import neither CORE demo data nor anything from BWS;
 *   S3 `src/data/verticalData.ts` is the ONLY module that may know both;
 *   S4 neither vertical's modules import the other's types.
 * RUNTIME (the modules actually loaded, no network):
 *   R1 the BWS bundle contains the BWS collections, at the volumes the source ships;
 *   R2 the Talent bundle contains the Talent collections, same;
 *   R3 the BWS bundle exposes NOTHING Talent-shaped and vice versa (key-level absence);
 *   R4 `core` resolves to `data: null` — a CORE surface is never handed another vertical;
 *   R5 an unknown vertical fails CLOSED (null), never falling back to another vertical.
 *
 * Run: node scripts/validate-vertical-isolation.mjs
 */
import { createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let pass = 0;
const failures = [];
const check = (name, ok, detail = '') => {
  if (ok) pass++;
  else failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
};

const listFiles = (dir) => {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) walk(rel);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(rel);
    }
  };
  if (fs.existsSync(path.join(ROOT, dir))) walk(dir);
  return out;
};

const bwsFiles = listFiles('src/data/bws');
const talentFiles = [...listFiles('src/data/talent'), ...listFiles('src/lib/talent')];
check('BWS modules were discovered (a check that finds nothing is a FAILURE)', bwsFiles.length >= 4, `${bwsFiles.length} files`);
check('Talent modules were discovered (a check that finds nothing is a FAILURE)', talentFiles.length >= 5, `${talentFiles.length} files`);

const CORE_DEMO = /@\/data\/(demoData|demoStore|api|queries)/;
/* A module "knows" a vertical through ANY import form — the alias (`@/data/bws`) or a
   relative specifier (`'./bws'`, `'./talent'`). The first version of this gate matched
   only the alias, so the ONE resolver — which uses `import('./bws')` — was invisible and
   the gate failed for the wrong reason. */
const BWS_MOD = /@\/data\/bws|['"]\.\/bws['"]/;
const TALENT_MOD = /@\/data\/talent|@\/lib\/talent|['"]\.\/talent['"]/;
const BWS_TYPES = /@\/types\/bws/;
const TALENT_TYPES = /@\/types\/talent/;

for (const f of bwsFiles) {
  const src = read(f);
  check(`S1 ${f} does not import CORE demo data`, !CORE_DEMO.test(src));
  check(`S1 ${f} does not import the Talent module`, !TALENT_MOD.test(src));
  check(`S4 ${f} does not import the Talent types`, !TALENT_TYPES.test(src));
}
for (const f of talentFiles) {
  const src = read(f);
  check(`S2 ${f} does not import CORE demo data`, !CORE_DEMO.test(src));
  check(`S2 ${f} does not import the BWS module`, !BWS_MOD.test(src));
  check(`S4 ${f} does not import the BWS types`, !BWS_TYPES.test(src));
}

const allFiles = listFiles('src');
const both = allFiles.filter((f) => {
  const src = read(f);
  return BWS_MOD.test(src) && TALENT_MOD.test(src);
});
check(
  'S3 `src/data/verticalData.ts` is the ONLY module that knows both verticals',
  both.length === 1 && both[0] === 'src/data/verticalData.ts',
  both.join(', ')
);

(async () => {
  /* ── R1–R5: the modules, actually loaded ─────────────────────────────────── */
  const server = await createServer({
    root: ROOT,
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'silent',
  });
  try {
    const resolver = await server.ssrLoadModule('/src/data/verticalData.ts');
    const bws = await resolver.loadVerticalDemoData('bws');
    const talent = await resolver.loadVerticalDemoData('talent_commerce');
    const core = await resolver.loadVerticalDemoData('core');
    const unknown = await resolver.loadVerticalDemoData('not-a-vertical');

    check('R4 `core` resolves to NO vertical bundle (a CORE surface is never handed one)', core.data === null && core.vertical === 'core');
    check("R5 an UNKNOWN vertical fails closed to null (never another vertical's rows)", unknown.data === null);

    const bwsMin = {
      COUNTRIES: 12,
      EVIDENCE_RECORDS: 14,
      PRODUCTS: 16,
      BRANDS: 15,
      DISTILLER_DIRECTORY: 12,
      ADMIN_LAUNCH_CHECKLIST: 14,
      AMAZON_AD_FORMATS: 11,
      AMAZON_AD_CHANNELS: 11,
      IMPORT_EXCISE_RECORDS: 4,
      INVENTORY_ITEMS: 4,
    };
    for (const [key, min] of Object.entries(bwsMin)) {
      const value = bws.data?.[key];
      check(
        `R1 BWS ${key} is present with at least ${min} record(s)`,
        Array.isArray(value) && value.length >= min,
        Array.isArray(value) ? `${value.length}` : 'not an array'
      );
    }
    const talentSentinels = ['INITIAL_TALENTS', 'INITIAL_RELATIONSHIPS', 'INITIAL_ROYALTY_STATEMENTS', 'TALENT_PROFILE'];
    const leakedIntoTalent = talentSentinels.filter((k) => k in (bws.data ?? {}));
    check('R3 the BWS bundle exposes NOTHING Talent-shaped', leakedIntoTalent.length === 0, leakedIntoTalent.join(', '));

    const talentMin = {
      INITIAL_TALENTS: 18,
      INITIAL_RELATIONSHIPS: 19,
      INITIAL_INTL_LISTINGS: 12,
      INITIAL_UK_ASSESSMENTS: 14,
      INITIAL_ACQUISITIONS: 4,
      INITIAL_BRAND_STORES: 3,
      INITIAL_CAMPAIGNS: 9,
    };
    for (const [key, min] of Object.entries(talentMin)) {
      const value = talent.data?.[key];
      check(
        `R2 Talent ${key} is present with at least ${min} record(s)`,
        Array.isArray(value) && value.length >= min,
        Array.isArray(value) ? `${value.length}` : 'not an array'
      );
    }
    const bwsSentinels = ['COUNTRIES', 'DISTILLER_DIRECTORY', 'ADMIN_LAUNCH_CHECKLIST', 'AMAZON_AD_FORMATS'];
    const leakedIntoBws = bwsSentinels.filter((k) => k in (talent.data ?? {}));
    check('R3 the Talent bundle exposes NOTHING BWS-shaped', leakedIntoBws.length === 0, leakedIntoBws.join(', '));
  } finally {
    await server.close();
  }

  console.log('');
  if (failures.length) {
    for (const f of failures) console.log(`✗ ${f}`);
    console.log(`VERTICAL_ISOLATION_VALIDATION_FAILED — ${failures.length} of ${pass + failures.length} assertions failed.`);
    process.exit(1);
  }
  console.log(
    `VERTICAL_ISOLATION_VALIDATION_PASS — BWS and Talent are isolated in the import graph and at runtime; CORE gets neither. (${pass} assertions)`
  );
})();
