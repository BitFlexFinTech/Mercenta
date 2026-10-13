/**
 * §PHASE B (2026-10-13) — SERVER-HELD PROVIDER SECRETS: ASK, NEVER READ.
 *
 * THE DEFECT THIS REPLACES
 * ------------------------
 * `hasLiveCredentialHint(id)` used to read `import.meta.env['VITE_OPENROUTER_API_KEY']`
 * (and Hunter / Instantly / Postmark) directly in the browser, and
 * `IntegrationsContext` auto-connected those providers from the same values.
 * Vite INLINES every `VITE_*` value into the public JavaScript bundle at build
 * time, so a provider key supplied that way would have been readable by anyone
 * who opened the site — no login required. The key would also have been written
 * into the bundle in `dist/`, so it could not be withdrawn by unsetting the
 * variable.
 *
 * THE FIX
 * -------
 * The browser no longer sees a provider secret, and no longer reads a `VITE_*`
 * provider key. The only question it may ask is "does a server-held secret EXIST
 * for this provider?" — answered by the `integration-secrets-status` Edge
 * Function, which reads Supabase Vault (the `_shared/vault.ts` pattern that
 * already exists) and returns a NAME and a BOOLEAN. Never a value.
 *
 * FAIL-CLOSED: with no Supabase project (the investor demo), with no session, or
 * on any error, the answer is "no secrets known" — so no hint is shown and no
 * provider is claimed to be connectable. The demo never depends on this.
 */
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { INTEGRATION_ORDER } from './registry';
import type { IntegrationId } from './types';

export type ServerSecretPresence = Partial<Record<IntegrationId, boolean>>;

/** Nothing is known to be present. The safe default for every failure path. */
const NO_SECRETS: ServerSecretPresence = {};

/**
 * Ask the server which providers have a credential held in Vault.
 *
 * Returns ONLY booleans keyed by provider. Any failure resolves to `NO_SECRETS`
 * rather than throwing, because this is a purely informational hint and a hint
 * must never be able to break the Integrations surface.
 */
export async function probeServerSecrets(): Promise<ServerSecretPresence> {
  if (!isSupabaseConfigured || !supabase) return NO_SECRETS;

  try {
    const { data, error } = await supabase.functions.invoke('integration-secrets-status', {
      body: { providers: INTEGRATION_ORDER },
    });
    if (error || !data || typeof data !== 'object') return NO_SECRETS;

    const present = (data as { present?: unknown }).present;
    if (!present || typeof present !== 'object') return NO_SECRETS;

    /* Defensive: accept ONLY boolean values, and ONLY for providers this build
       actually knows about. A server answer can never widen the surface. */
    const safe: ServerSecretPresence = {};
    for (const id of INTEGRATION_ORDER) {
      const value = (present as Record<string, unknown>)[id];
      if (typeof value === 'boolean') safe[id] = value;
    }
    return safe;
  } catch {
    return NO_SECRETS;
  }
}
