/**
 * §21/M12 — FOUNDER INVESTOR CENTRE (Super Admin only).
 *
 * PRIVATE founder tooling: the pitches, the business model, investor talking
 * points, the difficult questions, meeting practice, and generated artefacts
 * (brief + deck). Nothing here is brand-facing, and the AdminShell renders it
 * only for the Super Admin tier.
 *
 * Every figure on this screen is read from the SAME canonical modules the product
 * uses (`founderContent.ts` derives them from the commercial-model arithmetic), so
 * the founder can never quote a number the platform disagrees with — and the
 * honesty notice is displayed above everything.
 */
import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { cn } from '@/utils/cn';
import {
  FOUNDER_BUSINESS_MODEL,
  FOUNDER_DIFFICULT_QUESTIONS,
  FOUNDER_HONESTY_NOTICE,
  FOUNDER_KEY_FIGURES,
  FOUNDER_MEETING_PRACTICE,
  FOUNDER_PITCHES,
  FOUNDER_TALKING_POINTS,
} from '@/config/founderContent';
import {
  DOCUMENT_FORMAT,
  PRESENTATION_FORMAT,
  downloadHtml,
  openPrintView,
  renderFounderBriefHtml,
  renderPitchDeckHtml,
} from '@/lib/founder/documentExport';
import { Crown, FileText, Presentation, ShieldAlert } from 'lucide-react';

const TABS = [
  { id: 'pitches', label: 'Pitches' },
  { id: 'model', label: 'Business model' },
  { id: 'points', label: 'Talking points' },
  { id: 'questions', label: 'Difficult questions' },
  { id: 'practice', label: 'Meeting practice' },
] as const;

type CentreTab = (typeof TABS)[number]['id'];

function briefHtml(): string {
  return renderFounderBriefHtml({
    generatedFor: 'the founder (Super Admin)',
    keyFigures: FOUNDER_KEY_FIGURES as unknown as Record<string, unknown>,
    pitches: FOUNDER_PITCHES,
    businessModel: FOUNDER_BUSINESS_MODEL,
    talkingPoints: FOUNDER_TALKING_POINTS,
    questions: FOUNDER_DIFFICULT_QUESTIONS,
    practice: FOUNDER_MEETING_PRACTICE,
    honestyNotice: FOUNDER_HONESTY_NOTICE,
  });
}

function deckHtml(): string {
  return renderPitchDeckHtml({
    title: 'Mercenta — investor deck (HTML)',
    honestyNotice: FOUNDER_HONESTY_NOTICE,
    slides: [
      {
        title: 'Mercenta',
        lines: [
          'The intermediary layer between brands and the UK retail channel.',
          'One supplier account. Many brands behind it.',
        ],
      },
      {
        title: 'The problem',
        lines: [
          'Entering the UK is not a shipping decision — it is a corporate one.',
          'Importer of record, customs, UKCA compliance, channel relationship,',
          'carrier accounts, deductions, payouts. Most brands will never build it.',
        ],
      },
      {
        title: 'What Mercenta does',
        lines: [
          'The order is addressed to Mercenta. We identify the brand, the brand',
          'responds, and we communicate the outcome through the channel.',
          'Compliance gate → logistics → invoice → payment → reconciliation → payout.',
        ],
      },
      {
        title: 'How we make money — Model A',
        lines: [
          `${FOUNDER_KEY_FIGURES.modelA.po} order at ${FOUNDER_KEY_FIGURES.modelA.rate} commission`,
          `${FOUNDER_KEY_FIGURES.modelA.commission} to Mercenta · ${FOUNDER_KEY_FIGURES.modelA.brandAmount} to the brand`,
        ],
      },
      {
        title: 'How we make money — Model B',
        lines: [
          `${FOUNDER_KEY_FIGURES.modelB.revenue} revenue − ${FOUNDER_KEY_FIGURES.modelB.acquisition} acquisition = ${FOUNDER_KEY_FIGURES.modelB.grossSpread} GROSS spread`,
          `− ${FOUNDER_KEY_FIGURES.modelB.costs} costs = ${FOUNDER_KEY_FIGURES.modelB.netMargin} NET Mercenta margin`,
        ],
      },
      {
        title: 'Shipping is a revenue line',
        lines: [
          `${FOUNDER_KEY_FIGURES.shipping.list} list → ${FOUNDER_KEY_FIGURES.shipping.carrierCost} to Mercenta (negotiated)`,
          `Brand charged ${FOUNDER_KEY_FIGURES.shipping.brandCharge} → ${FOUNDER_KEY_FIGURES.shipping.margin} margin per lane`,
        ],
      },
      {
        title: 'Why it scales with one founder',
        lines: [
          'The scarce judgement — who to contact, what they are worth, how long',
          'until revenue — is software, not intuition.',
        ],
      },
      {
        title: 'Compliance is the trust layer',
        lines: [
          'A hard gate: no applicable document approved, no route to order.',
          'A commercial agreement never substitutes for a compliance document.',
        ],
      },
      {
        title: 'What the funding buys',
        lines: [
          'Live provider activation · brand acquisition at volume · compliance scale-up.',
          'The workflows already run end to end without credentials.',
        ],
      },
    ],
  });
}

