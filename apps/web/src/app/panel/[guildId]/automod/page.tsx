import { loadGuildSettings } from '@discordplus/db';
import type { Metadata } from 'next';
import type { RoleOption } from '@/components/settings/role-multi-select';
import { getDb } from '@/server/db';
import { getGuildChannels, getGuildRoles, ignorableChannelGroups } from '@/server/guild-data';
import { requireGuildAccess } from '@/server/guilds';
import { AutomodForm } from './automod-form';

export const metadata: Metadata = { title: 'AutoMod' };

export default async function AutomodSettingsPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  await requireGuildAccess(guildId);
  const { settings } = await loadGuildSettings(getDb(), guildId);
  const [channels, roles] = await Promise.all([
    getGuildChannels(guildId).catch(() => null),
    getGuildRoles(guildId).catch(() => null),
  ]);

  // Highest role first, as in Discord; @everyone cannot be exempted.
  const roleOptions: RoleOption[] | null = roles
    ? roles
        .filter((role) => role.id !== guildId)
        .sort((a, b) => b.position - a.position)
        .map(({ id, name, color }) => ({ id, name, color }))
    : null;

  return (
    <AutomodForm
      guildId={guildId}
      initial={settings.automod}
      channelGroups={channels ? ignorableChannelGroups(channels) : null}
      roles={roleOptions}
    />
  );
}
