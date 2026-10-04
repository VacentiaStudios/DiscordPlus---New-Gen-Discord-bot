import { loadGuildSettings } from '@discordplus/db';
import type { LogCategory } from '@discordplus/shared';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/settings/field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getDb } from '@/server/db';
import { getGuildChannels, textChannelGroups } from '@/server/guild-data';
import { requireGuildAccess } from '@/server/guilds';
import { LoggingForm } from './logging-form';

export const metadata: Metadata = { title: 'Loglar' };

const CATEGORIES: readonly LogCategory[] = ['moderation'];

export default async function LoggingSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  await requireGuildAccess(guildId);
  const { settings } = await loadGuildSettings(getDb(), guildId);

  const groups = await getGuildChannels(guildId).then(textChannelGroups, () => null);

  return (
    <div className="space-y-6">
      <PageHeader title="Loglar" description="Hangi olayların hangi kanala yazılacağı." />
      {groups ? (
        <LoggingForm
          guildId={guildId}
          initial={settings.logging}
          groups={groups}
          categories={CATEGORIES}
        />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Kanal listesi alınamadı</AlertTitle>
          <AlertDescription>
            Discord şu anda yanıt vermiyor veya bot sunucuya erişemiyor. Sayfayı birazdan yenileyin.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
