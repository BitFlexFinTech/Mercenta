// §P3 — EVERY BUTTON IS WIRED — the UI-wiring gate.
//
// WHY THIS EXISTS
// ---------------
// `docs/CLEANUP_AND_VERIFICATION_PLAN_2026-09-30.md` §3 P3 requires an audit of
// every interactive control against its handler AND its label, and fixes for
// anything that is decorative, or that promises more than it does. The class of
// defect is real: a control that renders the look of an action and does nothing
// when clicked (two such controls were found and FIXED at source in
// `src/components/brand/BrandSettings.tsx` — "Change Password" / "Enable 2FA",
// which promised account-security actions Mercenta has no system for).
//
// A typecheck and a build both pass cleanly on a dead button — only an explicit
// scan catches it. This gate therefore walks EVERY `.tsx` under
// `src/components/**`, strips comments (so commented-out code is never counted),
// and fails on:
//
//   W1  an interactive control with NO wiring at all — a `<button>`/`<Button>`
//       or an element with `role="button"` that has no onClick / onMouseDown /
//       onMouseUp / type="submit" / disabled / href / formAction. (The
//       design-system style guide, `DesignSystemShowcase.tsx`, is the ONE
//       declared exception: it renders the button variants as SPECIMENS.)
//   W2  an empty handler (`onClick={() => {}}`, `onClick={noop}`).
//   W3  an ACTION-LABELLED control whose handler only changes LOCAL state — a
//       control whose visible text promises a domain action ("Approve", "Send",
//       "Submit" …) but whose handler references nothing but a React setter.
//       Legitimate UI toggles ("Show breakdown", "Sort", "Hide preview") are
//       NOT action-labelled, so they are correctly left alone.
//   W4  a DOMAIN-CRITICAL control that lost its writer — a curated audit
//       manifest pinning the handler symbol behind each decision the audit
//       reviewed, so a future edit cannot silently unwire one.
//   W5  the specific fixed defect returning — a control labelled
//       "Change Password" or "Enable 2FA".
//   W6  the allowlisted style guide drifting into something else.
//
// Every mutation-sensitive assertion was PROVED ABLE TO FAIL (see the session
// report): the mutated file was restored byte-identical.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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

const COMPONENTS_DIR = fileURLToPath(new URL('../src/components/', import.meta.url));
const read = (abs) => readFileSync(abs, 'utf8');

function walk(dir) {
  let out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (entry.endsWith('.tsx')) out.push(p);
  }
  return out;
}

/**
 * Strip `//` and block comments, while keeping string/backtick contents (a
 * string can hold a `>` that would otherwise confuse tag reading). Commented-out
 * JSX must never be counted as a live control.
 */
function stripComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; out += c; i++;
      while (i < n) { out += src[i]; if (src[i] === '\\') { i++; out += src[i]; } else if (src[i] === q) { i++; break; } i++; }
      continue;
    }
    out += c; i++;
  }
  return out;
}

/** Read one opening tag from `<` at `start`, honouring nested braces and quotes. */
function readTag(src, start) {
  let i = start + 1;
  let depth = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < src.length && src[i] !== q) { if (src[i] === '\\') i++; i++; }
    } else if (c === '>' && depth === 0) return src.slice(start, i + 1);
    i++;
  }
  return null;
}

/** Collect every `<button>`, `<Button>` and `role="button"` control in a file. */
function controls(src) {
  const found = [];
  const tagRe = /<(button|Button)\b|role="button"/g;
  let m;
  while ((m = tagRe.exec(src))) {
    let start = m.index;
    if (!m[1]) {
      const lt = src.lastIndexOf('<', m.index);
      if (lt === -1) continue;
      start = lt;
    }
    const tag = readTag(src, start);
    if (!tag) continue;
    const line = src.slice(0, start).split('\n').length;
    const behind = src.slice(start + tag.length, start + tag.length + 200);
    const textMatch = /^(?:[^<]*<[^>]*>)?\s*([A-Za-z][^<>{}$]{0,60})/.exec(behind);
    const aria = /aria-label=(?:"([^"]*)"|'([^']*)')/.exec(tag);
    const label = `${aria ? (aria[1] ?? aria[2] ?? '') : ''} ${textMatch ? textMatch[1] : ''}`.trim();
    found.push({ line, tag, label, isRole: !m[1] });
  }
  return found;
}

