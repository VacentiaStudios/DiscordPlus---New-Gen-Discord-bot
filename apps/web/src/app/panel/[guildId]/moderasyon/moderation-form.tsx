'use client';

import {
  formatDurationInput,
  MAX_WARN_THRESHOLDS,
  parseDuration,
  PUNISHMENT_LABELS,
  PUNISHMENTS,
  type ModerationSettings,
  type Punishment,
} from '@discordplus/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { FieldError, SettingRow } from '@/components/settings/field';
import { SaveBar } from '@/components/settings/save-bar';
import { useSaveSettings, type IssueMap } from '@/components/settings/use-save-settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

const EXPIRY_OPTIONS = [0, 7, 14, 30, 60, 90, 180, 365];

interface ThresholdRow {
  key: string;
  count: string;
  action: Punishment;
  duration: string;
}

interface FormState {
  dmOnAction: boolean;
  warnExpiryDays: number;
  thresholds: ThresholdRow[];
}

let nextKey = 0;
const newKey = () => `row-${nextKey++}`;

function toState(settings: ModerationSettings): FormState {
  return {
    dmOnAction: settings.dmOnAction,
    warnExpiryDays: settings.warnExpiryDays,
    thresholds: [...settings.thresholds]
      .sort((a, b) => a.count - b.count)
      .map((t) => ({
        key: newKey(),
        count: String(t.count),
        action: t.action,
        duration: t.durationMs ? formatDurationInput(t.durationMs) : '',
      })),
  };
}

/** Converts the form to the stored shape; unparsable durations become field errors. */
function toSettings(state: FormState): { value: ModerationSettings; issues: IssueMap } {
  const issues: IssueMap = {};
  const thresholds = state.thresholds.map((row, index) => {
    let durationMs: number | null = null;
    if (row.action !== 'kick' && row.duration.trim()) {
      durationMs = parseDuration(row.duration);
      if (durationMs === null) {
        issues[`thresholds.${index}.durationMs`] = 'Geçersiz süre (ör. 30dk, 2sa, 1g)';
      }
    }
    return { count: Number(row.count), action: row.action, durationMs };
  });
  return {
    value: { dmOnAction: state.dmOnAction, warnExpiryDays: state.warnExpiryDays, thresholds },
    issues,
  };
}

function expiryLabel(days: number): string {
  return days === 0 ? 'Süresiz (hiç dolmaz)' : `${days} gün`;
}

