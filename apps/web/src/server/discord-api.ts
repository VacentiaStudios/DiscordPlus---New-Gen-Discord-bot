import 'server-only';
import type { UserGuild } from '@discordplus/shared';
import { z } from 'zod';
import { getServerEnv } from './env';

export class DiscordApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
  ) {
    super(`Discord API ${path} responded with ${status}`);
    this.name = 'DiscordApiError';
  }
}

const userGuildsSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string().nullable(),
    owner: z.boolean(),
    permissions: z.string(),
  }),
);

async function discordGet(path: string, authorization: string): Promise<unknown> {
  const response = await fetch(`${getServerEnv().DISCORD_API_BASE}${path}`, {
    headers: { Authorization: authorization },
    cache: 'no-store',
  });
  if (!response.ok) throw new DiscordApiError(response.status, path);
  return response.json();
}

/** Guilds of the signed-in user, read with their own OAuth token. */
export async function fetchCurrentUserGuilds(accessToken: string): Promise<UserGuild[]> {
  const data = await discordGet('/users/@me/guilds', `Bearer ${accessToken}`);
  return userGuildsSchema.parse(data);
}
