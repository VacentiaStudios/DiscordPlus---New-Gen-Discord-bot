import { defaultGuildSettings } from '@discordplus/shared';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { guilds } from '../schema';
import { createTestDatabase, type TestDatabase } from '../testing';
import {
  getBotGuildIds,
  getGuild,
  loadGuildSettings,
  markGuildLeft,
  syncGuildPresence,
  upsertGuildPresence,
} from './guilds';

const A = { id: '100000000000000001', name: 'Alpha', icon: null };
const B = { id: '100000000000000002', name: 'Beta', icon: 'abc' };
const C = { id: '100000000000000003', name: 'Gamma', icon: null };

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
});

afterAll(async () => {
  await testDb.close();
});

beforeEach(async () => {
  await testDb.db.delete(guilds);
});

describe('guild presence', () => {
  it('marks guilds as present and refreshes their name', async () => {
    const { db } = testDb;
    await upsertGuildPresence(db, [A, B]);
    await upsertGuildPresence(db, [{ ...A, name: 'Alpha 2' }]);

    expect((await getGuild(db, A.id))?.name).toBe('Alpha 2');
    expect(await getBotGuildIds(db, [A.id, B.id, C.id])).toEqual(new Set([A.id, B.id]));
  });

  it('marks a guild as left and back as joined', async () => {
    const { db } = testDb;
    await upsertGuildPresence(db, [A]);
    const firstJoin = (await getGuild(db, A.id))!.botJoinedAt!;

    await markGuildLeft(db, A.id);
    expect(await getBotGuildIds(db, [A.id])).toEqual(new Set());

    await new Promise((resolve) => setTimeout(resolve, 5));
    await upsertGuildPresence(db, [A]);
    const rejoined = (await getGuild(db, A.id))!;
    expect(rejoined.botLeftAt).toBeNull();
    expect(rejoined.botJoinedAt!.getTime()).toBeGreaterThan(firstJoin.getTime());
  });

  it('keeps the join time while the bot stays in a guild', async () => {
    const { db } = testDb;
    await upsertGuildPresence(db, [A]);
    const firstJoin = (await getGuild(db, A.id))!.botJoinedAt!;
    await new Promise((resolve) => setTimeout(resolve, 5));
    await upsertGuildPresence(db, [A]);
    expect((await getGuild(db, A.id))!.botJoinedAt!.getTime()).toBe(firstJoin.getTime());
  });

  it('full sync marks missing guilds as left', async () => {
    const { db } = testDb;
    await upsertGuildPresence(db, [A, B, C]);
    await syncGuildPresence(db, [B]);
    expect(await getBotGuildIds(db, [A.id, B.id, C.id])).toEqual(new Set([B.id]));
  });

  it('full sync with no guilds marks everything as left', async () => {
    const { db } = testDb;
    await upsertGuildPresence(db, [A, B]);
    await syncGuildPresence(db, []);
    expect(await getBotGuildIds(db, [A.id, B.id])).toEqual(new Set());
  });
});

describe('loadGuildSettings', () => {
  it('returns defaults for unknown guilds', async () => {
    const result = await loadGuildSettings(testDb.db, C.id);
    expect(result.settings).toEqual(defaultGuildSettings());
    expect(result.invalidSections).toEqual([]);
  });

  it('falls back to defaults for documents that do not match the schema', async () => {
    const { db } = testDb;
    await upsertGuildPresence(db, [A]);
    await db.update(guilds).set({ moderation: 'not an object' }).where(eq(guilds.id, A.id));

    const result = await loadGuildSettings(db, A.id);
    expect(result.settings.moderation).toEqual(defaultGuildSettings().moderation);
    expect(result.invalidSections).toEqual(['moderation']);
  });
});
