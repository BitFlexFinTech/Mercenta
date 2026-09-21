/**
 * WhatsApp Admin Panel — manages the Twilio WhatsApp escalation channel.
 *
 * Shows connection status, test send capability, and escalation history.
 * The actual escalation logic lives in src/lib/whatsapp/whatsAppEscalation.ts.
 * This is a management UI only — the escalation fires automatically from
 * the hot-lead classification pipeline.
 */

import { useState } from 'react';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { getWhatsAppClient, MockWhatsAppClient } from '@/lib/whatsapp/whatsAppClient';
import { Card, Button } from '@/components/ui';
import { Phone, MessageSquare, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

export function WhatsAppAdminPanel() {
  const { integrations } = useIntegrations();
  const waState = integrations.twilio_whatsapp;
  const connected = waState?.status === 'connected';
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  async function handleTestSend() {
    setTesting(true);
    setTestResult(null);
    const client = getWhatsAppClient(
      connected ? {
        accountSid: waState.metadata?.account_sid,
        authToken: '',
        fromNumber: waState.metadata?.from_number ?? 'whatsapp:+14155238886',
      } : undefined,
    );
    try {
      const result = await client.sendMessage(
        connected ? (waState.metadata?.notify_phone ?? '+447700900000') : '+447700900000',
        '[Test] Mercenta WhatsApp escalation channel is working.',
      );
      setTestResult(result.ok
        ? `Sent (SID: ${result.messageSid ?? 'mock'})`
        : `Failed: ${result.error}`);
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    }
    setTesting(false);
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">WhatsApp Escalation</h3>
            <p className="text-ds-label text-zinc-500 mt-1">
              Twilio WhatsApp Business API — time-sensitive hot-lead notifications.
            </p>
          </div>
          <span className={`text-ds-micro px-2 py-1 rounded-full ${connected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-500/20 text-zinc-400'}`}>
            {(connected ? 'Connected' : 'Mock') + (waState?.sandbox ? ' (Sandbox)' : '')}
          </span>
        </div>

        {!connected && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-ds-label text-amber-200 mb-3">
            Twilio WhatsApp not connected. Configure in Integrations wizard or use mock mode.
            In mock mode, messages are simulated (no actual WhatsApp sent).
          </div>
        )}

        <div className="border border-white/[0.06] rounded-lg p-3 mb-3">
          <h4 className="text-ds-label font-medium text-zinc-300 mb-2 flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            Test Send
          </h4>
          <p className="text-ds-micro text-zinc-500 mb-3">
            Sends a test message to the notify phone configured in the integration.
          </p>
          <Button className="text-xs" disabled={testing} onClick={handleTestSend}>
            {testing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
            {testing ? 'Sending...' : 'Send Test Message'}
          </Button>
          {testResult && (
            <div className={`mt-2 text-ds-micro ${testResult.startsWith('Sent') ? 'text-emerald-400' : 'text-red-400'}`}>
              {testResult.startsWith('Sent') ? <CheckCircle2 className="w-3 h-3 inline mr-1" /> : <AlertTriangle className="w-3 h-3 inline mr-1" />}
              {testResult}
            </div>
          )}
        </div>

        <div className="mt-3 border border-white/[0.06] rounded-lg p-2 text-ds-micro text-zinc-500 flex items-center gap-1">
          <Phone className="w-3 h-3" />
          Escalations fire automatically from hot-lead classification — no manual action needed.
        </div>
      </Card>
    </div>
  );
}