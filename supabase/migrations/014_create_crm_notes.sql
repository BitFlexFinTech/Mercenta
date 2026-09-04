-- Create crm_notes table
CREATE TABLE IF NOT EXISTS crm_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  content TEXT,
  author TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_notes_brand_id ON crm_notes(brand_id);

-- Row Level Security: brand scoped
ALTER TABLE crm_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_isolation" ON crm_notes
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id')::uuid);
