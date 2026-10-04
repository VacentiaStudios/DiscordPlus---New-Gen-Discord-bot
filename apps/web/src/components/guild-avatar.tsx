import { guildIconUrl, guildInitials } from '@discordplus/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export function GuildAvatar({
  guild,
  className,
  fallbackClassName,
  size = 128,
}: {
  guild: { id: string; name: string; icon: string | null };
  className?: string;
  fallbackClassName?: string;
  /** Requested icon resolution from Discord's CDN. */
  size?: number;
}) {
  const src = guildIconUrl(guild.id, guild.icon, size);
  return (
    <Avatar className={cn('size-10 rounded-xl', className)}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback className={cn('rounded-xl bg-secondary text-sm', fallbackClassName)}>
        {guildInitials(guild.name)}
      </AvatarFallback>
    </Avatar>
  );
}
