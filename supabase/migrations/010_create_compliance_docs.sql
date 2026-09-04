-- Create compliance_docs table
CREATE TABLE IF NOT EXISTS compliance_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  doc_type TEXT,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  expires_at DATE
);

CREATE INDEX IF NOT EXISTS idx_compliance_docs_brand_id ON compliance_docs(brand_id);

-- Row Level Security: brand scoped
ALTER TABLE compliance_docs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_isolation" ON compliance_docs
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id')::uuid);
