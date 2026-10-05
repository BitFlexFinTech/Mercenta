/**
 * §FLOAT-LAUNCHER — THE SUPPORT-CHAT CORNER-COLLISION GATE.
 *
 * WHY THIS EXISTS (the defect this gate keeps dead)
 * --------------------------------------------------
 * The brand support-chat trigger used to be a permanently-visible floating
 * button: `fixed bottom-6 right-6 z-50 w-12 h-12`. Because the workspace
 * `<main>` (src/components/layout/AppShell.tsx) is the scroll container, that
 * button sat over the bottom-right 48×48 of EVERY brand workspace — exactly
 * where a table's last row actions and a drawer footer come to rest. It was
 * caught once by a REAL regression (the Product Catalog "Check result" action
 * became unclickable) and MITIGATED (the header was kept to one line) but never
 * fixed at the root. A mitigation that depends on every future surface keeping
 * its action row away from one corner is not a fix.
 *
 * THE FIX (this gate pins it): the trigger is now INLINE header chrome — the
 * shell passes it into the Header via AppShell's `headerActions` slot — and the
 * panel opens as a header-anchored dropdown (`absolute right-0 top-full`), the
 * SAME shape the profile menu, ThemeSelector and NotificationCenter already use.
 * No fixed bottom-right element remains, so the corner can never be covered
 * again, whatever future surface lands its actions there.
 *
 * Usage: node scripts/validate-float-launcher-collision.mjs  (exit 1 on failure)
 */
import { readFileSync } from 'node:fs';

let failures = 0;
let checks = 0;
const test = (name, ok, detail) => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) {
    failures++;
    if (detail !== undefined) console.log(`      ${String(detail).slice(0, 400)}`);
  }
};

const ROOT = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), 'utf8');
/** Comments are documentation, not rendered UI — strip them before code-shape checks. */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const WIDGET = 'src/components/shared/LiveChatWidget.tsx';
const SHELL = 'src/components/layout/BrandShell.tsx';
const APP_SHELL = 'src/components/layout/AppShell.tsx';
const HEADER = 'src/components/layout/Header.tsx';

const widget = read(WIDGET);
const widgetCode = stripComments(widget);
const shellCode = stripComments(read(SHELL));
const appShellCode = stripComments(read(APP_SHELL));
const headerCode = stripComments(read(HEADER));

/* ── 1. THE DEFECT SIGNATURE IS GONE FROM THE SOURCE ─────────────────────── */
test('widget: renders NO `fixed` element at all (the corner overlay is gone)',
  !/\bfixed\b/.test(widgetCode), widgetCode.match(/[^\n]*fixed[^\n]*/)?.[0]);
test('widget: the old `bottom-6 right-6` corner launcher is gone',
  !/bottom-6\s+right-6/.test(widgetCode));
test('widget: has no paired bottom-/right- corner-offset utility on any class',
  !/\bbottom-\d+[^"']*\bright-\d+/.test(widgetCode));

/* ── 2. THE TRIGGER IS REAL INLINE HEADER CHROME ─────────────────────────── */
test('widget: exposes the trigger test id', widgetCode.includes('data-testid="live-chat-trigger"'));
test('widget: the trigger is a labelled, stateful control',
  /aria-label=\{open \? 'Close support chat' : 'Open support chat'\}/.test(widgetCode) &&
  /aria-expanded=\{open\}/.test(widgetCode) &&
  /aria-controls="live-chat-panel"/.test(widgetCode));
test('widget: the root is a positioning container for the dropdown',
  /className="relative"/.test(widgetCode) && widgetCode.includes('data-testid="live-chat-widget"'));

/* ── 3. THE PANEL IS HEADER-ANCHORED (house dropdown pattern) ────────────── */
test('widget: the panel is an absolutely-positioned dropdown under the trigger',
  /absolute\s+right-0\s+top-full/.test(widgetCode));
test('widget: the panel is a labelled dialog with its own test id',
  /role="dialog"/.test(widgetCode) && widgetCode.includes('data-testid="live-chat-panel"'));

/* ── 4. MOUNTED THROUGH THE SHELL HEADER SLOT, NOT THE BODY ──────────────── */
test('BrandShell: mounts the widget through the shell headerActions slot',
  /headerActions=\{<LiveChatWidget\s*\/>\}/.test(shellCode));
test('BrandShell: renders the widget exactly once (header slot only, not the body)',
  (shellCode.match(/<LiveChatWidget\b/g) ?? []).length === 1,
  `found ${(shellCode.match(/<LiveChatWidget\b/g) ?? []).length}`);
test('AppShell: declares and forwards the headerActions slot to the Header',
  /headerActions\?:\s*ReactNode/.test(appShellCode) && /extraActions=\{headerActions\}/.test(appShellCode));
test('Header: declares the extraActions slot and renders it in the action group',
  /extraActions\?:\s*ReactNode/.test(headerCode) && /\{extraActions\}/.test(headerCode));

/* ── 5. THE CHAT BEHAVIOUR IS UNCHANGED ──────────────────────────────────── */
test('widget: still logs through the canonical logMessage pipeline',
  /logMessage\(/.test(widgetCode));
test('widget: still opens a helpdesk ticket for the brand',
  /findOrCreateTicketForBrand\(/.test(widgetCode) && /appendMessageToTicket\(/.test(widgetCode));
test('widget: still records the ticket with the live_chat source',
  widgetCode.includes("'live_chat'"));
test('widget: still scopes every read to the session tenant',
  /session\?\.tenantId/.test(widgetCode) && /m\.brandId === brandId/.test(widgetCode));

/* ── Summary ─────────────────────────────────────────────────────────────── */
console.log('');
console.log(`Float-launcher collision: ${checks} assertions`);
console.log(failures === 0 ? 'FLOAT_LAUNCHER_VALIDATION_PASS' : `FLOAT_LAUNCHER_VALIDATION_FAIL (${failures})`);
if (failures > 0) process.exit(1);

