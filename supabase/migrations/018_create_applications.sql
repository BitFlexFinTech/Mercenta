-- §Access-gate — Brand applications table
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  country text NOT NULL,
  category text NOT NULL,
  sku_count int,
  monthly_revenue text,
  website_url text,
  instagram_url text,
  facebook_url text,
  website_status text,
  instagram_status text,
  facebook_status text,
  referral_source text,
  description text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text
);