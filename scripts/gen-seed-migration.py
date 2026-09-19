#!/usr/bin/env python3
"""Regenerate supabase/migrations/016_seed_demo_data.sql - CANONICAL 20 REAL BRANDS."""
import os

ROOT = '/Users/tadii/Desktop/1. Mercenta'
OUTPATH = os.path.join(ROOT, 'supabase', 'migrations', '016_seed_demo_data.sql')

A = lambda h: f"a0000000-0000-0000-0000-0000000000{h}"
B = lambda h: f"b0000000-0000-0000-0000-0000000000{h}"
C = lambda h: f"c0000000-0000-0000-0000-0000000000{h}"
D = lambda h: f"d0000000-0000-0000-0000-0000000000{h}"
E = lambda h: f"e0000000-0000-0000-0000-0000000000{h}"

BRANDS = [
  ('01', 'Astonish',         'Home',                    'financed'),
  ('02', 'Seep',             'Home',                    'direct_fulfillment'),
  ('03', 'Delphis Eco',      'Home',                    'direct_fulfillment'),
  ('04', 'Kit & Kin',        'Baby',                    'direct_fulfillment'),
  ('05', 'Bulldog Skincare', 'Health & Personal Care',  'direct_fulfillment'),
  ('06', 'Joseph Joseph',    'Kitchen',                 'direct_fulfillment'),
  ('07', 'Roberts Radio',    'Consumer Electronics',    'direct_fulfillment'),
  ('08', 'Clipper Teas',     'Grocery',                 'direct_fulfillment'),
  ('09', 'Regatta',          'Apparel',                 'direct_fulfillment'),
  ('0a', 'Autoglym',         'Automotive',              'direct_fulfillment'),
  ('0b', 'Tapatio',          'Grocery',                 'direct_fulfillment'),
  ('0c', 'Cholula',          'Grocery',                 'direct_fulfillment'),
  ('0d', 'Valentina',        'Grocery',                 'financed'),
  ('0e', 'Fly By Jing',      'Grocery',                 'direct_fulfillment'),
  ('0f', 'LocknLock',        'Kitchen',                 'direct_fulfillment'),
  ('10', 'Le Creuset',       'Kitchen',                 'direct_fulfillment'),
  ('11', 'Moleskine',        'Office Products',         'direct_fulfillment'),
  ('12', 'Sennheiser',       'Consumer Electronics',    'direct_fulfillment'),
  ('13', 'Vileda',           'Home',                    'direct_fulfillment'),
  ('14', 'Logitech',         'Personal Computer',       'direct_fulfillment'),
]

def brand_rows():
    return [f"  ('{A(h)}', '{n}',            '{t}',            'Active')" for (h, n, _c, t) in BRANDS]

def product_rows():
    rows = []
    for pi, (h, name, cat, _t) in enumerate(BRANDS, start=1):
        prefix = ''.join(ch for ch in name if ch.isalnum())[:3].upper()
        for n in (1, 2):
            rows.append(f"  ('{B(f'{pi:02x}')}', '{A(h)}', '{prefix}-{n:02d}', 'P{pi:02d}{n:02d}01', '{name} {cat} Line {n}', {10 + pi}, {6 + pi}, '{cat}', 'active')")
    return rows

def po_rows():
    rows = []
    for bi, (h, _n, _c, _t) in enumerate(BRANDS[:10]):
        for pi, st in enumerate(('received', 'under_review', 'accepted')):
            idx = bi * 3 + pi
            rows.append(f"  ('{C(f'{idx + 1:02x}')}', '{A(h)}', 'PO-{9000 + idx}', '{st}', now() - interval '{(bi + 1) * 5} days', now() + interval '{(bi + 1) * 2} days', current_date - 7, current_date + 9)")
    return rows

def shipments_rows():
    rows = []
    for si in range(1, 8):
        carrier = 'dhl' if si % 3 else 'fedex'
        rows.append(f"  ('{D(f'{si:02x}')}', '{C(f'{si:02x}')}', '{A(BRANDS[(si - 1) // 3][0])}', '{carrier}', 'DHL-PO-9{si:03d}', 'transit')")
    return rows

