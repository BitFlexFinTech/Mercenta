// §Canonical model §23 — DATABASE HARDENING validator.
//
// §23 asked for three invariants to be enforced at the DATABASE boundary:
//   1. `deductions.category` constrained to the canonical DeductionType set;
//   2. acknowledged quantity ≤ ordered quantity on purchase_order_lines;
//   3. the message-routing columns the reply webhook persists (§22).
//
// This validator proves BOTH halves of the contract:
//   (a) the migration expresses each constraint, and
//   (b) the vocabulary it hardcodes still MATCHES the TypeScript source of truth
//       (`src/types.ts → DeductionType`). A constraint cannot read TypeScript, so
//       the list is duplicated — and this is the drift guard that stops the two
//       diverging. If a new deduction type is added to the model and not to the
//       constraint, this validator FAILS.
//
// It also proves the constraints are non-destructive: every ADD CONSTRAINT is
// declared NOT VALID, so applying the migration cannot fail on legacy rows.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

let failures = 0;
let checks = 0;
const test = (name, ok, detail = '') => {
  checks++;
  console.log(`${ok ? '✓' : '✗'} ${name}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

const migration = read('supabase/migrations/026_harden_deductions_ack_and_messages.sql');
const typesSource = read('src/types.ts');

/* ── The migration is the newest and is purely additive ────────────────── */

const migrations = readdirSync(new URL('../supabase/migrations', import.meta.url)).sort();
// §Phase M13 — REPOINTED. This pinned "026 remains the newest", which was TRUE when
// M11 wrote it. M13 legitimately added 027 (§39 RLS hardening for audit_log +
// applications), so the newest file moved. The INVARIANT is unchanged: the §23
// hardening migration (026) still exists and is still purely additive — asserted on
// the next line and throughout this validator.
test('the §23 hardening migration (026) is present in the sequential history',
  migrations.some((f) => f.startsWith('026_')), migrations.at(-1));
test('the newest migration is not an edit of the §23 hardening file',
  !migrations.at(-1).startsWith('026_') || migrations.filter((f) => f.startsWith('026_')).length === 1,
  migrations.at(-1));
test('the migration is non-destructive (no drop table / no column type change)',
  !/drop\s+table/i.test(migration) && !/alter\s+column/i.test(migration));

/* ── 1. deductions.category vocabulary parity with DeductionType ───────── */

const modelBlock = typesSource.slice(
  typesSource.indexOf('export type DeductionType'),
  typesSource.indexOf('export type DeductionStatus')
);
const modelCategories = [...modelBlock.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();

const checkBlock = migration.slice(
  migration.indexOf('deductions_category_check'),
  migration.indexOf('not valid', migration.indexOf('deductions_category_check'))
);
const constraintCategories = [...checkBlock.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();

test('the canonical DeductionType vocabulary was found in src/types.ts',
  modelCategories.length >= 9, `${modelCategories.length} categories`);
test('the constraint lists EXACTLY the canonical deduction categories (no drift)',
  JSON.stringify(modelCategories) === JSON.stringify(constraintCategories),
  `model=[${modelCategories}] constraint=[${constraintCategories}]`);
test('deductions.category remains nullable (existing rows are not broken)',
  checkBlock.includes('category is null'));

/* ── 2. acknowledged qty ≤ ordered qty ─────────────────────────────────── */

test('purchase_order_lines enforces acknowledged_qty ≤ ordered_qty',
  migration.includes('purchase_order_lines_ack_within_ordered') &&
    migration.includes('acknowledged_qty <= ordered_qty'));
test('the ack-qty rule tolerates NULL on either side',
  migration.includes('acknowledged_qty is null') && migration.includes('ordered_qty is null'));

/* ── 3. messages routing columns ───────────────────────────────────────── */

test('messages gains the automation marker used by the reply webhook',
  migration.includes('add column if not exists sent_by text'));
test('messages gains the human-attention flag',
  /add column if not exists requires_human boolean not null default false/.test(migration));
test('messages gains a direction column',
  migration.includes('add column if not exists direction text'));
test('the human-attention flag is indexed (it is the real-time notification)',
  migration.includes('idx_messages_requires_human'));

/* ── Non-destructive application: every constraint is NOT VALID ────────── */

const addedConstraints = [...migration.matchAll(/add constraint (\w+)/g)].map((m) => m[1]);
test('every added constraint is declared NOT VALID (cannot fail on legacy data)',
  addedConstraints.length === 2 && addedConstraints.every((name) => {
    const at = migration.indexOf(name);
    return migration.slice(at, at + 700).includes('not valid');
  }),
  addedConstraints.join(', '));
test('the VALIDATE follow-up is documented for each constraint',
  (migration.match(/validate constraint/g) ?? []).length === 2);

/* ── The webhook persists exactly these columns ────────────────────────── */

const webhook = read('supabase/functions/instantly-reply-webhook/index.ts');
test('the reply webhook writes sent_by/requires_human (columns now exist)',
  webhook.includes("sent_by: 'automation'") && webhook.includes('requires_human'));
test('the reply webhook never writes a non-existent sender_email column',
  !webhook.includes('sender_email'));

console.log(
  failures === 0
    ? `DB_HARDENING_VALIDATION_PASS (${checks} checks)`
    : `DB_HARDENING_VALIDATION_FAIL (${failures}/${checks})`
);
if (failures > 0) process.exit(1);
