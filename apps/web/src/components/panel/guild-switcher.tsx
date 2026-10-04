'use client';

import { ChevronsUpDown, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { GuildAvatar } from '@/components/guild-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface SwitcherGuild {
  id: string;
  name: string;
  icon: string | null;
}

export function GuildSwitcher({
  current,
  guilds,
}: {
  current: SwitcherGuild;
  /** Other manageable guilds where the bot is present. */
  guilds: SwitcherGuild[];
}) {
  const others = guilds.filter((guild) => guild.id !== current.id);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg border bg-card p-2 text-left transition-colors outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Sunucu değiştir"
        >
          <GuildAvatar guild={current} className="size-9" fallbackClassName="text-xs" size={64} />
          <span className="min-w-0 flex-1 truncate font-medium">{current.name}</span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width)">
        {others.length > 0 ? (
          <>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Sunucu değiştir
            </DropdownMenuLabel>
            {others.map((guild) => (
              <DropdownMenuItem key={guild.id} asChild>
                <Link href={`/panel/${guild.id}`}>
                  <GuildAvatar
                    guild={guild}
                    className="size-6 rounded-md"
                    fallbackClassName="rounded-md text-[9px]"
                    size={32}
                  />
                  <span className="truncate">{guild.name}</span>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem asChild>
          <Link href="/panel">
            <LayoutGrid />
            Tüm sunucular
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