def contracts_rows():
    return [f"  ('{E(f'{i:02x}')}', '{A(h)}', 'distribution_agreement', 'active', now() - interval '{i * 30} days')" for i, (h, _n, _c, _t) in enumerate(BRANDS, start=1)]
def build():
    q1 = ",\n".join(brand_rows())
    q2 = ",\n".join(product_rows())
    q3 = ",\n".join(po_rows())
    q4 = ",\n".join(shipments_rows())
    q5 = ",\n".join(contracts_rows())
    return f"""-- Seed demo data for Supabase persistent mode.
-- Deterministic UUIDs map each demo brand to a fixed identity so live-mode
-- queries return the same data the demo mode returns from demoStore.ts.
--
-- Phase 4: canonical 20 REAL brands (10 UK + 10 international), mirroring
-- src/data/demoData.ts. Operational rows are SIMULATED records.
--
-- Brand UUID prefix:   a0000000-0000-0000-0000-0000000000XX
-- Product UUID prefix: b0000000-0000-0000-0000-0000000000XX
-- PO UUID prefix:      c0000000-0000-0000-0000-0000000000XX
-- Shipment prefix:     d0000000-0000-0000-0000-0000000000XX
-- Contract prefix:     e0000000-0000-0000-0000-0000000000XX
--
-- ON CONFLICT DO NOTHING so re-running is safe.

/* -- Brands (canonical 20 real brands) -- */

INSERT INTO brands (id, name, fulfillment_track, lifecycle_stage) VALUES
{q1}
ON CONFLICT (id) DO NOTHING;

/* -- Products (2 per brand, simulated) -- */

INSERT INTO products (id, brand_id, sku, ean, name, ex_works_cost, case_pack, category, status) VALUES
{q2}
ON CONFLICT (id) DO NOTHING;

/* -- Purchase orders (simulated) -- */

INSERT INTO purchase_orders (id, brand_id, po_number, status, ship_window_start, ship_window_end, delivery_window_start, delivery_window_end) VALUES
{q3}
ON CONFLICT (id) DO NOTHING;

DO $$
DECLARE
  brand_rec RECORD;
  po_rec RECORD;
  prod_rec RECORD;
  bi INT;
  pi INT;
  idx INT;
  qty INT;
BEGIN
  bi := 0;
  FOR brand_rec IN SELECT * FROM brands ORDER BY id LOOP
    pi := 0;
    FOR po_rec IN SELECT * FROM purchase_orders WHERE brand_id = brand_rec.id ORDER BY id LOOP
      idx := 0;
      FOR prod_rec IN SELECT * FROM products WHERE brand_id = brand_rec.id ORDER BY id LOOP
        qty := (40 + (bi + pi + idx) * 10);
        IF brand_rec.id = '{A('02')}' AND pi = 1 THEN
          qty := qty * 8;
        END IF;
        INSERT INTO purchase_order_lines (id, po_id, product_id, ordered_qty, status)
        VALUES (gen_random_uuid(), po_rec.id, prod_rec.id, qty, 'pending')
        ON CONFLICT (id) DO NOTHING;
        idx := idx + 1;
      END LOOP;
      pi := pi + 1;
    END LOOP;
    bi := bi + 1;
  END LOOP;
END $$;

/* -- Shipments -- */

INSERT INTO shipments (id, po_id, brand_id, carrier, tracking, status) VALUES
{q4}
ON CONFLICT (id) DO NOTHING;

/* -- Contracts -- */

INSERT INTO contracts (id, brand_id, type, status, signed_at) VALUES
{q5}
ON CONFLICT (id) DO NOTHING;

/* -- Compliance docs (derived per brand) -- */

INSERT INTO compliance_docs (id, brand_id, doc_type, status, submitted_at)
SELECT
  gen_random_uuid(), b.id, t.doc_type,
  CASE ((SELECT array_position(ARRAY(SELECT id FROM brands ORDER BY id), b.id) - 1)) % 3
    WHEN 0 THEN CASE t.idx WHEN 0 THEN 'approved' WHEN 1 THEN 'approved' WHEN 2 THEN 'approved' WHEN 3 THEN 'approved' END
    WHEN 1 THEN CASE t.idx WHEN 0 THEN 'approved' WHEN 1 THEN 'under_review' WHEN 2 THEN 'missing' WHEN 3 THEN 'approved' END
    WHEN 2 THEN CASE t.idx WHEN 0 THEN 'uploaded' WHEN 1 THEN 'uploaded' WHEN 2 THEN 'under_review' WHEN 3 THEN 'missing' END
  END,
  CASE WHEN t.idx < 2 THEN now() - interval '30 days' ELSE NULL END
FROM brands b
CROSS JOIN (VALUES ('letter_of_authorization',0),('product_safety_ukca',1),('insurance_certificate',2),('brand_registry_confirmation',3)) AS t(doc_type,idx)
ON CONFLICT (id) DO NOTHING;

/* -- Messages (derived per brand) -- */

INSERT INTO messages (id, brand_id, sender_id, sender_role, content, created_at)
SELECT
  gen_random_uuid(), b.id, '00000000-0000-0000-0000-000000000000'::uuid, 'automation',
  'Welcome to Mercenta Partners onboarding. Next step: compliance review.',
  now() - ((row_number() OVER (ORDER BY b.id))::int * interval '1 hour')
FROM brands b
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, brand_id, sender_id, sender_role, content, created_at)
SELECT gen_random_uuid(), b.id, b.id, 'brand',
  'Thanks - can we talk about pricing and the first purchase order this week?',
  now() - (((seq.rn)::int * interval '1 hour') - interval '30 minutes')
FROM (SELECT id, row_number() OVER (ORDER BY id) - 1 AS rn FROM brands) seq
JOIN brands b ON b.id = seq.id
WHERE seq.rn % 3 = 0
ON CONFLICT (id) DO NOTHING;

/* -- Deductions (derived per brand) -- */

INSERT INTO deductions (id, brand_id, po_id, category, amount_gbp, status)
SELECT
  gen_random_uuid(), b.id,
  (SELECT id FROM purchase_orders WHERE brand_id = b.id ORDER BY id LIMIT 1),
  CASE seq.rn % 3
    WHEN 0 THEN 'damage' WHEN 1 THEN 'shortage' ELSE 'quality'
  END,
  round((random() * 500 + 50)::numeric, 2),
  CASE seq.rn % 3
    WHEN 0 THEN 'closed' WHEN 1 THEN 'open' ELSE 'disputed'
  END
FROM (SELECT id, row_number() OVER (ORDER BY id) - 1 AS rn FROM brands) seq
JOIN brands b ON b.id = seq.id
WHERE seq.rn % 3 = 0
ON CONFLICT (id) DO NOTHING;

/* -- Billing invoices (derived per brand) -- */

INSERT INTO billing_invoices (id, brand_id, period_start, period_end, gross_po_value, commission, net_paid, status)
SELECT
  gen_random_uuid(), b.id,
  (date_trunc('month', now()) - interval '2 months')::date,
  (date_trunc('month', now()) - interval '1 month' - interval '1 day')::date,
  coalesce(sum(coalesce(po_lines.total,0)),0),
  round(coalesce(sum(coalesce(po_lines.total,0))*0.07,0),2),
  round(coalesce(sum(coalesce(po_lines.total,0))*0.93,0),2),
  'pending'
FROM brands b
LEFT JOIN LATERAL (
  SELECT sum(p.ordered_qty * pr.ex_works_cost) AS total
  FROM purchase_orders po
  JOIN purchase_order_lines p ON p.po_id = po.id
  JOIN products pr ON pr.id = p.product_id
  WHERE po.brand_id = b.id
) po_lines ON true
GROUP BY b.id
ON CONFLICT (id) DO NOTHING;
"""

def main():
    with open(OUTPATH, 'w') as f:
        f.write(build())
    print(f"WROTE {OUTPATH}")

if __name__ == '__main__':
    main()