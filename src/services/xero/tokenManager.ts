/** §Xero — OAuth 2.0 token lifecycle manager.
 * Auth code flow, proactive refresh 5min before expiry, token rotation,
 * per-tenant concurrency lock, demo mode fallback.
 */
import { isXeroDemoMode } from './xeroClient';
import { supabase } from '@/lib/supabase';
import { logSync } from './syncEngine';

const refreshLocks = new Map<string, Promise<TokenResult>>();

interface TokenResult { accessToken: string; refreshToken: string; error?: string; needsReauth?: boolean; }

interface DemoToken { accessToken: string; refreshToken: string; expiresAt: number; }
const demoTokenStore = new Map<string, DemoToken>();

function getOrCreateDemoToken(partnerId: string): DemoToken {
  let t = demoTokenStore.get(partnerId);
  if (!t) {
    t = {
      accessToken: 'xero-demo-access-token-' + partnerId.slice(0, 8),
      refreshToken: 'xero-demo-refresh-token-' + partnerId.slice(0, 8),
      expiresAt: Date.now() + 30 * 60 * 1000,
    };
    demoTokenStore.set(partnerId, t);
  }
  return t;
}

export function buildAuthorizationUrl(clientId: string, redirectUri: string, state: string): string {
  const scopes = ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.contacts', 'accounting.settings', 'offline_access'];
  const params = new URLSearchParams({ response_type: 'code', client_id: clientId, redirect_uri: redirectUri, scope: scopes.join(' '), state });
  return 'https://login.xero.com/identity/connect/authorize?' + params.toString();
}

export async function exchangeCodeForTokens(
  code: string, clientId: string, redirectUri: string, partnerId: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: number; error?: string }> {
  if (isXeroDemoMode()) {
    const t = getOrCreateDemoToken(partnerId);
    await logSync(partnerId, 'token_refresh', 0, true, null, 1);
    return { accessToken: t.accessToken, refreshToken: t.refreshToken + '-rotated', expiresAt: t.expiresAt };
  }
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jcjevaepsweoeiawfurr.supabase.co';
  const edgeUrl = `${baseUrl}/functions/v1/xero-token`;
  try {
    const res = await fetch(edgeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnerId, code, redirectUri, grantType: 'authorization_code' }),
    });
    if (!res.ok) { const text = await res.text(); return { accessToken: '', refreshToken: '', expiresAt: 0, error: text }; }
    const data = await res.json() as { accessToken: string; refreshToken: string; expiresIn: number };
    const expiresAt = Date.now() + data.expiresIn * 1000;
    return { accessToken: data.accessToken, refreshToken: data.refreshToken, expiresAt };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { accessToken: '', refreshToken: '', expiresAt: 0, error: msg };
  }
}
export async function ensureFreshToken(partnerId: string): Promise<{
  accessToken: string; refreshToken: string; error?: string; needsReauth?: boolean;
}> {
  if (isXeroDemoMode()) {
    const t = getOrCreateDemoToken(partnerId);
    if (Date.now() >= t.expiresAt - 5 * 60 * 1000) t.expiresAt = Date.now() + 30 * 60 * 1000;
    return { accessToken: t.accessToken, refreshToken: t.refreshToken };
  }
  const existing = refreshLocks.get(partnerId);
  if (existing) {
    await existing;
    const r = await readTokensFromDb(partnerId);
    return { accessToken: r.accessToken, refreshToken: r.refreshToken, error: r.error };
  }
  const { accessToken, refreshToken, expiresAt, error: readError } = await readTokensFromDb(partnerId);
  if (readError) return { accessToken: '', refreshToken: '', error: readError };
  if (!expiresAt || Date.now() < expiresAt - 5 * 60 * 1000) return { accessToken, refreshToken };
  const p = performTokenRefresh(partnerId, refreshToken);
  refreshLocks.set(partnerId, p);
  try { return await p; } finally { refreshLocks.delete(partnerId); }
}

async function readTokensFromDb(partnerId: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number | null; error?: string }> {
  if (!supabase) return { accessToken: '', refreshToken: '', expiresAt: null, error: 'No Supabase client' };
  const { data, error } = await supabase.from('xero_connections').select('access_token, refresh_token, token_expires_at').eq('partner_id', partnerId).single();
  if (error || !data) return { accessToken: '', refreshToken: '', expiresAt: null, error: error?.message ?? 'No connection found' };
  return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresAt: data.token_expires_at ? new Date(data.token_expires_at).getTime() : null };
}

async function performTokenRefresh(partnerId: string, refreshToken: string): Promise<{
  accessToken: string; refreshToken: string; error?: string; needsReauth?: boolean;
}> {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jcjevaepsweoeiawfurr.supabase.co';
  const edgeUrl = `${baseUrl}/functions/v1/xero-token`;

  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(edgeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId,
          refreshToken,
          grantType: 'refresh_token',
        }),
      });
      if (res.ok) {
        const data = await res.json() as { accessToken: string; refreshToken: string; expiresIn: number };
        // Edge Function already updated xero_connections; sync_log handled server-side
        return { accessToken: data.accessToken, refreshToken: data.refreshToken };
      }
      const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      lastError = errBody.error ?? `HTTP ${res.status}`;
      if (res.status === 400) break; // don't retry client errors
    } catch (err) { lastError = err instanceof Error ? err.message : 'Unknown'; }
  }
  // If Edge Function unavailable, fall back to Supabase update for needs_reauth
  if (supabase) {
    try {
      await supabase.from('xero_connections').update({ status: 'needs_reauth' }).eq('partner_id', partnerId);
      await supabase.from('xero_sync_log').insert({
        partner_id: partnerId, operation: 'token_refresh', records_affected: 0,
        success: false, error_message: lastError, api_calls_used: 2,
      });
    } catch { /* silent */ }
  }
  return { accessToken: '', refreshToken: '', error: lastError, needsReauth: true };
}