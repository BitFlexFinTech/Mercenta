// §P4 — DUPLICATE OWNERS — the one-owner gate.
//
// WHY THIS EXISTS
// ---------------
// `docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md` §3 P4 requires duplicate
// owners of the same value be consolidated to ONE each. A duplicated label map is
// invisible to a typecheck AND a build: two maps can disagree and nothing fails,
// because each is internally valid — the drift only shows as the SAME state
// reading two different words on two screens.
//
// This gate pins the consolidations P4 verified and fixes:
//   DO1  the canonical presentation owner still owns BOTH the application-status
//        and the purchase-order-status vocabularies;
//   DO2  the application-status labels have exactly ONE owner — no other source
//        file re-declares the `info_requested → "Info Requested"` map (this was
//        the real duplicate, `src/components/admin/ApplicationsPanel.tsx`);
//   DO3  the purchase-order-status labels have ONE owner — no other source file
//        re-declares the `ready_to_fulfil → "Ready to Fulfil"` map;
//   DO4  the "Received"-class wording defect cannot return: the PO lifecycle's
//        `received` label is the disambiguated "Received from channel", never the
//        bare "Received" that used to also label the goods-received state;
//   DO5  the specific fixed duplicate (ApplicationsPanel) stays fixed.
// Every mutation-sensitive assertion was PROVED ABLE TO FAIL in the session that
// added it (the mutated file was restored byte-identical).
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

let failures = 0;
let checks = 0;
const test = (name, ok, detail) => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 800)}`);
  }
};

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');
const OWNER = 'src/lib/statusPresentation.ts';
const ownerText = readFileSync(join(ROOT, OWNER), 'utf8');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts') || p.endsWith('.tsx')) out.push(p);
  }
  return out;
}
const allSrc = walk(SRC);

/** Every source file OTHER than the canonical owner. */
const others = allSrc.filter((f) => relative(ROOT, f) !== OWNER);

/** Files whose text matches a regex (used for "no second owner" checks). */
const matches = (re) =>
  others.filter((f) => re.test(readFileSync(f, 'utf8'))).map((f) => relative(ROOT, f));

// ── DO1 — the canonical owner still owns both vocabularies ────────────────────
test('DO1 statusPresentation owns the application-status vocabulary (applicationStatusPresentation)',
  /export function applicationStatusPresentation\b/.test(ownerText));
test('DO1 statusPresentation owns the purchase-order-status vocabulary (poStatusPresentation)',
  /export function poStatusPresentation\b/.test(ownerText));

// ── DO2 — ONE owner of the application-status labels ─────────────────────────
const appLabelDupes = matches(/\binfo_requested\s*:\s*['"`]Info Requested['"`]/);
test('DO2 the application-status labels have ONE owner (no second `info_requested → "Info Requested"` map)',
  appLabelDupes.length === 0, appLabelDupes.join('\n        - '));

// ── DO3 — ONE owner of the purchase-order-status labels ──────────────────────
const poLabelDupes = matches(/\bready_to_fulfil\s*:\s*['"`]Ready to Fulfil['"`]/);
test('DO3 the purchase-order-status labels have ONE owner (no second `ready_to_fulfil → "Ready to Fulfil"` map)',
  poLabelDupes.length === 0, poLabelDupes.join('\n        - '));

// ── DO4 — the "Received"-class wording defect cannot return ──────────────────
test('DO4 the PO `received` label stays disambiguated ("Received from channel", never the bare "Received")',
  /received:\s*\{\s*label:\s*['"`]Received from channel['"`]/.test(ownerText));

// ── DO5 — the fixed duplicate (ApplicationsPanel) stays fixed ────────────────
const panel = readFileSync(join(SRC, 'components/admin/ApplicationsPanel.tsx'), 'utf8');
test('DO5 ApplicationsPanel no longer DECLARES a local STATUS_LABELS map',
  !/const\s+STATUS_LABELS\b/.test(panel));
test('DO5 ApplicationsPanel reads the ONE owner for its filter labels',
  /applicationStatusPresentation\(f\)\.label/.test(panel));

console.log(`\nDUPLICATE_OWNERS_VALIDATION ${failures === 0 ? 'PASS' : 'FAIL'} (${checks - failures}/${checks} checks)`);
process.exit(failures > 0 ? 1 : 0);
