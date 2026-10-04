import 'server-only';
import { getDiscordAccount } from '@discordplus/db';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getAuth } from './auth';
import { getDb } from './db';

export interface CurrentUser {
  /** Better Auth user id. */
  id: string;
  name: string;
  image: string | null;
  /** The user's Discord snowflake. */
  discordId: string;
  /** Better Auth account row id of the Discord account (selects the OAuth token). */
  accountRowId: string;
}

/** The signed-in user, or null. Memoized per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Read the request headers first: this also marks the page as dynamic before any
  // runtime configuration is touched.
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;

  const account = await getDiscordAccount(getDb(), session.user.id);
  if (!account) return null;

  return {
    id: session.user.id,
    name: session.user.name,
    image: session.user.image ?? null,
    discordId: account.discordId,
    accountRowId: account.id,
  };
});

export function loginPath(next?: string, error?: string): string {
  const params = new URLSearchParams();
  if (next) params.set('sonra', next);
  if (error) params.set('hata', error);
  const query = params.toString();
  return query ? `/giris?${query}` : '/giris';
}

/** Redirects to the login page (coming back to `next` afterwards) when nobody is signed in. */
export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(loginPath(next));
  return user;
}
