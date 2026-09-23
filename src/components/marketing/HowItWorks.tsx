import { PublicNav, type PublicPage } from './PublicNav';
import { PublicFooter } from './PublicFooter';

export function HowItWorks({ onNavigate, onOpenPortal }: { onNavigate: (p: PublicPage) => void; onOpenPortal: () => void }) {
  return (
    <div className="min-h-screen bg-ink text-parchment font-plex">
      <PublicNav currentPage="how-it-works" onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          <section className="text-center">
            <h1 className="font-display text-3xl md:text-4xl font-semibold mb-4">How Mercenta Works</h1>
            <p className="text-sm text-steel max-w-2xl mx-auto leading-relaxed">
              Mercenta Partners is a self-service wholesale distribution platform and UK importer of record.
              We connect independent brands from North America, Europe, and Africa with UK retail channels.
              You manage your operations through a single portal. We handle the infrastructure.
            </p>
          </section>

          <section className="bg-ink-900 border border-white/[0.06] rounded-xl p-8">
            <h2 className="font-display text-xl font-semibold mb-4">The Brand Journey</h2>
            <ol className="space-y-3 text-sm text-steel leading-relaxed">
              <li><strong className="text-parchment">1. Request Partner Access</strong> — Submit an application with brand information, website, and social links.</li>
              <li><strong className="text-parchment">2. Complete Onboarding</strong> — Self-service wizard: profile, legal, banking, carrier preferences, and working-capital assessment.</li>
              <li><strong className="text-parchment">3. Submit Products</strong> — Upload your catalogue in approved categories: Home, Baby, Office Products, Health &amp; Personal Care, Kitchen, Consumer Electronics, Automotive, Grocery, Personal Computer, Apparel.</li>
              <li><strong className="text-parchment">4. Compliance Documents</strong> — Upload Certificate of Incorporation, VAT Registration, EORI Certificate, Bank Account Confirmation, Brand Registry.</li>
              <li><strong className="text-parchment">5. Get Approved</strong> — Mercenta Admin reviews and clears compliance. Catalogue becomes active.</li>
              <li><strong className="text-parchment">6. Receive Purchase Orders</strong> — POs from the retail network appear in your portal. Acknowledge within 24 hours.</li>
              <li><strong className="text-parchment">7. Ship &amp; Track</strong> — Shipments tracked through every stage: Factory Intake → Regional Hub → International Forwarding → UK Port/HMRC → Destination Fulfilment Centre → Live on Retail Channel.</li>
              <li><strong className="text-parchment">8. Ongoing Management</strong> — Manage orders, compliance, returns, analytics, and team communications from your dashboard.</li>
            </ol>
          </section>

          <section className="bg-ink-900 border border-white/[0.06] rounded-xl p-8">
            <h2 className="font-display text-xl font-semibold mb-4">Who Does What</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div className="bg-ink-800 rounded-lg p-4">
                <h3 className="text-brass font-semibold mb-2">Brand</h3>
                <ul className="text-xs text-steel space-y-1 list-disc list-inside">
                  <li>Manages product catalogue and compliance</li>
                  <li>Acknowledges purchase orders</li>
                  <li>Tracks shipments in real-time</li>
                  <li>Manages returns and views analytics</li>
                </ul>
              </div>
              <div className="bg-ink-800 rounded-lg p-4">
                <h3 className="text-brass font-semibold mb-2">Mercenta</h3>
                <ul className="text-xs text-steel space-y-1 list-disc list-inside">
                  <li>UK importation and customs clearance</li>
                  <li>Distribution infrastructure and retail access</li>
                  <li>Compliance oversight and carrier integration</li>
                  <li>Billing, contracts, and remittance</li>
                </ul>
              </div>
              <div className="bg-ink-800 rounded-lg p-4">
                <h3 className="text-brass font-semibold mb-2">Carriers</h3>
                <ul className="text-xs text-steel space-y-1 list-disc list-inside">
                  <li>DHL, FedEx, BAK Logistics</li>
                  <li>Physical shipment execution</li>
                  <li>Manifest and tracking</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>
      <PublicFooter onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
    </div>
  );
}
