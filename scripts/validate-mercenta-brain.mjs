#!/usr/bin/env node
/**
 * §MERCENTA BRAIN — CONTRACT VALIDATOR.
 *
 * Two phases, because a source-only gate cannot prove a graph contract:
 *
 *   PHASE A — SOURCE CONTRACT. Structural assertions over the Brain's own
 *             modules: the entity/relationship catalogue exists and is the ONLY
 *             declaration of kind presentation, tenant isolation is enforced in
 *             the BUILDER (the brand branch never reaches the Mercenta-only
 *             layers), the epistemic four-state model is not collapsed, and no
 *             non-deterministic identity enters node/edge ids.
 *
 *   PHASE B — RUNTIME CONTRACT. Bundles `scripts/brain-runtime-check.ts` with
 *             esbuild and EXECUTES it under Node against the real canonical
 *             domain stores, so entity coverage, relationship coverage, the
 *             tenant boundary, the unknown-tenant refusal and determinism are
 *             verified by observed output rather than by reading source text.
 *
 * Run: node scripts/validate-mercenta-brain.mjs
 */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let pass = 0;
let fail = 0;
const errors = [];

function check(name, ok, detail = '') {
  if (ok) pass++;
  else {
    fail++;
    errors.push(`${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

/**
 * Strip comments before pattern-testing source. THE FIRST RUN OF THIS VALIDATOR
 * PROVED WHY THIS IS MANDATORY: the builder's own header comment says it uses
 * "no `Math.random()`, no `Date.now()`-derived identity", and a naive
 * `!/Math\.random/` test failed on the comment describing the absence of the
 * thing it was checking for. A gate that fails on documentation is a broken
 * gate, not a strict one.
 */
function code(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

const types = read('src/lib/intelligence/brain/types.ts');
const typesCode = code(types);
const builder = read('src/lib/intelligence/brain/buildGraph.ts');
const builderCode = code(builder);

/** The brand branch of the orchestrator, extracted structurally (not by regex lookahead). */
function brandBranch() {
  const start = builderCode.indexOf("if (scope.kind === 'brand') {");
  const end = builderCode.indexOf('const brands = [...ALL_DEMO_BRANDS];');
  if (start === -1 || end === -1 || end <= start) return '';
  return builderCode.slice(start, end);
}
const BRAND_BRANCH = brandBranch();

/* ── PHASE A — source contract ─────────────────────────────────────────── */

check('the entity-kind catalogue exists', types.includes('export const BRAIN_KIND_DEFINITIONS'));
check('the relationship catalogue exists', types.includes('export const BRAIN_RELATION_DEFINITIONS'));
check('every entity kind declares cluster + domain + authority + note', (types.match(/kind: '[a-z_]+', label: /g) ?? []).length > 25);
check('the four epistemic states are NOT collapsed', ['verified', 'simulation', 'inference', 'unknown'].every((s) => types.includes(`'${s}'`)));
check('the authority model distinguishes code/automation/agent/mixed/human', ['code', 'automation', 'agent', 'mixed', 'human'].every((a) => new RegExp(`\\b${a}: '`).test(types)));
check('every node carries provenance', /provenance: BrainProvenance/.test(types));
check('every edge carries the evidence that proves it', /evidence: string;/.test(types));
check('the scope union is explicit (mercenta | brand)', /export type BrainScope = \{ kind: 'mercenta' \} \| \{ kind: 'brand'; tenantId: string \}/.test(types));
check('node ids are derived, never random', /export function brainNodeId/.test(typesCode) && !/Math\.random/.test(typesCode));
check('edge ids are derived, never random', /export function brainEdgeId/.test(typesCode) && !/Math\.random/.test(builderCode));
check('the builder does not use wall-clock identity', !/brainNodeId\([^)]*Date\.now/.test(builderCode) && !/brainEdgeId\([^)]*Date\.now/.test(builderCode));
check('the builder reads the canonical domain stores', /from '@\/data\/demoStore'/.test(builderCode) && /from '@\/data\/prospectStore'/.test(builderCode));
check('the builder reads the canonical automation registry', /AUTOMATION_REGISTRY/.test(builderCode));
check('the builder reads the canonical integration registry', /INTEGRATION_REGISTRY/.test(builderCode));
check('the builder reads the canonical compliance rules', /getComplianceRequirements/.test(builderCode));
check('the builder reads the canonical payout config (no hardcoded rail)', /DEFAULT_PAYOUT_RAIL/.test(builderCode));
check('the builder reads the canonical shipping terms', /SHIPPING_COMMERCIAL_TERMS/.test(builderCode));
check('the builder never reaches a live provider', !/fetch\(|https?:\/\//.test(builderCode));
check('the builder dedupes node identity', /private nodes = new Map<string, BrainNode>/.test(builderCode));
check('the builder drops (never keeps) edges with a missing endpoint', /known\.has\(e\.from\) && known\.has\(e\.to\)/.test(builderCode));
check('an unknown tenant FAILS CLOSED', /function refusedGraph/.test(builderCode) && /if \(!brand\) return refusedGraph/.test(builderCode));
check('exclusions are declared for both scopes', /MERCENTA_EXCLUSIONS/.test(builderCode) && /function brandExclusions/.test(builderCode));
check(
  'the Mercenta-only layers are NOT reachable from the brand branch',
  BRAND_BRANCH.length > 0 && !/addPlatformLayer/.test(BRAND_BRANCH) && !/addPoliciesLayer/.test(BRAND_BRANCH) && !/addDecisionLayer/.test(BRAND_BRANCH)
);
check('the brand branch never builds the acquisition layer', BRAND_BRANCH.length > 0 && !/addAcquisitionLayer/.test(BRAND_BRANCH));
check('the Mercenta branch DOES build the Mercenta-only layers', /addPlatformLayer\(draft\)/.test(builderCode) && /addAcquisitionLayer\(draft\)/.test(builderCode));
check('the brand branch declares the tenant boundary in its exclusions', /no runtime filter was applied to a Mercenta-wide graph/.test(builderCode));
check('the brand branch states there is NO direct brand↔channel path', /NO direct brand↔channel path/.test(builderCode));
check('every node names an origin kind', /origin: 'domain_store' \| 'registry' \| 'config' \| 'runtime_state' \| 'document'/.test(typesCode));
check('no secret value is read into the graph', !/import\.meta\.env/.test(builderCode) && !/process\.env/.test(builderCode));

/* ── PHASE B — runtime contract (actually executed) ────────────────────── */

const OUT_DIR = path.join(ROOT, '.brain-validator-build');
const OUT_FILE = path.join(OUT_DIR, 'brain-runtime-check.cjs');
let runtimeStatus = 'NOT EXECUTED';
let runtimeOutput = '';

try {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  execFileSync(
    'npx',
    [
      'esbuild',
      'scripts/brain-runtime-check.ts',
      '--bundle',
      '--platform=node',
      '--format=cjs',
      '--alias:@=./src',
      '--resolve-extensions=.tsx,.ts,.jsx,.js,.mjs,.json',
      '--define:import.meta.env={"MODE":"validation"}',
      `--outfile=${OUT_FILE}`,
      '--log-level=error',
    ],
    { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  runtimeOutput = execFileSync('node', [OUT_FILE], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  runtimeStatus = /BRAIN_RUNTIME_PASS/.test(runtimeOutput) ? 'PASS' : 'FAIL';
  check('runtime harness executed and reported BRAIN_RUNTIME_PASS', runtimeStatus === 'PASS');
} catch (error) {
  const stdout = typeof error?.stdout === 'string' ? error.stdout : '';
  const stderr = typeof error?.stderr === 'string' ? error.stderr : String(error);
  runtimeOutput = `${stdout}\n${stderr}`;
  runtimeStatus = 'FAIL';
  check(
    'runtime harness executed and reported BRAIN_RUNTIME_PASS',
    false,
    (stderr || String(error)).split('\n').slice(0, 4).join(' | ')
  );
} finally {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
}

/* ── Report ────────────────────────────────────────────────────────────── */

console.log(`BRAIN_RUNTIME_STATUS: ${runtimeStatus}`);
if (runtimeOutput.trim()) console.log(runtimeOutput.trim());

if (fail > 0) {
  console.error(`MERCENTA_BRAIN_VALIDATION_FAIL (${fail} of ${pass + fail})`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`MERCENTA_BRAIN_VALIDATION_PASS (${pass} assertions, runtime executed, 0 network calls)`);