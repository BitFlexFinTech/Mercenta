import { useState, useMemo } from 'react';
import { BRAND_NAME } from '@/config/brand';
import { PRODUCT_CATEGORIES, MONTHLY_REVENUE_OPTIONS } from '@/types';
import { submitApplication } from '@/data/applicationStore';
import { verifyLinks } from '@/lib/verification/linkVerifier';
import { ArrowLeft, Send, CheckCircle2, Globe, Instagram, Facebook, Search } from 'lucide-react';
import brandMark from '@/assets/mercenta-mark-dark-bg.svg';

const COUNTRIES_WITH_CODES = [
  { name: 'United States', code: '+1' },
  { name: 'Canada', code: '+1' },
  { name: 'United Kingdom', code: '+44' },
  { name: 'Germany', code: '+49' },
  { name: 'France', code: '+33' },
  { name: 'Italy', code: '+39' },
  { name: 'Netherlands', code: '+31' },
  { name: 'Spain', code: '+34' },
  { name: 'Denmark', code: '+45' },
  { name: 'Sweden', code: '+46' },
  { name: 'Norway', code: '+47' },
  { name: 'Poland', code: '+48' },
  { name: 'Zimbabwe', code: '+263' },
  { name: 'South Africa', code: '+27' },
  { name: 'Kenya', code: '+254' },
  { name: 'Nigeria', code: '+234' },
  { name: 'Ghana', code: '+233' },
  { name: 'Ethiopia', code: '+251' },
  { name: 'Tanzania', code: '+255' },
  { name: 'Rwanda', code: '+250' },
  { name: 'Morocco', code: '+212' },
  { name: 'Botswana', code: '+267' },
  { name: 'Mauritius', code: '+230' },
  { name: 'Egypt', code: '+20' },
  { name: 'Australia', code: '+61' },
  { name: 'New Zealand', code: '+64' },
  { name: 'Japan', code: '+81' },
  { name: 'South Korea', code: '+82' },
  { name: 'China', code: '+86' },
  { name: 'India', code: '+91' },
  { name: 'Brazil', code: '+55' },
  { name: 'Mexico', code: '+52' },
  { name: 'UAE', code: '+971' },
  { name: 'Turkey', code: '+90' },
  { name: 'Israel', code: '+972' },
];

interface PartnerApplicationFormProps {
  onBack: () => void;
  onSubmitted: () => void;
}

