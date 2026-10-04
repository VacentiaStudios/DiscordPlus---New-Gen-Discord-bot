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

const channelsSchema = z.array(
  z.object({
    id: z.string(),
    type: z.number(),
    name: z.string().default(''),
    position: z.number().default(0),
    parent_id: z.string().nullish(),
  }),
);

const rolesSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    color: z.number().default(0),
    position: z.number(),
    managed: z.boolean().default(false),
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

function botAuthorization(): string {
  return `Bot ${getServerEnv().DISCORD_TOKEN}`;
}

/** Guilds of the signed-in user, read with their own OAuth token. */
export async function fetchCurrentUserGuilds(accessToken: string): Promise<UserGuild[]> {
  const data = await discordGet('/users/@me/guilds', `Bearer ${accessToken}`);
  return userGuildsSchema.parse(data);
}

export interface GuildChannel {
  id: string;
  name: string;
  type: number;
  position: number;
  parentId: string | null;
}

/** All channels of a guild, read with the bot token. */
export async function fetchGuildChannels(guildId: string): Promise<GuildChannel[]> {
  const data = channelsSchema.parse(
    await discordGet(`/guilds/${guildId}/channels`, botAuthorization()),
  );
  return data.map((channel) => ({
    id: channel.id,
    name: channel.name,
    type: channel.type,
    position: channel.position,
    parentId: channel.parent_id ?? null,
  }));
}

export interface GuildRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

/** All roles of a guild, read with the bot token. */
export async function fetchGuildRoles(guildId: string): Promise<GuildRole[]> {
  return rolesSchema.parse(await discordGet(`/guilds/${guildId}/roles`, botAuthorization()));
}
