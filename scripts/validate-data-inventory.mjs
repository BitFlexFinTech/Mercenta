// §PHASE 15 — THE THIRD-PARTY DATA INVENTORY GATE.
//
// WHY THIS EXISTS
// ---------------
// `src/config/dataProcessing.ts` is now the SINGLE OWNER of Mercenta's
// third-party processor inventory (the UK GDPR Article 30 register). Before this
// gate, that inventory was prose: the privacy policy's "who we share it with"
// could fall behind the platform with nothing failing, and a new integration that
// touches personal data could be added to the registry without appearing in the
// register.
//
// This gate EXECUTES the real module (Node's TypeScript stripping) and proves:
//   1. the inventory is non-empty and every entry is COMPLETE — a purpose, a
//      lawful basis from the closed set, at least one personal-data category, a
//      data-residency line, a boolean DPA flag and a valid status;
//   2. every `provider` names a provider actually registered in
//      `src/integrations/types.ts`, and no provider is declared twice;
//   3. every REGISTERED provider is either DECLARED in the inventory or
//      deliberately EXCLUDED with a reason — so a provider can never be added
//      undeclared and silently process personal data;
//   4. the public-safe projection is COMPLETE (every category an ACTIVE processor
//      uses has a public row) and HONEST (no public row for an unused category),
//      and no supplier NAME leaks into it;
//   5. the legal sign-off state is a DECLARED, recognised value pinning the exact
//      current truth — the gate cannot be silently re-opened or mis-declared
//      (§2026-10-12 — REPOINTED: the Owner gave the sign-off, so this now pins
//      `legal_sign_off_given` rather than the old `pending_legal_sign_off`);
//   6. the privacy policy READS the owner (it does not hold its own prose list).
//
// A change that engages a new processor, drops a field, breaks the provider link,
// leaks a supplier name into public copy, or claims the sign-off is done FAILS.
import { readFileSync } from 'node:fs';

