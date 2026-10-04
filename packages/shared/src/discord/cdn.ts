const CDN = 'https://cdn.discordapp.com';

export function guildIconUrl(guildId: string, icon: string | null, size = 128): string | null {
  if (!icon) return null;
  const extension = icon.startsWith('a_') ? 'gif' : 'webp';
  return `${CDN}/icons/${guildId}/${icon}.${extension}?size=${size}`;
}

/** Initials Discord shows for guilds without an icon, e.g. "Vacentia Studios" → "VS". */
export function guildInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => Array.from(word)[0] ?? '')
    .join('')
    .slice(0, 3);
}
