import { useMemo, useState } from 'react';
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
  renderFounderBriefHtml,
  renderPitchDeckHtml,
} from '@/lib/founder/documentExport';
import { FounderInvestorView, type FounderSlideItem } from './FounderInvestorView';

export function FounderInvestorScreen() {
  const [notice, setNotice] = useState<string | null>(null);

  const slides: FounderSlideItem[] = useMemo(
    () => [
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
          'Importer of record, customs, UKCA compliance, channel relationship, carrier accounts, deductions, payouts.',
        ],
      },
      {
        title: 'What Mercenta does',
        lines: [
          'The order is addressed to Mercenta. We identify the brand, the brand responds, and we communicate the outcome through the channel.',
          'Compliance gate -> logistics -> invoice -> payment -> reconciliation -> payout.',
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
          `${FOUNDER_KEY_FIGURES.modelB.revenue} revenue - ${FOUNDER_KEY_FIGURES.modelB.acquisition} acquisition = ${FOUNDER_KEY_FIGURES.modelB.grossSpread} GROSS spread`,
          `- ${FOUNDER_KEY_FIGURES.modelB.costs} costs = ${FOUNDER_KEY_FIGURES.modelB.netMargin} NET Mercenta margin`,
        ],
      },
      {
        title: 'Shipping is a revenue line',
        lines: [
          `${FOUNDER_KEY_FIGURES.shipping.list} list -> ${FOUNDER_KEY_FIGURES.shipping.carrierCost} to Mercenta (negotiated)`,
          `Brand charged ${FOUNDER_KEY_FIGURES.shipping.brandCharge} -> ${FOUNDER_KEY_FIGURES.shipping.margin} margin per lane`,
        ],
      },
      {
        title: 'Why it scales with one founder',
        lines: [
          'The scarce judgement — who to contact, what they are worth, how long until revenue — is software, not intuition.',
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
    []
  );

  function handleDownloadBrief() {
    const html = renderFounderBriefHtml({
      generatedFor: 'the founder (Super Admin)',
      keyFigures: FOUNDER_KEY_FIGURES as unknown as Record<string, unknown>,
      pitches: FOUNDER_PITCHES,
      businessModel: FOUNDER_BUSINESS_MODEL,
      talkingPoints: FOUNDER_TALKING_POINTS,
      questions: FOUNDER_DIFFICULT_QUESTIONS,
      practice: FOUNDER_MEETING_PRACTICE,
      honestyNotice: FOUNDER_HONESTY_NOTICE,
    });
    downloadHtml('mercenta-founder-brief.html', html);
    setNotice(`Brief downloaded — ${DOCUMENT_FORMAT}.`);
  }

  function handleDownloadDeck() {
    const html = renderPitchDeckHtml({
      title: 'Mercenta — investor deck (HTML)',
      honestyNotice: FOUNDER_HONESTY_NOTICE,
      slides,
    });
    downloadHtml('mercenta-investor-deck.html', html);
    setNotice(`Investor deck downloaded — ${PRESENTATION_FORMAT}.`);
  }

  return (
    <FounderInvestorView
      honestyNotice={FOUNDER_HONESTY_NOTICE}
      modelSummary={{
        modelARate: FOUNDER_KEY_FIGURES.modelA.rate,
        modelBNetMargin: FOUNDER_KEY_FIGURES.modelB.netMargin,
        shippingMargin: FOUNDER_KEY_FIGURES.shipping.margin,
      }}
      pitches={FOUNDER_PITCHES}
      businessModel={FOUNDER_BUSINESS_MODEL}
      talkingPoints={FOUNDER_TALKING_POINTS}
      questions={FOUNDER_DIFFICULT_QUESTIONS}
      practice={FOUNDER_MEETING_PRACTICE}
      slides={slides}
      onDownloadBrief={handleDownloadBrief}
      onDownloadDeck={handleDownloadDeck}
      documentNotice={notice}
    />
  );
}
