-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_role TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_brand_id ON messages(brand_id);

-- Row Level Security: brand scoped
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_isolation" ON messages
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id')::uuid);
