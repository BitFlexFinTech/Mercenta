import { useState, useEffect } from 'react';
import { useApp } from '@/store';
import { Card, Badge, Button, Input, Textarea, Checkbox } from '@/components/ui';
import { cn } from '@/utils/cn';
import type { Lead } from '@/types';
import {
  Sparkles,
  Loader2,
  Rocket,
  Mail,
  Send,
  Inbox,
  CalendarCheck,
  Target,
  Zap,
  TrendingUp,
} from 'lucide-react';

const TICKER_MESSAGES = [
  'Explee agent studying competitors...',
  'Scanning US organic food directories...',
  'Checking European cosmetics databases...',
  'Scanning trade-maps for African export activity...',
  'Analyzing Canadian wellness manufacturers...',
  'Cross-referencing HMRC import records...',
  'Identifying high-intent decision makers...',
  'Building prospect intelligence profiles...',
  'Validating corporate email addresses...',
  'Scoring ICP fit across 4 global segments...',
];

const ICP_SEGMENTS = [
  { name: 'US Natural & Organic Food Brands', score: 96, color: 'bg-emerald-500' },
  { name: 'European Cosmetics & Skincare', score: 92, color: 'bg-neon-500' },
  { name: 'Southern African Agribusiness', score: 88, color: 'bg-blue-500' },
  { name: 'Canadian Wellness Manufacturers', score: 84, color: 'bg-amber-500' },
];

const TARGET_REGIONS = [
  'US Natural & Organic Food Brands',
  'European Cosmetics & Skincare',
  'Southern African Agribusiness',
  'Canadian Wellness Manufacturers',
];

const REGION_FLAG: Record<Lead['region'], string> = {
  us: '🇺🇸',
  eu: '🇪🇺',
  africa: '🌍',
  canada: '🇨🇦',
};

function getEmailPreview(lead: Lead): { subject: string; body: string } {
  const firstName = lead.persona.split(',')[0].split(' ')[0];
  const company = lead.company;

  if (lead.region === 'us') {
    return {
      subject: `Boxbee x ${company} — UK Market Entry & VAT Mitigation`,
      body: `Hi ${firstName},

I noticed ${company} is producing premium products out of ${lead.location}. Expanding into the UK market means navigating cross-border VAT, EORI registration, and HMRC customs — all of which can be a real barrier to entry.

Boxbee buys your inventory wholesale, acts as your exclusive UK Importer of Record, and handles all VAT/EORI compliance. We route your products straight to Amazon 1P channels in the UK, so you can sell into the UK market without setting up a single customs account.

We also handle US FCC/FDA exemption documentation for outbound shipments, so nothing gets held up at the border.

Open to a 15-minute call this week?

— Dave Anderson, Boxbee Commerce`,
    };
  }

  if (lead.region === 'eu') {
    return {
      subject: `Boxbee x ${company} — UK Cross-Border Distribution`,
      body: `Hi ${firstName},

I noticed ${company} is scaling out of ${lead.location}. Post-Brexit, selling into the UK from the EU means dealing with CE-to-UKCA marking transitions, EORI numbers, and HMRC customs declarations — friction that slows down even the best brands.

Boxbee buys your inventory wholesale, manages all CE/UKCA compliance transitions, and routes your products directly to Amazon 1P channels in the UK. We handle the customs, VAT, and regulatory side so you can focus on production.

We also manage CE Declarations for your outbound shipments to ensure smooth clearance.

Open to a 15-minute call this week?

— Dave Anderson, Boxbee Commerce`,
    };
  }

  if (lead.region === 'canada') {
    return {
      subject: `Boxbee x ${company} — UK Market Entry & Cross-Border Tax Mitigation`,
      body: `Hi ${firstName},

I noticed ${company} is building wellness products out of ${lead.location}. Expanding from Canada into the UK market means navigating cross-border tax structures, VAT registration, and HMRC customs — significant overhead for a growing brand.

Boxbee buys your inventory wholesale, acts as your exclusive UK Importer of Record, and handles all VAT/EORI compliance. We route your products straight to Amazon 1P channels in the UK, eliminating the need for you to set up UK tax infrastructure.

We also handle customs documentation for outbound shipments from North America.

Open to a 15-minute call this week?

— Dave Anderson, Boxbee Commerce`,
    };
  }

  // Africa
  return {
    subject: `Boxbee x ${company} — UK Growth via BAK Logistics`,
    body: `Hi ${firstName},

I noticed your brand scales premium products out of ${lead.location}. Shipping internationally from Africa gets expensive fast, and UK customs can be complex.

Boxbee buys your inventory wholesale via our BAK Logistics node, clears UK HMRC customs, and moves it straight to Amazon 1P channels in the UK. We handle Export CD1 forms, ZIMRA customs clearing, and bonded warehousing through our Southern African depot network.

We act as your exclusive UK Importer of Record — handling UKCA compliance, EORI registration, and Vendor Central distribution. You focus on production; we handle the rest.

Open to a 15-minute call this week?

— Dave Anderson, Boxbee Commerce`,
  };
}

