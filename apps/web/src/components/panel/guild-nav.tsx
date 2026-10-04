'use client';

import { FileText, Gavel, LayoutDashboard, ScrollText, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { segment: '', label: 'Genel bakış', icon: LayoutDashboard, available: true },
  { segment: '/moderasyon', label: 'Moderasyon', icon: Gavel, available: false },
  { segment: '/loglar', label: 'Loglar', icon: ScrollText, available: false },
  { segment: '/automod', label: 'AutoMod', icon: ShieldCheck, available: false },
  { segment: '/vakalar', label: 'Vakalar', icon: FileText, available: false },
] as const;

export function GuildNav({ guildId }: { guildId: string }) {
  const pathname = usePathname();
  const base = `/panel/${guildId}`;

  return (
    <nav aria-label="Sunucu menüsü" className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(({ segment, label, icon: Icon, available }) => {
        const href = `${base}${segment}`;
        const active = pathname === href;
        const className = cn(
          'flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
          active
            ? 'bg-primary/15 font-medium text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        );
        if (!available) {
          return (
            <span
              key={segment}
              aria-disabled="true"
              className={cn(className, 'cursor-not-allowed opacity-50 hover:bg-transparent')}
            >
              <Icon className="size-4" />
              {label}
              <span className="ml-auto hidden text-[10px] tracking-wide uppercase md:inline">
                Yakında
              </span>
            </span>
          );
        }
        return (
          <Link
            key={segment}
            href={href}
            className={className}
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
