import { useState } from 'react';
import {
  MetricStrip,
  PageHeader,
  SlideOverDrawer,
} from '@/next/components/ConsolePrimitives';
import { ConsoleTabs, NoticeBanner, SectionCard } from '@/next/components/ConsoleCharts';

export type FounderTab = 'pitches' | 'model' | 'points' | 'questions' | 'practice';

export interface FounderPitchItem {
  id: string;
  label: string;
  duration: string;
  body: string;
}

export interface FounderSectionItem {
  id: string;
  title: string;
  body: string;
}

export interface FounderQuestionItem {
  id: string;
  question: string;
  answer: string;
}

export interface FounderPracticeItem {
  id: string;
  label: string;
  targetTime: string;
  direction: string;
  cue: string;
}

export interface FounderSlideItem {
  title: string;
  lines: string[];
}

export interface FounderInvestorViewProps {
  honestyNotice: string;
  modelSummary: {
    modelARate: string;
    modelBNetMargin: string;
    shippingMargin: string;
  };
  pitches: readonly FounderPitchItem[];
  businessModel: readonly FounderSectionItem[];
  talkingPoints: readonly FounderSectionItem[];
  questions: readonly FounderQuestionItem[];
  practice: readonly FounderPracticeItem[];
  slides: FounderSlideItem[];
  onDownloadBrief: () => void;
  onDownloadDeck: () => void;
  documentNotice: string | null;
}

export function FounderInvestorView({
  honestyNotice,
  modelSummary,
  pitches,
  businessModel,
  talkingPoints,
  questions,
  practice,
  slides,
  onDownloadBrief,
  onDownloadDeck,
  documentNotice,
}: FounderInvestorViewProps) {
  const [tab, setTab] = useState<FounderTab>('pitches');
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [deckOpen, setDeckOpen] = useState(false);

  return (
    <div className="space-y-6" data-testid="founder-investor-centre">
      <PageHeader
        title="Founder Investor Centre"
        description="Super-Admin-only investor briefings, economic model arithmetic, difficult questions, and downloadable artifacts."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onDownloadBrief}
              className="px-3 py-1.5 rounded border border-zinc-300 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Download founder brief
            </button>
            <button
              type="button"
              onClick={onDownloadDeck}
              className="px-3 py-1.5 rounded border border-zinc-300 bg-white text-[12px] font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Download investor deck
            </button>
            <button
              type="button"
              onClick={() => setDeckOpen(true)}
              className="px-3.5 py-1.5 rounded bg-[var(--mr-accent)] text-white text-[12px] font-medium hover:bg-[var(--mr-accent-600)]"
            >
              Present deck
            </button>
          </div>
        }
      />

      <NoticeBanner tone="warning" title="Canonical figure provenance" message={honestyNotice} />

      {documentNotice && <NoticeBanner tone="info" message={documentNotice} />}

      <MetricStrip
        columns={3}
        items={[
          {
            id: 'fc-model-a',
            label: 'Model A (Commission)',
            value: modelSummary.modelARate,
            context: 'Canonical commission placeholder',
          },
          {
            id: 'fc-model-b',
            label: 'Model B (Net Margin)',
            value: modelSummary.modelBNetMargin,
            context: 'After carrier, fees, and deductions',
          },
          {
            id: 'fc-shipping',
            label: 'Shipping Lane Margin',
            value: modelSummary.shippingMargin,
            context: 'Negotiated carrier spread',
          },
        ]}
      />

      <SectionCard title="Founder Reference Material">
        <ConsoleTabs
          ariaLabel="Founder Investor Centre sections"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'pitches', label: 'Pitches', count: pitches.length },
            { id: 'model', label: 'Business Model', count: businessModel.length },
            { id: 'points', label: 'Talking Points', count: talkingPoints.length },
            { id: 'questions', label: 'Difficult Questions', count: questions.length },
            { id: 'practice', label: 'Meeting Practice', count: practice.length },
          ]}
        />

        {tab === 'pitches' && (
          <div className="space-y-4">
            {pitches.map((p) => (
              <div key={p.id} className="border border-zinc-200 rounded-md p-4 bg-zinc-50/40">
                <div className="text-[13px] font-semibold text-zinc-950 mb-1.5">
                  {p.label} — {p.duration}
                </div>
                <p className="text-[13px] text-zinc-800 whitespace-pre-line leading-relaxed">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === 'model' && (
          <div className="space-y-4">
            {businessModel.map((s) => (
              <div key={s.id} className="border border-zinc-200 rounded-md p-4 bg-zinc-50/40">
                <div className="text-[13px] font-semibold text-zinc-950 mb-1.5">{s.title}</div>
                <p className="text-[13px] text-zinc-800 whitespace-pre-line leading-relaxed">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === 'points' && (
          <div className="divide-y divide-zinc-200">
            {talkingPoints.map((t) => (
              <div key={t.id} className="py-3 first:pt-0 last:pb-0">
                <div className="text-[13px] font-semibold text-zinc-950">{t.title}</div>
                <p className="mt-1 text-[13px] text-zinc-700">{t.body}</p>
              </div>
            ))}
          </div>
        )}

        {tab === 'questions' && (
          <div className="space-y-2">
            {questions.map((q) => {
              const isOpen = openQuestion === q.id;
              return (
                <div key={q.id} className="border border-zinc-200 rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setOpenQuestion(isOpen ? null : q.id)}
                    className="w-full text-left px-4 py-3 text-[13px] font-medium text-zinc-950 hover:bg-zinc-50 flex items-center justify-between gap-2"
                  >
                    <span>{q.question}</span>
                    <span className="text-[12px] text-zinc-500">{isOpen ? 'Hide' : 'Show'}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50/60 text-[13px] text-zinc-700 leading-relaxed">
                      {q.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'practice' && (
          <div className="divide-y divide-zinc-200">
            {practice.map((s) => (
              <div key={s.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-zinc-950">{s.label}</span>
                  <span className="text-[11px] font-mono text-[var(--mr-accent)]">{s.targetTime}</span>
                </div>
                <p className="text-[13px] text-zinc-700">{s.direction}</p>
                <p className="text-[12px] text-zinc-500">Cue: {s.cue}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SlideOverDrawer
        open={deckOpen}
        onClose={() => setDeckOpen(false)}
        title="Mercenta — Investor Deck Preview"
        subtitle={`${slides.length} canonical slides`}
        testId="founder-deck-drawer"
      >
        <div className="space-y-4">
          {slides.map((s, idx) => (
            <div key={s.title} className="border border-zinc-200 rounded-md p-4 bg-zinc-50/40">
              <div className="text-[11px] font-mono text-zinc-500">Slide {idx + 1}</div>
              <div className="text-[15px] font-semibold text-zinc-950 mt-0.5">{s.title}</div>
              <ul className="mt-2 space-y-1 text-[13px] text-zinc-700">
                {s.lines.map((line, li) => (
                  <li key={li}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SlideOverDrawer>
    </div>
  );
}
