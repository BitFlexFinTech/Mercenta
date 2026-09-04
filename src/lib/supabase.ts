import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client.
 *
 * Credentials come from env vars (Vite: VITE_-prefixed). When they are not
 * configured, `isSupabaseConfigured` is false and every repository in
 * src/data falls back to local seed data (src/data/demoStore.ts), so the app
 * remains fully runnable in local/demo mode.
 *
 * NEVER hardcode URLs or keys here. The §14 integrations wizard will later
 * manage service-level secrets server-side; these vars are only the
 * browser-safe anon key for direct table reads/writes under RLS.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
