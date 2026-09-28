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

/** The vault reference a stored secret is handed out as. Never the value. */
export function vaultSecretRef(name: string): string {
  return name.startsWith('vault:') ? name : `vault:${name}`;
}

/**
 * §BATCH1b — SUPABASE VAULT WRITE (server-side only).
 *
 * The connect flow's missing step 2: a real credential must be stored
 * ENCRYPTED, server-side, and the client must only ever receive the
 * `vault:<name>` REFERENCE. This is that write.
 *
 * Deterministic naming (one secret per integration+provider) so a re-connect
 * UPDATES rather than piling up secrets.
 *
 * Returns false — NEVER throws, NEVER pretends — when Vault is unreachable, so
 * the caller fails closed instead of reporting a connection it did not store.
 */
export function credentialSecretName(integrationId: string, provider: string): string {
  const safe = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return `integration_${safe(integrationId)}${provider ? `_${safe(provider)}` : ''}`;
}

export async function writeVaultSecret(
  name: string,
  value: string,
  description = ''
): Promise<boolean> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey || !name || !value) return false;
  try {
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const existing = await supabase
      .schema('vault')
      .from('secrets')
      .select('id')
      .eq('name', name)
      .maybeSingle();
    const id = (existing.data as { id?: string } | null)?.id;
    if (id) {
      const { error } = await supabase
        .schema('vault')
        .rpc('update_secret', { secret_id: id, new_secret: value });
      return !error;
    }
    const { error } = await supabase
      .schema('vault')
      .rpc('create_secret', { new_secret: value, new_name: name, new_description: description });
    return !error;
  } catch {
    return false;
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
