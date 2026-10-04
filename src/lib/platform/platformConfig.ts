/**
 * §Batch-0 — PLATFORM CONFIG SEAM (Supabase platform_config).
 *
 * The persistence seam for the platform-wide demo/live mode. The ONE switch
 * that DECIDES the mode stays src/config/environment.ts; this module only
 * PERSISTS that decision to Supabase so it applies to EVERY device, and reads
 * it back on load.
 *
 * Rules:
 * - It holds NO environment storage key and does NOT read the Vite build env var, so
 *   src/config/environment.ts stays the single owner (gated by
 *   validate-environment).
 * - FAIL-SOFT: with no Supabase configured (the demo default) or before the
 *   platform_config table exists (created in a later, approved batch), every
 *   call returns null/false and NEVER throws. The platform keeps running in demo.
 * - The Supabase client is imported LAZILY, so this module adds nothing to the
 *   first-load path and cannot affect the environment module load.
 */
export type PlatformMode = 'demo' | 'live';

/** The platform_config.key that holds the platform mode. */
export const PLATFORM_MODE_CONFIG_KEY = 'platform_mode';

/** Resolve the shared Supabase client, or null when it is not configured. */
async function getClient() {
  try {
    const mod = await import('@/lib/supabase');
    return mod.isSupabaseConfigured ? mod.supabase : null;
  } catch {
    return null;
  }
}

/** Read the persisted platform mode, or null when unset or unavailable. */
export async function readPlatformMode(): Promise<PlatformMode | null> {
  const sb = await getClient();
  if (sb === null) return null;
  try {
    const { data, error } = await sb
      .from('platform_config')
      .select('value')
      .eq('key', PLATFORM_MODE_CONFIG_KEY)
      .maybeSingle();
    if (error) return null;
    const value = (data as { value?: string } | null)?.value;
    return value === 'live' || value === 'demo' ? value : null;
  } catch {
    return null;
  }
}

/** Persist the platform mode. True ONLY when the write actually succeeded. */
export async function writePlatformMode(
  mode: PlatformMode,
  updatedBy: string | null = null
): Promise<boolean> {
  const sb = await getClient();
  if (sb === null) return false;
  try {
    const { error } = await sb.from('platform_config').upsert(
      {
        key: PLATFORM_MODE_CONFIG_KEY,
        value: mode,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      },
      { onConflict: 'key' }
    );
    return error ? false : true;
  } catch {
    return false;
  }
}
