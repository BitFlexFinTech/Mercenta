-- Create purchase_order_lines table
CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  ordered_qty INT,
  acknowledged_qty INT,
  status TEXT DEFAULT 'pending',
  reason_code TEXT,
  scheduled_ship_date DATE
);

CREATE INDEX IF NOT EXISTS idx_po_lines_po_id ON purchase_order_lines(po_id);

-- Row Level Security: join-based isolation via po_id -> purchase_orders.brand_id
ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_isolation" ON purchase_order_lines
  FOR ALL
  USING (po_id IN (
    SELECT id FROM purchase_orders
    WHERE brand_id = (auth.jwt() ->> 'tenant_id')::uuid
  ));
