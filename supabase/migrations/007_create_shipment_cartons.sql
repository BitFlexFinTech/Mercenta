-- Create shipment_cartons table
CREATE TABLE IF NOT EXISTS shipment_cartons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
  carton_number INT,
  contents JSONB,
  weight_kg NUMERIC,
  dimensions TEXT
);

CREATE INDEX IF NOT EXISTS idx_shipment_cartons_shipment_id ON shipment_cartons(shipment_id);

-- Row Level Security: join-based isolation via shipment_id -> shipments.brand_id
ALTER TABLE shipment_cartons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_isolation" ON shipment_cartons
  FOR ALL
  USING (shipment_id IN (
    SELECT id FROM shipments
    WHERE brand_id = (auth.jwt() ->> 'tenant_id')::uuid
  ));
