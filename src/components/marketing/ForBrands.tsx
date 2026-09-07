import { PublicNav, type PublicPage } from './PublicNav';
import { PublicFooter } from './PublicFooter';

export function ForBrands({ onNavigate, onOpenPortal }: { onNavigate: (p: PublicPage) => void; onOpenPortal: () => void }) {
  return (
    <div className="min-h-screen bg-ink text-parchment font-plex">
      <PublicNav currentPage="for-brands" onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          <section className="text-center">
            <h1 className="font-display text-3xl md:text-4xl font-semibold mb-4">For Brands</h1>
            <p className="text-sm text-steel max-w-2xl mx-auto">
              Mercenta Partners gives independent brands UK market access without requiring their own UK distribution infrastructure.
              Everything is managed through a self-service portal.
            </p>
          </section>

          <section className="bg-ink-900 border border-white/[0.06] rounded-xl p-8">
            <h2 className="font-display text-xl font-semibold mb-4">What Brands Can Manage</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                { title: 'Dashboard', desc: 'Overview of orders, shipments, and performance metrics' },
                { title: 'Onboarding & Legal', desc: 'Self-service wizard and legal agreement management' },
                { title: 'Contracts', desc: 'Commercial agreement viewing and management' },
                { title: 'Purchase Orders', desc: 'View, acknowledge, and manage POs from the retail network' },
                { title: 'Product Catalog', desc: 'Manage listings across 10 approved categories' },
                { title: 'Inbound Shipments', desc: 'Track from factory intake to live on retail-channel' },
                { title: 'UK Compliance', desc: 'Upload and manage compliance documentation' },
                { title: 'Returns', desc: 'Manage return requests and tracking' },
                { title: 'Analytics', desc: 'Sales performance analytics' },
                { title: 'Reports', desc: 'Business reports and data export' },
                { title: 'Team Messaging', desc: 'Support and team communication' },
                { title: 'Social Accounts', desc: 'Linked social media account management' },
              ].map((item) => (
                <div key={item.title} className="bg-ink-800 rounded-lg p-4">
                  <h3 className="text-brass font-semibold mb-1">{item.title}</h3>
                  <p className="text-xs text-steel">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-ink-900 border border-white/[0.06] rounded-xl p-8">
            <h2 className="font-display text-xl font-semibold mb-4">How to Get Started</h2>
            <ol className="space-y-3 text-sm text-steel leading-relaxed">
              <li><strong className="text-parchment">1. Request Partner Access</strong> — Complete the application form with your brand details, website, and social links.</li>
              <li><strong className="text-parchment">2. Onboard</strong> — Complete the self-service wizard. Submit your profile, legal agreements, banking details, and carrier preferences.</li>
              <li><strong className="text-parchment">3. Upload Products &amp; Compliance</strong> — Add your catalogue and required compliance documents.</li>
              <li><strong className="text-parchment">4. Start Trading</strong> — Once approved, receive POs, manage shipments, and track everything in real-time.</li>
            </ol>
          </section>
        </div>
      </main>
      <PublicFooter onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
    </div>
  );
}
