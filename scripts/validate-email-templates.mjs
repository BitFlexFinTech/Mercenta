/**
 * §PHASE 15 — TRANSACTIONAL EMAIL-TEMPLATE GATE (communications launch gate).
 *
 * The `phase15-communications-email-auth` gate declares "production email
 * templates" in its scope, but no single owner existed and every body carried a
 * LINE-BREAK BUG: `\\n` inside a template literal renders a LITERAL backslash-n,
 * so the emails shipped a visible "\n" instead of a newline. This gate pins the
 * ONE owner (`src/lib/mail/templates.ts`), proves the break is fixed, and proves
 * the applicant panel reads the owner rather than inlining copy.
 *
 * Usage: node scripts/validate-email-templates.mjs  (exit 1 on any failure)
 */
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';

const BS = String.fromCharCode(92); // a single backslash — avoided literally so this file cannot itself break
const NL = String.fromCharCode(10);

let checks = 0;
let failures = 0;
const test = (name, ok, detail = '') => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
try {
  const t = await server.ssrLoadModule('/src/lib/mail/templates.ts');

  const cases = [
    ['welcome', t.welcomeEmailTemplate('Ada'), 'Welcome to Mercenta Partners'],
    ['approved', t.applicationApprovedTemplate('Acme'), 'Your Mercenta Partners application has been approved'],
    ['rejected', t.applicationRejectedTemplate('Acme'), 'Update on your Mercenta Partners application'],
    ['info', t.applicationInfoRequestedTemplate('Acme', 'Passport'), 'Additional information required'],
  ];
  for (const [name, tpl, subject] of cases) {
    test(`email: the ${name} template carries the canonical subject`, tpl.subject === subject, tpl.subject);
    test(
      `email: the ${name} body uses REAL newlines, not a literal backslash-n`,
      tpl.text.includes(NL) && !tpl.text.includes(BS + 'n'),
      JSON.stringify(tpl.text)
    );
  }
  test('email: the info template interpolates the notes', t.applicationInfoRequestedTemplate('Acme', 'Passport').text.includes('Passport'));
} finally {
  await server.close();
}

/* The applicant panel must READ the owner, not inline copy. */
const apps = readFileSync(new URL('../src/components/admin/ApplicationsPanel.tsx', import.meta.url), 'utf8');
test('email: the applicant panel reads the ONE template owner', /from '@\/lib\/mail\/templates'/.test(apps));
test('email: no inline email subject remains in the panel', !/subject\s*:/.test(apps));
test(
  'email: the panel carries none of the buggy double-backslash-n bodies',
  !apps.includes(BS + BS + 'n')
);

/* The owner is COPY only — it must never send anything. */
const owner = readFileSync(new URL('../src/lib/mail/templates.ts', import.meta.url), 'utf8');
test('email: the template owner makes no network call', !/fetch\s*\(|XMLHttpRequest|axios/.test(owner));

console.log('');
console.log(`EMAIL_TEMPLATES_${failures ? 'FAIL' : 'PASS'} — ${checks - failures}/${checks} assertions`);
if (failures > 0) process.exit(1);
