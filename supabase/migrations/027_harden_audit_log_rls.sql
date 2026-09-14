-- §39 / Phase M13 — HARDENING the platform audit trail (`audit_log`) AND the
-- brand-application intake (`applications`). TWO genuine, previously-invisible gaps.
--
-- FINDING (verified 2026-09-14 against the canonical migration history, not
-- assumed): `015_create_audit_log.sql` created `audit_log` with NO RLS and an
-- explicit comment "no RLS - admin-only cross-tenant view". Admin-only in the UI
-- is NOT a database control: with RLS off and default grants, any role holding a
-- table grant could (a) READ every tenant's audit rows — actor, entity, details —
-- and (b) UPDATE or DELETE them, which would destroy audit history. The canonical
-- rule is "every important business event produces an audit record … history is
-- never destroyed", so this was a genuine gap, not a cosmetic one.
--
-- ACCESS MODEL (established by READING the code, not inferred):
--   • READ  — Super-Admin-only screens only. `src/data/api.ts → fetchAuditLog` /
--             `fetchAuditLogPaginated`, rendered by
--             `src/components/admin/AdminAuditLog.tsx` (route `audit_log`, already
--             gated by `isSuper ? … : <AccessDenied/>` in AdminShell).
--   • WRITE — APPEND-ONLY inserts from an authenticated session
--             (`src/data/api.ts` payout + fulfillment-override paths,
--              `src/services/xero/xeroReseed.ts`), plus service-role/server-side.
--   • There is NO client UPDATE or DELETE path anywhere in the codebase.
-- A brand must never be able to read the cross-tenant audit trail.
--
-- THEREFORE: RLS ON; staff-only SELECT; authenticated INSERT; and NO
-- update/delete policy at all — so the trail is append-only and immutable from
-- the client. Service-role / server-side operations bypass RLS unchanged.
--
-- SEPARATE REAL GAP REPAIRED HERE: the three client insert paths write
-- `brand_id`, `reason` and `metadata`, which migration 015 never created — every
-- one of those rows was being silently dropped (the callers only `console.warn`
-- and fall back to the in-memory demo log). `add column if not exists` is
-- additive and safe on a live database; without it this hardening would protect a
-- table the platform cannot actually write to.
--
-- NOTE (honest): NOT executed in the current demo environment — no Supabase
-- credentials are configured there (the in-memory adapter is active). This file is
-- the canonical schema change for go-live, applied in order per GO_LIVE.md §3.

/* ── 0a. SECOND FINDING — `applications` had NO RLS AT ALL ────────────────── */
--
-- `018_create_applications.sql` created `applications` and never enabled RLS. That
-- table holds brand-application PII (company, country, revenue band, social links,
-- free-text description) plus `admin_notes` and `reviewed_by`. The corollary: once
-- Supabase is live, ANY role with a table grant could read every applicant's
-- details and — because there is no policy at all — could also approve itself.
--
-- This gap was invisible because the OLD hardcoded audit list never contained
-- `applications`; deriving the list from the schema (see scripts/rls-audit.mjs,
-- M13 repoint) surfaced it immediately.
--
-- ACCESS MODEL (from the code):
--   • the public application form (`src/components/auth/PartnerApplicationForm.tsx`
--     → `submitApplication`) is submitted by an UNAUTHENTICATED visitor — so anon
--     must be able to INSERT, and only INSERT;
--   • review is staff-only (`src/components/admin/ApplicationsPanel.tsx`, the
--     Super Admin "Applications" tab) → staff SELECT/UPDATE;
--   • applications are retained records → no client DELETE.
--
-- The approved-brand login cards read `approvedApplicationBrands`, which is an
-- in-memory array in `src/data/applicationStore.ts` (verified: no Supabase read),
-- so no SELECT access is required for the login surface today. When that path is
-- moved to the database it must go through a server-side function, NOT an
-- anonymous SELECT of applicant PII — a policy granting that would leak it.

alter table public.applications enable row level security;

-- Public submission, but a submitter can only ever create a PENDING record: the
-- self-approval path that NO RLS allowed is now impossible.
drop policy if exists "public_submit_pending_application" on public.applications;
create policy "public_submit_pending_application" on public.applications
  for insert
  to anon, authenticated
  with check (status = 'pending');

-- Staff review (Super Admin → Applications). A brand has no access to any
-- applicant's data.
drop policy if exists "staff_read_applications" on public.applications;
create policy "staff_read_applications" on public.applications
  for select
  using ((auth.jwt() ->> 'role') in ('super_admin', 'admin_staff'));

drop policy if exists "staff_review_applications" on public.applications;
create policy "staff_review_applications" on public.applications
  for update
  using ((auth.jwt() ->> 'role') in ('super_admin', 'admin_staff'))
  with check ((auth.jwt() ->> 'role') in ('super_admin', 'admin_staff'));

-- No delete policy: an application is a record of what was submitted.

/* ── 1. Repair the column mismatch the client insert paths depend on ──────── */

alter table public.audit_log add column if not exists brand_id uuid;
alter table public.audit_log add column if not exists reason text;
alter table public.audit_log add column if not exists metadata jsonb;

create index if not exists idx_audit_log_brand on public.audit_log (brand_id);
create index if not exists idx_audit_log_created_at on public.audit_log (created_at desc);

/* ── 2. Row Level Security — staff read, authenticated append, nothing else ─ */

alter table public.audit_log enable row level security;

-- Staff may read the platform-wide trail. The tenant role claim is the same
-- canonical predicate every other migration uses (`auth.jwt() ->> 'role'`), so
-- this cannot drift from the rest of the schema. A brand role is NOT included, so
-- tenant isolation holds: a brand can never read another tenant's audit rows.
drop policy if exists "staff_read_audit_log" on public.audit_log;
create policy "staff_read_audit_log" on public.audit_log
  for select
  using ((auth.jwt() ->> 'role') in ('super_admin', 'admin_staff'));

-- Authenticated sessions may APPEND (this is how the app records payout,
-- override and Xero-reset events). Anonymous writes are refused.
drop policy if exists "authenticated_append_audit_log" on public.audit_log;
create policy "authenticated_append_audit_log" on public.audit_log
  for insert
  with check (auth.role() = 'authenticated');

-- Deliberately NO update and NO delete policy: with RLS on, those operations are
-- deny-by-default for every client role, which is what makes the audit trail
-- immutable. Server-side/service-role maintenance still bypasses RLS by design.
