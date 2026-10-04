import { createDatabase, schema, upsertGuildPresence } from '@discordplus/db';
import { runMigrations } from '@discordplus/db/migrator';
import { ensureDatabase } from '@discordplus/db/testing';
import { E2E_ENV } from './env';
import { guilds, users } from './fixtures.mjs';

const DAY = 24 * 60 * 60 * 1000;

/** Fresh database with the fixture users signed in and the bot in some guilds. */
export default async function globalSetup() {
  await ensureDatabase(E2E_ENV.DATABASE_URL);
  await runMigrations(E2E_ENV.DATABASE_URL);

  const database = createDatabase(E2E_ENV.DATABASE_URL, { maxConnections: 1 });
  const { db } = database;
  try {
    await db.delete(schema.session);
    await db.delete(schema.account);
    await db.delete(schema.verification);
    await db.delete(schema.user);
    await db.delete(schema.guilds);

    await upsertGuildPresence(
      db,
      Object.values(guilds)
        .filter((guild) => guild.botPresent)
        .map(({ id, name, icon }) => ({ id, name, icon })),
    );

    const expiresAt = new Date(Date.now() + DAY);
    for (const user of Object.values(users)) {
      await db.insert(schema.user).values({
        id: user.id,
        name: user.name,
        email: `${user.discordId}@discord.placeholder.invalid`,
      });
      await db.insert(schema.account).values({
        id: `${user.id}-discord`,
        userId: user.id,
        accountId: user.discordId,
        providerId: 'discord',
        accessToken: user.accessToken,
        accessTokenExpiresAt: expiresAt,
        scope: 'identify,guilds',
      });
      await db.insert(schema.session).values({
        id: `${user.id}-session`,
        userId: user.id,
        token: user.sessionToken,
        expiresAt,
      });
    }
  } finally {
    await database.close();
  }
}
