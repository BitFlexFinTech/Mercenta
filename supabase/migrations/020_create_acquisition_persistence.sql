-- §Phase D4 — domain persistence for acquisition artefacts + BI lifecycle state.
--
-- WHY: Phase C/D1–D3 acquisition artefacts (outreach revisions, responses,
-- opportunities, acquisition events) and the BI lifecycle history (runs, change
-- events, snapshots, prospect lifecycle updates) were session-only in memory.
-- D4 gives them a durable home in the EXISTING Supabase database — no second
-- database, no SQLite/IndexedDB/localStorage.
--
-- SHAPE: each row carries the canonical typed key columns that queries/RLS need
-- plus the full domain artefact in `payload jsonb`. `id` is the artefact's
-- CANONICAL id, so every write is an idempotent upsert (no duplicate rows).
--
-- TENANCY: pre-onboarding acquisition is owned by the Mercenta operations tenant
-- (`tenant_id`); once an Opportunity is linked to a brand, `brand_id` is set and
-- the brand tenant can see only its own opportunities. BI state is admin-only.
--
-- NOTE (honest): these tables cannot be exercised in the current demo
-- environment because browser Supabase credentials are not configured; the
-- repository port's memory adapter is active there. This migration is the
-- durable seam for the credentialed environment.

/* ── acquisition_outreach — every outreach revision ─────────────────────── */

CREATE TABLE IF NOT EXISTS acquisition_outreach (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  prospect_id text NOT NULL,
  status text NOT NULL,
  channel text,
  revision int NOT NULL DEFAULT 1,
  transport text,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acquisition_outreach_prospect
  ON acquisition_outreach(prospect_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_outreach_tenant
  ON acquisition_outreach(tenant_id);

ALTER TABLE acquisition_outreach ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_acquisition_outreach" ON acquisition_outreach
  FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

/* ── acquisition_responses — inbound replies (one per outreach send) ────── */

CREATE TABLE IF NOT EXISTS acquisition_responses (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  prospect_id text NOT NULL,
  outreach_id text,
  wants_human boolean NOT NULL DEFAULT false,
  simulated boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acquisition_responses_prospect
  ON acquisition_responses(prospect_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_responses_tenant
  ON acquisition_responses(tenant_id);

ALTER TABLE acquisition_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_acquisition_responses" ON acquisition_responses
  FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

/* ── acquisition_opportunities — commercial opportunities ───────────────────
 * Two policies: ops/admin see all; a brand tenant sees ONLY the opportunity
 * linked to its own brand_id (tenant isolation). */

CREATE TABLE IF NOT EXISTS acquisition_opportunities (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  prospect_id text NOT NULL,
  brand_id text,
  stage text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acquisition_opportunities_prospect
  ON acquisition_opportunities(prospect_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_opportunities_brand
  ON acquisition_opportunities(brand_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_opportunities_tenant
  ON acquisition_opportunities(tenant_id);

ALTER TABLE acquisition_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_acquisition_opportunities" ON acquisition_opportunities
  FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

CREATE POLICY "brand_own_acquisition_opportunity" ON acquisition_opportunities
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id'));

/* ── acquisition_events — the relationship timeline ─────────────────────── */

CREATE TABLE IF NOT EXISTS acquisition_events (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  prospect_id text NOT NULL,
  type text NOT NULL,
  actor text,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_acquisition_events_prospect
  ON acquisition_events(prospect_id);
CREATE INDEX IF NOT EXISTS idx_acquisition_events_tenant
  ON acquisition_events(tenant_id);

ALTER TABLE acquisition_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_acquisition_events" ON acquisition_events
  FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));


/* ── bi_prospects — canonical BI prospect lifecycle overrides ──────────────
 * The seed universe is deterministic and re-derived on boot; ONLY operator
 * lifecycle mutations (disqualify/requalify/score update) are persisted here
 * and overlaid by id on reload. Admin-only. */

CREATE TABLE IF NOT EXISTS bi_prospects (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  brand text NOT NULL,
  category text,
  disqualified boolean NOT NULL DEFAULT false,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bi_prospects_tenant ON bi_prospects(tenant_id);

ALTER TABLE bi_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_bi_prospects" ON bi_prospects
  FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

/* ── bi_intelligence_runs — discovery-run history ───────────────────────── */

CREATE TABLE IF NOT EXISTS bi_intelligence_runs (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  "trigger" text,
  mode text,
  started_at timestamptz,
  completed_at timestamptz,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bi_intelligence_runs_tenant
  ON bi_intelligence_runs(tenant_id);

ALTER TABLE bi_intelligence_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_bi_intelligence_runs" ON bi_intelligence_runs
  FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

/* ── bi_prospect_changes — canonical prospect timeline ──────────────────── */

CREATE TABLE IF NOT EXISTS bi_prospect_changes (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  run_id text,
  prospect_id text NOT NULL,
  change_type text,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bi_prospect_changes_prospect
  ON bi_prospect_changes(prospect_id);
CREATE INDEX IF NOT EXISTS idx_bi_prospect_changes_tenant
  ON bi_prospect_changes(tenant_id);

ALTER TABLE bi_prospect_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_bi_prospect_changes" ON bi_prospect_changes
  FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

/* ── bi_snapshots — weekly score snapshots (id = snap-<brandId>-<date>) ─── */

CREATE TABLE IF NOT EXISTS bi_snapshots (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  brand_id text NOT NULL,
  snapshot_date text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bi_snapshots_brand ON bi_snapshots(brand_id);
CREATE INDEX IF NOT EXISTS idx_bi_snapshots_tenant ON bi_snapshots(tenant_id);

ALTER TABLE bi_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_bi_snapshots" ON bi_snapshots
  FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

