'use client';

import {
  LOG_CATEGORIES,
  LOG_CATEGORY_DESCRIPTIONS,
  LOG_CATEGORY_LABELS,
  logChannelAccess,
  MAX_IGNORED_LOG_CHANNELS,
  type LogCategory,
  type LoggingSettings,
} from '@discordplus/shared';
import { TriangleAlert } from 'lucide-react';
import { useId, useState } from 'react';
import { ChannelMultiSelect } from '@/components/settings/channel-multi-select';
import { ChannelSelect } from '@/components/settings/channel-select';
import { FieldError, SettingRow } from '@/components/settings/field';
import { SaveBar } from '@/components/settings/save-bar';
import { useSaveSettings } from '@/components/settings/use-save-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { ChannelGroup } from '@/lib/channels';

/** Explains what the bot cannot do in the chosen log channel, if anything. */
function AccessWarning({
  category,
  permissions,
}: {
  category: LogCategory;
  /** The bot's permission bits in the chosen channel. */
  permissions: string | undefined;
}) {
  if (permissions === undefined) return null;
  const { missing, canPost } = logChannelAccess(BigInt(permissions), category);
  if (missing.length === 0) return null;
  return (
    <p className="mt-2 flex max-w-64 items-start gap-1.5 text-xs text-warning" role="status">
      <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>
        Botun bu kanalda {missing.join(', ')} yetkisi yok.{' '}
        {canPost
          ? 'Toplu silme dökümleri dosya olarak eklenemez.'
          : 'Bu kategorinin logları gönderilemez.'}
      </span>
    </p>
  );
}

export function LoggingForm({
  guildId,
  initial,
  targetGroups,
  ignorableGroups,
  permissions,
}: {
  guildId: string;
  initial: LoggingSettings;
  /** Channels logs can be sent to. */
  targetGroups: ChannelGroup[];
  /** Channels and categories that can be left out of logs. */
  ignorableGroups: ChannelGroup[];
  /** The bot's permission bits per channel; null when they could not be read. */
  permissions: Record<string, string> | null;
}) {
  const ids = useId();
  const [state, setState] = useState(initial);
  const { save, pending, issues, setIssues } = useSaveSettings(guildId, 'logging');
  const dirty = JSON.stringify(state) !== JSON.stringify(initial);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Log kanalları</CardTitle>
          <CardDescription>
            Her kategori ayrı bir kanala ya da hepsi aynı kanala gönderilebilir. Kapalı kategoriler
            loglanmaz.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {LOG_CATEGORIES.map((category) => {
            const channelId = state.channels[category];
            return (
              <SettingRow
                key={category}
                title={`${LOG_CATEGORY_LABELS[category]} logu`}
                description={LOG_CATEGORY_DESCRIPTIONS[category]}
                htmlFor={`${ids}-${category}`}
              >
                <ChannelSelect
                  id={`${ids}-${category}`}
                  groups={targetGroups}
                  value={channelId}
                  invalid={Boolean(issues[`channels.${category}`])}
                  onChange={(next) =>
                    setState((s) => ({ ...s, channels: { ...s.channels, [category]: next } }))
                  }
                />
                {channelId && permissions ? (
                  <AccessWarning category={category} permissions={permissions[channelId]} />
                ) : null}
                <FieldError message={issues[`channels.${category}`]} />
              </SettingRow>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hariç tutulanlar</CardTitle>
          <CardDescription>
            Gürültüyü azaltmak için bazı etkinlikleri loglamayın. Log kanallarının kendi mesajları
            hiçbir zaman loglanmaz.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <SettingRow
            title="Botları yoksay"
            description="Botların silinen ve düzenlenen mesajları ile ses etkinlikleri loglanmaz."
            htmlFor={`${ids}-bots`}
          >
            <Switch
              id={`${ids}-bots`}
              checked={state.ignoreBots}
              onCheckedChange={(ignoreBots) => setState((s) => ({ ...s, ignoreBots }))}
            />
          </SettingRow>
          <div className="space-y-3 py-4 last:pb-0">
            <div className="space-y-1">
              <label htmlFor={`${ids}-ignored`} className="text-sm font-medium">
                Yoksayılan kanallar
              </label>
              <p className="text-sm text-muted-foreground">
                Bu kanallardaki mesaj ve ses etkinlikleri loglanmaz. Bir kategori seçerseniz
                içindeki tüm kanallar yoksayılır.
              </p>
            </div>
            <ChannelMultiSelect
              id={`${ids}-ignored`}
              groups={ignorableGroups}
              value={state.ignoredChannelIds}
              max={MAX_IGNORED_LOG_CHANNELS}
              emptyLabel="Yoksayılan kanal yok."
              onChange={(ignoredChannelIds) => setState((s) => ({ ...s, ignoredChannelIds }))}
            />
            <FieldError message={issues.ignoredChannelIds} />
          </div>
        </CardContent>
      </Card>

      <SaveBar
        dirty={dirty}
        pending={pending}
        onSave={() => save(state)}
        onReset={() => {
          setIssues({});
          setState(initial);
        }}
      />
    </div>
  );
}
