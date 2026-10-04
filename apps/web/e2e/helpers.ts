import { createHmac } from 'node:crypto';
import type { BrowserContext } from '@playwright/test';
import { AUTH_SECRET, users } from './fixtures.mjs';

/** Same format Better Auth uses for signed cookies: `token.base64(hmac-sha256)`, URI-encoded. */
function signedCookieValue(value: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(value).digest('base64');
  return encodeURIComponent(`${value}.${signature}`);
}

/** Signs the browser context in as a seeded fixture user. */
export async function loginAs(context: BrowserContext, user: keyof typeof users): Promise<void> {
  await context.addCookies([
    {
      name: 'discordplus.session_token',
      value: signedCookieValue(users[user].sessionToken, AUTH_SECRET),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}
