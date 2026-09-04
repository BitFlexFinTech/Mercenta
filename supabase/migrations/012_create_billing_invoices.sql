-- Create billing_invoices table
CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  period_start DATE,
  period_end DATE,
  gross_po_value NUMERIC,
  commission NUMERIC,
  deductions NUMERIC,
  net_paid NUMERIC,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_brand_id ON billing_invoices(brand_id);

-- Row Level Security: brand scoped
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_isolation" ON billing_invoices
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id')::uuid);
