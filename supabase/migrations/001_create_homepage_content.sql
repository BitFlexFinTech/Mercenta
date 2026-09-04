-- Create homepage_content table for CMS-driven homepage editor
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)

CREATE TABLE IF NOT EXISTS homepage_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nav_items JSONB NOT NULL DEFAULT '["Home", "About Us", "Services", "Global Network"]'::jsonb,
  global_pathways JSONB NOT NULL DEFAULT '[
    {
      "region": "North America",
      "flag": "🇺🇸",
      "icon": "Plane",
      "route": "US Brands → DHL/FedEx Air Courier",
      "color": "border-blue-500/30 text-blue-400"
    },
    {
      "region": "Europe",
      "flag": "🇪🇺",
      "icon": "Truck",
      "route": "EU Brands → Trucking Network",
      "color": "border-emerald-500/30 text-emerald-400"
    },
    {
      "region": "Africa",
      "flag": "🌍",
      "icon": "Ship",
      "route": "African Brands → BAK Logistics",
      "color": "border-amber-500/30 text-amber-400"
    }
  ]'::jsonb,
  services JSONB NOT NULL DEFAULT '[
    {
      "icon": "Package",
      "title": "1P Wholesale Distribution",
      "description": "We purchase your inventory at Ex-Works pricing and route it directly to Amazon Vendor Central UK."
    },
    {
      "icon": "ShieldCheck",
      "title": "Importer of Record",
      "description": "Boxbee holds UK EORI numbers, manages HMRC customs declarations, and ensures full UKCA compliance."
    },
    {
      "icon": "Truck",
      "title": "Global Logistics Network",
      "description": "DHL and FedEx for air courier parcels worldwide. BAK Logistics for heavy freight from African origins."
    },
    {
      "icon": "TrendingUp",
      "title": "Revenue Acceleration",
      "description": "Bi-weekly payouts in USD, EUR, or GBP. We handle the complexity so you can focus on production."
    }
  ]'::jsonb,
  hero_text TEXT NOT NULL DEFAULT 'Global 1P Wholesale Trade Platform',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (optional, safe default)
ALTER TABLE homepage_content ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (public homepage)
CREATE POLICY "Anyone can read homepage_content"
  ON homepage_content
  FOR SELECT
  USING (true);

-- Allow authenticated users (admin) to insert/update
CREATE POLICY "Authenticated users can insert homepage_content"
  ON homepage_content
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update homepage_content"
  ON homepage_content
  FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Seed a single row so the query always returns something
INSERT INTO homepage_content (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;