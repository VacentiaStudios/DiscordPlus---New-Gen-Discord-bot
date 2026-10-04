import { botInviteUrl, isSnowflake } from '@discordplus/shared';
import { getServerEnv } from '@/server/env';

/** `/davet` redirects to the bot invite; `/davet?sunucu=<id>` preselects a server. */
export function GET(request: Request) {
  const guildId = new URL(request.url).searchParams.get('sunucu');
  const url = botInviteUrl(
    getServerEnv().DISCORD_CLIENT_ID,
    isSnowflake(guildId) ? guildId : undefined,
  );
  return Response.redirect(url, 302);
}
