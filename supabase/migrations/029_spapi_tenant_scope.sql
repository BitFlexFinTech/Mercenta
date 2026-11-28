-- §PHASE 3 / ITEM 1 — AMAZON SP-API TENANT SCOPE + ACCESS AUDIT.
--
-- WHY THIS EXISTS
-- ---------------
-- The SP-API proxy (`supabase/functions/spapi/index.ts`) authorises an OPERATOR
-- session and then performs a channel call. Nothing yet proves that the ASIN being
-- read or written belongs to the brand whose session is making the call, and nothing
-- records who read which ASIN. Both are Amazon SP-API Data Protection Policy
-- requirements (tenant isolation + access logging) and both are stated in
-- `docs/AMAZON_COMPLIANCE.md`.
--
-- WHAT THESE TABLES ARE — AND ARE NOT
--   · `brand_asin_scope` — the AUTHORITATIVE list of which ASINs a brand owns. An
--     ASIN absent from this table is NOT that brand's ASIN, and the proxy REFUSES
--     the call with 403 rather than filtering it out silently.
--   · `spapi_access_audit` — append-only record of every live SP-API ASIN access:
--     who, which brand, which ASIN, which route, when, and the result.
--   · Neither table holds a credential. Neither is brand-writable.
--
-- RLS
--   · staff (super_admin, admin_staff) may read/write the scope, and read the audit;
--   · a BRAND session may read ONLY its own rows, in both tables;
--   · a brand may never write either table, and may never update or delete an audit
--     row. Retention deletion is performed by the SECURITY DEFINER purge function in
--     `030_spapi_audit_retention.sql`, which runs as the owner and is not reachable
--     from a brand session.
--
-- The claim convention matches every earlier migration in this repository
-- (`auth.jwt() ->> 'role'`, `auth.jwt() ->> 'tenant_id'`) — see 002–028.

CREATE TABLE IF NOT EXISTS brand_asin_scope (
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  -- Amazon ASINs are 10 upper-case alphanumerics; a malformed value is refused here
  -- rather than becoming an unscopable row.
  asin text NOT NULL CHECK (asin ~ '^[A-Z0-9]{10}$'),
  added_by text NOT NULL DEFAULT '',
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_id, asin)
);

COMMENT ON TABLE brand_asin_scope IS
  'Authoritative brand→ASIN ownership. An ASIN not present here is refused by the SP-API proxy (403), never filtered silently.';

CREATE INDEX IF NOT EXISTS idx_brand_asin_scope_asin
  ON brand_asin_scope(asin);

ALTER TABLE brand_asin_scope ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_brand_asin_scope" ON brand_asin_scope
  FOR SELECT
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

CREATE POLICY "brand_read_own_asin_scope" ON brand_asin_scope
  FOR SELECT
  USING (brand_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "staff_insert_brand_asin_scope" ON brand_asin_scope
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

CREATE POLICY "staff_update_brand_asin_scope" ON brand_asin_scope
  FOR UPDATE
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

CREATE POLICY "staff_delete_brand_asin_scope" ON brand_asin_scope
  FOR DELETE
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

CREATE TABLE IF NOT EXISTS spapi_access_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The operator's identity as the JWT asserts it (email/sub), never a client-supplied name.
  actor text NOT NULL,
  -- NULL means the session carried no brand tenant (an operator session); the row still
  -- records the attempt, which is why this column is nullable rather than defaulted.
  brand_id uuid,
  asin text NOT NULL,
  route text NOT NULL,
  at timestamptz NOT NULL DEFAULT now(),
  result text NOT NULL CHECK (result IN ('granted', 'refused', 'error'))
);

COMMENT ON TABLE spapi_access_audit IS
  'Append-only log of live SP-API ASIN access: actor, brand, ASIN, route, time, result. Retained 90 days by the purge job in 030.';

CREATE INDEX IF NOT EXISTS idx_spapi_access_audit_at
  ON spapi_access_audit(at);

CREATE INDEX IF NOT EXISTS idx_spapi_access_audit_brand
  ON spapi_access_audit(brand_id, at DESC);

ALTER TABLE spapi_access_audit ENABLE ROW LEVEL SECURITY;

-- Staff read the whole log; write is INSERT-only (there is no update policy, so an
-- audit row cannot be rewritten).
CREATE POLICY "staff_read_spapi_access_audit" ON spapi_access_audit
  FOR SELECT
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

CREATE POLICY "staff_insert_spapi_access_audit" ON spapi_access_audit
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

-- A brand sees ONLY its own access records — never another brand's reads.
CREATE POLICY "brand_read_own_spapi_access_audit" ON spapi_access_audit
  FOR SELECT
  USING (brand_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- NO update and NO delete policy: the log is append-only by construction.