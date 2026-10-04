import { getBotGuildIds } from '@discordplus/db';
import type { UserGuild } from '@discordplus/shared';
import { Plus, RefreshCw, Settings2 } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GuildAvatar } from '@/components/guild-avatar';
import { SubmitButton } from '@/components/submit-button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { guildRoleLabel } from '@/lib/format';
import { refreshGuildList } from '@/server/actions/guilds';
import { getDb } from '@/server/db';
import { getManageableGuilds, ReauthenticationRequired } from '@/server/guilds';
import { loginPath, requireUser } from '@/server/session';

export const metadata: Metadata = { title: 'Sunucularım' };

function GuildCard({ guild, botPresent }: { guild: UserGuild; botPresent: boolean }) {
  return (
    <Card className="flex-row items-center gap-4 px-4 py-4" data-testid={`guild-${guild.id}`}>
      <GuildAvatar guild={guild} className="size-12" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{guild.name}</p>
        <Badge variant="secondary" className="mt-1">
          {guildRoleLabel(guild)}
        </Badge>
      </div>
      {botPresent ? (
        <Button asChild size="sm">
          <Link href={`/panel/${guild.id}`}>
            <Settings2 />
            Yönet
          </Link>
        </Button>
      ) : (
        <Button asChild size="sm" variant="secondary">
          <a href={`/davet?sunucu=${guild.id}`} target="_blank" rel="noopener">
            <Plus />
            Botu Ekle
          </a>
        </Button>
      )}
    </Card>
  );
}

export default async function ServersPage() {
  const user = await requireUser('/panel');

  let guilds: UserGuild[] | null = null;
  try {
    guilds = await getManageableGuilds(user);
  } catch (error) {
    if (error instanceof ReauthenticationRequired) redirect(loginPath('/panel', 'oturum'));
  }
  const present = guilds
    ? await getBotGuildIds(
        getDb(),
        guilds.map((g) => g.id),
      )
    : new Set();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sunucularım</h1>
          <p className="mt-1 text-muted-foreground">
            Sahibi olduğunuz veya Yönetici ya da Sunucuyu Yönet yetkiniz bulunan sunucular.
          </p>
        </div>
        <form action={refreshGuildList}>
          <SubmitButton variant="outline" size="sm">
            <RefreshCw />
            Yenile
          </SubmitButton>
        </form>
      </div>

      <div className="mt-8">
        {guilds === null ? (
          <Alert variant="destructive">
            <AlertTitle>Sunucu listesi alınamadı</AlertTitle>
            <AlertDescription>
              Discord şu anda yanıt vermiyor. Birkaç saniye sonra “Yenile” ile tekrar deneyin.
            </AlertDescription>
          </Alert>
        ) : guilds.length === 0 ? (
          <Card className="items-center px-6 py-12 text-center">
            <p className="font-medium">Yönetebileceğiniz bir sunucu bulunamadı</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Paneli kullanmak için bir sunucunun sahibi olmanız ya da o sunucuda Yönetici veya
              Sunucuyu Yönet yetkisine sahip olmanız gerekir.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {guilds.map((guild) => (
              <GuildCard key={guild.id} guild={guild} botPresent={present.has(guild.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
