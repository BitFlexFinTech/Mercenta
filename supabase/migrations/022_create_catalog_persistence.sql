-- §Phase E3 — catalog / product-management persistence (submission spine).
--
-- WHY: E3 must record the RESULT of a catalog submission truthfully and
-- durably. Before E3, `src/data/api.ts → submitCatalogItem` inserted into a
-- `catalog_submissions` table that NO migration ever created, using a
-- `product_payload` column that no migration defined — a write that could
-- never have executed in any environment. E3 closes that gap in the EXISTING
-- database: no second database, no second product store, no duplicate identity.
--
-- SHAPE: mirrors `020_create_acquisition_persistence.sql` and
-- `021_create_brand_onboarding.sql` exactly — canonical typed key columns that
-- queries/RLS need, plus the full domain artefact in `payload jsonb`. `id` is
-- the artefact's CANONICAL id (`sub-<brandId>-<sku>`), so re-submitting the same
-- product is an idempotent upsert that updates in place rather than duplicating.
--
-- TENANCY: the submission belongs to the brand tenant that owns the product
-- (brand_id = tenant_id), so a brand session can read ONLY its own submissions;
-- Mercenta staff (super_admin / admin_staff) can read every submission. RLS is
-- enabled with no blanket allow-all policy.
--
-- SIMULATION IS PRESERVED: `simulated` is a NOT NULL boolean on the row, so a
-- submission that never reached a live provider is recorded as such and can
-- never later be mistaken for a real retail acceptance. No Amazon outcome is
-- fabricated by this schema.
--
-- NON-DESTRUCTIVE: purely additive. It does not alter or drop the legacy
-- `products` table created in 003_create_products.sql.
--
-- NOTE (honest): these tables cannot be exercised in the current demo
-- environment because browser Supabase credentials are not configured; the
-- persistence port's memory adapter is active there and reports
-- `durable:false`. This migration is the durable seam for the credentialed
-- environment and has NOT been executed.

/* ── catalog_submissions — one canonical record per product submission ───── */

CREATE TABLE IF NOT EXISTS catalog_submissions (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  brand_id text NOT NULL,
  product_id text NOT NULL,
  sku text NOT NULL,
  status text NOT NULL,
  submission_id text,
  simulated boolean NOT NULL DEFAULT true,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_catalog_submissions_brand
  ON catalog_submissions(brand_id);
CREATE INDEX IF NOT EXISTS idx_catalog_submissions_tenant
  ON catalog_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_catalog_submissions_sku
  ON catalog_submissions(brand_id, sku);
CREATE INDEX IF NOT EXISTS idx_catalog_submissions_status
  ON catalog_submissions(status);

ALTER TABLE catalog_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_catalog_submissions" ON catalog_submissions
  FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

CREATE POLICY "brand_own_catalog_submissions" ON catalog_submissions
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id'));
