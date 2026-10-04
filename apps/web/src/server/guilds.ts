import 'server-only';
import { getBotGuildIds } from '@discordplus/db';
import { isSnowflake, manageableGuilds, type UserGuild } from '@discordplus/shared';
import { notFound, redirect } from 'next/navigation';
import { cache } from 'react';
import { getAuth } from './auth';
import { getDb } from './db';
import { DiscordApiError, fetchCurrentUserGuilds } from './discord-api';
import { TtlCache } from './guild-cache';
import { loginPath, requireUser, type CurrentUser } from './session';

/** The Discord token is gone or revoked; the user has to sign in again. */
export class ReauthenticationRequired extends Error {
  constructor(options?: ErrorOptions) {
    super('Discord authorization is no longer valid', options);
    this.name = 'ReauthenticationRequired';
  }
}

/** Discord did not return the guild list (rate limit, outage). */
export class GuildListUnavailable extends Error {
  constructor(options?: ErrorOptions) {
    super('Could not load the guild list from Discord', options);
    this.name = 'GuildListUnavailable';
  }
}

const GUILD_LIST_TTL_MS = 60_000;
const MIN_REFRESH_INTERVAL_MS = 5_000;

const guildLists = new TtlCache<UserGuild[]>(GUILD_LIST_TTL_MS);

async function loadManageableGuilds(user: CurrentUser): Promise<UserGuild[]> {
  let accessToken: string | undefined;
  try {
    // Refreshes the token first when it has expired.
    ({ accessToken } = await getAuth().api.getAccessToken({
      body: { accountId: user.accountRowId, userId: user.id },
    }));
  } catch (error) {
    throw new ReauthenticationRequired({ cause: error });
  }
  if (!accessToken) throw new ReauthenticationRequired();

  try {
    return manageableGuilds(await fetchCurrentUserGuilds(accessToken));
  } catch (error) {
    if (error instanceof DiscordApiError && error.status === 401) {
      throw new ReauthenticationRequired({ cause: error });
    }
    throw new GuildListUnavailable({ cause: error });
  }
}

/** Guilds the user may manage, cached for a minute; falls back to the last known list. */
export async function getManageableGuilds(
  user: CurrentUser,
  options: { force?: boolean } = {},
): Promise<UserGuild[]> {
  try {
    return await guildLists.get(user.id, () => loadManageableGuilds(user), options);
  } catch (error) {
    if (error instanceof ReauthenticationRequired) throw error;
    const stale = guildLists.peek(user.id);
    if (stale) return stale;
    throw error;
  }
}

/** Fetches the list again unless it was fetched in the last few seconds. */
export function refreshManageableGuilds(user: CurrentUser): Promise<UserGuild[]> {
  const age = guildLists.age(user.id);
  return getManageableGuilds(user, { force: age === undefined || age >= MIN_REFRESH_INTERVAL_MS });
}

export interface GuildAccess {
  user: CurrentUser;
  guild: UserGuild;
  /** Whether the bot is currently in the guild. */
  botPresent: boolean;
}

/**
 * Gatekeeper for every guild page and action: requires a signed-in user who may
 * manage the guild. Unknown or foreign guilds answer 404 so their existence is not
 * revealed. Memoized per request.
 */
export const requireGuildAccess = cache(async (guildId: string): Promise<GuildAccess> => {
  const path = `/panel/${guildId}`;
  const user = await requireUser(path);
  if (!isSnowflake(guildId)) notFound();

  let guilds: UserGuild[];
  try {
    guilds = await getManageableGuilds(user);
  } catch (error) {
    if (error instanceof ReauthenticationRequired) redirect(loginPath(path, 'oturum'));
    throw error;
  }

  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) notFound();

  const botPresent = (await getBotGuildIds(getDb(), [guildId])).has(guildId);
  return { user, guild, botPresent };
});
