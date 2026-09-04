-- Seed demo data for Supabase persistent mode.
-- Deterministic UUIDs map each demo brand to a fixed identity so live-mode
-- queries return the same data the demo mode returns from demoStore.ts.
--
-- Brand UUID prefix:   a0000000-0000-0000-0000-0000000000XX
-- Product UUID prefix: b0000000-0000-0000-0000-0000000000XX
-- PO UUID prefix:      c0000000-0000-0000-0000-0000000000XX
-- Shipment prefix:     d0000000-0000-0000-0000-0000000000XX
-- Contract prefix:     e0000000-0000-0000-0000-0000000000XX
--
-- ON CONFLICT DO NOTHING so re-running is safe.

/* ── Brands ──────────────────────────────────────────────────────────── */

INSERT INTO brands (id, name, fulfillment_track, lifecycle_stage) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Zambezi Organic Extracts Ltd',    'financed',            'Lead'),
  ('a0000000-0000-0000-0000-000000000002', 'Nordhaus Living ApS',             'direct_fulfillment',  'Active'),
  ('a0000000-0000-0000-0000-000000000003', 'Little Kiwi Baby Co',             'financed',            'Lead'),
  ('a0000000-0000-0000-0000-000000000004', 'DeskForge Supplies Inc',          'direct_fulfillment',  'Active'),
  ('a0000000-0000-0000-0000-000000000005', 'Munich Clean-Care GmbH',          'direct_fulfillment',  'Lead'),
  ('a0000000-0000-0000-0000-000000000006', 'Culinary Forge B.V.',             'financed',            'Active'),
  ('a0000000-0000-0000-0000-000000000007', 'Voltaic Audio LLC',               'direct_fulfillment',  'Lead'),
  ('a0000000-0000-0000-0000-000000000008', 'ApexDrive Auto Care Ltd',         'financed',            'Active'),
  ('a0000000-0000-0000-0000-000000000009', 'Harvest Lane Foods Pty',          'financed',            'Lead'),
  ('a0000000-0000-0000-0000-00000000000a', 'Sahara Threads SARL',             'direct_fulfillment',  'Lead'),
  ('a0000000-0000-0000-0000-00000000000b', 'PixelPerch Accessories Inc',      'direct_fulfillment',  'Active')
ON CONFLICT (id) DO NOTHING;
/* ── Products (2 per brand) ──────────────────────────────────────────── */

