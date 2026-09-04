-- Create purchase_orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  po_number TEXT,
  status TEXT DEFAULT 'pending',
  ship_window_start TIMESTAMPTZ,
  ship_window_end TIMESTAMPTZ,
  delivery_window_start DATE,
  delivery_window_end DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_brand_id ON purchase_orders(brand_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);

-- Row Level Security: brand scoped
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_isolation" ON purchase_orders
  FOR ALL
  USING (brand_id = (auth.jwt() ->> 'tenant_id')::uuid);
