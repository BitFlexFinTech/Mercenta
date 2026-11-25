/**
 * §WAVE 3c (2026-11-25) — admin Brand CRM (data).
 * Aggregates the canonical brand rows and the canonical message log. No message is
 * composed here: the data layer has no send API, and inventing one would be worse
 * than reporting honestly that staff reply through the messaging hub.
 */
import { useMemo, useState } from 'react';
import { useBrands, useMessages } from '@/data/queries';
import { AdminCrmView, type AdminCrmRow } from './AdminCrmView';

export function AdminCrmScreen() {
  const brandsQ = useBrands();
  const messagesQ = useMessages();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminCrmRow | null>(null);

  const brands = brandsQ.data?.data ?? [];
  const messages = messagesQ.data?.data ?? [];

  const rows = useMemo<AdminCrmRow[]>(() => {
    const query = search.trim().toLowerCase();
    return brands
      .filter((brand) => {
        if (!query) return true;
        return `${brand.profile.businessName} ${brand.category}`.toLowerCase().includes(query);
      })
      .map((brand) => {
        const brandMessages = messages
          .filter((message) => message.brandId === brand.id)
          .slice()
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return {
          brand,
          messageCount: brandMessages.length,
          needsHuman: brandMessages.filter((message) => message.requiresHuman).length,
          lastContact: brandMessages[0]?.createdAt,
        };
      });
  }, [brands, messages, search]);

  const selectedMessages = selected
    ? messages
        .filter((message) => message.brandId === selected.brand.id)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 8)
    : [];

  return (
    <AdminCrmView
      rows={rows}
      totalBrands={brands.length}
      needsHumanTotal={messages.filter((message) => message.requiresHuman).length}
      messagesTotal={messages.length}
      search={search}
      selected={selected}
      selectedMessages={selectedMessages}
      isLoading={brandsQ.isPending || messagesQ.isPending}
      isError={brandsQ.isError || messagesQ.isError}
      errorMessage={String(brandsQ.error ?? messagesQ.error ?? '') || undefined}
      onRetry={() => {
        void brandsQ.refetch();
        void messagesQ.refetch();
      }}
      onChangeSearch={setSearch}
      onSelect={setSelected}
    />
  );
}