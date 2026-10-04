'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuth } from '../auth';
import { safeRedirectPath } from '../redirects';
import { loginPath } from '../session';

export async function signInWithDiscord(formData: FormData): Promise<void> {
  const next = safeRedirectPath(formData.get('sonra'));
  const result = await getAuth().api.signInSocial({
    body: {
      provider: 'discord',
      callbackURL: next,
      errorCallbackURL: loginPath(next, 'giris'),
    },
  });
  if (!result.url) redirect(loginPath(next, 'giris'));
  redirect(result.url);
}

export async function signOut(): Promise<void> {
  await getAuth().api.signOut({ headers: await headers() });
  redirect('/');
}
