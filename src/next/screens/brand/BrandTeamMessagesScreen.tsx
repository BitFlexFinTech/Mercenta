import { useMemo } from 'react';
import { useApp } from '@/context/GlobalStateContext';
import { useMessages } from '@/data/queries';
import { logMessage } from '@/data/api';
import { demoTeamMembers } from '@/data/demoStore';
import { BrandTeamMessagesView } from './BrandTeamMessagesView';

export function BrandTeamMessagesScreen() {
  const { session, brandProfile } = useApp();
  const messagesQ = useMessages();
  const brandId = session?.tenantId ?? '';
  const brandName = brandProfile?.businessName ?? 'Brand';
  const allMessages = useMemo(() => messagesQ.data?.data ?? [], [messagesQ.data]);

  const teamMembers = useMemo(
    () => demoTeamMembers.filter((m) => m.brandId === brandId),
    [brandId]
  );
  const supportMessages = useMemo(() => {
    if (!brandId) return [];
    return allMessages
      .filter((m) => m.brandId === brandId && m.channel !== 'team_note')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [allMessages, brandId]);

  const teamNotes = useMemo(() => {
    if (!brandId) return [];
    return allMessages
      .filter((m) => m.brandId === brandId && m.channel === 'team_note')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [allMessages, brandId]);

  async function handleSendSupport(body: string) {
    if (!brandId) return;
    await logMessage({
      brandId,
      channel: 'in_app',
      direction: 'inbound',
      subject: 'Support message',
      body,
      sentBy: 'staff',
      requiresHuman: true,
    });
    await messagesQ.refetch();
  }

  async function handleSendTeamNote(body: string) {
    if (!brandId) return;
    await logMessage({
      brandId,
      channel: 'team_note',
      direction: 'inbound',
      subject: `team-note: ${brandProfile?.signatory ?? brandName}`,
      body,
      sentBy: 'staff',
      requiresHuman: false,
    });
    await messagesQ.refetch();
  }

  return (
    <BrandTeamMessagesView
      hasTenant={Boolean(brandId)}
      loading={messagesQ.isPending}
      error={messagesQ.isError ? String(messagesQ.error) : null}
      onRetry={() => void messagesQ.refetch()}
      supportMessages={supportMessages}
      teamNotes={teamNotes}
      teamMembers={teamMembers}
      onSendSupport={handleSendSupport}
      onSendTeamNote={handleSendTeamNote}
    />
  );
}
export default BrandTeamMessagesScreen;
