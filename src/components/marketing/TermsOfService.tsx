/**
 * §Batch -4 item 7 — Terms of Service page.
 * Covers platform use, brand obligations, liability, dispute resolution.
 */
import { BRAND_LEGAL_NAME } from '@/config/brand';

export function TermsOfService({ onBack }: { onBack?: () => void }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {onBack && (
          <button onClick={onBack} className="text-xs text-zinc-500 hover:text-white mb-6 transition-colors">
            &larr; Back to homepage
          </button>
        )}
        <h1 className="text-2xl font-bold mb-1">Terms of Service</h1>
        <p className="text-xs text-zinc-500 mb-8">Last updated: 30 August 2026</p>

        <Section title="1. Acceptance">
          <p>By using the {BRAND_LEGAL_NAME} platform, you agree to these Terms.
            If you do not agree, do not use the platform.</p>
        </Section>

        <Section title="2. Definitions">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Platform:</strong> the Mercenta wholesale distribution system</li>
            <li><strong>Brand:</strong> a product supplier registered on the platform</li>
            <li><strong>Retail Network:</strong> the UK fulfilment partners we distribute to</li>
            <li><strong>PO:</strong> purchase order issued by the retail network</li>
          </ul>
        </Section>

        <Section title="3. Brand obligations">
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide accurate product information, pricing, and compliance documentation</li>
            <li>Acknowledge POs within 24 hours per retail network requirements</li>
            <li>Fulfil accepted POs to the specified quantities and delivery windows</li>
            <li>Maintain valid compliance documentation for all listed products</li>
            <li>Notify Mercenta promptly of any changes to business or banking information</li>
          </ul>
        </Section>

        <Section title="4. Platform fees">
          <p>Mercenta charges commission on each PO fulfilled through the platform,
            plus applicable logistics and service fees as disclosed in your agreement.
            Fees are deducted from remittance payments.</p>
        </Section>

        <Section title="5. Payment terms">
          <p>Payments are remitted to brands on the schedule specified in your
            commercial agreement, subject to PO verification, delivery confirmation,
            and deduction resolution.</p>
        </Section>

        <Section title="6. Compliance">
          <p>Brands are responsible for ensuring their products meet UK regulations
            including UKCA/CE marking, REACH, GPSR, and applicable sector-specific
            requirements. Mercenta reserves the right to suspend listing of
            non-compliant products.</p>
        </Section>

        <Section title="7. Limitation of liability">
          <p>Mercenta's total liability for any claim arising from platform use is
            limited to the fees paid by the brand in the 12 months preceding the
            claim. We are not liable for indirect or consequential losses.</p>
        </Section>

        <Section title="8. Termination">
          <p>Either party may terminate the agreement with 30 days' written notice.
            Mercenta may suspend access for material breach, non-compliance, or
            activity that risks the retail network relationship.</p>
        </Section>

        <Section title="9. Governing law">
          <p>These Terms are governed by the laws of England and Wales. Disputes
            shall be subject to the exclusive jurisdiction of the English courts.</p>
        </Section>

        <Section title="10. Contact">
          <p>Questions: <a href="mailto:legal@mercenta.co.uk" className="text-brass-400 hover:underline">legal@mercenta.co.uk</a></p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="text-base font-semibold text-white mb-2">{title}</h2>
      <div className="text-sm text-zinc-400 leading-relaxed">{children}</div>
    </section>
  );
}
