-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  type TEXT,
  status TEXT DEFAULT 'draft',
  signed_at TIMESTAMPTZ,
  renewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_brand_id ON contracts(brand_id);

-- Row Level Security: brand scoped
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_isolation" ON contracts
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id')::uuid);
