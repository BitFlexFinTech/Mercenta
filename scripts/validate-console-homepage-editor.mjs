#!/usr/bin/env node
/**
 * §PHASE C BATCH C1 GATE — THE CONSOLE HOMEPAGE EDITOR.
 *
 * WHY THIS EXISTS. The console is now the DEFAULT for a signed-in session, so this panel
 * is the ONLY way an operator reaches their own front page without finding the hidden
 * legacy switch. A surface added that way must be pinned, or the next session can quietly
 * unwire it, retype a design label that belongs to an owner, or lose one of the capabilities
 * the legacy editor had — none of which typecheck, the build or a browser test would catch.
 *
 * WHAT IT ASSERTS
 *   H1  the panel exists AND is reachable: the Super Admin body renders it under the
 *       `homepage` tab id, and the screen supplies it
 *   H2  THE LABELS COME FROM THE OWNER. The design list is projected from
 *       `homepageDesign.ts`; no design label is retyped in the panel (a second copy of
 *       approved copy is the defect this project has already paid for)
 *   H3  EVERY LEGACY CAPABILITY IS STILL PRESENT: the design picker, the hero fields, the
 *       visibility + protection point editors, save-draft, publish, revert, and the
 *       wording gate that blocks both save and publish
 *   H4  THE WORDING COVERAGE IS EQUIVALENT to the legacy editor's — the outward field set
 *       is extracted from BOTH files and compared, so a section can never become
 *       publishable with banned positioning on one screen but not the other
 *   H5  THE PREVIEW IS PORTALLED OUT OF THE CONSOLE'S SCOPE. `next.css` overrides
 *       `.mercenta-next .text-strong/-muted/-faint`, which the marketing components use, so
 *       a preview rendered inside the console would show the owner the CONSOLE's colours
 *       rather than the public page's. The portal to `document.body` is the fix, and this
 *       assertion stops it being removed as "unnecessary"
 *   H6  FAIL-CLOSED: save and publish are disabled while any outward field is unsafe
 *   H7  ZERO NETWORK (the project's validation convention)
 *
 * A check that reads nothing is a FAILURE, so every source it depends on is asserted
 * non-empty and present.
 */
import { readFileSync } from 'node:fs';

const ROOT = '/Users/tadii/Desktop/1. Mercenta';
const PANEL_SCREEN = `${ROOT}/src/next/screens/admin/AdminHomepageEditorScreen.tsx`;
const PANEL_VIEW = `${ROOT}/src/next/screens/admin/AdminHomepageEditorView.tsx`;
const SUPER_VIEW = `${ROOT}/src/next/screens/admin/SuperAdminView.tsx`;
const SUPER_SCREEN = `${ROOT}/src/next/screens/admin/SuperAdminScreen.tsx`;
const LEGACY = `${ROOT}/src/components/admin/HomepageEditor.tsx`;

