/**
 * §Batch-14 — Amazon UK Fulfilment Centre selector.
 *
 * Admin-editable list of Amazon UK FCs for use when creating shipments.
 * Brands and admin select from the list rather than typing addresses freehand.
 * The FC list source is DEFAULT_UK_FC_LIST (in types.ts) — replace with
 * an admin-managed Supabase table or demoStore when live.
 */
import { useState, useMemo } from 'react';
import { Search, MapPin } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AmazonFulfilmentCentre } from '@/types';
import { DEFAULT_UK_FC_LIST } from '@/types';

interface FcSelectorProps {
  /** Currently selected FC code. */
  value?: string;
  /** Called when an FC is selected. */
  onChange: (fc: AmazonFulfilmentCentre) => void;
  /** Optional external FC list (admin override). */
  fcList?: AmazonFulfilmentCentre[];
  /** Whether to show the search box. */
  showSearch?: boolean;
}

/**
 * Amazon UK Fulfilment Centre selector with search/filter.
 * Defaults to DEFAULT_UK_FC_LIST unless an external list is provided.
 */
export function FcSelector({ value, onChange, fcList, showSearch = true }: FcSelectorProps) {
  const list = fcList ?? DEFAULT_UK_FC_LIST;
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (fc) =>
        fc.code.toLowerCase().includes(q) ||
        fc.name.toLowerCase().includes(q) ||
        fc.city.toLowerCase().includes(q) ||
        fc.postcode.toLowerCase().includes(q),
    );
  }, [list, search]);

  return (
    <div className="space-y-2">
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search FC by code, city, or postcode…"
            className="w-full bg-ink-900 border border-white/[0.08] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-brass-500/40"
          />
        </div>
      )}
      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {filtered.length === 0 && (
          <p className="text-[10px] text-zinc-600 py-2 text-center">No fulfilment centres match your search.</p>
        )}
        {filtered.map((fc) => (
          <button
            key={fc.code}
            type="button"
            onClick={() => onChange(fc)}
            className={cn(
              'w-full flex items-center gap-2 text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors',
              value === fc.code
                ? 'bg-brass-500/15 text-brass-300 border border-brass-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent',
            )}
          >
            <MapPin className="w-3 h-3 flex-shrink-0 text-zinc-500" />
            <div className="min-w-0 flex-1">
              <span className="font-medium text-white/90">{fc.code}</span>{' '}
              <span className="text-zinc-500">{fc.name}</span>
            </div>
            <span className="text-[10px] text-zinc-600 font-mono flex-shrink-0">{fc.postcode}</span>
          </button>
        ))}
      </div>
    </div>
  );
}