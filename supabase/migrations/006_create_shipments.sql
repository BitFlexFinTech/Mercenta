-- Create shipments table
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID REFERENCES purchase_orders(id),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  carrier TEXT,
  tracking TEXT,
  bol TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_brand_id ON shipments(brand_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);

-- Row Level Security: brand scoped
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_isolation" ON shipments
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id')::uuid);
