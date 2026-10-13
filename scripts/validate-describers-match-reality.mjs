/**
 * §PHASE B (2026-10-13) — A DOCUMENT MUST NOT DESCRIBE A THING THAT IS GONE.
 *
 * THE DEFECT THIS GATE EXISTS FOR
 * -------------------------------
 * The 3PL carrier surface was REMOVED on 2026-09-23 (§P9, Founder decision T-2),
 * and `scripts/validate-conversion-gate.mjs` has asserted ever since that
 * `src/components/layout/CarrierShell.tsx` and `src/components/carrier/` do not
 * exist. The CODE was guarded. **The PROSE was not** — and so on 2026-10-13 four
 * live documents still described the carrier shell as present:
 *   · `MERCENTA_ARCHITECTURE.md` — a fourth `carrier → CarrierShell` branch,
 *     in a tree it called exhaustive;
 *   · `MERCENTA_MASTER_CONTEXT.md` — listed `CarrierShell` among the shells;
 *   · `docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md` — "Shells: 4", 
 *     "Environments: 5 … carrier", "Session roles: 4 … 3PL Carrier",
 *     "Carrier nav views: 3 ids";
 *   · and their neighbours.
 *
 * This is the documented failure mode of `10-describers-must-match-reality`: an
 * absence guard on the CODE does not protect a claim about the code. This gate is
 * the missing half. It is the class fix, not the instance fix.
 *
 * HOW IT DECIDES
 * --------------
 * Truth is DISCOVERED from the owner of each fact, never retyped here:
 *   · the shells that exist  ← the actual files in `src/components/layout/`;
 *   · the environments       ← `src/types.ts`;
 *   · the session roles      ← `src/types.ts`.
 * A LIVE describer line that presents a REMOVED thing as PRESENT fails, unless
 * the line itself carries a correction/removal marker (in which case it is the
 * record of the removal, which the rules REQUIRE be kept).
 */
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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
const rootDir = fileURLToPath(ROOT);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const exists = (p) => existsSync(join(rootDir, p));

/* ── 1. DISCOVER the truth from the code (never a retyped list) ─────────── */

const layoutDir = join(rootDir, 'src/components/layout');
const shellFiles = readdirSync(layoutDir).filter((f) => /Shell\.tsx$/.test(f));
const shellsPresent = shellFiles.map((f) => f.replace('.tsx', '')).sort();

test(
  'the shells present on disk were discovered (a check that finds nothing is a FAILURE)',
  shellsPresent.length >= 3,
  shellsPresent.join(', ')
);
test(
  'the discovery is real: the three live shells exist on disk',
  ['AdminShell', 'BrandShell', 'HomeShell'].every((s) => shellsPresent.includes(s)),
  shellsPresent.join(', ')
);
test(
  'the REMOVED carrier shell is absent from disk (the premise of this gate)',
  !shellsPresent.includes('CarrierShell') && !exists('src/components/carrier')
);

const typesSrc = read('src/types.ts');
const envBlock = (typesSrc.match(/export type Environment\s*=\s*([^;]+);/) || [, ''])[1];
const environmentsPresent = (envBlock.match(/'([a-z]+)'/g) || []).map((s) => s.replace(/'/g, ''));
const roleBlock = (typesSrc.match(/export type SessionRole\s*=\s*([^;]+);/) || [, ''])[1];
const rolesPresent = (roleBlock.match(/'([^']+)'/g) || []).map((s) => s.replace(/'/g, ''));

test(
  `the environments present were discovered (${environmentsPresent.join(', ') || 'NONE'})`,
  environmentsPresent.length >= 3,
  `from src/types.ts: ${envBlock.trim()}`
);
test(
  `the session roles present were discovered (${rolesPresent.join(', ') || 'NONE'})`,
  rolesPresent.length >= 3,
  `from src/types.ts: ${roleBlock.trim()}`
);
test(
  "the REMOVED 'carrier' environment is genuinely absent from src/types.ts",
  !environmentsPresent.includes('carrier')
);
test(
  "the REMOVED '3PL Carrier' session role is genuinely absent from src/types.ts",
  !rolesPresent.includes('3PL Carrier')
);

/* ── 2. describe the removed things, and what a LIVE claim looks like ───── */

/**
 * Each removed thing: its primary identifier, the words that prove a line is
 * about its REMOVAL rather than its presence, and the id it was removed WITH.
 */
