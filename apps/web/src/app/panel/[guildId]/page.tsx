import { getGuild } from '@discordplus/db';
import { FileText, Gavel, ScrollText, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import { GuildAvatar } from '@/components/guild-avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, guildRoleLabel } from '@/lib/format';
import { getDb } from '@/server/db';
import { requireGuildAccess } from '@/server/guilds';

export const metadata: Metadata = { title: 'Genel bakış' };

const sections = [
  { icon: Gavel, title: 'Moderasyon', description: 'DM bildirimi, uyarı süresi ve eşikleri.' },
  { icon: ScrollText, title: 'Loglar', description: 'Her log kategorisi için kanal seçimi.' },
  { icon: ShieldCheck, title: 'AutoMod', description: 'Spam, küfür, davet ve link filtreleri.' },
  { icon: FileText, title: 'Vakalar', description: 'Tüm moderasyon işlemlerinin kaydı.' },
];

export default async function GuildOverviewPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const { guild } = await requireGuildAccess(guildId);
  const row = await getGuild(getDb(), guildId);

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <GuildAvatar guild={guild} className="size-14" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{guild.name}</h1>
          <p className="text-sm text-muted-foreground">Genel bakış · {guildRoleLabel(guild)}</p>
        </div>
      </header>

      <Card className="gap-4">
        <CardHeader>
          <CardTitle>Bot durumu</CardTitle>
          <CardDescription>DiscordPlus bu sunucuda çalışıyor.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="success">Aktif</Badge>
          {row?.botJoinedAt ? (
            <span className="text-muted-foreground">
              Sunucuya katılma: {formatDateTime(row.botJoinedAt)}
            </span>
          ) : null}
        </CardContent>
      </Card>

      <section>
        <h2 className="text-lg font-semibold">Ayarlar</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {sections.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="flex-row items-start gap-4 px-5 py-5">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <Icon className="size-5" />
              </div>
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-medium">
                  {title}
                  <Badge variant="outline" className="text-[10px] uppercase">
                    Yakında
                  </Badge>
                </p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
