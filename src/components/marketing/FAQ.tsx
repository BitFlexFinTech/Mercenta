import { PublicNav, type PublicPage } from './PublicNav';
import { PublicFooter } from './PublicFooter';
import { BRAND_NAME, BRAND_LEGAL_NAME } from '@/config/brand';

const FAQ_ITEMS = [
  { q: 'What is Mercenta Partners?', a: `${BRAND_NAME} is a self-service wholesale distribution platform and UK importer of record. We connect independent brands from North America, Europe, and Africa with UK retail channels. Brands manage catalogues, purchase orders, shipments, compliance, and retail relationships through a single portal.` },
  { q: 'Who can use Mercenta?', a: 'The platform serves four roles: Brand Partners (product suppliers distributing through our network), Mercenta Admin (operations team), Super Admin (full platform administration), and 3PL Carriers (DHL, FedEx, BAK Logistics).' },
  { q: 'How does the self-service model work?', a: 'Brands onboard themselves through the platform without waiting for manual setup. They submit products, compliance documents, and manage their entire UK operation from a dashboard — all self-managed, all in real-time.' },
  { q: 'What product categories does Mercenta support?', a: 'Ten approved categories: Home, Baby, Office Products, Health & Personal Care, Kitchen, Consumer Electronics, Automotive, Grocery, Personal Computer, and Apparel.' },
  { q: 'How do purchase orders work?', a: 'Purchase orders from the retail network appear in the brand portal. Brands acknowledge POs within 24 hours per retail requirements. Fulfilled POs are tracked through the shipment lifecycle. Mercenta handles remittance minus commission and service fees.' },
  { q: 'What is the shipment lifecycle?', a: 'Shipments are tracked through six stages: Factory Intake → Regional Hub → International Forwarding → UK Port / HMRC Clearance → Mercenta UK Hub → Live on Retail Channel.' },
  { q: 'What compliance documentation is required?', a: 'Brands must provide Certificate of Incorporation, VAT Registration, EORI Certificate, Bank Account Confirmation, and Brand Registry documentation. Products must comply with UK regulations including UKCA/CE marking, REACH, and GPSR.' },
  { q: 'How does a brand get started?', a: 'Submit a Request Partner Access application with brand details and links. Once approved by admin, complete the onboarding wizard (profile, legal, banking, carriers, working capital). Then upload products and compliance documents.' },
  { q: 'What does Mercenta handle?', a: 'Mercenta provides UK importation and customs clearance, distribution infrastructure, retail channel relationships, compliance oversight, carrier integration (DHL, FedEx, BAK, Palletline), billing, and remittance processing.' },
  { q: 'Where does Mercenta operate?', a: `${BRAND_NAME} is a UK-based company (${BRAND_LEGAL_NAME}) operating as an EORI-registered UK importer of record. We source from North America, Europe, and Africa for distribution into UK retail channels.` },
];

export function FAQ({ onNavigate, onOpenPortal }: { onNavigate: (p: PublicPage) => void; onOpenPortal: () => void }) {
  return (
    <div className="min-h-screen bg-ink text-parchment font-plex">
      <PublicNav currentPage="faq" onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
      <main className="pt-24 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-center mb-8">Frequently Asked Questions</h1>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item, i) => (
              <details key={i} className="bg-ink-900 border border-white/[0.06] rounded-xl overflow-hidden">
                <summary className="text-sm font-medium text-parchment px-6 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors">
                  {item.q}
                </summary>
                <div className="px-6 pb-4 text-sm text-steel leading-relaxed">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </main>
      <PublicFooter onNavigate={onNavigate} onOpenPortal={onOpenPortal} />
    </div>
  );
}