export function ExpleeFinder() {
  const { leads, updateLeadStatus, campaigns } = useApp();
  const [step, setStep] = useState(1);
  const [pitch, setPitch] = useState(
    'Global 1P wholesale distribution and supply chain management for premium American, European, and African brands entering the UK e-commerce market, utilizing BAK Logistics, DHL, and FedEx.'
  );
  const [competitors, setCompetitors] = useState(
    'african-trade-direct.com\neu-cosmetics-export.com\nus-organic-distributors.com\ncanadian-wellness-trade.ca'
  );
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(
    new Set(TARGET_REGIONS)
  );
  const [scanning, setScanning] = useState(false);
  const [tickerIdx, setTickerIdx] = useState(0);
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id || '');

  useEffect(() => {
    if (scanning) {
      const interval = setInterval(() => {
        setTickerIdx((i) => {
          if (i >= TICKER_MESSAGES.length - 1) {
            setScanning(false);
            return 0;
          }
          return i + 1;
        });
      }, 800);
      return () => clearInterval(interval);
    }
  }, [scanning]);

  const toggleRegion = (r: string) =>
    setSelectedRegions((prev) => {
      const next = new Set(prev);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });

  const totalDispatched = campaigns.reduce((s, c) => s + c.dispatched, 0);
  const totalReplies = campaigns.reduce((s, c) => s + c.replies, 0);
  const totalMeetings = campaigns.reduce((s, c) => s + c.meetings, 0);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || leads[0];
  const emailPreview = selectedLead ? getEmailPreview(selectedLead) : { subject: '', body: '' };

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-neon-500/15 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-neon-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Explee AI Client Finder</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            24/7 autopilot client acquisition — global brand sourcing engine
          </p>
        </div>
      </div>

      {/* A. Setup Wizard */}
      <Card title="Explee Setup & Configuration Wizard">
        <div className="p-5">
          {/* Wizard Steps */}
          <div className="flex items-center gap-2 mb-5">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  step === s
                    ? 'bg-neon-500/20 text-neon-400'
                    : step > s
                    ? 'text-emerald-400'
                    : 'text-zinc-600'
                )}
              >
                <span
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px]',
                    step === s
                      ? 'bg-neon-500 text-white'
                      : step > s
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-ink-700 text-zinc-500'
                  )}
                >
                  {step > s ? '✓' : s}
                </span>
                {s === 1 && 'Pitch & Product'}
                {s === 2 && 'Competitor Scraper'}
                {s === 3 && 'Target Regions'}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-3 animate-fade-in">
              <Textarea
                label="What Boxbee sells/provides"
                value={pitch}
                onChange={(e) => setPitch(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button onClick={() => setStep(2)}>Next Step</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 animate-fade-in">
              <Textarea
                label="Competitor domains to analyze (one per line)"
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
                rows={4}
              />
              <Button onClick={() => setStep(3)}>Next Step</Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">
                  Target Regions & Segments
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TARGET_REGIONS.map((r) => (
                    <Checkbox
                      key={r}
                      label={r}
                      checked={selectedRegions.has(r)}
                      onChange={() => toggleRegion(r)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={() => {
                    setScanning(true);
                    setTickerIdx(0);
                  }}
                  disabled={scanning}
                >
                  {scanning ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-3.5 h-3.5" />
                      Launch Explee Agent
                    </>
                  )}
                </Button>
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
              </div>

              {scanning && (
                <div className="relative h-32 bg-ink-900 border border-neon-500/20 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-1 bg-neon-500/30 rounded-full overflow-hidden">
                      <div className="h-full bg-neon-500 rounded-full animate-pulse-neon" style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute inset-x-0 h-0.5 bg-neon-500/40 animate-scan" />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-xs text-neon-400 font-mono">
                    {TICKER_MESSAGES[tickerIdx]}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* B. ICP Classifier */}
      <Card
        title="Target Ideal Customer Profile (ICP) Classifier"
        subtitle="Global segments deduced by Explee AI"
        action={
          <Badge className="bg-neon-500/15 text-neon-400 border-neon-500/20">
            <Target className="w-3 h-3" />
            AI-Classified
          </Badge>
        }
      >
        <div className="p-5 space-y-3">
          {ICP_SEGMENTS.map((seg) => (
            <div key={seg.name} className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-white">{seg.name}</span>
                  <span className="text-sm font-bold text-neon-400">{seg.score}%</span>
                </div>
                <div className="h-2 bg-ink-900 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', seg.color)}
                    style={{ width: `${seg.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* C. Live Prospects Table */}
      <Card title="Live Scraped High-Intent Prospects & Leads" subtitle="Compiled by the Explee cluster — global pipeline">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs text-zinc-500">
                <th className="text-left font-medium px-5 py-3">Contact Persona</th>
                <th className="text-left font-medium px-4 py-3">Location</th>
                <th className="text-left font-medium px-4 py-3">Email</th>
                <th className="text-center font-medium px-4 py-3">AI Fit</th>
                <th className="text-center font-medium px-4 py-3">Priority</th>
                <th className="text-left font-medium px-4 py-3">Outreach Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={cn(
                    'hover:bg-white/[0.02] transition-colors cursor-pointer',
                    selectedLeadId === lead.id && 'bg-neon-500/5'
                  )}
                >
                  <td className="px-5 py-3.5">
                    <div className="text-sm font-medium text-white">{lead.persona}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">{lead.company}</div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-zinc-400">
                    <span className="mr-1">{REGION_FLAG[lead.region]}</span>
                    {lead.location}
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono text-zinc-400">
                    {lead.email}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={cn(
                      'text-sm font-bold',
                      lead.fitScore >= 90 ? 'text-emerald-400' : lead.fitScore >= 80 ? 'text-neon-400' : 'text-amber-400'
                    )}>
                      {lead.fitScore}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <Badge
                      className={cn(
                        'text-[10px]',
                        lead.priority === 'High'
                          ? 'bg-crimson-accent/15 text-red-300 border-red-500/20'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                      )}
                    >
                      {lead.priority}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={lead.outreachStatus}
                      onChange={(e) =>
                        updateLeadStatus(
                          lead.id,
                          e.target.value as typeof lead.outreachStatus
                        )
                      }
                      className="bg-ink-900 border border-white/[0.08] rounded-md px-2.5 py-1 text-xs text-white focus:outline-none focus:border-neon-500/40 cursor-pointer"
                    >
                      {['Scraped', 'Email Sent', 'Replied', 'Meeting Booked'].map((s) => (
                        <option key={s} value={s} className="bg-ink-900">
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* D. Outbound Email & Campaign Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Email Template Editor + Preview */}
        <Card title="Automated Outbound Email Editor" subtitle="AI-generated pitch — adapts to lead region">
          <div className="p-5 space-y-3">
            <div className="text-xs text-zinc-500 mb-1">
              {selectedLead && (
                <span>Previewing for: <span className="text-neon-400 font-medium">{REGION_FLAG[selectedLead.region]} {selectedLead.persona} — {selectedLead.location}</span></span>
              )}
            </div>
            <Input
              label="Subject Line"
              value={emailPreview.subject}
              readOnly
            />
            <div className="bg-ink-900 border border-white/[0.06] rounded-lg p-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
              {emailPreview.body}
            </div>
            <Button className="w-full">
              <Send className="w-3.5 h-3.5" />
              Dispatch Campaign
            </Button>
          </div>
        </Card>

        {/* Campaign Health Stats */}
        <Card title="Campaign Health Statistics" subtitle="Explee Model — real-time metrics">
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatBox
                icon={<Send className="w-3.5 h-3.5" />}
                label="Total Dispatched"
                value={totalDispatched.toLocaleString()}
                color="text-neon-400"
              />
              <StatBox
                icon={<Inbox className="w-3.5 h-3.5" />}
                label="Inbox Delivery Rate"
                value="100%"
                color="text-emerald-400"
              />
              <StatBox
                icon={<Mail className="w-3.5 h-3.5" />}
                label="Total Replies"
                value={String(totalReplies)}
                color="text-blue-400"
              />
              <StatBox
                icon={<CalendarCheck className="w-3.5 h-3.5" />}
                label="Meetings Booked"
                value={String(totalMeetings)}
                color="text-amber-400"
              />
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs text-emerald-300">
                Inbox Delivery Rate hardcoded to 100% — pre-warmed domain status active
              </span>
            </div>

            {/* Campaign Management Rows */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-zinc-500 mb-1">
                Campaign Management
              </div>
              {campaigns.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between bg-ink-900 border border-white/[0.06] rounded-lg px-3 py-2.5"
                >
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-zinc-500" />
                    <span className="text-xs font-medium text-white">{c.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      className={cn(
                        'text-[10px]',
                        c.status === 'Scaling'
                          ? 'bg-neon-500/15 text-neon-400 border-neon-500/20'
                          : c.status === 'Active'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                          : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20'
                      )}
                    >
                      {c.status}
                    </Badge>
                    <span className="text-xs text-zinc-400">
                      Cost/Lead: <span className="text-white font-semibold">£{c.costPerLead}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-ink-900 border border-white/[0.06] rounded-lg p-3">
      <div className={cn('flex items-center gap-1.5 mb-1', color)}>
        {icon}
        <span className="text-[10px] text-zinc-500 font-medium">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}
