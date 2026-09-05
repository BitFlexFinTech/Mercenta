#!/usr/bin/env node
/**
 * §Xero — Generate xero-reseed-seed.json from current Supabase data.
 * Backup for manual reseed if auto-reseed fails.
 * Run: node scripts/generate-xero-seed.js
 */
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_PUBLISHABLE_KEY) must be set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function generateSeed() {
  console.log('Reading Xero-related data from Supabase...\n');

  const seed = {
    generatedAt: new Date().toISOString(),
    source: 'Supabase',
    brands: [],
    purchaseOrders: [],
    xeroConnections: [],
    xeroSyncLog: [],
    xeroSyncStatus: [],
  };

  try {
    const { data: brands, error: brandsErr } = await supabase.from('brands').select('*');
    if (brandsErr) console.error('brands error:', brandsErr.message);
    else seed.brands = brands || [];
    console.log(`  brands: ${seed.brands.length}`);
  } catch (e) { console.error('brands error:', e); }

  try {
    const { data: pos, error: posErr } = await supabase.from('purchase_orders').select('*');
    if (posErr) console.error('purchase_orders error:', posErr.message);
    else seed.purchaseOrders = pos || [];
    console.log(`  purchase_orders: ${seed.purchaseOrders.length}`);
  } catch (e) { console.error('purchase_orders error:', e); }

  try {
    const { data: conns, error: connsErr } = await supabase.from('xero_connections').select('*');
    if (connsErr) console.error('xero_connections error:', connsErr.message);
    else seed.xeroConnections = conns || [];
    console.log(`  xero_connections: ${seed.xeroConnections.length}`);
  } catch (e) { console.error('xero_connections error:', e); }

  try {
    const { data: logs, error: logsErr } = await supabase.from('xero_sync_log').select('*');
    if (logsErr) console.error('xero_sync_log error:', logsErr.message);
    else seed.xeroSyncLog = logs || [];
    console.log(`  xero_sync_log: ${seed.xeroSyncLog.length}`);
  } catch (e) { console.error('xero_sync_log error:', e); }

  try {
    const { data: status, error: statusErr } = await supabase.from('xero_sync_status').select('*');
    if (statusErr) console.error('xero_sync_status error:', statusErr.message);
    else seed.xeroSyncStatus = status || [];
    console.log(`  xero_sync_status: ${seed.xeroSyncStatus.length}`);
  } catch (e) { console.error('xero_sync_status error:', e); }

  const outputPath = resolve(process.cwd(), 'scripts/xero-reseed-seed.json');
  writeFileSync(outputPath, JSON.stringify(seed, null, 2));
  console.log(`\n✅ Seed written to scripts/xero-reseed-seed.json`);
  console.log(`   Total records: ${seed.brands.length + seed.purchaseOrders.length + seed.xeroConnections.length + seed.xeroSyncLog.length + seed.xeroSyncStatus.length}`);
}

generateSeed().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});