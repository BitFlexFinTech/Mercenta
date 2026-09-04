-- Create brand_agreements table for mandatory legal agreement acceptances
CREATE TABLE IF NOT EXISTS brand_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  agreement_type TEXT NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version TEXT NOT NULL DEFAULT '1.0',
  UNIQUE(brand_id, agreement_type)
);

CREATE INDEX IF NOT EXISTS idx_brand_agreements_brand_id ON brand_agreements(brand_id);

-- Row Level Security: brand scoped
ALTER TABLE brand_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_isolation" ON brand_agreements
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id')::uuid);

COMMENT ON TABLE brand_agreements IS 'Mandatory legal agreement acceptances per brand (§4.1 Logistics SLAs, §4.2 Chargeback Indemnity)';
COMMENT ON COLUMN brand_agreements.agreement_type IS 'logistics_sla | chargeback_indemnity';
COMMENT ON COLUMN brand_agreements.version IS 'Semantic version of the accepted terms';