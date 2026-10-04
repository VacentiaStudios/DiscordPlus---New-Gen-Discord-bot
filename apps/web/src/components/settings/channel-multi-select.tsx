'use client';

import { CHANNEL_TYPE, type ChannelGroup } from '@/lib/channels';
import { ChannelIcon } from './channel-icon';
import { MultiSelect, type MultiSelectProps } from './multi-select';

/** Picks channels and whole categories. */
export function ChannelMultiSelect({
  groups,
  addLabel = 'Kanal ekle',
  emptyLabel = 'Kanal seçilmedi.',
  ...props
}: { groups: ChannelGroup[]; addLabel?: string; emptyLabel?: string } & Omit<
  MultiSelectProps,
  'groups' | 'addLabel' | 'emptyLabel' | 'unknownLabel' | 'removeLabel'
>) {
  return (
    <MultiSelect
      {...props}
      addLabel={addLabel}
      emptyLabel={emptyLabel}
      unknownLabel="silinmiş kanal"
      removeLabel={(name) => `${name} kanalını listeden çıkar`}
      groups={groups.map((group) => ({
        label: group.category,
        options: group.channels.map((channel) => ({
          id: channel.id,
          name: channel.name,
          label:
            channel.type === CHANNEL_TYPE.category
              ? `${channel.name} (tüm kategori)`
              : channel.name,
          icon: <ChannelIcon channelType={channel.type} />,
        })),
      }))}
    />
  );
}
