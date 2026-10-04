import { defaultSettings } from '@discordplus/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { DB_EVENTS_CHANNEL, parseDbEvent, type DbEvent } from '../events';
import { guilds, settingsAudit } from '../schema';
import { createTestDatabase, type TestDatabase } from '../testing';
import { upsertGuildPresence } from './guilds';
import { listSettingsAudit, updateGuildSettings } from './settings';

const GUILD = '100000000000000001';
const actor = { id: '200000000000000001', name: 'Alice' };

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
});

afterAll(async () => {
  await testDb.close();
});

beforeEach(async () => {
  await testDb.db.delete(settingsAudit);
  await testDb.db.delete(guilds);
  await upsertGuildPresence(testDb.db, [{ id: GUILD, name: 'Guild', icon: null }]);
});

describe('updateGuildSettings', () => {
  it('stores the section, records the change and notifies the bot', async () => {
    const { db, client } = testDb;
    const events: (DbEvent | null)[] = [];
    const unsubscribe = await client.listen(DB_EVENTS_CHANNEL, (payload) => {
      events.push(parseDbEvent(payload));
    });

    const value = { ...defaultSettings('moderation'), dmOnAction: false };
    const result = await updateGuildSettings(db, {
      guildId: GUILD,
      section: 'moderation',
      value,
      actor,
    });

    expect(result).toEqual({
      changed: true,
      changes: [{ path: 'dmOnAction', before: true, after: false }],
    });
    const [row] = await db.select().from(guilds).where(eq(guilds.id, GUILD));
    expect(row?.moderation).toEqual(value);

    const audit = await listSettingsAudit(db, GUILD);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      section: 'moderation',
      actorId: actor.id,
      actorName: 'Alice',
    });

    await expect.poll(() => events.length).toBe(1);
    expect(events[0]).toEqual({
      type: 'settings_updated',
      guildId: GUILD,
      section: 'moderation',
      actorId: actor.id,
      actorName: 'Alice',
    });
    await unsubscribe();
  });

  it('does nothing when nothing changed', async () => {
    const { db } = testDb;
    const result = await updateGuildSettings(db, {
      guildId: GUILD,
      section: 'logging',
      value: defaultSettings('logging'),
      actor,
    });
    expect(result.changed).toBe(false);
    expect(await listSettingsAudit(db, GUILD)).toEqual([]);
  });

  it('rejects unknown guilds', async () => {
    await expect(
      updateGuildSettings(testDb.db, {
        guildId: '100000000000000009',
        section: 'logging',
        value: defaultSettings('logging'),
        actor,
      }),
    ).rejects.toThrow(/not known/);
  });
});
