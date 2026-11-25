/**
 * §WAVE 3f (2026-11-25) — admin messages (data).
 * Reads the canonical message log through the non-paginated hook (the paginated read
 * is 0-based and unnecessary here) and joins each message to its brand.
 */
import { useMemo, useState } from 'react';
import { useBrands, useMessages } from '@/data/queries';
import { AdminMessagesView, type AdminMessageRow } from './AdminMessagesView';

export function AdminMessagesScreen() {
  const messagesQ = useMessages();
  const brandsQ = useBrands();

  const [brandFilter, setBrandFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [needsHumanOnly, setNeedsHumanOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminMessageRow | null>(null);

  const messages = messagesQ.data?.data ?? [];
  const brands = brandsQ.data?.data ?? [];

  const allRows = useMemo<AdminMessageRow[]>(
    () =>
      messages
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((message) => ({
          message,
          brandName:
            brands.find((brand) => brand.id === message.brandId)?.profile.businessName ??
            message.brandId,
        })),
    [messages, brands]
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allRows
      .filter((row) => brandFilter === 'all' || row.message.brandId === brandFilter)
      .filter((row) => channelFilter === 'all' || row.message.channel === channelFilter)
      .filter((row) => directionFilter === 'all' || row.message.direction === directionFilter)
      .filter((row) => !needsHumanOnly || row.message.requiresHuman)
      .filter((row) =>
        query
          ? `${row.message.subject ?? ''} ${row.message.body}`.toLowerCase().includes(query)
          : true
      );
  }, [allRows, brandFilter, channelFilter, directionFilter, needsHumanOnly, search]);

  const channelOptions = useMemo(
    () => Array.from(new Set(allRows.map((row) => row.message.channel))).sort(),
    [allRows]
  );
  const directionOptions = useMemo(
    () => Array.from(new Set(allRows.map((row) => row.message.direction))).sort(),
    [allRows]
  );

  return (
    <AdminMessagesView
      rows={rows}
      totalMessages={allRows.length}
      brandOptions={brands.map((brand) => ({ id: brand.id, name: brand.profile.businessName }))}
      channelOptions={channelOptions}
      directionOptions={directionOptions}
      brandFilter={brandFilter}
      channelFilter={channelFilter}
      directionFilter={directionFilter}
      needsHumanOnly={needsHumanOnly}
      search={search}
      needsHumanCount={allRows.filter((row) => row.message.requiresHuman).length}
      inboundCount={allRows.filter((row) => row.message.direction === 'inbound').length}
      outboundCount={allRows.filter((row) => row.message.direction === 'outbound').length}
      selected={selected}
      isLoading={messagesQ.isPending || brandsQ.isPending}
      isError={messagesQ.isError || brandsQ.isError}
      errorMessage={String(messagesQ.error ?? brandsQ.error ?? '') || undefined}
      onRetry={() => {
        void messagesQ.refetch();
        void brandsQ.refetch();
      }}
      onChangeBrand={setBrandFilter}
      onChangeChannel={setChannelFilter}
      onChangeDirection={setDirectionFilter}
      onToggleNeedsHuman={() => setNeedsHumanOnly((previous) => !previous)}
      onChangeSearch={setSearch}
      onSelect={setSelected}
    />
  );
}