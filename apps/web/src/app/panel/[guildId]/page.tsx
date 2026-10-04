import { caseCountsByType, getGuild, listCases, listSettingsAudit } from '@discordplus/db';
import {
  CASE_TYPE_LABELS,
  CASE_TYPES,
  isSettingsSection,
  SETTINGS_SECTION_LABELS,
  type CaseType,
} from '@discordplus/shared';
import { ChevronRight, FileText, Gavel, ScrollText, ShieldCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CaseTypeBadge } from '@/components/cases/case-type-badge';
import { GuildAvatar } from '@/components/guild-avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime, guildRoleLabel } from '@/lib/format';
import { getDb } from '@/server/db';
import { requireGuildAccess } from '@/server/guilds';

export const metadata: Metadata = { title: 'Genel bakış' };

const DAY = 24 * 60 * 60 * 1000;

/** Server components render per request, so reading the clock here is intended. */
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY);
}

const sections = [
  {
    href: '/moderasyon',
    icon: Gavel,
    title: 'Moderasyon',
    description: 'DM bildirimi, uyarı süresi ve eşikleri.',
    available: true,
  },
  {
    href: '/loglar',
    icon: ScrollText,
    title: 'Loglar',
    description: 'Her log kategorisi için kanal seçimi.',
    available: true,
  },
  {
    href: '/automod',
    icon: ShieldCheck,
    title: 'AutoMod',
    description: 'Spam, küfür, davet ve link filtreleri.',
    available: false,
  },
  {
    href: '/vakalar',
    icon: FileText,
    title: 'Vakalar',
    description: 'Tüm moderasyon işlemlerinin kaydı.',
    available: true,
  },
];

function total(counts: Partial<Record<CaseType, number>>): number {
  return Object.values(counts).reduce((sum, value) => sum + (value ?? 0), 0);
}

function StatCard({ title, counts }: { title: string; counts: Partial<Record<CaseType, number>> }) {
  const types = CASE_TYPES.filter((type) => counts[type]);
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl tabular-nums">{total(counts)}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {types.length === 0
          ? 'Vaka yok'
          : types.map((type) => (
              <span key={type}>
                {CASE_TYPE_LABELS[type]}: <span className="text-foreground">{counts[type]}</span>
              </span>
            ))}
      </CardContent>
    </Card>
  );
}

export default async function GuildOverviewPage({
  params,
}: {
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const { guild } = await requireGuildAccess(guildId);
  const db = getDb();
  const [row, week, month, recentCases, recentChanges] = await Promise.all([
    getGuild(db, guildId),
    caseCountsByType(db, { guildId, since: daysAgo(7) }),
    caseCountsByType(db, { guildId, since: daysAgo(30) }),
    listCases(db, { guildId }, { limit: 5 }),
    listSettingsAudit(db, guildId, 5),
  ]);

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <GuildAvatar guild={guild} className="size-14" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{guild.name}</h1>
          <p className="text-sm text-muted-foreground">Genel bakış · {guildRoleLabel(guild)}</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="gap-3">
          <CardHeader>
            <CardDescription>Bot durumu</CardDescription>
            <CardTitle>
              <Badge variant="success">Aktif</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {row?.botJoinedAt ? `Katılma: ${formatDateTime(row.botJoinedAt)}` : null}
          </CardContent>
        </Card>
        <StatCard title="Son 7 gün" counts={week} />
        <StatCard title="Son 30 gün" counts={month} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Son vakalar</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCases.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz vaka yok.</p>
            ) : (
              <ul className="divide-y">
                {recentCases.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/panel/${guildId}/vakalar/${c.caseNumber}`}
                      className="flex items-center gap-3 py-2.5 text-sm hover:text-primary"
                    >
                      <span className="w-10 font-medium text-muted-foreground">
                        #{c.caseNumber}
                      </span>
                      <CaseTypeBadge type={c.type} />
                      <span className="min-w-0 flex-1 truncate">{c.targetTag}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(c.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="gap-4">
          <CardHeader>
            <CardTitle>Son ayar değişiklikleri</CardTitle>
          </CardHeader>
          <CardContent>
            {recentChanges.length === 0 ? (
              <p className="text-sm text-muted-foreground">Panelden henüz ayar değiştirilmedi.</p>
            ) : (
              <ul className="divide-y">
                {recentChanges.map((change) => (
                  <li key={change.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <Badge variant="secondary">
                      {isSettingsSection(change.section)
                        ? SETTINGS_SECTION_LABELS[change.section]
                        : change.section}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate">
                      {change.actorName} · {change.changes.length} değişiklik
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(change.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Ayarlar</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {sections.map(({ href, icon: Icon, title, description, available }) => {
            const body = (
              <>
                <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex items-center gap-2 font-medium">
                    {title}
                    {available ? null : (
                      <Badge variant="outline" className="text-[10px] uppercase">
                        Yakında
                      </Badge>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                {available ? <ChevronRight className="size-4 text-muted-foreground" /> : null}
              </>
            );
            return available ? (
              <Link key={title} href={`/panel/${guildId}${href}`}>
                <Card className="flex-row items-center gap-4 px-5 py-5 transition-colors hover:bg-accent/40">
                  {body}
                </Card>
              </Link>
            ) : (
              <Card key={title} className="flex-row items-center gap-4 px-5 py-5 opacity-70">
                {body}
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
