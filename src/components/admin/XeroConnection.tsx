/** §Xero — Super Admin Xero Connection UI */
import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { isXeroDemoMode, buildAuthorizationUrl } from '@/services/xero';
import type { XeroConnection as XeroConnectionType, XeroSyncLogEntry } from '@/services/xero/types';
import { DEMO_SYNC_LOG } from '@/services/xero/demoData';
import { cn } from '@/utils/cn';
import {
  RefreshCw, Link2, Unlink, AlertTriangle, CheckCircle2, Loader2,
  Clock, XCircle, ExternalLink,
} from 'lucide-react';

type ConnectionState = 'idle' | 'loading' | 'connected' | 'disconnected' | 'needs_reauth' | 'error';

export function XeroConnection() {
  const [connection, setConnection] = useState<XeroConnectionType | null>(null);
  const [syncLogs, setSyncLogs] = useState<XeroSyncLogEntry[]>([]);
  const [state, setState] = useState<ConnectionState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadConnection = useCallback(async () => {
    setState('loading');
    if (isXeroDemoMode()) {
      setConnection({
        id: 'x-conn-mock-001', partner_id: 'a0000000-0000-0000-0000-000000000001',
        xero_tenant_id: 'xero-tenant-mock-001', access_token: '***', refresh_token: '***',
        token_expires_at: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
        last_synced_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        last_reset_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active', created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      });
      setSyncLogs(DEMO_SYNC_LOG);
      setState('connected');
      return;
    }
    if (!supabase) { setState('disconnected'); return; }
    try {
      const { data } = await supabase.from('xero_connections').select('*').maybeSingle();
      if (!data) { setState('disconnected'); return; }
      setConnection(data as unknown as XeroConnectionType);
      setState(data.status as ConnectionState);
      const { data: logs } = await supabase.from('xero_sync_log').select('*').order('created_at', { ascending: false }).limit(10);
      setSyncLogs((logs ?? []) as unknown as XeroSyncLogEntry[]);
    } catch { setState('disconnected'); }
  }, []);
useEffect(() => { loadConnection(); }, [loadConnection]);

  const handleConnect = () => {
    const clientId = import.meta.env.VITE_XERO_CLIENT_ID as string | undefined;
    const redirectUri = import.meta.env.VITE_XERO_REDIRECT_URI || 'https://demo.mercenta.co.uk/xero/callback';
    if (!clientId) {
      setBusy('Connecting…');
      setTimeout(() => {
        setConnection({
          id: 'x-conn-mock-001', partner_id: 'a0000000-0000-0000-0000-000000000001',
          xero_tenant_id: 'xero-tenant-mock-001', access_token: '***', refresh_token: '***',
          token_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          last_synced_at: new Date().toISOString(), last_reset_at: new Date().toISOString(),
          status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
        setSyncLogs(DEMO_SYNC_LOG); setState('connected'); setBusy(null);
      }, 1500);
      return;
    }
    const state = crypto.randomUUID();
    window.open(buildAuthorizationUrl(clientId, redirectUri, state), '_blank', 'noopener,noreferrer');
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Xero integration? This will stop all syncs.')) return;
    setBusy('Disconnecting…');
    if (isXeroDemoMode() && connection) {
      setTimeout(() => { setConnection(null); setState('disconnected'); setBusy(null); }, 500);
      return;
    }
    if (supabase && connection) await supabase.from('xero_connections').update({ status: 'disconnected' }).eq('id', connection.id);
    setConnection(null); setState('disconnected'); setBusy(null);
  };

  const handleForceResync = async () => {
    setBusy('Resyncing…');
    if (isXeroDemoMode()) {
      setTimeout(() => {
        setSyncLogs([
          { id: 'x-sync-mock-force', partner_id: connection?.partner_id ?? '', operation: 'full_resync', records_affected: 3, success: true, error_message: null, api_calls_used: 2, created_at: new Date().toISOString() },
          ...syncLogs.slice(0, 9),
        ]);
        setBusy(null);
      }, 2000);
      return;
    }
    setBusy(null);
  };

  const nextResetDate = connection?.last_reset_at
    ? new Date(new Date(connection.last_reset_at).getTime() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString()
    : '—';

  return (
    <Card title="Xero Accounting Integration" subtitle="Connect Xero to sync invoices, contacts, and cost data">
      <div className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              state === 'connected' ? 'bg-emerald-500/15' : state === 'needs_reauth' ? 'bg-amber-500/15' : 'bg-zinc-500/10'
            )}>
              {state === 'connected' ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> :
               state === 'needs_reauth' ? <AlertTriangle className="w-5 h-5 text-amber-400" /> :
               state === 'loading' ? <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" /> :
               <Link2 className="w-5 h-5 text-zinc-400" />}
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {state === 'connected' ? 'Connected' :
                 state === 'needs_reauth' ? 'Needs Re-authorization' :
                 state === 'loading' ? 'Loading\u2026' :
                 'Not Connected'}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {state === 'connected' ? 'Invoices and contacts syncing' :
                 state === 'needs_reauth' ? 'Token expired - reconnect Xero' :
                 'Xero integration is inactive'}
                {isXeroDemoMode() && <span className="ml-1 text-amber-400">(Mock)</span>}
              </p>
            </div>
          </div>
          <Badge className={cn(
            'text-[10px]',
            state === 'connected' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' :
            state === 'needs_reauth' ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' :
            'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
          )}>
            {state === 'connected' ? 'Active' : state === 'needs_reauth' ? 'Reauth needed' : 'Offline'}
          </Badge>
{connection && state === 'connected' && (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg p-3 space-y-2 text-[11px]">
            <div className="flex justify-between"><span className="text-zinc-500">Xero Tenant ID</span><span className="font-mono text-zinc-300">{connection.xero_tenant_id}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Last Sync</span><span className="text-zinc-300">{connection.last_synced_at ? new Date(connection.last_synced_at).toLocaleString() : '—'}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Next 28-day Reset</span><span className="text-zinc-300">{nextResetDate}</span></div>
            <div className="flex justify-between"><span className="text-zinc-500">Token Expires</span><span className="text-zinc-300">{connection.token_expires_at ? new Date(connection.token_expires_at).toLocaleString() : '—'}</span></div>
          </div>
        )}

        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-[11px] text-red-300">{error}</div>}

        <div className="flex items-center flex-wrap gap-2">
          {state === 'disconnected' && (
            <Button onClick={handleConnect} disabled={!!busy} size="sm">
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}{busy || 'Connect Xero'}
            </Button>
          )}
          {state === 'connected' && (<>
            <Button onClick={handleDisconnect} disabled={!!busy} variant="danger" size="sm">
              {busy === 'Disconnecting\u2026' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}{busy || 'Disconnect'}
            </Button>
            <Button onClick={handleForceResync} disabled={!!busy} variant="secondary" size="sm">
              {busy === 'Resyncing\u2026' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}{busy || 'Force Resync'}
            </Button>
          </>)}
          {state === 'needs_reauth' && (
            <Button onClick={handleConnect} disabled={!!busy} size="sm">
              <ExternalLink className="w-3.5 h-3.5" />Re-authorize Xero
            </Button>
          )}
        </div>

        <div>
          <h4 className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> Recent Sync Activity
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {syncLogs.length === 0 ? (
              <p className="text-[11px] text-zinc-600 italic">No sync activity yet</p>
            ) : (
              syncLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-white/[0.02] text-[11px]">
                  <div className="flex items-center gap-2 min-w-0">
                    {log.success ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
                    <span className="font-medium text-zinc-300 capitalize">{log.operation.replace(/_/g, ' ')}</span>
                    <span className="text-zinc-600">· {log.records_affected} records</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {log.error_message && <span className="text-red-300 truncate max-w-[150px]" title={log.error_message}>{log.error_message}</span>}
                    <span className="text-zinc-600">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {state === 'disconnected' && !connection && (
          <div className="bg-brass-500/5 border border-brass-500/15 rounded-lg p-3">
            <h4 className="text-xs font-medium text-brass-300 mb-1">Getting Started</h4>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              1. Sign up for a Xero free trial at{' '}
              <a href="https://developer.xero.com" target="_blank" rel="noopener noreferrer" className="text-brass-400 underline">developer.xero.com</a><br />
              2. Create a demo company (or use your real one)<br />
              3. Create an OAuth 2.0 app with the redirect URI set to your callback URL<br />
              4. Add the client ID and secret to your .env file<br />
              5. Click Connect Xero above to authorize
            </p>
          </div>
        )}
      </div>
      </div>
    </Card>
  );
}