export function FounderInvestorCentre() {
  const [tab, setTab] = useState<CentreTab>('pitches');
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  return (
    <div className="space-y-4" data-testid="founder-investor-centre">
      <Card title="Founder Investor Centre">
        <div className="flex items-start gap-2">
          <Crown className="w-4 h-4 text-brass-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs text-zinc-400">
              Private Super Admin material for investor meetings. Figures are read from the same
              canonical modules the platform uses, so they cannot drift from the product.
            </p>
            <p className="text-[10px] text-amber-300/90 flex items-start gap-1.5 mt-2">
              <ShieldAlert className="w-3 h-3 mt-0.5 flex-shrink-0" />
              {FOUNDER_HONESTY_NOTICE}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            variant="tertiary"
            className="text-xs"
            onClick={() => {
              downloadHtml('mercenta-founder-brief.html', briefHtml());
              setNotice(`Brief downloaded — ${DOCUMENT_FORMAT}.`);
            }}
          >
            <FileText className="w-3.5 h-3.5" />
            Download founder brief
          </Button>
          <Button
            variant="tertiary"
            className="text-xs"
            onClick={() => {
              const opened = openPrintView(briefHtml());
              setNotice(
                opened
                  ? `Brief opened for printing — ${DOCUMENT_FORMAT}.`
                  : 'Popup blocked — allow popups to open the print view.'
              );
            }}
          >
            <FileText className="w-3.5 h-3.5" />
            Open brief for PDF
          </Button>
          <Button
            variant="tertiary"
            className="text-xs"
            onClick={() => {
              const opened = openPrintView(deckHtml());
              setNotice(
                opened
                  ? `Deck opened — ${PRESENTATION_FORMAT}.`
                  : 'Popup blocked — allow popups to open the deck.'
              );
            }}
          >
            <Presentation className="w-3.5 h-3.5" />
            Present deck
          </Button>
        </div>
        {notice && (
          <p className="text-[11px] text-brass-300 mt-2" data-testid="founder-document-notice">
            {notice}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-4 border-t border-white/[0.06] pt-3">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              data-testid={`founder-tab-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn(
                'rounded-ds-md px-3 py-1.5 text-xs transition-ds',
                tab === t.id
                  ? 'bg-white/[0.08] text-white'
                  : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {tab === 'pitches' && (
        <div className="space-y-3" data-testid="founder-pitches">
          {FOUNDER_PITCHES.map((p) => (
            <Card key={p.id} title={`${p.label} — ${p.duration}`}>
              <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">{p.body}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === 'model' && (
        <div className="space-y-3" data-testid="founder-model">
          {FOUNDER_BUSINESS_MODEL.map((s) => (
            <Card key={s.id} title={s.title}>
              <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">{s.body}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === 'points' && (
        <Card title="Investor talking points">
          <div className="space-y-2.5" data-testid="founder-talking-points">
            {FOUNDER_TALKING_POINTS.map((t) => (
              <div key={t.id} className="border-b border-white/[0.04] pb-2">
                <p className="text-xs font-medium text-white">{t.title}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{t.body}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'questions' && (
        <Card title="Difficult questions — practice list">
          <div className="space-y-2" data-testid="founder-questions">
            {FOUNDER_DIFFICULT_QUESTIONS.map((q) => (
              <div key={q.id} className="border border-white/[0.06] rounded-lg">
                <button
                  type="button"
                  data-testid={`founder-question-${q.id}`}
                  onClick={() => setOpenQuestion(openQuestion === q.id ? null : q.id)}
                  className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/[0.03]"
                >
                  {q.question}
                </button>
                {openQuestion === q.id && (
                  <p className="px-3 pb-3 text-[11px] text-zinc-400 leading-relaxed">{q.answer}</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'practice' && (
        <Card title="Investor meeting practice">
          <div className="space-y-3" data-testid="founder-practice">
            {FOUNDER_MEETING_PRACTICE.map((s) => (
              <div key={s.id} className="border-b border-white/[0.04] pb-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-white">{s.label}</p>
                  <span className="text-[10px] text-brass-300">{s.targetTime}</span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">{s.direction}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  <span className="text-zinc-400">Cue:</span> {s.cue}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default FounderInvestorCentre;