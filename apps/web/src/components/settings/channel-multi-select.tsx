'use client';

import { Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CHANNEL_TYPE, type ChannelGroup } from '@/lib/channels';
import { ChannelIcon } from './channel-icon';

/** A list of chosen channels (removable chips) with a picker to add more. */
export function ChannelMultiSelect({
  id,
  groups,
  value,
  onChange,
  max,
  addLabel = 'Kanal ekle',
  emptyLabel = 'Kanal seçilmedi.',
}: {
  id?: string;
  groups: ChannelGroup[];
  value: string[];
  onChange: (value: string[]) => void;
  max: number;
  addLabel?: string;
  emptyLabel?: string;
}) {
  const chosen = new Set(value);
  const byId = new Map(groups.flatMap((g) => g.channels).map((c) => [c.id, c]));
  const available = groups
    .map((g) => ({ ...g, channels: g.channels.filter((c) => !chosen.has(c.id)) }))
    .filter((g) => g.channels.length > 0);

  return (
    <div className="space-y-3">
      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {value.map((channelId) => {
            const channel = byId.get(channelId);
            const name = channel?.name ?? 'silinmiş kanal';
            return (
              <li key={channelId}>
                <Badge variant="secondary" className="h-7 gap-1.5 pr-1 text-sm">
                  <ChannelIcon channelType={channel?.type} />
                  {name}
                  <button
                    type="button"
                    className="rounded-sm p-0.5 text-muted-foreground hover:bg-background/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label={`${name} kanalını listeden çıkar`}
                    onClick={() => onChange(value.filter((v) => v !== channelId))}
                  >
                    <X className="size-3.5" />
                  </button>
                </Badge>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      )}

      <Select
        value=""
        onValueChange={(channelId) => onChange([...value, channelId])}
        disabled={value.length >= max || available.length === 0}
      >
        <SelectTrigger id={id} className="w-64">
          <span className="flex items-center gap-2">
            <Plus aria-hidden />
            <SelectValue placeholder={addLabel} />
          </span>
        </SelectTrigger>
        <SelectContent>
          {available.map((group) => (
            <SelectGroup key={group.category ?? '__none__'}>
              {group.category ? <SelectLabel>{group.category}</SelectLabel> : null}
              {group.channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  <ChannelIcon channelType={channel.type} />
                  {channel.type === CHANNEL_TYPE.category
                    ? `${channel.name} (tüm kategori)`
                    : channel.name}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
