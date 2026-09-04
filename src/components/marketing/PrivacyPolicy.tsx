/**
 * §Batch -4 item 7 — Privacy Policy page.
 * UK GDPR compliant draft. Reflects actual data collected by Mercenta.
 */
export function PrivacyPolicy({ onBack }: { onBack?: () => void }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        {onBack && (
          <button onClick={onBack} className="text-xs text-zinc-500 hover:text-white mb-6 transition-colors">
            &larr; Back to homepage
          </button>
        )}
        <h1 className="text-2xl font-bold mb-1">Privacy Policy</h1>
        <p className="text-xs text-zinc-500 mb-8">Last updated: 30 August 2026</p>
        <p className="text-sm text-zinc-400 mb-8">
          This policy explains how Mercenta Partners Ltd collects, uses, and protects
          your personal data, in compliance with UK GDPR and the Data Protection Act 2018.
        </p>

        <Section title="1. Who we are">
          <p>Mercenta Partners Ltd is a UK wholesale distribution platform. Contact us at{' '}
            <a href="mailto:privacy@mercenta.co.uk" className="text-brass-400 hover:underline">privacy@mercenta.co.uk</a>.</p>
        </Section>

        <Section title="2. What we collect">
          <ul className="list-disc pl-5 space-y-1">
            <li>Identity: name, job title, company name, signatory authority</li>
            <li>Contact: business email, phone, registered address</li>
            <li>Financial: bank account details, sort code, VAT and EORI numbers</li>
            <li>Transaction: purchase order history, shipments, compliance documents, catalog content</li>
            <li>Communications: platform messages, support tickets, call logs</li>
            <li>Technical: IP address, browser type, login timestamps</li>
          </ul>
        </Section>

        <Section title="3. Legal basis">
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Contract performance:</strong> processing orders, shipments, payments</li>
            <li><strong>Legitimate interests:</strong> CRM, fraud prevention, platform improvement</li>
            <li><strong>Legal obligation:</strong> tax reporting, customs, regulatory compliance</li>
            <li><strong>Consent:</strong> marketing (opt-in only)</li>
          </ul>
        </Section>

        <Section title="4. Data sharing">
          <p>We share data with fulfilment partners, payment processors (Stripe), carriers,
            and regulators as required. We never sell personal data or scrape social media.</p>
        </Section>

        <Section title="5. Retention">
          <p>Data is retained for the business relationship plus six years (HMRC requirement),
            then securely deleted or anonymised.</p>
        </Section>

        <Section title="6. Your rights">
          <p>Access, rectify, erase, restrict, port, or withdraw consent — email{' '}
            <a href="mailto:privacy@mercenta.co.uk" className="text-brass-400 hover:underline">privacy@mercenta.co.uk</a>.</p>
        </Section>

        <Section title="7. Security">
          <p>Encryption in transit (TLS), access controls, UK data centre hosting, regular reviews.</p>
        </Section>

        <Section title="8. Contact">
          <p>Privacy queries: <a href="mailto:privacy@mercenta.co.uk" className="text-brass-400 hover:underline">privacy@mercenta.co.uk</a></p>
          <p className="mt-1">Regulator: ICO, Wycliffe House, Wilmslow SK9 5AF —{' '}
            <a href="https://ico.org.uk" className="text-brass-400 hover:underline">ico.org.uk</a></p>
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
