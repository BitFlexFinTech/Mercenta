-- §Phase E1 — brand onboarding persistence (opportunity → operational tenant).
--
-- WHY: the acquisition workflow (Phase C) produced BI-qualified Opportunities,
-- but `Opportunity.brandId` was never wired to anything downstream, so an
-- accepted/qualified brand had no canonical, persisted onboarding record and
-- no tenant identity. E1 closes that hand-off in the EXISTING database —
-- no second database, no second brand store, no duplicate identity.
--
-- SHAPE: mirrors `020_create_acquisition_persistence.sql` exactly — canonical
-- typed key columns that queries/RLS need plus the full domain artefact in
-- `payload jsonb`. `id` is the artefact's CANONICAL id (`onb-<prospectId>`), so
-- every write is an idempotent upsert and a replayed hand-off cannot duplicate.
--
-- TENANCY: the onboarding record belongs to the brand tenant it creates
-- (`brand_id` = `tenant_id`), so a brand session can read its OWN onboarding
-- record and nothing else; Mercenta staff (super_admin / admin_staff) can read
-- and operate every record. RLS is enabled, with no blanket using(true).
--
-- RELATIONSHIP PRESERVATION: `prospect_id` and `opportunity_id` are stored on
-- the row, so the originating acquisition relationship is never lost when the
-- brand becomes an operational tenant.
--
-- NOTE (honest): these tables cannot be exercised in the current demo
-- environment because browser Supabase credentials are not configured; the
-- persistence port's memory adapter is active there. This migration is the
-- durable seam for the credentialed environment and has NOT been executed.

/* ── brand_onboarding — one canonical onboarding record per opportunity ──── */

CREATE TABLE IF NOT EXISTS brand_onboarding (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  prospect_id text NOT NULL,
  opportunity_id text NOT NULL,
  brand_id text NOT NULL,
  status text NOT NULL,
  origin text NOT NULL DEFAULT 'acquisition_opportunity',
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brand_onboarding_prospect
  ON brand_onboarding(prospect_id);
CREATE INDEX IF NOT EXISTS idx_brand_onboarding_opportunity
  ON brand_onboarding(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_brand_onboarding_brand
  ON brand_onboarding(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_onboarding_tenant
  ON brand_onboarding(tenant_id);

ALTER TABLE brand_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_brand_onboarding" ON brand_onboarding
  FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

CREATE POLICY "brand_own_onboarding" ON brand_onboarding
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id'));
