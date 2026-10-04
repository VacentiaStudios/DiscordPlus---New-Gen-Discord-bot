'use client';

import { FileText, Gavel, LayoutDashboard, ScrollText, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { segment: '', label: 'Genel bakış', icon: LayoutDashboard },
  { segment: '/moderasyon', label: 'Moderasyon', icon: Gavel },
  { segment: '/loglar', label: 'Loglar', icon: ScrollText },
  { segment: '/automod', label: 'AutoMod', icon: ShieldCheck },
  { segment: '/vakalar', label: 'Vakalar', icon: FileText },
] as const;

export function GuildNav({ guildId }: { guildId: string }) {
  const pathname = usePathname();
  const base = `/panel/${guildId}`;

  return (
    <nav aria-label="Sunucu menüsü" className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(({ segment, label, icon: Icon }) => {
        const href = `${base}${segment}`;
        const active = segment === '' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={segment}
            href={href}
            className={cn(
              'flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-primary/15 font-medium text-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
