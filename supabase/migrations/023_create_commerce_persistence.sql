-- §Phase E4 — commerce / Amazon-style operational-simulation persistence.
--
-- WHY: E4 makes the operational commerce lifecycle genuinely functional in
-- SIMULATION mode (PO → acknowledgement → fulfilment/shipment → receiving →
-- invoice → payment → exceptions → dispute). Every operational record carries
-- explicit simulation provenance, and until now there was no durable home for
-- the operational-simulation invoice, payment or activity trail.
--
-- WHY ITS OWN TABLES (and not the legacy `purchase_orders` table from
-- 004_create_purchase_orders.sql): that table's PRIMARY KEY is a `uuid`, but the
-- canonical operational ids this platform uses are deterministic TEXT ids
-- (`po-sim-<brandId>-<productId>`, `cinv-<brandId>-<PO-SIM-…>`). The same
-- incompatibility was already documented and handled by migration
-- 022_create_catalog_persistence.sql. This migration follows that established
-- pattern EXACTLY. It is still ONE database, ONE persistence port.
--
-- SHAPE: mirrors 020/021/022 — canonical typed key columns that queries and RLS
-- need, plus the full domain artefact in `payload jsonb`. `id` is the artefact's
-- CANONICAL id, so replaying any operational step is an idempotent upsert that
-- updates in place rather than duplicating.
--
-- TENANCY: every row belongs to the brand tenant that owns it
-- (brand_id = tenant_id), so a brand session can read ONLY its own records;
-- Mercenta staff (super_admin / admin_staff) can read every row. RLS is enabled
-- with no blanket allow-all policy.
--
-- SIMULATION IS PRESERVED: `simulated` is a NOT NULL boolean on every row, so a
-- record that could never have been produced by a live provider is recorded as
-- such and can never later be mistaken for real Amazon/DHL/Xero activity. No
-- external outcome is fabricated by this schema.
--
-- NON-DESTRUCTIVE: purely additive. It does not alter or drop any table created
-- by migrations 001–022.
--
-- NOTE (honest): these tables cannot be exercised in the current demo
-- environment because browser Supabase credentials are not configured; the
-- persistence port's memory adapter is active there and reports
-- `durable:false`. This migration is the durable seam for the credentialed
-- environment and has NOT been executed.

/* ── commerce_purchase_orders — canonical operational-simulation POs ──────── */

CREATE TABLE IF NOT EXISTS commerce_purchase_orders (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  brand_id text NOT NULL,
  po_number text NOT NULL,
  status text NOT NULL,
  mode text,
  simulated boolean NOT NULL DEFAULT true,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commerce_po_brand
  ON commerce_purchase_orders(brand_id);
CREATE INDEX IF NOT EXISTS idx_commerce_po_tenant
  ON commerce_purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commerce_po_number
  ON commerce_purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_commerce_po_status
  ON commerce_purchase_orders(status);

ALTER TABLE commerce_purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_commerce_purchase_orders" ON commerce_purchase_orders
  FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

CREATE POLICY "brand_own_commerce_purchase_orders" ON commerce_purchase_orders
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id'));

/* ── commerce_invoices — canonical SIMULATED invoice, keyed by its PO ────── */

CREATE TABLE IF NOT EXISTS commerce_invoices (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  brand_id text NOT NULL,
  purchase_order_id text NOT NULL,
  status text NOT NULL,
  simulated boolean NOT NULL DEFAULT true,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commerce_invoice_brand
  ON commerce_invoices(brand_id);
CREATE INDEX IF NOT EXISTS idx_commerce_invoice_tenant
  ON commerce_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commerce_invoice_po
  ON commerce_invoices(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_commerce_invoice_status
  ON commerce_invoices(status);

ALTER TABLE commerce_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_commerce_invoices" ON commerce_invoices
  FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

CREATE POLICY "brand_own_commerce_invoices" ON commerce_invoices
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id'));

/* ── commerce_payments — canonical SIMULATED payment against an invoice ──── */

CREATE TABLE IF NOT EXISTS commerce_payments (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  brand_id text NOT NULL,
  invoice_id text NOT NULL,
  status text NOT NULL,
  simulated boolean NOT NULL DEFAULT true,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commerce_payment_brand
  ON commerce_payments(brand_id);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_tenant
  ON commerce_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commerce_payment_invoice
  ON commerce_payments(invoice_id);

ALTER TABLE commerce_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_commerce_payments" ON commerce_payments
  FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

CREATE POLICY "brand_own_commerce_payments" ON commerce_payments
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id'));

/* ── commerce_activities — the canonical operational activity trail ──────── */

CREATE TABLE IF NOT EXISTS commerce_activities (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  brand_id text NOT NULL,
  type text NOT NULL,
  purchase_order_id text,
  simulated boolean NOT NULL DEFAULT true,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commerce_activity_brand
  ON commerce_activities(brand_id);
CREATE INDEX IF NOT EXISTS idx_commerce_activity_tenant
  ON commerce_activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commerce_activity_po
  ON commerce_activities(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_commerce_activity_type
  ON commerce_activities(type);

ALTER TABLE commerce_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_commerce_activities" ON commerce_activities
  FOR ALL
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin_staff'));

CREATE POLICY "brand_own_commerce_activities" ON commerce_activities
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id'));
