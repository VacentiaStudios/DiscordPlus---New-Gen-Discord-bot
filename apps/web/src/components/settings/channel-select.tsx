'use client';

import { Hash } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ChannelGroup } from '@/server/guild-data';

const OFF = '__off__';

/** Picks a text channel of the guild, or none. */
export function ChannelSelect({
  id,
  value,
  onChange,
  groups,
  offLabel = 'Kapalı',
  invalid,
}: {
  id?: string;
  value: string | null;
  onChange: (value: string | null) => void;
  groups: ChannelGroup[];
  offLabel?: string;
  invalid?: boolean;
}) {
  const known = groups.some((g) => g.channels.some((c) => c.id === value));
  return (
    <Select value={value ?? OFF} onValueChange={(next) => onChange(next === OFF ? null : next)}>
      <SelectTrigger id={id} className="w-64" aria-invalid={invalid || undefined}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={OFF}>{offLabel}</SelectItem>
        {value && !known ? (
          <SelectItem value={value} disabled>
            <Hash />
            silinmiş kanal
          </SelectItem>
        ) : null}
        {groups.map((group) => (
          <SelectGroup key={group.category ?? '__none__'}>
            <SelectSeparator />
            {group.category ? <SelectLabel>{group.category}</SelectLabel> : null}
            {group.channels.map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                <Hash />
                {channel.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
