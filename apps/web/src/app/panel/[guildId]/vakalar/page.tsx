import { countCases, listCases } from '@discordplus/db';
import { CASE_TYPE_LABELS, CASE_TYPES, isCaseType, isSnowflake } from '@discordplus/shared';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { CaseTypeBadge } from '@/components/cases/case-type-badge';
import { PageHeader } from '@/components/settings/field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import { getDb } from '@/server/db';
import { requireGuildAccess } from '@/server/guilds';

export const metadata: Metadata = { title: 'Vakalar' };

const PAGE_SIZE = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default async function CasesPage({
  params,
  searchParams,
}: {
  params: Promise<{ guildId: string }>;
  searchParams: SearchParams;
}) {
  const { guildId } = await params;
  await requireGuildAccess(guildId);

  const query = await searchParams;
  const typeParam = first(query.tur);
  const type = isCaseType(typeParam) ? typeParam : undefined;
  const userParam = first(query.kullanici)?.trim() ?? '';
  const targetId = isSnowflake(userParam) ? userParam : undefined;
  const page = Math.max(1, Number.parseInt(first(query.sayfa) ?? '1', 10) || 1);

  const db = getDb();
  const filter = { guildId, type, targetId };
  const [rows, total] = await Promise.all([
    listCases(db, filter, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countCases(db, filter),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (target: number) => {
    const search = new URLSearchParams();
    if (type) search.set('tur', type);
    if (targetId) search.set('kullanici', targetId);
    if (target > 1) search.set('sayfa', String(target));
    const qs = search.toString();
    return `/panel/${guildId}/vakalar${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vakalar"
        description="Bot komutlarıyla, AutoMod tarafından veya Discord arayüzünden yapılan tüm moderasyon işlemleri."
      />

      <form className="flex flex-wrap items-end gap-3" action={`/panel/${guildId}/vakalar`}>
        <div className="space-y-1">
          <label htmlFor="tur" className="block text-xs text-muted-foreground">
            Tür
          </label>
          <NativeSelect id="tur" name="tur" defaultValue={type ?? ''} className="w-48">
            <option value="">Tümü</option>
            {CASE_TYPES.map((value) => (
              <option key={value} value={value}>
                {CASE_TYPE_LABELS[value]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <label htmlFor="kullanici" className="block text-xs text-muted-foreground">
            Kullanıcı ID
          </label>
          <Input
            id="kullanici"
            name="kullanici"
            defaultValue={userParam}
            placeholder="ör. 123456789012345678"
            inputMode="numeric"
            className="w-60"
          />
        </div>
        <Button type="submit" variant="secondary">
          <Search />
          Filtrele
        </Button>
        {type || userParam ? (
          <Button asChild variant="ghost">
            <Link href={`/panel/${guildId}/vakalar`}>Temizle</Link>
          </Button>
        ) : null}
      </form>
      {userParam && !targetId ? (
        <p className="text-sm text-warning">Kullanıcı ID’si 17-20 haneli bir sayı olmalıdır.</p>
      ) : null}

      <Card className="py-0">
        {rows.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            {total === 0 && !type && !targetId
              ? 'Henüz hiç vaka yok.'
              : 'Bu filtrelere uyan vaka bulunamadı.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">No</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Moderatör</TableHead>
                <TableHead>Sebep</TableHead>
                <TableHead className="text-right">Tarih</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} data-testid={`case-${row.caseNumber}`}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/panel/${guildId}/vakalar/${row.caseNumber}`}
                      className="text-primary hover:underline"
                    >
                      #{row.caseNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <CaseTypeBadge type={row.type} />
                  </TableCell>
                  <TableCell>
                    <div className="max-w-48 truncate">{row.targetTag}</div>
                    <div className="font-mono text-xs text-muted-foreground">{row.targetId}</div>
                  </TableCell>
                  <TableCell className="max-w-40 truncate">{row.moderatorTag}</TableCell>
                  <TableCell className="max-w-72 text-muted-foreground">
                    {row.reason ? truncate(row.reason, 80) : '—'}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                    {formatDateTime(row.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {total > PAGE_SIZE ? (
        <nav className="flex items-center justify-between gap-4" aria-label="Sayfalama">
          <p className="text-sm text-muted-foreground">
            Sayfa {page} / {pages} · {total} vaka
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(page - 1)}>
                  <ChevronLeft />
                  Önceki
                </Link>
              </Button>
            ) : null}
            {page < pages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(page + 1)}>
                  Sonraki
                  <ChevronRight />
                </Link>
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
