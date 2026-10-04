import 'server-only';
import { schema } from '@discordplus/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { getDb } from './db';
import { getServerEnv } from './env';

export const SESSION_COOKIE_PREFIX = 'discordplus';

function createAuth() {
  const env = getServerEnv();
  return betterAuth({
    appName: 'DiscordPlus',
    baseURL: env.WEB_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      discord: {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        // Only the user's identity and server list; no email address.
        disableDefaultScope: true,
        scope: ['identify', 'guilds'],
        overrideUserInfoOnSignIn: true,
        mapProfileToUser: (profile) => ({
          // Better Auth requires an email; a non-routable placeholder keeps it unique.
          email: `${profile.id}@discord.placeholder.invalid`,
          emailVerified: false,
          name: profile.global_name ?? profile.username,
          image: profile.image_url,
        }),
      },
    },
    account: { encryptOAuthTokens: true },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    advanced: { cookiePrefix: SESSION_COOKIE_PREFIX },
    telemetry: { enabled: false },
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/** Lazily created so that building the site does not require runtime secrets. */
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
