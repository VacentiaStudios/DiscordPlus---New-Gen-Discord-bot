import { getBotGuildIds } from '@discordplus/db';
import type { Metadata } from 'next';
import type * as React from 'react';
import { BotMissing } from '@/components/panel/bot-missing';
import { GuildNav } from '@/components/panel/guild-nav';
import { GuildSwitcher } from '@/components/panel/guild-switcher';
import { getDb } from '@/server/db';
import { getManageableGuilds, requireGuildAccess } from '@/server/guilds';

type Params = Promise<{ guildId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { guildId } = await params;
  const { guild } = await requireGuildAccess(guildId);
  return { title: { default: guild.name, template: `%s · ${guild.name}` } };
}

export default async function GuildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { guildId } = await params;
  const { user, guild, botPresent } = await requireGuildAccess(guildId);
  if (!botPresent) return <BotMissing guild={guild} />;

  const guilds = await getManageableGuilds(user);
  const present = await getBotGuildIds(
    getDb(),
    guilds.map((g) => g.id),
  );

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[15rem_1fr] md:gap-8 md:py-8">
      <aside className="min-w-0 space-y-4 md:sticky md:top-20 md:self-start">
        <GuildSwitcher
          current={{ id: guild.id, name: guild.name, icon: guild.icon }}
          guilds={guilds
            .filter((g) => present.has(g.id))
            .map((g) => ({ id: g.id, name: g.name, icon: g.icon }))}
        />
        <GuildNav guildId={guild.id} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