let failures = 0;
let checks = 0;
const test = (name, ok, detail) => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 600)}`);
  }
};

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');

const MODULE = 'src/config/dataProcessing.ts';
const mod = await import(new URL(MODULE, ROOT).href);
const {
  DATA_PROCESSORS,
  INVENTORY_EXCLUSIONS,
  PUBLIC_PROCESSING_CATEGORIES,
  PROCESSING_LAWFUL_BASES,
  PERSONAL_DATA_CATEGORIES,
  DATA_PROCESSING_LEGAL_SIGNOFF,
} = mod;

/* The providers actually registered in the integration registry, read from the
   INITIAL_INTEGRATIONS block so this gate can never drift from the real list. */
const typesSrc = read('src/integrations/types.ts');
const block = typesSrc.slice(
  typesSrc.indexOf('export const INITIAL_INTEGRATIONS'),
  typesSrc.indexOf('/* API keys are held IN-MEMORY ONLY')
);
const registered = [...block.matchAll(/^\s*([a-z][a-z0-9_]*):\s*\{/gm)].map((m) => m[1]);

/* ── 1. non-empty and complete ─────────────────────────────────────────────── */
test('the inventory is non-empty (fails closed on an empty register)', DATA_PROCESSORS.length >= 5, DATA_PROCESSORS.length);
test('at least one processor is registered as ACTIVE', DATA_PROCESSORS.some((p) => p.status === 'active'));

const ids = DATA_PROCESSORS.map((p) => p.id);
test('every processor id is unique and non-empty',
  new Set(ids).size === ids.length && ids.every((i) => typeof i === 'string' && i.length > 0),
  ids.join(','));

const LAWFUL = new Set(PROCESSING_LAWFUL_BASES);
const DATACATS = new Set(PERSONAL_DATA_CATEGORIES);
const incomplete = DATA_PROCESSORS.filter((p) =>
  !(typeof p.name === 'string' && p.name.length > 0) ||
  !(typeof p.purpose === 'string' && p.purpose.length > 8) ||
  !(typeof p.location === 'string' && p.location.length > 0) ||
  typeof p.dpaRequired !== 'boolean' ||
  !['active', 'planned'].includes(p.status) ||
  !LAWFUL.has(p.lawfulBasis) ||
  !Array.isArray(p.dataCategories) || p.dataCategories.length === 0 ||
  !p.dataCategories.every((c) => DATACATS.has(c))
);
test('every processor entry is complete (purpose · lawful basis · data categories · location · DPA · status)',
  incomplete.length === 0, incomplete.map((p) => p.id).join(', '));

/* ── 2. the provider link is real, and declared once ──────────────────────── */
const linked = DATA_PROCESSORS.filter((p) => p.provider !== null).map((p) => p.provider);
const linkedSet = new Set(linked);
test('every `provider` names a provider actually registered in src/integrations/types.ts',
  linked.every((p) => registered.includes(p)),
  linked.filter((p) => !registered.includes(p)).join(', '));
test('no provider is declared twice in the inventory',
  linkedSet.size === linked.length,
  linked.join(', '));

/* ── 3. every registered provider is declared OR excluded (with a reason) ──── */
const declared = new Set(linked);
const excluded = Object.keys(INVENTORY_EXCLUSIONS);
const undeclared = registered.filter((p) => !declared.has(p) && !excluded.includes(p));
test('every registered provider is EITHER declared in the inventory OR consciously excluded',
  undeclared.length === 0, undeclared.join(', '));
const both = registered.filter((p) => declared.has(p) && excluded.includes(p));
test('no provider is both declared AND excluded', both.length === 0, both.join(', '));
test('every exclusion states a reason',
  excluded.every((p) => typeof INVENTORY_EXCLUSIONS[p] === 'string' && INVENTORY_EXCLUSIONS[p].length > 20),
  excluded.join(', '));

/* ── 4. the public projection is complete, honest and name-free ────────────── */
const publicCats = new Set(PUBLIC_PROCESSING_CATEGORIES.map((c) => c.category));
const activeCats = new Set(DATA_PROCESSORS.filter((p) => p.status === 'active').map((p) => p.category));
const allCats = new Set(DATA_PROCESSORS.map((p) => p.category));
const missingPublic = [...activeCats].filter((c) => !publicCats.has(c));
test('every category used by an ACTIVE processor has a public-safe row',
  missingPublic.length === 0, missingPublic.join(', '));
const unusedPublic = [...publicCats].filter((c) => !allCats.has(c));
test('no public-safe row exists for a category no processor uses',
  unusedPublic.length === 0, unusedPublic.join(', '));

const publicText = PUBLIC_PROCESSING_CATEGORIES
  .map((c) => `${c.label} ${c.purpose}`)
  .join(' ')
  .toLowerCase();
const leakedNames = DATA_PROCESSORS
  .map((p) => p.name)
  .filter((n) => publicText.includes(n.toLowerCase()));
test('no supplier NAME leaks into the public-safe projection', leakedNames.length === 0, leakedNames.join(', '));

/* ── 5. the legal sign-off state is DECLARED and recognised ──────────────────
 * §2026-10-12 — REPOINTED (rule 07: repoint, never weaken). This previously
 * asserted the state was exactly `pending_legal_sign_off`. The Owner gave the
 * legal sign-off on 2026-10-12, so the gate moved to `legal_sign_off_given`. The
 * check now pins the CLOSED SET of declared states (so a typo or a blank state
 * fails) AND the exact current value (so the gate cannot be silently re-opened or
 * flipped without the declaration changing with it). */
const LEGAL_SIGNOFF_STATES = ['pending_legal_sign_off', 'legal_sign_off_given'];
test('the legal sign-off state is a declared, recognised value (never absent/typo)',
  LEGAL_SIGNOFF_STATES.includes(DATA_PROCESSING_LEGAL_SIGNOFF.state),
  DATA_PROCESSING_LEGAL_SIGNOFF.state);
test('§2026-10-12 — the legal sign-off is declared GIVEN (the Owner gave it)',
  DATA_PROCESSING_LEGAL_SIGNOFF.state === 'legal_sign_off_given',
  DATA_PROCESSING_LEGAL_SIGNOFF.state);

/* ── 6. the privacy policy READS the owner ────────────────────────────────── */
const policy = read('src/components/marketing/PrivacyPolicy.tsx');
test('the privacy policy imports the inventory owner',
  /from ['"]@\/config\/dataProcessing['"]/.test(policy));
test('the privacy policy derives its "who we share with" list from the owner',
  /publicProcessorCategories\(\)/.test(policy));

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) {
  console.error(`\n${failures} FAILED`);
  process.exit(1);
}
console.log('DATA_INVENTORY_VALIDATION PASS');
process.exit(0);
