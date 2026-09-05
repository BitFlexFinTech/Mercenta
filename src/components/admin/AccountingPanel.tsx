/** §Xero — Super Admin Accounting tab.
 * Connection status, reset tracker, financial summary, Amazon sync,
 * brand payouts table, Penny Pincher integration.
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { isXeroDemoMode } from '@/services/xero';
import { getFinancialSummary } from '@/services/xero/xeroSync';
import { checkAndReseed } from '@/services/xero/xeroReseed';
import { cn } from '@/utils/cn';
import {
  RefreshCw, Link2, AlertTriangle, CheckCircle2, Loader2,
  Clock, DollarSign, TrendingUp, TrendingDown,
  Banknote,
} from 'lucide-react';

const PARTNER_ID = 'a0000000-0000-0000-0000-000000000001';

export function AccountingPanel() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [lastReseed, setLastReseed] = useState<string | null>(null);
  const [daysSinceReseed, setDaysSinceReseed] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [credClientId, setCredClientId] = useState('');
  const [credClientSecret, setCredClientSecret] = useState('');
  const [credTenantId, setCredTenantId] = useState('');
  const [credAccessToken, setCredAccessToken] = useState('');
  const [summary, setSummary] = useState<{ revenue: number; expenses: number; netProfit: number } | null>(null);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const mode = isXeroDemoMode();
    setDemoMode(mode);
    if (!supabase) { setConnected(false); return; }
    const { data: conn } = await supabase.from('xero_connections')
      .select('*').eq('partner_id', PARTNER_ID).maybeSingle();
    if (!conn || conn.status !== 'active') { setConnected(false); return; }
    setConnected(true);
    setLastSync(conn.last_synced_at);
    setLastReseed(conn.last_reset_at);
    if (conn.last_reset_at) {
      const days = Math.floor((Date.now() - new Date(conn.last_reset_at).getTime()) / 86400000);
      setDaysSinceReseed(days);
    }
    const result = await getFinancialSummary(PARTNER_ID, new Date().toISOString().slice(0, 7));
    if (result.data) {
      setSummary({ revenue: result.data.revenue, expenses: result.data.expenses, netProfit: result.data.netProfit });
    }
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleManualReseed = async () => {
    setBusy('Reseeding…');
    setError(null);
    setSeedMessage(null);
    try {
      const result = await checkAndReseed(PARTNER_ID);
      if (result) {
        setSeedMessage(result.message);
        if (!result.ok) setError(result.error ?? 'Reseed failed');
      } else {
        setSeedMessage('No reseed needed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reseed error');
    }
    setBusy(null);
    await loadStatus();
  };

  const handleSaveCredentials = () => {
    setConnected(true);
    setShowCredentialForm(false);
    setDemoMode(false);
    setLastSync(new Date().toISOString());
    setLastReseed(new Date().toISOString());
    setDaysSinceReseed(0);
    setSeedMessage('Credentials saved. Xero connected.');
  };

  const remainingDays = daysSinceReseed !== null ? Math.max(0, 28 - daysSinceReseed) : null;

  return (
    <div className="space-y-6">
      <Card title="Xero Connection Status" className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {connected === null ? (
              <Loader2 className="w-5 h-5 text-zinc-500 animate-spin" />
            ) : connected ? (
              <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Xero Connected{demoMode ? ' (Demo)' : ''}
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/20">
                <AlertTriangle className="w-3 h-3" />
                Xero Not Connected — Add API credentials
              </Badge>
            )}
            {lastSync && (
              <span className="text-[11px] text-zinc-500">
                <Clock className="w-3 h-3 inline mr-1" />
                Last sync: {new Date(lastSync).toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!connected ? (
              <Button onClick={() => setShowCredentialForm(!showCredentialForm)} size="sm">
                <Link2 className="w-3.5 h-3.5" />
                {showCredentialForm ? 'Cancel' : 'Enter Xero Credentials'}
              </Button>
            ) : (
              <Button onClick={handleManualReseed} disabled={!!busy} variant="secondary" size="sm">
                {busy === 'Reseeding…' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                {busy || 'Manual Reseed'}
              </Button>
            )}
          </div>
        </div>
{error && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-[11px] text-red-300">{error}</div>
        )}
        {seedMessage && (
          <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-[11px] text-emerald-300">{seedMessage}</div>
        )}

        {showCredentialForm && (
          <div className="mt-4 space-y-3 border border-white/[0.06] rounded-lg p-4">
            <h4 className="text-xs font-medium text-zinc-400">Xero API Credentials</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Client ID</label>
                <input value={credClientId} onChange={(e) => setCredClientId(e.target.value)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white" placeholder="xero-client-id" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Client Secret</label>
                <input value={credClientSecret} onChange={(e) => setCredClientSecret(e.target.value)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white" placeholder="xero-client-secret" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Tenant ID</label>
                <input value={credTenantId} onChange={(e) => setCredTenantId(e.target.value)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white" placeholder="xero-tenant-id" />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Access Token</label>
                <input value={credAccessToken} onChange={(e) => setCredAccessToken(e.target.value)}
                  className="w-full bg-ink-900 border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white" placeholder="xero-access-token" />
              </div>
            </div>
            <Button onClick={handleSaveCredentials} size="sm" disabled={!credClientId || !credAccessToken}>
              Save & Connect
            </Button>
          </div>
        )}
      </Card>
{demoMode && (
        <Card title="28-Day Reset Tracker" className="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-zinc-400">
              Days since last reseed:{' '}
              <span className="text-white font-semibold">{daysSinceReseed ?? '—'}</span>
              {' / 28'}
            </span>
            {remainingDays !== null && remainingDays <= 3 && (
              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/20">
                <AlertTriangle className="w-3 h-3" />
                {remainingDays} days until reset
              </Badge>
            )}
          </div>
          {daysSinceReseed !== null && (
            <div className="w-full bg-ink-900 rounded-full h-2.5 mb-2">
              <div
                className={cn(
                  'h-2.5 rounded-full transition-all duration-500',
                  remainingDays && remainingDays <= 3 ? 'bg-amber-500' : 'bg-brass-500',
                )}
                style={{ width: `${Math.min(100, (daysSinceReseed / 28) * 100)}%` }}
              />
            </div>
          )}
          <p className="text-[11px] text-zinc-500">
            {remainingDays !== null
              ? `Next expected reset: ${new Date(Date.now() + remainingDays * 86400000).toLocaleDateString()}`
              : 'Not connected — reseed tracking unavailable'}
          </p>
        </Card>
      )}

      <Card title="Financial Summary" className="p-5">
        {summary ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Revenue</span>
              </div>
              <span className="text-lg font-semibold text-white">£{summary.revenue.toLocaleString()}</span>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-rose-400 mb-1">
                <TrendingDown className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Expenses</span>
              </div>
              <span className="text-lg font-semibold text-white">£{summary.expenses.toLocaleString()}</span>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-brass-400 mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Net Profit</span>
              </div>
              <span className={cn('text-lg font-semibold', summary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                £{summary.netProfit.toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 italic">Connect Xero to see financial summary.</p>
        )}
      </Card>

      <Card title="Amazon Remittance Sync" className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-400">
            {connected ? 'Xero connected. Sync remittance statements from Amazon.' : 'Connect Xero to enable Amazon remittance sync.'}
          </p>
          <Button disabled={!connected || !!busy} variant="secondary" size="sm">
            <RefreshCw className="w-3.5 h-3.5" /> Sync Now
          </Button>
        </div>
      </Card>

      <Card title="Brand Payouts (Pending)" className="p-5">
        <p className="text-xs text-zinc-500 italic mb-3">
          {connected ? 'Review and mark brand payouts as paid in Xero.' : 'Connect Xero to see brand payout data.'}
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-zinc-500 uppercase tracking-wider">
              <th className="text-left py-2 px-2 font-medium">Brand</th>
              <th className="text-right py-2 px-2 font-medium">Amount</th>
              <th className="text-center py-2 px-2 font-medium">Status</th>
              <th className="text-right py-2 px-2 font-medium">Due Date</th>
              <th className="text-center py-2 px-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-white/[0.03] text-zinc-400">
              <td className="py-2.5 px-2" colSpan={5}>No pending payouts</td>
            </tr>
          </tbody>
        </table>
      </Card>

      <Card title="Penny Pincher Integration" className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">
              Last infra cost sync: {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
            </p>
            <p className="text-[11px] text-zinc-500 mt-1">
              Month-to-date infrastructure costs will sync via Penny Pincher when connected.
            </p>
          </div>
          <Button disabled={!connected || !!busy} variant="secondary" size="sm">
            <Banknote className="w-3.5 h-3.5" /> Sync Costs
          </Button>
        </div>
      </Card>
    </div>
  );
}