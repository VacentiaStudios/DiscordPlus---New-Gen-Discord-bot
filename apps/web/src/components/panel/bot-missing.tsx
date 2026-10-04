import type { UserGuild } from '@discordplus/shared';
import { Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { GuildAvatar } from '@/components/guild-avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function BotMissing({ guild }: { guild: UserGuild }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card className="items-center px-6 py-10 text-center">
        <GuildAvatar guild={guild} className="size-16" />
        <div className="space-y-2">
          <h1 className="text-xl font-semibold">{guild.name}</h1>
          <p className="text-muted-foreground">
            DiscordPlus bu sunucuda değil. Ayarları yapabilmek için önce botu sunucuya ekleyin.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <a href={`/davet?sunucu=${guild.id}`} target="_blank" rel="noopener">
              <Plus />
              Botu Ekle
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/panel/${guild.id}`} prefetch={false}>
              <RefreshCw />
              Ekledim, yenile
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
