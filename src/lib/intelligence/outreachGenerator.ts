/**
 * §Brand Intelligence — Outreach generator.
 * Generates tailored email/LinkedIn per prospect data.
 * Structure: "Why we noticed you" + Amazon evidence + growth evidence + Mercenta proposition + next step.
 */
import type { BrandProspect, ProspectOutreachRecord } from '@/types';

function today(): string { return new Date().toISOString().slice(0, 10); }

function pickContact(p: BrandProspect): { name: string; title: string } | null {
  return p.contacts.length > 0 ? { name: p.contacts[0].name, title: p.contacts[0].jobTitle } : null;
}

function amazonEvidence(p: BrandProspect): string {
  if (p.asins.length === 0) return '';
  const rev = p.asins.reduce((s, a) => s + (a.estimatedRevenue ?? 0), 0);
  const sales = p.asins.reduce((s, a) => s + (a.estimatedSales ?? 0), 0);
  const avgR = (p.asins.reduce((s, a) => s + a.rating, 0) / p.asins.length).toFixed(1);
  const totR = p.asins.reduce((s, a) => s + a.reviewCount, 0);
  const top = p.asins.reduce((b, a) => a.reviewCount > b.reviewCount ? a : b, p.asins[0]);
  let e = `${p.brand}'s products show strong Amazon UK demand — ${p.asins.length} ASINs, ~£${(rev / 1000).toFixed(0)}k/mo estimated revenue`;
  if (totR > 0) e += `, ${totR.toLocaleString()} reviews (${avgR}★ avg)`;
  e += `. "${top.title}" (BSR #${top.bsr}) has strong ranking`;
  if (top.sellerCount > 2) e += ` with ${top.sellerCount} sellers, suggesting supply fragmentation`;
  e += '.';
  return e;
}

function distNote(p: BrandProspect): string {
export function generateEmail(p: BrandProspect): ProspectOutreachRecord {
  const contact = pickContact(p);
  const greet = contact ? `Hi ${contact.name.split(' ')[0]},` : 'Hi there,';
  const rev = p.asins.reduce((s, a) => s + (a.estimatedRevenue ?? 0), 0);

  const body = `${greet}

${amazonEvidence(p)}

${distNote(p)}

We operate Mercenta, a self-service wholesale distribution platform with an existing Amazon UK Vendor relationship. We're interested in testing a small number of proven ASINs — not your entire range.

Would you be open to a brief call to discuss who currently owns Amazon UK supply for ${p.brand}?

Best,
Mercenta Partners`;

  return {
    id: `out-email-${p.id}-${Date.now()}`, prospectId: p.id,
    contactId: contact ? p.contacts[0]?.name : undefined,
    channel: 'email',
    subject: `${p.brand} × Mercenta: Amazon UK Distribution Opportunity`,
    body, status: 'draft', sequenceDay: 0,
  };
}

export function generateLinkedInMessage(p: BrandProspect): ProspectOutreachRecord {
  const contact = pickContact(p);
  const greet = contact ? `Hi ${contact.name.split(' ')[0]}` : 'Hi';
  const rev = p.asins.reduce((s, a) => s + (a.estimatedRevenue ?? 0), 0);
  const amazonNote = rev > 0 ? `~£${(rev / 1000).toFixed(0)}k/mo across ${p.asins.length} products` : `${p.asins.length} products with Amazon UK demand`;

  const body = `${greet}, I've been following ${p.brand}'s Amazon UK growth. Your products are generating real demand — ${amazonNote}${p.asins[0]?.reviewCount ? ` with ${p.asins[0].reviewCount.toLocaleString()}+ reviews` : ''}.

We run Mercenta — UK distribution connected to an active Amazon Vendor relationship. We help brands turn UK demand into consistent POs without the operational overhead.

Would you be open to a 10-min chat?

Best,
Mercenta Partners`;

  return {
    id: `out-li-${p.id}-${Date.now()}`, prospectId: p.id,
    contactId: contact ? p.contacts[0]?.name : undefined,
    channel: 'linkedin', body, status: 'draft', sequenceDay: 0,
  };
}

export function generateFollowUp(p: BrandProspect, day: number): ProspectOutreachRecord {
  const contact = pickContact(p);
  const greet = contact ? `Hi ${contact.name.split(' ')[0]},` : 'Hi,';
  const msgs: Record<number, string> = {
    3: 'Just following up — would love to hear your thoughts on whether our Amazon UK distribution model might fit your brand.',
    7: `${p.brand} has ${p.asins.length} ASINs on Amazon UK with ${p.asins.reduce((s, a) => s + a.reviewCount, 0)} combined reviews — strong UK consumer demand. Our model is designed for brands at exactly this stage.`,
    14: 'I appreciate you may be busy. If the right time comes to explore Amazon UK Vendor support, we'd welcome that conversation.',
    30: 'Circling back after some time — we've continued tracking your Amazon UK growth. If your distribution strategy has evolved, we'd welcome a fresh conversation.',
  };
  return {
    id: `out-fu-${p.id}-d${day}`, prospectId: p.id,
    contactId: contact ? p.contacts[0]?.name : undefined,
    channel: 'email',
    subject: day >= 30 ? `Re: ${p.brand} × Mercenta` : `Following up: ${p.brand}`,
    body: `${greet}\n\n${msgs[day] ?? msgs[7]}\n\nBest,\nMercenta Partners`,
    status: 'draft', sequenceDay: day,
  };
}

export function generateAllOutreach(p: BrandProspect): { email: ProspectOutreachRecord; linkedin: ProspectOutreachRecord; followUps: ProspectOutreachRecord[] } {
  return { email: generateEmail(p), linkedin: generateLinkedInMessage(p), followUps: [3, 7, 14, 30].map(d => generateFollowUp(p, d)) };
}

export function generateOutreachSummary(p: BrandProspect): string {
  const contact = pickContact(p);
  const out = generateAllOutreach(p);
  return [
    `## Outreach: ${p.brand}`,
    `**Contact:** ${contact ? `${contact.name} (${contact.title})` : 'Not identified'}`,
    `**Score:** ${p.score.total}/100 (${p.score.tier})`,
    `**Approach:** ${p.distributors[0]?.suggestedApproach?.replace(/_/g, ' ') ?? 'Direct to brand'}`,
    `**Email:** "${out.email.subject}"`,
    `**LinkedIn:** Day 0 + follow-ups Day 3/7/14/30`,
    `**Acceptance:** ${p.score.acceptanceProbability}/10 (${(p.score.acceptanceProbability / 10 * 100).toFixed(0)}%)`,
    p.distributors.some(d => d.exclusive) ? `\n⚠️ ${p.distributors.find(d => d.exclusive)?.company} is exclusive UK distributor — approach them first.` : '',
  ].filter(Boolean).join('\n');
}
  if (p.distributors.length === 0) return '';
  const d = p.distributors[0];
  if (d.exclusive) return `${d.company} manages UK distribution — we'd welcome a conversation with them about Amazon Vendor support.`;
  return `${d.company} is involved in UK distribution — we can complement existing relationships.`;
}