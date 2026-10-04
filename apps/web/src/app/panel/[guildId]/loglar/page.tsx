import { loadGuildSettings } from '@discordplus/db';
import type { Metadata } from 'next';
import { PageHeader } from '@/components/settings/field';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getDb } from '@/server/db';
import {
  getBotChannelPermissions,
  getGuildChannels,
  ignorableChannelGroups,
  textChannelGroups,
} from '@/server/guild-data';
import { requireGuildAccess } from '@/server/guilds';
import { LoggingForm } from './logging-form';

export const metadata: Metadata = { title: 'Loglar' };

export default async function LoggingSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  await requireGuildAccess(guildId);
  const { settings } = await loadGuildSettings(getDb(), guildId);

  const channels = await getGuildChannels(guildId).catch(() => null);
  // Without the bot's permissions the form still works, just without warnings.
  const permissions = channels ? await getBotChannelPermissions(guildId, channels) : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Loglar" description="Hangi olayların hangi kanala yazılacağı." />
      {channels ? (
        <LoggingForm
          guildId={guildId}
          initial={settings.logging}
          targetGroups={textChannelGroups(channels)}
          ignorableGroups={ignorableChannelGroups(channels)}
          permissions={permissions}
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
