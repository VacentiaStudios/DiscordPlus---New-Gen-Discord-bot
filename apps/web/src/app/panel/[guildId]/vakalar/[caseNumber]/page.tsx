import { getCase } from '@discordplus/db';
import { CASE_TYPE_LABELS, formatDuration } from '@discordplus/shared';
import { ChevronLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type * as React from 'react';
import { CaseSourceBadge, CaseTypeBadge } from '@/components/cases/case-type-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/format';
import { getDb } from '@/server/db';
import { requireGuildAccess } from '@/server/guilds';
import { CaseReasonForm, DeleteCaseButton } from './case-actions';

type Params = Promise<{ guildId: string; caseNumber: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { caseNumber } = await params;
  return { title: `Vaka #${caseNumber}` };
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export default async function CasePage({ params }: { params: Params }) {
  const { guildId, caseNumber: raw } = await params;
  await requireGuildAccess(guildId);
  const caseNumber = Number(raw);
  if (!Number.isSafeInteger(caseNumber) || caseNumber < 1) notFound();
  const row = await getCase(getDb(), guildId, caseNumber);
  if (!row) notFound();

  const deleted = row.deletedAt !== null;
  const showsDuration = row.type === 'timeout' || row.type === 'ban';
  const tracksActivity = row.type === 'warn' || (row.type === 'ban' && row.expiresAt !== null);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href={`/panel/${guildId}/vakalar`}>
          <ChevronLeft />
          Vakalar
        </Link>
      </Button>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Vaka #{row.caseNumber} · {CASE_TYPE_LABELS[row.type]}
        </h1>
        <CaseTypeBadge type={row.type} />
        <CaseSourceBadge source={row.source} />
        {deleted ? <Badge variant="destructive">Silindi</Badge> : null}
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Ayrıntılar</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-5 sm:grid-cols-2">
            <Detail label="Kullanıcı">
              {row.targetTag}
              <span className="block font-mono text-xs text-muted-foreground">{row.targetId}</span>
            </Detail>
            <Detail label="Moderatör">
              {row.moderatorTag}
              <span className="block font-mono text-xs text-muted-foreground">
                {row.moderatorId}
              </span>
            </Detail>
            <Detail label="Tarih">{formatDateTime(row.createdAt)}</Detail>
            {showsDuration ? (
              <Detail label="Süre">
                {row.durationMs ? formatDuration(row.durationMs) : 'Kalıcı'}
                {row.expiresAt ? (
                  <span className="block text-xs text-muted-foreground">
                    Bitiş: {formatDateTime(row.expiresAt)}
                  </span>
                ) : null}
              </Detail>
            ) : null}
            {tracksActivity && !deleted ? (
              <Detail label="Durum">
                {row.active ? (
                  <Badge variant="success">Aktif</Badge>
                ) : (
                  <Badge variant="secondary">Pasif</Badge>
                )}
              </Detail>
            ) : null}
            {deleted && row.deletedAt ? (
              <Detail label="Silinme">
                {formatDateTime(row.deletedAt)}
                {row.deletedBy ? (
                  <span className="block font-mono text-xs text-muted-foreground">
                    Silen: {row.deletedBy}
                  </span>
                ) : null}
              </Detail>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {deleted ? (
            <div className="space-y-1">
              <p className="text-sm font-medium">Sebep</p>
              <p className="text-sm text-muted-foreground">{row.reason ?? 'Sebep belirtilmedi'}</p>
            </div>
          ) : (
            <CaseReasonForm guildId={guildId} caseNumber={row.caseNumber} reason={row.reason} />
          )}
        </CardContent>
      </Card>

      {!deleted ? (
        <div className="flex justify-end">
          <DeleteCaseButton guildId={guildId} caseNumber={row.caseNumber} />
        </div>
      ) : null}
    </div>
  );
}
