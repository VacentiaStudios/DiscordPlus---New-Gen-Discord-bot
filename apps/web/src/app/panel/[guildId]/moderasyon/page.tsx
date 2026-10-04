import { loadGuildSettings } from '@discordplus/db';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/settings/field';
import { getDb } from '@/server/db';
import { requireGuildAccess } from '@/server/guilds';
import { ModerationForm } from './moderation-form';

export const metadata: Metadata = { title: 'Moderasyon' };

export default async function ModerationSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  await requireGuildAccess(guildId);
  const { settings } = await loadGuildSettings(getDb(), guildId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderasyon"
        description="Moderasyon komutlarının davranışı ve uyarı eşikleri."
      />
      <ModerationForm guildId={guildId} initial={settings.moderation} />
    </div>
  );
}
