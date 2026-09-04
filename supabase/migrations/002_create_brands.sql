-- Create brands table (core tenant entity)
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  eori TEXT,
  vat TEXT,
  fulfillment_track TEXT,
  lifecycle_stage TEXT DEFAULT 'Lead',
  account_owner TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Row Level Security: brand sees only its own row
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_access" ON brands
  FOR ALL
  USING (id = (auth.jwt() ->> 'tenant_id')::uuid);
