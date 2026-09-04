-- Create crm_tasks table
CREATE TABLE IF NOT EXISTS crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT,
  due_date DATE,
  status TEXT DEFAULT 'open',
  assignee TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_brand_id ON crm_tasks(brand_id);

-- Row Level Security: brand scoped
ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_isolation" ON crm_tasks
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id')::uuid);
