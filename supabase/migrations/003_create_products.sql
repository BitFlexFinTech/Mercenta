-- Create products table (catalog items per brand)
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  sku TEXT,
  ean TEXT,
  name TEXT,
  ex_works_cost NUMERIC,
  case_pack INT,
  category TEXT,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);

-- Row Level Security: brand scoped by brand_id
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_isolation" ON products
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id')::uuid);
