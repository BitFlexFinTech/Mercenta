/**
 * Postiz Admin Panel — social media scheduling management.
 *
 * Surface inside the admin Marketing section. Schedule posts, view queued
 * content, and verify the Postiz connection. The actual scheduling API lives
 * in src/lib/postiz/postizClient.ts.
 */

import { useState } from 'react';
import { useIntegrations } from '@/integrations/IntegrationsContext';
import { getPostizClient } from '@/lib/postiz/postizClient';
import { Card, Button, Input, Textarea } from '@/components/ui';
import { Calendar, CheckCircle2, Loader2, Send, Instagram, Linkedin, Twitter, Youtube } from 'lucide-react';

const PLATFORM_OPTIONS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'twitter', label: 'X / Twitter', icon: Twitter },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'facebook', label: 'Facebook' },
  { id: 'tiktok', label: 'TikTok' },
];

export function PostizAdminPanel() {
  const { integrations } = useIntegrations();
  const postizState = integrations.postiz;
  const connected = postizState?.status === 'connected';
  const apiUrl = postizState?.metadata?.api_url ?? 'http://localhost:8100';

  const [content, setContent] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSchedule() {
    if (!content.trim() || selectedPlatforms.length === 0) return;
    setSending(true);
    setResult(null);
    const client = getPostizClient(connected ? { apiUrl, apiKey: '' } : undefined);
    try {
      const r = await client.schedulePost({ content: content.trim(), platforms: selectedPlatforms });
      setResult(r.ok ? `Scheduled (ID: ${r.post?.id ?? 'mock'})` : `Failed: ${r.error}`);
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    }
    setSending(false);
  }

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Social Media Scheduler</h3>
            <p className="text-[11px] text-zinc-500 mt-1">
              Postiz — self-hosted social scheduling. Schedule posts across Instagram, TikTok, LinkedIn, X, Facebook, YouTube.
            </p>
          </div>
          <span className={`text-[10px] px-2 py-1 rounded-full ${connected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-zinc-500/20 text-zinc-400'}`}>
            {(connected ? 'Connected' : 'Mock') + (postizState?.sandbox ? ' (Sandbox)' : '')}
          </span>
        </div>

        {!connected && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-[11px] text-amber-200 mb-3">
            <strong>Self-hosted service unavailable.</strong> Postiz requires a Docker-capable VPS.
            See <span className="text-brass-300">scripts/deploy-docker.sh</span> to provision and deploy.
            Until deployed, mock mode is active — scheduled posts use simulated data.
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-zinc-500 mb-1 block">Post Content</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your post content..."
              className="w-full min-h-[80px] text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 mb-1 block">Platforms</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((p) => {
                const active = selectedPlatforms.includes(p.id);
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] border transition-colors ${
                      active
                        ? 'bg-brass/20 text-brass border-brass/30'
                        : 'bg-white/[0.04] text-zinc-400 border-white/[0.06] hover:border-white/[0.12]'
                    }`}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Button className="text-xs" disabled={sending || !content.trim() || selectedPlatforms.length === 0} onClick={handleSchedule}>
            {sending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
            {sending ? 'Scheduling...' : 'Schedule Post'}
          </Button>

          {result && (
            <div className={`text-[10px] ${result.startsWith('Scheduled') ? 'text-emerald-400' : 'text-red-400'}`}>
              <CheckCircle2 className="w-3 h-3 inline mr-1" />
              {result}
            </div>
          )}
        </div>

        <div className="mt-3 border border-white/[0.06] rounded-lg p-2 text-[10px] text-zinc-500 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Posts are scheduled via the Postiz API. View the full calendar at{' '}
          <a href={apiUrl} target="_blank" rel="noopener noreferrer" className="text-brass underline">
            {apiUrl}
          </a>
        </div>
      </Card>
    </div>
  );
}