INSERT INTO products (id, brand_id, sku, ean, name, ex_works_cost, case_pack, category, status) VALUES
  -- Zambezi Organic Extracts
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ZAMB-001', '600010001145', 'Zambezi Health & Personal Care Line 1', 12, 6, 'Health & Personal Care', 'active'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'ZAMB-002', '600010002245', 'Zambezi Health & Personal Care Line 2', 16, 10, 'Health & Personal Care', 'active'),
  -- Nordhaus Living
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'NORD-001', '600020001145', 'Nordhaus Home Line 1', 13, 8, 'Home', 'active'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'NORD-002', '600020002245', 'Nordhaus Home Line 2', 17, 12, 'Home', 'active'),
  -- Little Kiwi Baby
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'LITK-001', '600030001145', 'Little Kiwi Baby Line 1', 14, 10, 'Baby', 'active'),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'LITK-002', '600030002245', 'Little Kiwi Baby Line 2', 18, 14, 'Baby', 'active'),
  -- DeskForge Supplies
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000004', 'DESK-001', '600040001145', 'DeskForge Office Products Line 1', 15, 12, 'Office Products', 'active'),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000004', 'DESK-002', '600040002245', 'DeskForge Office Products Line 2', 19, 16, 'Office Products', 'active'),
  -- Munich Clean-Care
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000005', 'MUNC-001', '600050001145', 'Munich Health & Personal Care Line 1', 16, 14, 'Health & Personal Care', 'active'),
  ('b0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000005', 'MUNC-002', '600050002245', 'Munich Health & Personal Care Line 2', 20, 18, 'Health & Personal Care', 'active'),
  -- Culinary Forge
  ('b0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000006', 'CULI-001', '600060001145', 'Culinary Forge Kitchen Line 1', 17, 16, 'Kitchen', 'active'),
  ('b0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-000000000006', 'CULI-002', '600060002245', 'Culinary Forge Kitchen Line 2', 21, 20, 'Kitchen', 'active'),
  -- Voltaic Audio
  ('b0000000-0000-0000-0000-00000000000d', 'a0000000-0000-0000-0000-000000000007', 'VOLT-001', '600070001145', 'Voltaic Audio Consumer Electronics Line 1', 18, 18, 'Consumer Electronics', 'active'),
  ('b0000000-0000-0000-0000-00000000000e', 'a0000000-0000-0000-0000-000000000007', 'VOLT-002', '600070002245', 'Voltaic Audio Consumer Electronics Line 2', 22, 22, 'Consumer Electronics', 'active'),
  -- ApexDrive Auto Care
  ('b0000000-0000-0000-0000-00000000000f', 'a0000000-0000-0000-0000-000000000008', 'APEX-001', '600080001145', 'ApexDrive Automotive Line 1', 19, 20, 'Automotive', 'active'),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000008', 'APEX-002', '600080002245', 'ApexDrive Automotive Line 2', 23, 24, 'Automotive', 'active'),
  -- Harvest Lane Foods
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000009', 'HARV-001', '600090001145', 'Harvest Lane Grocery Line 1', 20, 22, 'Grocery', 'active'),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000009', 'HARV-002', '600090002245', 'Harvest Lane Grocery Line 2', 24, 26, 'Grocery', 'active'),
  -- Sahara Threads
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-00000000000a', 'SAHA-001', '6000a0001145', 'Sahara Threads Apparel Line 1', 21, 24, 'Apparel', 'active'),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-00000000000a', 'SAHA-002', '6000a0002245', 'Sahara Threads Apparel Line 2', 25, 28, 'Apparel', 'active'),
  -- PixelPerch Accessories
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-00000000000b', 'PIXE-001', '6000b0001145', 'PixelPerch Personal Computer Line 1', 22, 26, 'Personal Computer', 'active'),
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-00000000000b', 'PIXE-002', '6000b0002245', 'PixelPerch Personal Computer Line 2', 26, 30, 'Personal Computer', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO purchase_orders (id, brand_id, po_number, status, ship_window_start, ship_window_end, delivery_window_start, delivery_window_end) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'PO-9000', 'received',     now() - interval '14 days', now() - interval '7 days',  current_date - 7,  current_date),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'PO-9001', 'under_review', now() - interval '5 days',  now() + interval '2 days',  current_date + 2,  current_date + 9),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'PO-9002', 'under_review', now() - interval '14 days', now() - interval '7 days',  current_date - 7,  current_date),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'PO-9003', 'accepted',     now() - interval '5 days',  now() + interval '2 days',  current_date + 2,  current_date + 9),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'PO-9004', 'accepted',     now() - interval '14 days', now() - interval '7 days',  current_date - 7,  current_date),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'PO-9005', 'rejected',     now() - interval '5 days',  now() + interval '2 days',  current_date + 2,  current_date + 9),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000004', 'PO-9006', 'rejected',         now() - interval '14 days', now() - interval '7 days',  current_date - 7,  current_date),
  ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000004', 'PO-9007', 'ready_to_fulfil',   now() - interval '5 days',  now() + interval '2 days',  current_date + 2,  current_date + 9),
  ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000005', 'PO-9008', 'ready_to_fulfil', now() - interval '14 days', now() - interval '7 days',  current_date - 7,  current_date),
  ('c0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000005', 'PO-9009', 'shipped',        now() - interval '5 days',  now() + interval '2 days',  current_date + 2,  current_date + 9),
  ('c0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000006', 'PO-9010', 'shipped',       now() - interval '14 days', now() - interval '7 days',  current_date - 7,  current_date),
  ('c0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-000000000006', 'PO-9011', 'delivered',     now() - interval '5 days',  now() + interval '2 days',  current_date + 2,  current_date + 9),
  ('c0000000-0000-0000-0000-00000000000d', 'a0000000-0000-0000-0000-000000000007', 'PO-9012', 'delivered',  now() - interval '14 days', now() - interval '7 days',  current_date - 7,  current_date),
  ('c0000000-0000-0000-0000-00000000000e', 'a0000000-0000-0000-0000-000000000007', 'PO-9013', 'received',   now() - interval '5 days',  now() + interval '2 days',  current_date + 2,  current_date + 9),
  ('c0000000-0000-0000-0000-00000000000f', 'a0000000-0000-0000-0000-000000000008', 'PO-9014', 'received',     now() - interval '14 days', now() - interval '7 days',  current_date - 7,  current_date),
  ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000008', 'PO-9015', 'under_review', now() - interval '5 days',  now() + interval '2 days',  current_date + 2,  current_date + 9),
  ('c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000009', 'PO-9016', 'under_review', now() - interval '14 days', now() - interval '7 days',  current_date - 7,  current_date),
  ('c0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000009', 'PO-9017', 'accepted',     now() - interval '5 days',  now() + interval '2 days',  current_date + 2,  current_date + 9),
  ('c0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-00000000000a', 'PO-9018', 'accepted',     now() - interval '14 days', now() - interval '7 days',  current_date - 7,  current_date),
  ('c0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-00000000000a', 'PO-9019', 'rejected',     now() - interval '5 days',  now() + interval '2 days',  current_date + 2,  current_date + 9),
  ('c0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-00000000000b', 'PO-9020', 'rejected',         now() - interval '14 days', now() - interval '7 days',  current_date - 7,  current_date),
  ('c0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-00000000000b', 'PO-9021', 'ready_to_fulfil',   now() - interval '5 days',  now() + interval '2 days',  current_date + 2,  current_date + 9)
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
        IF brand_rec.id = 'a0000000-0000-0000-0000-000000000002' AND pi = 1 THEN
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