const FILES = walk(COMPONENTS_DIR);
/** The design-system STYLE GUIDE renders the button variants as specimens. */
const ALLOWLIST = new Set(['design/DesignSystemShowcase.tsx']);
/**
 * W3 allowlist — controls that LEGITIMATELY only reveal a form and whose real
 * write happens on that form's submit. Each entry states WHY, so a new one
 * cannot be added silently. Keyed `file::visible label`.
 */
const W3_ALLOWLIST = new Map([
  ['brand/BrandSettings.tsx::Invite Team Member', 'reveals the invite form; the write is handleInvite on submit'],
  /* §BRAND REDESIGN (2026-11-19) — the design PREVIEW control is LOCAL BY CONTRACT:
     previewing a homepage design must never write. The label itself says
     "(not published)", and the write happens on the separate Publish control, so a
     handler that only sets local preview state is the CORRECT behaviour here — not
     the "does nothing but look like it does" defect W3 exists to catch. */
  ['admin/HomepageEditor.tsx::Preview this design (not published)', 'toggles the draft PREVIEW only, by design; publishing is a separate control — preview must never write'],
]);

/* ── W1 — no unwired control ──────────────────────────────────────────────── */
const WIRED = /(onClick|onMouseDown|onMouseUp|type="submit"|type='submit'|disabled|href=|formAction)/;
const unwired = [];
for (const abs of FILES) {
  const rel = abs.slice(COMPONENTS_DIR.length);
  if (ALLOWLIST.has(rel)) continue;
  for (const c of controls(stripComments(read(abs)))) {
    if (!WIRED.test(c.tag)) unwired.push(`${rel}:${c.line} ${c.tag.replace(/\s+/g, ' ').slice(0, 80)}`);
  }
}
test(`W1 every interactive control is wired (scanned ${FILES.length} component files)`,
  unwired.length === 0, `UNWIRED CONTROLS:\n      ${unwired.join('\n      ')}`);

/* ── W2 — no empty handler ────────────────────────────────────────────────── */
const EMPTY = /onClick=\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}|onClick=\{noop\}/;
const empties = [];
for (const abs of FILES) {
  const rel = abs.slice(COMPONENTS_DIR.length);
  for (const c of controls(stripComments(read(abs)))) if (EMPTY.test(c.tag)) empties.push(`${rel}:${c.line}`);
}
test('W2 no empty/decorative click handler', empties.length === 0, empties.join(', '));

/* ── W3 — an action-labelled control must not only change local state ──────── */
const ACTION_VERBS = /(approve|reject|decline|confirm|submit|send|book|pay|file|escalate|resolve|block|save|create|delete|remove|invite|upload|verify|publish|withdraw|authoris|authoriz|acknowledge|retry)/i;
const localOnly = [];
for (const abs of FILES) {
  const rel = abs.slice(COMPONENTS_DIR.length);
  for (const c of controls(stripComments(read(abs)))) {
    if (!ACTION_VERBS.test(c.label)) continue;
    const hm = /onClick=\{([^}]*)\}/.exec(c.tag);
    if (!hm) continue;
    const handler = hm[1];
    // A real writer is referenced when, after removing React setters and the
    // standard callback parameters, at least ONE identifier remains — a call
    // (`doThing(...)`) OR a bare function reference (`handleApprove`, which the
    // click invokes) OR a property access. A handler that is ONLY a setter
    // (`() => setOpen(true)`) leaves nothing and is the defect W3 targets.
    const rest = handler
      .replace(/set[A-Z][A-Za-z0-9_]*/g, ' ');
    const ids = (rest.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || [])
      .filter((x) => !['e', 'ev', 'event', 'prev', 'v', 'o', 'i', 'value', 'val', 'id', 'item', 'row', 'entry', 'true', 'false', 'null', 'undefined', 'void', 'window', 'document'].includes(x));
    if (ids.length === 0 && !W3_ALLOWLIST.has(`${rel}::${c.label}`)) {
      localOnly.push(`${rel}:${c.line} label="${c.label}" handler={${handler.trim().slice(0, 60)}}`);
    }
  }
}
test('W3 every action-labelled control reaches a real writer (not only local state)',
  localOnly.length === 0, `LOCAL-ONLY ACTION CONTROLS:\n      ${localOnly.join('\n      ')}`);