export function PartnerApplicationForm({ onBack, onSubmitted }: PartnerApplicationFormProps) {
  const [companyName, setCompanyName] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<{ name: string; code: string } | null>(null);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [category, setCategory] = useState<string>(PRODUCT_CATEGORIES[0]);
  const [skuCount, setSkuCount] = useState('');
  const [monthlyRevenue, setMonthlyRevenue] = useState<string>(MONTHLY_REVENUE_OPTIONS[0]);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return COUNTRIES_WITH_CODES;
    const q = countrySearch.toLowerCase();
    return COUNTRIES_WITH_CODES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.includes(q)
    );
  }, [countrySearch]);

  const selectCountry = (c: { name: string; code: string }) => {
    setSelectedCountry(c);
    setCountrySearch(c.name);
    setPhoneCode(c.code);
    setShowCountryDropdown(false);
  };

  const atLeastOneLink = websiteUrl.trim() || instagramUrl.trim() || facebookUrl.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!companyName.trim()) { setError('Company name is required.'); return; }
    if (!selectedCountry) { setError('Please select your country.'); return; }
    if (!atLeastOneLink) { setError('Please provide at least one link so we can verify your brand.'); return; }
    setSubmitting(true);
    const vr = await verifyLinks({
      websiteUrl: websiteUrl.trim() || null,
      instagramUrl: instagramUrl.trim() || null,
      facebookUrl: facebookUrl.trim() || null,
    });
    submitApplication({
      companyName: companyName.trim(), country: selectedCountry.name, category,
      phone: phoneCode && phoneNumber ? `${phoneCode} ${phoneNumber.trim()}` : null,
      skuCount: skuCount ? parseInt(skuCount, 10) : null,
      monthlyRevenue: monthlyRevenue,
      websiteUrl: websiteUrl.trim() || null,
      instagramUrl: instagramUrl.trim() || null,
      facebookUrl: facebookUrl.trim() || null,
      websiteStatus: vr.websiteStatus,
      instagramStatus: vr.instagramStatus,
      facebookStatus: vr.facebookStatus,
      referralSource: referralSource.trim() || null,
      description: description.trim() || null,
    });
    setSubmitting(false);
    onSubmitted();
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <button onClick={onBack} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
        </button>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <img src={brandMark} alt="Mercenta Partners hexagon mark" className="w-10 h-10" />
            <span className="text-xl font-semibold text-white">{BRAND_NAME}</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Request Partner Access</h1>
          <p className="text-sm text-zinc-500">Apply to distribute your products in the UK</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Company Name <span className="text-red-400">*</span></label>
            <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
              className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
              placeholder="Your registered business name" />
          </div>
          <div className="relative">
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Country <span className="text-red-400">*</span></label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" />
              <input type="text" value={countrySearch} onChange={e => { setCountrySearch(e.target.value); setShowCountryDropdown(true); if (selectedCountry && e.target.value !== selectedCountry.name) setSelectedCountry(null); }}
                onFocus={() => setShowCountryDropdown(true)} onBlur={() => setTimeout(() => setShowCountryDropdown(false), 200)}
                className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
                placeholder="Type your country name..." />
            </div>
            {showCountryDropdown && filteredCountries.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-zinc-900 border border-white/[0.08] rounded-lg shadow-2xl max-h-48 overflow-y-auto">
                {filteredCountries.map((c) => (
                  <button key={c.name} type="button" onMouseDown={() => selectCountry(c)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-brass-500/10 transition-colors flex items-center justify-between ${selectedCountry?.name === c.name ? 'bg-brass-500/15 text-brass-400' : 'text-white'}`}>
                    <span>{c.name}</span>
                    <span className="text-xs text-zinc-500 font-mono">{c.code}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedCountry && (
              <p className="text-ds-micro text-emerald-400 mt-1">Selected: {selectedCountry.name} ({selectedCountry.code})</p>
            )}
          </div>
          {selectedCountry && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Phone Number <span className="text-red-400">*</span></label>
              <div className="flex gap-2">
                <div className="flex-shrink-0 bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-zinc-400 font-mono flex items-center">
                  {phoneCode || '—'}
                </div>
                <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
                  placeholder="Your phone number after the country code" />
              </div>
              <p className="text-ds-micro text-zinc-600 mt-1">Your country code is auto-filled. Enter the rest of your number.</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Product Category <span className="text-red-400">*</span></label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brass-500/40 appearance-none cursor-pointer">
              {PRODUCT_CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-zinc-900">{cat}</option>)}
            </select>
          </div>
<div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Number of SKUs</label>
            <input type="number" value={skuCount} onChange={e => setSkuCount(e.target.value)}
              className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
              placeholder="Approximate number of products" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Current Monthly Revenue</label>
            <select value={monthlyRevenue} onChange={e => setMonthlyRevenue(e.target.value)}
              className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brass-500/40 appearance-none cursor-pointer">
              {MONTHLY_REVENUE_OPTIONS.map(opt => <option key={opt} value={opt} className="bg-zinc-900">{opt}</option>)}
            </select>
          </div>
          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-xs text-zinc-500 mb-3">Provide at least one link so we can verify your brand:</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5"><Globe className="w-3 h-3 text-zinc-500" /> Website URL</label>
                <input type="text" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
                  placeholder="https://your-company.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5"><Instagram className="w-3 h-3 text-zinc-500" /> Instagram URL</label>
                <input type="text" value={instagramUrl} onChange={e => setInstagramUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
                  placeholder="https://instagram.com/your-brand" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex items-center gap-1.5"><Facebook className="w-3 h-3 text-zinc-500" /> Facebook URL</label>
                <input type="text" value={facebookUrl} onChange={e => setFacebookUrl(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
                  placeholder="https://facebook.com/your-brand" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">How did you hear about us?</label>
            <input type="text" value={referralSource} onChange={e => setReferralSource(e.target.value)}
              className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
              placeholder="e.g. UK Trade Fair, LinkedIn, Google" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tell us about your products and why you want UK market access</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              maxLength={200} rows={4}
              className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40 resize-none"
              placeholder="Describe your product line, target customers, and why you're looking to enter the UK market..." />
            <p className="text-ds-micro text-zinc-600 text-right mt-1">{description.length}/200</p>
          </div>
          <button type="submit" disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-brass-500 hover:bg-brass-600 text-white font-medium px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? <>...</> : <><Send className="w-4 h-4" /> Submit Application</>}
          </button>
        </form>
      </div>
    </div>
  );
}
export function ApplicationReceived({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Application Received</h1>
        <p className="text-sm text-zinc-400 leading-relaxed mb-8">Our team will review your brand and respond within 2 business days.</p>
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-brass-400 hover:text-brass-300 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
        </button>
      </div>
    </div>
  );
}
