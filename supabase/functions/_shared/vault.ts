/**
 * §BATCH1a — SUPABASE VAULT READ (server-side only).
 *
 * The Integrations wizard stores a live provider credential as a `vault:<name>`
 * secret reference; the plaintext value is read HERE with the service-role
 * client, so only the server ever sees it. Same convention as
 * `supabase/functions/send-email/index.ts → resolveToken`.
 *
 * Returns null when Vault is not wired — the caller then fails closed (503),
 * never guessing a credential.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

/** Strip the `vault:` scheme from a secret reference. */
export function vaultSecretName(secretRef: string): string {
  return secretRef.startsWith('vault:') ? secretRef.slice('vault:'.length) : secretRef;
}

export async function readVaultSecret(secretRef: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const name = vaultSecretName(secretRef);
  if (!supabaseUrl || !serviceKey || !name) return null;
  try {
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data } = await supabase
      .schema('vault')
      .from('decrypted_secrets')
      .select('decrypted_secret')
      .eq('name', name)
      .maybeSingle();
    const value = (data as { decrypted_secret?: string } | null)?.decrypted_secret ?? '';
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

/**
 * Parse a stored credential blob. The wizard stores JSON; a bare string is
 * accepted only for the single-field case the caller names.
 */
export function parseCredentialBlob(
  raw: string,
  singleField?: string
): Record<string, string> | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const out: Record<string, string> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string' || typeof value === 'number') out[key] = String(value);
      }
      return Object.keys(out).length > 0 ? out : null;
    } catch {
      return null;
    }
  }
  if (singleField && trimmed.length > 0) return { [singleField]: trimmed };
  return null;
}