/* ── W4 — the curated audit manifest (the decisions the audit reviewed) ───── */
const MANIFEST = [
  ['admin/AdminPurchaseOrderDetail.tsx', 'acknowledgePurchaseOrder(', 'on-behalf acknowledgement → domain writer'],
  ['admin/AdminPurchaseOrderDetail.tsx', 'createShipmentForPO(', 'on-behalf ASN → shipment writer'],
  ['admin/AdminPurchaseOrderDetail.tsx', 'approveOnBehalfRejection(', 'on-behalf rejection approval → writer'],
  ['admin/ComplianceApprovals.tsx', 'manual(', 'compliance approve/reject → document writer'],
  ['admin/ComplianceApprovals.tsx', 'runAutomated(', 'compliance automated verification → writer'],
  ['admin/ComplianceApprovals.tsx', 'uploadComplianceDoc(', 'compliance document upload → writer'],
  ['admin/ApplicationsPanel.tsx', 'handleAction(', 'application approve/reject/flag → store writer'],
  ['admin/HelpdeskDashboard.tsx', 'handleCaseEscalate(', 'case escalation → case writer'],
  ['admin/HelpdeskDashboard.tsx', 'handleCaseResolve(', 'case resolution → case writer'],
  ['shared/WorkWorkspace.tsx', 'resolveWorkItem(', 'work-item resolution → work writer'],
  ['brand/BrandPurchaseOrders.tsx', 'approveOnBehalf(', 'on-behalf rejection approval → writer'],
  ['admin/AcquisitionWorkflow.tsx', 'handleStartOnboarding', 'start onboarding → onboarding writer'],
  ['brand/BrandSettings.tsx', 'handleInvite', 'team invite → team writer'],
  ['brand/BrandSettings.tsx', 'handleAdd', 'outage/address add → store writer'],
];
const missingWriters = MANIFEST.filter(([rel, sym]) => !read(join(COMPONENTS_DIR, rel)).includes(sym))
  .map(([rel, sym, why]) => `${rel} lost ${sym} (${why})`);
test(`W4 the ${MANIFEST.length} audited domain-critical controls still reach their writers`,
  missingWriters.length === 0, missingWriters.join('\n      '));

/* ── W5 — the specific fixed defect cannot return ─────────────────────────── */
const brandSettings = read(join(COMPONENTS_DIR, 'brand/BrandSettings.tsx'));
test('W5 the credentialless "Change Password" / "Enable 2FA" controls do NOT return',
  !/>\s*Change Password\s*</.test(brandSettings) && !/>\s*Enable 2FA\s*</.test(brandSettings),
  'a control promises a password/2FA action Mercenta has no system for');

/* ── W6 — the style-guide exception stays a style guide ───────────────────── */
test('W6 the ONE allowlisted file is still the design-system style guide',
  /Buttons/.test(read(join(COMPONENTS_DIR, 'design/DesignSystemShowcase.tsx'))),
  'the allowlisted path is no longer the button-variant showcase');

console.log('');
console.log(`UI wiring: ${FILES.length} component files · ${checks} assertions · failures: ${failures}`);
console.log(failures === 0 ? 'UI_WIRING_VALIDATION_PASS' : `UI_WIRING_VALIDATION_FAIL (${failures})`);
// exitCode (never process.exit) so buffered stdout is never truncated on a pipe.
process.exitCode = failures === 0 ? 0 : 1;