INSERT INTO shipments (id, po_id, brand_id, carrier, tracking, status) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000004', 'dhl',   'DHL-PO-9007',  'factory_intake'),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000005', 'fedex', 'FDX-PO-9008',  'factory_intake'),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000005', 'bak',   'BAK-PO-9009',  'sea_transit'),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000006', 'palletline', 'PAL-PO-9010', 'sea_transit'),
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-000000000006', 'amazon_partner', 'AMZ-PO-9011', 'live_amazon'),
  ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-00000000000d', 'a0000000-0000-0000-0000-000000000007', 'dhl',   'DHL-PO-9012',  'live_amazon'),
  ('d0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-00000000000b', 'fedex', 'FDX-PO-9021',  'factory_intake')
ON CONFLICT (id) DO NOTHING;

INSERT INTO contracts (id, brand_id, type, status, signed_at) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'distribution_agreement', 'active', now() - interval '180 days'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'distribution_agreement', 'signed', now() - interval '90 days'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'distribution_agreement', 'sent',   NULL),
  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'distribution_agreement', 'active', now() - interval '365 days'),
  ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'distribution_agreement', 'draft',  NULL),
  ('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000006', 'distribution_agreement', 'active', now() - interval '120 days'),
  ('e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000007', 'distribution_agreement', 'sent',   NULL),
  ('e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000008', 'distribution_agreement', 'active', now() - interval '200 days'),
  ('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000009', 'distribution_agreement', 'signed', now() - interval '60 days'),
  ('e0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-00000000000a', 'distribution_agreement', 'under_review', NULL),
  ('e0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000b', 'distribution_agreement', 'active', now() - interval '150 days')
ON CONFLICT (id) DO NOTHING;

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
