/**
 * Scoring engine core. 7-dimension model: 25+20+15+15+10+10+5 = 100.
 */
import type { ProspectASIN, ProspectScore, ProspectTier, GrowthSignal, ProspectRestriction } from '@/types';
import type { RawScoreFactors } from './intelligenceTypes';

export function checkDisq(asins: ProspectASIN[], restrictions: ProspectRestriction[]): { dq: boolean; reason?: string } {
  if (asins.length === 0) return { dq: true, reason: 'No ASINs' };
  if (Math.max(...asins.map(a => a.reviewCount), 0) < 10) return { dq: true, reason: 'Low demand' };
  for (const r of restrictions) {
    if (r.severity === 'hard') {
      const t = ((r.restrictionText ?? '') + ' ' + (r.description ?? '')).toLowerCase();
      if (t.includes('amazon') || t.includes('marketplace')) return { dq: true, reason: r.description };
    }
  }
  return { dq: false };
}

/* ── Sub-scores ──────────────────────────────────────────────────── */

function d(asins: ProspectASIN[]) {
  const rv = asins.reduce((s, a) => s + a.reviewCount, 0) / Math.max(asins.length, 1);
  const bb = Math.min(...asins.map(a => a.bsr), 99999);
  const es = asins.reduce((s, a) => s + (a.estimatedSales ?? 0), 0);
  const ar = asins.reduce((s, a) => s + a.rating, 0) / Math.max(asins.length, 1);
  return { raw: { reviewScore: Math.min(8, Math.round(rv / 1000)), bsrScore: bb <= 500 ? 7 : bb <= 1500 ? 5 : bb <= 3000 ? 3 : bb <= 5000 ? 2 : 1, searchDemandScore: Math.min(5, Math.round(es / 2000)), salesEstimateScore: ar >= 4.5 ? 5 : ar >= 4 ? 4 : ar >= 3.5 ? 3 : 1 }, score: 0 };
}

function p(asins: ProspectASIN[]) {
  const ac = asins.filter(a => a.amazonRetailSeller).length;
  const asl = asins.reduce((s, a) => s + a.sellerCount, 0) / Math.max(asins.length, 1);
  const er = asins.reduce((s, a) => s + (a.estimatedRevenue ?? 0), 0);
  return { ro: ac > 0 ? (asins.some(a => a.amazonOfferClass === 'AMAZON_PRESENT_BUT_UNCLEAR') ? 6 : 4) : 3, sd: Math.min(4, Math.round(asins.length / 2)), rp: 2, fr: asl >= 5 ? 3 : asl >= 3 ? 2 : 1, br: Math.min(3, Math.round(er / 50000)) };
}

function g(signals: GrowthSignal[]) { const ss = Math.min(8, signals.reduce((s, sig) => s + sig.scoreContribution, 0)); return { ss, cb: signals.length > 0 ? 2 : 0 }; }

function gd(distributors: { exclusive?: boolean }[]) { const hx = distributors.some(d => d.exclusive); return { gs: hx ? 2 : distributors.length > 0 ? 6 : 10, oe: distributors.length > 0 ? 3 : 4 }; }

function ac(restrictions: ProspectRestriction[], contacts: { name: string }[], asins: ProspectASIN[]) {
  const hr = restrictions.some(r => r.severity === 'hard' || r.severity === 'conditional');
  const hc = contacts.length > 0;
  const arh = asins.filter(a => a.amazonRetailSeller).length > asins.length / 2;
  return { wo: 2, fa: hc ? 2 : 1, sr: arh ? 1 : 2, rr: hr ? 0 : 3 };
}

function mf(asins: ProspectASIN[], cat: string) {
  const sb = Math.min(3, Math.round(asins.length / 2));
  const rp = ['Grocery', 'Home', 'Baby', 'Health & Personal Care', 'Kitchen'].includes(cat) ? 2 : 1;
  return { sb, rp, cb: 1, oc: 2, ss: 1 };
}

function l(asins: ProspectASIN[]) {
  const ap = asins.reduce((s, a) => s + a.price, 0) / Math.max(asins.length, 1);
  return { wc: 2, hz: 1, ms: ap >= 5 && ap <= 150 ? 2 : 1 };
}

/* ── Calculate ───────────────────────────────────────────────────── */

export function calculateScore(
  asins: ProspectASIN[], signals: GrowthSignal[],
  distributors: { exclusive?: boolean }[], restrictions: ProspectRestriction[],
  contacts: { name: string }[], category: string,
): ProspectScore {
  const d1 = d(asins); const p1 = p(asins); const g1 = g(signals);
  const gd1 = gd(distributors); const a1 = ac(restrictions, contacts, asins);
  const m1 = mf(asins, category); const l1 = l(asins);

  // Recalculate scores from raw values
  const dScore = d1.raw.reviewScore + d1.raw.bsrScore + d1.raw.searchDemandScore + d1.raw.salesEstimateScore;
  const pScore = p1.ro + p1.sd + p1.rp + p1.fr + p1.br;
  const gScore = g1.ss + g1.cb + g1.cb;
  const gdScore = gd1.gs + gd1.oe;
  const aScore = a1.wo + a1.fa + a1.sr + a1.rr;
  const mScore = m1.sb + m1.rp + m1.cb + m1.oc + m1.ss;
  const lScore = l1.wc + l1.hz + l1.ms;
  const total = Math.min(100, dScore + pScore + gScore + gdScore + aScore + mScore + lScore);

  const tier: ProspectTier = total >= 90 ? 'tier_1' : total >= 80 ? 'tier_2' : total >= 70 ? 'tier_3' : total >= 60 ? 'tier_4' : 'unscored';
  return { amazonDemand: dScore, poPotential: pScore, growth: gScore, distributionOpenness: gdScore, acceptanceProbability: aScore, mercentaFit: mScore, logisticsSuitability: lScore, total, tier, calculatedAt: new Date().toISOString().slice(0, 10) };
}