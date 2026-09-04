-- Create homepage_content table for CMS-driven homepage editor
-- Stores the full HomepageContent as a single JSONB row (singleton).

CREATE TABLE IF NOT EXISTS homepage_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (safe default)
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
INSERT INTO homepage_content (id, content)
VALUES ('00000000-0000-0000-0000-000000000001', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;