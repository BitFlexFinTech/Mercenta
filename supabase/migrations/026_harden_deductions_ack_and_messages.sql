-- §Canonical model §23 — DATABASE HARDENING.
--
-- WHY: three invariants the platform already relies on in its domain layer were
-- never enforced at the DATABASE boundary. §23 asks for exactly these:
--
--   1. `deductions.category` had NO constraint. `008_create_deductions.sql`
--      declared it plain TEXT, so any string could be written and the
--      vocabulary lived only in the typed model (`src/types.ts → DeductionType`).
--   2. "acknowledged quantity ≤ ordered quantity" had no database enforcement.
--      `005_create_purchase_order_lines.sql` declared two plain INT columns and
--      the rule was enforced only in `src/data/api.ts`.
--   3. The reply-routing webhook (`instantly-reply-webhook`, §22) needs to mark
--      a message as automation-sent and as requiring human attention. The
--      `messages` table (011) has no such columns, so the flow could not persist
--      what the routing rule decides.
--
-- BACKWARD COMPATIBILITY: every constraint below is added `NOT VALID`. Postgres
-- then enforces it on every NEW insert/update while leaving pre-existing rows
-- untouched, so applying this migration can never fail on legacy data. Each
-- carries the exact statement to run once the legacy data is confirmed clean.
--
-- NO DUPLICATED RULES: these constraints are the DATABASE boundary. The existing
-- domain-layer checks stay because they produce a user-facing message before the
-- write is attempted; the constraint is what makes the rule impossible to
-- bypass. Both layers express the SAME rule, from the same vocabulary.
--
-- NON-DESTRUCTIVE: purely additive. No table is dropped, no column is narrowed
-- and no existing value is rewritten.
--
-- NOTE (honest): NOT executed in the current demo environment (no browser
-- Supabase credentials are configured there; the memory adapter is active).

/* ── 1. deductions.category — constrain to the canonical DeductionType ────── */

-- Vocabulary source of truth: `src/types.ts → DeductionType`. A constraint
-- cannot read TypeScript, so the list is repeated here and pinned by
-- `scripts/validate-db-hardening.mjs`, which compares the two.
alter table public.deductions
  drop constraint if exists deductions_category_check;

alter table public.deductions
  add constraint deductions_category_check
  check (
    category is null
    or category in (
      'late_shipment',
      'shortage_claim',
      'mislabeled_carton',
      'non_compliance_fine',
      'co_op',
      'return_charge',
      'unfilled_by_cancel_date',
      'po_on_time_accuracy',
      'other'
    )
  )
  not valid;

-- Once the legacy rows are confirmed clean, run:
--   alter table public.deductions validate constraint deductions_category_check;

/* ── 2. purchase_order_lines — acknowledged qty may not exceed ordered qty ── */

alter table public.purchase_order_lines
  drop constraint if exists purchase_order_lines_ack_within_ordered;

alter table public.purchase_order_lines
  add constraint purchase_order_lines_ack_within_ordered
  check (
    acknowledged_qty is null
    or ordered_qty is null
    or acknowledged_qty <= ordered_qty
  )
  not valid;

-- Once the legacy rows are confirmed clean, run:
--   alter table public.purchase_order_lines validate constraint purchase_order_lines_ack_within_ordered;

/* ── 3. messages — the routing columns the reply webhook persists ─────────── */

-- Who authored the message ('automation' for provider/automation traffic).
alter table public.messages
  add column if not exists sent_by text;

-- §19 — set by the reply classifier when a reply needs a human immediately.
alter table public.messages
  add column if not exists requires_human boolean not null default false;

-- Whether the message moved inbound to the platform or outbound to the lead.
alter table public.messages
  add column if not exists direction text;

create index if not exists idx_messages_requires_human
  on public.messages (requires_human)
  where requires_human;

-- §19 — a flagged reply is the ONE real-time notification; it must be findable.
create index if not exists idx_messages_sent_by
  on public.messages (sent_by);
