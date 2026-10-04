'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ReauthenticationRequired, refreshManageableGuilds } from '../guilds';
import { loginPath, requireUser } from '../session';

/** "Yenile" on the server list: fetch the user's guilds from Discord again. */
export async function refreshGuildList(): Promise<void> {
  const user = await requireUser('/panel');
  try {
    await refreshManageableGuilds(user);
  } catch (error) {
    if (error instanceof ReauthenticationRequired) redirect(loginPath('/panel', 'oturum'));
    // The page shows the error state on its own.
  }
  revalidatePath('/panel');
}
