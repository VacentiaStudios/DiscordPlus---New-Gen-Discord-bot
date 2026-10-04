'use client';

import {
  LOG_CATEGORY_DESCRIPTIONS,
  LOG_CATEGORY_LABELS,
  type LogCategory,
  type LoggingSettings,
} from '@discordplus/shared';
import { useId, useState } from 'react';
import { ChannelSelect } from '@/components/settings/channel-select';
import { FieldError, SettingRow } from '@/components/settings/field';
import { SaveBar } from '@/components/settings/save-bar';
import { useSaveSettings } from '@/components/settings/use-save-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ChannelGroup } from '@/server/guild-data';

export function LoggingForm({
  guildId,
  initial,
  groups,
  categories,
}: {
  guildId: string;
  initial: LoggingSettings;
  groups: ChannelGroup[];
  /** Categories configurable in this version of the panel. */
  categories: readonly LogCategory[];
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
            Her kategori ayrı bir kanala gönderilebilir. Botun seçilen kanalı görebilmesi ve oraya
            mesaj gönderebilmesi gerekir.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {categories.map((category) => (
            <SettingRow
              key={category}
              title={`${LOG_CATEGORY_LABELS[category]} logu`}
              description={LOG_CATEGORY_DESCRIPTIONS[category]}
              htmlFor={`${ids}-${category}`}
            >
              <ChannelSelect
                id={`${ids}-${category}`}
                groups={groups}
                value={state.channels[category]}
                invalid={Boolean(issues[`channels.${category}`])}
                onChange={(channelId) =>
                  setState((s) => ({ ...s, channels: { ...s.channels, [category]: channelId } }))
                }
              />
              <FieldError message={issues[`channels.${category}`]} />
            </SettingRow>
          ))}
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