const REMOVED = [
  {
    id: 'CarrierShell',
    aliases: [/CarrierShell/g],
  },
  {
    id: 'the carrier environment',
    aliases: [/\bcarrier\b/gi],
    /* Only counts when it reads as an environment value, not as a carrier NAME
       (DHL/Palletline are live carriers and must not be flagged). */
    requiresContext: /environment|\bcarrier\s*['"`]|\bcarrier\b\s*\)?\s*[,|·]|\bcarrier\b\s*\|\s*(home|login|brand|admin)/i,
  },
];

/** A line is the RECORD of a removal — allowed, and required — when it says so. */
const REMOVAL_MARKER =
  /\b(REMOVED|is gone|are gone|do not exist|does not exist|no longer|CORRECTION|REPOINTED|HISTORY ONLY|historical|RETIRED|deleted|DELETED|retired|EXCLUDED|excluded)\b/i;

/* The live canonical describers. A chronological session log is excluded on
   purpose: it records what was true WHEN WRITTEN, and is not a live claim. */
const LIVE_DESCRIBERS = [
  'MERCENTA_ARCHITECTURE.md',
  'MERCENTA_MASTER_CONTEXT.md',
  'docs/ARCHITECTURE.md',
  'docs/MERCENTA_MASTER_FEATURE_FUNCTION_MATRIX.md',
  'README.md',
];

test(
  'the live describer set was found on disk',
  LIVE_DESCRIBERS.length > 0 && LIVE_DESCRIBERS.some((d) => exists(d)),
  LIVE_DESCRIBERS.join(', ')
);

/* ── 3. scan each live describer, line by line ─────────────────────────── */

const offences = [];
let linesScanned = 0;

/**
 * Each rule is TARGETED so it cannot fire on innocent prose. A bare search for
 * "carrier" would flag every real carrier (DHL, Palletline) and make this gate
 * useless — the aim is a gate that fails for the right reason and only that.
 */
const RULES = [
  {
    what: 'names a shell that has been removed',
    test: (line) => /\bCarrierShell\b/.test(line),
  },
  {
    what: 'enumerates environments and wrongly includes the removed `carrier` one',
    test: (line) => {
      const l = line.toLowerCase();
      const enumerates =
        /\benvironments?\s*[:|=]/i.test(line) ||
        (['home', 'login', 'brand', 'admin'].every((e) => l.includes(e)) && l.includes('carrier'));
      return enumerates && /\bcarrier\b/.test(l);
    },
  },
  {
    what: "names the removed '3PL Carrier' session role",
    test: (line) => /3PL Carrier/.test(line),
  },
  {
    what: 'states a shell COUNT larger than the three that exist',
    test: (line) => /shells?\s*\|?\s*\*{0,2}\s*4\b/i.test(line) || /\b4\s+shells?\b/i.test(line),
  },
];

/**
 * Join a multi-line BLOCKQUOTE into ONE logical block.
 *
 * WHY. A correction note wraps over several lines, and one of those lines quotes
 * the removed text in order to explain it (e.g. `` `carrier → CarrierShell …` ``).
 * Judged line by line, that continuation reads as a stale claim — so the gate
 * would FAIL the very correction it demands and PASS an unexplained deletion.
 * Treating the blockquote as a unit lets the banner cover its own quotation.
 */
function logicalBlocks(lines) {
  const blocks = [];
  let current = null;
  lines.forEach((line, index) => {
    const quoted = /^\s*>/.test(line);
    if (quoted) {
      if (current) current.text += '\n' + line;
      else current = { startLine: index + 1, text: line };
    } else {
      if (current) {
        blocks.push(current);
        current = null;
      }
      blocks.push({ startLine: index + 1, text: line });
    }
  });
  if (current) blocks.push(current);
  return blocks;
}

for (const doc of LIVE_DESCRIBERS) {
  if (!exists(doc)) continue;
  const lines = read(doc).split('\n');
  linesScanned += lines.length;
  for (const block of logicalBlocks(lines)) {
    /* A block that RECORDS the removal is the required history, not a stale claim. */
    if (REMOVAL_MARKER.test(block.text)) continue;
    for (const rule of RULES) {
      if (rule.test(block.text)) {
        offences.push(
          `${doc}:${block.startLine} ${rule.what}\n        ${block.text.trim().slice(0, 200)}`
        );
      }
    }
  }
}

test(
  `the scan actually read the describers (${linesScanned} lines across ${LIVE_DESCRIBERS.length} documents)`,
  linesScanned > 200,
  `lines=${linesScanned}`
);
test(
  'NO live describer presents a REMOVED shell, environment or role as present',
  offences.length === 0,
  offences.join('\n      ')
);
test(
  'the absence is RECORDED where it was removed (the correction notes survive)',
  /CORRECTION/.test(read('MERCENTA_ARCHITECTURE.md')) &&
    /CORRECTION/.test(read('MERCENTA_MASTER_CONTEXT.md'))
);

console.log(
  failures === 0 ? 'DESCRIBERS_MATCH_REALITY_PASS' : `DESCRIBERS_MATCH_REALITY_FAIL (${failures} of ${checks})`
);
if (failures > 0) process.exitCode = 1;
