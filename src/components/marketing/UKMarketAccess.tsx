import { PublicNav, type PublicPage } from './PublicNav';
import { PublicFooter } from './PublicFooter';

export function UKMarketAccess({ onNavigate, onOpenPortal }: { onNavigate: (p: PublicPage) => void; onOpenPortal: () => void }) {
  return (
    <div className="min-h-screen bg-ink text-parchment font-plex">
      <PublicNav currentPage="uk-market-access" onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          <section className="text-center">
            <h1 className="font-display text-3xl md:text-4xl font-semibold mb-4">UK Market Access</h1>
            <p className="text-sm text-steel max-w-2xl mx-auto leading-relaxed">
              Mercenta Partners is a UK-based wholesale distribution platform and importer of record.
              We provide international brands with the infrastructure needed to enter and operate in the UK retail market.
            </p>
          </section>

          <section className="bg-ink-900 border border-white/[0.06] rounded-xl p-8">
            <h2 className="font-display text-xl font-semibold mb-4">UK Importer of Record</h2>
            <p className="text-sm text-steel leading-relaxed mb-4">
              Mercenta is EORI registered and acts as the UK importer of record for brands distributing through our network.
              We handle customs clearance, compliance documentation, and UK regulatory requirements including UKCA/CE marking, REACH, and GPSR.
            </p>
            <ul className="text-sm text-steel space-y-2 list-disc list-inside">
              <li>EORI registered UK importer of record</li>
              <li>HMRC customs clearance and duty management</li>
              <li>UKCA/CE compliance oversight</li>
              <li>VAT and duty handling</li>
              <li>Product compliance documentation management</li>
            </ul>
          </section>

          <section className="bg-ink-900 border border-white/[0.06] rounded-xl p-8">
            <h2 className="font-display text-xl font-semibold mb-4">Distribution Infrastructure</h2>
            <p className="text-sm text-steel leading-relaxed mb-4">
              Brands ship products to our UK distribution hub, where inventory is received, processed, and distributed to retail channels.
              Every shipment is tracked through the platform from origin to retail fulfilment.
            </p>
            <p className="text-sm text-steel leading-relaxed">
              Our carrier network includes DHL, FedEx, BAK Logistics, and Palletline,
              providing flexible routing for international shipments across sea and air freight.
            </p>
          </section>

          <section className="bg-ink-900 border border-white/[0.06] rounded-xl p-8">
            <h2 className="font-display text-xl font-semibold mb-4">Global Sourcing Routes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-ink-800 rounded-lg p-4">
                <h3 className="text-brass font-semibold mb-1">North America</h3>
                <p className="text-xs text-steel">US brands enter through established trade corridors into UK retail channels.</p>
              </div>
              <div className="bg-ink-800 rounded-lg p-4">
                <h3 className="text-brass font-semibold mb-1">Europe</h3>
                <p className="text-xs text-steel">EU brands move by road freight into UK distribution with full compliance handled.</p>
              </div>
              <div className="bg-ink-800 rounded-lg p-4">
                <h3 className="text-brass font-semibold mb-1">Africa</h3>
                <p className="text-xs text-steel">African brands ship through our depot network into UK retail channels.</p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <PublicFooter onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
    </div>
  );
}