export function ModerationForm({
  guildId,
  initial,
}: {
  guildId: string;
  initial: ModerationSettings;
}) {
  const ids = useId();
  const initialState = useMemo(() => toState(initial), [initial]);
  const [state, setState] = useState(initialState);
  const { save, pending, issues, setIssues } = useSaveSettings(guildId, 'moderation');

  const snapshot = (s: FormState) => JSON.stringify(toSettings(s).value);
  const dirty = snapshot(state) !== snapshot(initialState);
  const expiryOptions = EXPIRY_OPTIONS.includes(state.warnExpiryDays)
    ? EXPIRY_OPTIONS
    : [...EXPIRY_OPTIONS, state.warnExpiryDays].sort((a, b) => a - b);

  const updateRow = (key: string, patch: Partial<ThresholdRow>) =>
    setState((s) => ({
      ...s,
      thresholds: s.thresholds.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    }));

  const addRow = () =>
    setState((s) => {
      const highest = Math.max(0, ...s.thresholds.map((row) => Number(row.count) || 0));
      return {
        ...s,
        thresholds: [
          ...s.thresholds,
          { key: newKey(), count: String(highest + 1), action: 'timeout', duration: '1sa' },
        ],
      };
    });

  const submit = () => {
    const { value, issues: conversionIssues } = toSettings(state);
    save(value, conversionIssues);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Bildirimler</CardTitle>
          <CardDescription>Ceza alan kullanıcılara ne söylendiği.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingRow
            title="Kullanıcıya özel mesaj gönder"
            description="Uyarı, susturma, atma ve yasaklamadan önce kullanıcıya sebebiyle birlikte DM gönderilir."
            htmlFor={`${ids}-dm`}
          >
            <Switch
              id={`${ids}-dm`}
              checked={state.dmOnAction}
              onCheckedChange={(dmOnAction) => setState((s) => ({ ...s, dmOnAction }))}
            />
          </SettingRow>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uyarılar</CardTitle>
          <CardDescription>
            Uyarıların ne kadar süre geçerli kalacağı ve belirli sayıda uyarıda otomatik olarak
            uygulanacak cezalar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SettingRow
            title="Uyarıların geçerlilik süresi"
            description="Bu süreden eski uyarılar eşik hesabına katılmaz."
            htmlFor={`${ids}-expiry`}
          >
            <Select
              value={String(state.warnExpiryDays)}
              onValueChange={(v) => setState((s) => ({ ...s, warnExpiryDays: Number(v) }))}
            >
              <SelectTrigger id={`${ids}-expiry`} className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {expiryOptions.map((days) => (
                  <SelectItem key={days} value={String(days)}>
                    {expiryLabel(days)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Uyarı eşikleri</p>
              <p className="text-sm text-muted-foreground">
                Bir kullanıcı tam bu sayıda aktif uyarıya ulaştığında ceza bot tarafından uygulanır.
              </p>
            </div>

            {state.thresholds.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                Henüz eşik yok. Örneğin 3 uyarıda 1 saat susturma ekleyebilirsiniz.
              </p>
            ) : (
              <ul className="space-y-2" aria-label="Uyarı eşikleri">
                {state.thresholds.map((row, index) => {
                  const countError = issues[`thresholds.${index}.count`];
                  const durationError = issues[`thresholds.${index}.durationMs`];
                  return (
                    <li
                      key={row.key}
                      className="flex flex-wrap items-start gap-2 rounded-lg border bg-background/30 p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={50}
                            aria-label={`${index + 1}. eşik: uyarı sayısı`}
                            aria-invalid={countError ? true : undefined}
                            className="w-20"
                            value={row.count}
                            onChange={(e) => updateRow(row.key, { count: e.target.value })}
                          />
                          <span className="text-sm text-muted-foreground">uyarıda</span>
                        </div>
                        <FieldError message={countError} />
                      </div>
                      <Select
                        value={row.action}
                        onValueChange={(action) =>
                          updateRow(row.key, { action: action as Punishment })
                        }
                      >
                        <SelectTrigger className="w-36" aria-label={`${index + 1}. eşik: ceza`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PUNISHMENTS.map((action) => (
                            <SelectItem key={action} value={action}>
                              {PUNISHMENT_LABELS[action]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {row.action !== 'kick' ? (
                        <div>
                          <Input
                            aria-label={`${index + 1}. eşik: süre`}
                            aria-invalid={durationError ? true : undefined}
                            placeholder={row.action === 'ban' ? 'Boş: kalıcı' : 'ör. 1sa'}
                            className="w-36"
                            value={row.duration}
                            onChange={(e) => updateRow(row.key, { duration: e.target.value })}
                          />
                          <FieldError message={durationError} />
                        </div>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-auto"
                        aria-label={`${index + 1}. eşiği sil`}
                        onClick={() => {
                          setIssues({});
                          setState((s) => ({
                            ...s,
                            thresholds: s.thresholds.filter((r) => r.key !== row.key),
                          }));
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addRow}
              disabled={state.thresholds.length >= MAX_WARN_THRESHOLDS}
            >
              <Plus />
              Eşik ekle
            </Button>
          </div>
        </CardContent>
      </Card>

      <SaveBar
        dirty={dirty}
        pending={pending}
        onSave={submit}
        onReset={() => {
          setIssues({});
          setState(initialState);
        }}
      />
    </div>
  );
}