let failures = 0;
let assertions = 0;
const test = (name, ok, detail = '') => {
  assertions += 1;
  console.log(`${ok ? '\u2713' : '\u2717'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

let networkCalls = 0;
globalThis.fetch = async (...args) => {
  networkCalls += 1;
  throw new Error(`NO LIVE NETWORK ALLOWED IN VALIDATION: ${String(args[0])}`);
};

const read = (path) => readFileSync(path, 'utf8');
const screen = read(PANEL_SCREEN);
const view = read(PANEL_VIEW);
const superView = read(SUPER_VIEW);
const superScreen = read(SUPER_SCREEN);
const legacy = read(LEGACY);

console.log('§PHASE C BATCH C1 — CONSOLE HOMEPAGE EDITOR GATE\n');

/* Non-vacuity first: every source this gate depends on must be there and non-trivial. */
test(
  'H0 every source this gate reads is present and non-trivial (a check that finds nothing is a FAILURE)',
  [screen, view, superView, superScreen, legacy].every((s) => s.length > 1500),
  `panel screen ${screen.length}B · panel view ${view.length}B · super view ${superView.length}B · super screen ${superScreen.length}B · legacy ${legacy.length}B`
);

/* ── H1 — the panel exists, is wired to the tab, and is supplied by the screen ── */
test(
  'H1a the Super Admin tab union declares the `homepage` tab',
  /export type SuperAdminTabId =[\s\S]*?'homepage'/.test(superView)
);
test(
  'H1b the tab strip offers the Homepage Editor',
  /\{ id: 'homepage', label: 'Homepage Editor' \}/.test(superView)
);
test(
  'H1c the Super Admin body renders the panel under the `homepage` tab',
  /\{activeTab === 'homepage' && homepagePanel\}/.test(superView)
);
test(
  'H1d the screen supplies the panel and passes the editor as a node',
  /homepagePanel=\{activeTab === 'homepage' \? <AdminHomepageEditorScreen \/> : null\}/.test(superScreen)
);
test(
  'H1e the view keeps its single job — the panel arrives as a ReactNode prop',
  /homepagePanel: ReactNode;/.test(superView) && /homepagePanel,/.test(superView)
);

/* ── H2 — the design labels come from their owner, never retyped ─────────────── */
test(
  'H2a the screen projects the design list from its owner',
  /HOMEPAGE_DESIGN_ORDER\.map/.test(screen) && /HOMEPAGE_DESIGNS\[id\]\.label/.test(screen)
);
const retypedLabels = ['Monolith', 'Grid', 'Signal', 'Mark', 'Concept 3'].filter((label) =>
  new RegExp(`['"\`]${label}['"\`]`).test(screen) || new RegExp(`['"\`]${label}['"\`]`).test(view)
);
test(
  'H2b no design label is retyped in the panel (one owner for approved copy)',
  retypedLabels.length === 0,
  retypedLabels.join(', ')
);
test(
  'H2c the panel writes ONLY through the existing persistence seam',
  /from '@\/data\/api'/.test(screen) && /saveHomepageDraft|publishHomepageContent|fetchHomepageContent/.test(screen)
);

/* ── H3 — every legacy capability is still present ──────────────────────────── */
const HERO_LABELS = [
  'Hero eyebrow',
  'Hero heading (first part)',
  'Hero heading (highlight)',
  'Hero primary CTA',
  'Nav / secondary CTA',
  'Hero subheading',
];
test(
  'H3a the panel edits all six hero fields (the legacy editor exposed exactly these)',
  HERO_LABELS.every((l) => view.includes(`label="${l}"`)),
  HERO_LABELS.filter((l) => !view.includes(`label="${l}"`)).join(', ')
);
test(
  'H3b the design picker offers every option from the owner',
  /designOptions\.map\(/.test(view) && /data-testid=\{`homepage-design-option-\$\{option\.id\}`\}/.test(view)
);
test(
  'H3c the visibility and protection point editors are present, with their heading and subheading',
  /homepage-section-\$\{section\.id\}/.test(view) &&
    /onSectionHeading\(section\.id, v\)/.test(view) &&
    /onSectionSubheading\(section\.id, v\)/.test(view) &&
    /onSectionPoint\(section\.id, index, \{ title: v \}\)/.test(view) &&
    /Points \(\{section\.points\.length\}\)/.test(view)
);
test(
  'H3d save-draft, publish and revert all exist as real controls',
  ['homepage-save-draft', 'homepage-publish', 'homepage-editor-revert'].every((id) =>
    view.includes(`data-testid="${id}"`)
  )
);
test(
  'H3e the design change can be abandoned without publishing (reset to published)',
  /homepage-design-reset/.test(view) && /resetDesignToPublished/.test(screen)
);
test(
  'H3f the wording lint is attached to the fields themselves, not only to the buttons',
  /Unsafe wording \(/.test(view) && /lintOutwardWording\(value\)/.test(view)
);

/* ── H4 — the wording coverage is EQUIVALENT to the legacy editor's ─────────── */
const tokensBetween = (src, startMarker, endMarker) => {
  const at = src.indexOf(startMarker);
  if (at === -1) return null;
  const end = src.indexOf(endMarker, at);
  if (end === -1) return null;
  const body = src.slice(at, end);
  return [
    ...new Set([...body.matchAll(/content\.[a-zA-Z]+(?:\.[a-zA-Z]+)?/g)].map((m) => m[0])),
  ].sort();
};
const legacyFields = tokensBetween(legacy, 'const texts = [', '];');
const consoleFields = tokensBetween(screen, 'function outwardTexts', '];');
test(
  'H4a both field lists were found (a check that finds nothing is a FAILURE)',
  Array.isArray(legacyFields) &&
    Array.isArray(consoleFields) &&
    legacyFields.length >= 15 &&
    consoleFields.length >= 15,
  `legacy ${legacyFields?.length ?? 'MISSING'} \u00b7 console ${consoleFields?.length ?? 'MISSING'}`
);
const onlyLegacy = (legacyFields ?? []).filter((f) => !(consoleFields ?? []).includes(f));
const onlyConsole = (consoleFields ?? []).filter((f) => !(legacyFields ?? []).includes(f));
test(
  'H4b the console editor lints EXACTLY the outward fields the legacy editor lints',
  onlyLegacy.length === 0 && onlyConsole.length === 0,
  onlyLegacy.length || onlyConsole.length
    ? `missing from console: ${onlyLegacy.join(', ') || 'none'} \u00b7 new in console: ${onlyConsole.join(', ') || 'none'}`
    : `${consoleFields.length} fields in both`
);

/* ── H5 — the preview escapes the console's token scope ─────────────────────── */
test(
  'H5a the draft preview is portalled to document.body (outside .mercenta-next)',
  /createPortal\(/.test(view) && /document\.body\s*\n?\s*\)/.test(view)
);
test(
  'H5b the portal carries its reason, so it cannot be removed as "unnecessary"',
  /mercenta-next/.test(view) && /text-muted/.test(view) && /text-strong/.test(view)
);

/* ── H6 — fail-closed ───────────────────────────────────────────────────────── */
const disabledSites = [...view.matchAll(/disabled=\{unsafeReason !== null\}/g)].length;
test(
  'H6 save AND publish are both disabled while any outward field is unsafe',
  disabledSites === 2,
  `${disabledSites} disabled site(s)`
);
test(
  'H6b the reason is SHOWN to the operator, not only enforced',
  /Saving and publishing are blocked/.test(view) && /unsafeReason\b/.test(screen)
);

/* ── H7 — zero network ──────────────────────────────────────────────────────── */
test('H7 the whole run made zero live network calls', networkCalls === 0, `${networkCalls} call(s)`);

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${assertions - failures}/${assertions} assertions`);
process.exit(failures === 0 ? 0 : 1);

