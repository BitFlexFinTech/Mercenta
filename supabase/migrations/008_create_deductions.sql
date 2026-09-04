-- Create deductions table
CREATE TABLE IF NOT EXISTS deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID REFERENCES purchase_orders(id),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  category TEXT,
  amount_gbp NUMERIC,
  status TEXT DEFAULT 'open',
  dispute_status TEXT,
  dispute_outcome TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deductions_brand_id ON deductions(brand_id);
CREATE INDEX IF NOT EXISTS idx_deductions_status ON deductions(status);

-- Row Level Security: brand scoped
ALTER TABLE deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_isolation" ON deductions
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id')::uuid);
