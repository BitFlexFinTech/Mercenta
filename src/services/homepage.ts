import { supabase } from '@/lib/supabase';
import {
  Plane,
  Truck,
  Ship,
  Package,
  ShieldCheck,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

// ---------- Types ----------

export interface GlobalPathway {
  region: string;
  flag: string;
  icon: string;
  route: string;
  color: string;
}

export interface Service {
  icon: string;
  title: string;
  description: string;
}

export interface HomepageContent {
  id?: string;
  nav_items: string[];
  global_pathways: GlobalPathway[];
  services: Service[];
  hero_text: string;
  updated_at?: string;
}

// ---------- Defaults matching Home.tsx (with "UK Amazon 1P" removed) ----------

const DEFAULT_NAV_ITEMS: string[] = [
  'Home',
  'About Us',
  'Services',
  'Global Network',
];

const DEFAULT_GLOBAL_PATHWAYS: GlobalPathway[] = [
  {
    region: 'North America',
    flag: '🇺🇸',
    icon: 'Plane',
    route: 'US Brands → DHL/FedEx Air Courier',
    color: 'border-blue-500/30 text-blue-400',
  },
  {
    region: 'Europe',
    flag: '🇪🇺',
    icon: 'Truck',
    route: 'EU Brands → Trucking Network',
    color: 'border-emerald-500/30 text-emerald-400',
  },
  {
    region: 'Africa',
    flag: '🌍',
    icon: 'Ship',
    route: 'African Brands → BAK Logistics',
    color: 'border-amber-500/30 text-amber-400',
  },
];

const DEFAULT_SERVICES: Service[] = [
  {
    icon: 'Package',
    title: '1P Wholesale Distribution',
    description:
      'We purchase your inventory at Ex-Works pricing and route it directly to Amazon Vendor Central UK.',
  },
  {
    icon: 'ShieldCheck',
    title: 'Importer of Record',
    description:
      'Boxbee holds UK EORI numbers, manages HMRC customs declarations, and ensures full UKCA compliance.',
  },
  {
    icon: 'Truck',
    title: 'Global Logistics Network',
    description:
      'DHL and FedEx for air courier parcels worldwide. BAK Logistics for heavy freight from African origins.',
  },
  {
    icon: 'TrendingUp',
    title: 'Revenue Acceleration',
    description:
      'Bi-weekly payouts in USD, EUR, or GBP. We handle the complexity so you can focus on production.',
  },
];

const DEFAULT_HERO_TEXT = 'Global 1P Wholesale Trade Platform';

export const DEFAULT_HOMEPAGE_CONTENT: HomepageContent = {
  nav_items: DEFAULT_NAV_ITEMS,
  global_pathways: DEFAULT_GLOBAL_PATHWAYS,
  services: DEFAULT_SERVICES,
  hero_text: DEFAULT_HERO_TEXT,
};

// ---------- Icon name -> Lucide component mapping ----------

const ICON_MAP: Record<string, LucideIcon> = {
  Plane,
  Truck,
  Ship,
  Package,
  ShieldCheck,
  TrendingUp,
};

export function getIconByName(name: string): LucideIcon {
  return ICON_MAP[name] || Package;
}

// ---------- Supabase service ----------

export async function fetchHomepageContent(): Promise<HomepageContent> {
  try {
    const { data, error } = await supabase
      .from('homepage_content')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      // Table doesn't exist or query failed — fall back to defaults
      console.warn('fetchHomepageContent error:', error.message);
      return DEFAULT_HOMEPAGE_CONTENT;
    }

    if (!data) {
      // No row exists yet — return defaults
      return DEFAULT_HOMEPAGE_CONTENT;
    }

    return {
      id: data.id,
      nav_items: data.nav_items ?? DEFAULT_NAV_ITEMS,
      global_pathways: data.global_pathways ?? DEFAULT_GLOBAL_PATHWAYS,
      services: data.services ?? DEFAULT_SERVICES,
      hero_text: data.hero_text ?? DEFAULT_HERO_TEXT,
      updated_at: data.updated_at,
    };
  } catch (err) {
    console.warn('fetchHomepageContent exception:', err);
    return DEFAULT_HOMEPAGE_CONTENT;
  }
}

export async function publishHomepageContent(
  content: Omit<HomepageContent, 'id' | 'updated_at'>
): Promise<void> {
  const payload = {
    nav_items: content.nav_items,
    global_pathways: content.global_pathways,
    services: content.services,
    hero_text: content.hero_text,
    updated_at: new Date().toISOString(),
  };

  // Check if a row already exists
  const { data: existing } = await supabase
    .from('homepage_content')
    .select('id')
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    // Update existing row
    const { error } = await supabase
      .from('homepage_content')
      .update(payload)
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    // Insert new row — use a fixed ID so subsequent publishes update it
    const { error } = await supabase
      .from('homepage_content')
      .insert({ id: '00000000-0000-0000-0000-000000000001', ...payload });

    if (error) throw error;
  }
}