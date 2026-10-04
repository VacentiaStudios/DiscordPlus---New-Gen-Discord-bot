import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { guilds, modCases } from '../schema';
import { createTestDatabase, type TestDatabase } from '../testing';
import {
  caseCountsByType,
  countActiveWarnings,
  countCases,
  createCase,
  deactivateTempBans,
  deleteCase,
  findExpiredTempBans,
  getCase,
  listCases,
  updateCaseReason,
  type NewCase,
} from './cases';
import { upsertGuildPresence } from './guilds';

const GUILD = '100000000000000001';
const OTHER_GUILD = '100000000000000002';
const USER = '200000000000000001';
const MOD = '200000000000000009';

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
});

afterAll(async () => {
  await testDb.close();
});

beforeEach(async () => {
  await testDb.db.delete(modCases);
  await testDb.db.delete(guilds);
  await upsertGuildPresence(testDb.db, [
    { id: GUILD, name: 'Guild', icon: null },
    { id: OTHER_GUILD, name: 'Other', icon: null },
  ]);
});

function newCase(overrides: Partial<NewCase> = {}): NewCase {
  return {
    guildId: GUILD,
    guildName: 'Guild',
    type: 'warn',
    source: 'command',
    targetId: USER,
    targetTag: 'user',
    moderatorId: MOD,
    moderatorTag: 'mod',
    reason: 'test',
    ...overrides,
  };
}

describe('createCase', () => {
  it('numbers cases per guild', async () => {
    const { db } = testDb;
    const first = await createCase(db, newCase());
    const second = await createCase(db, newCase());
    const other = await createCase(db, newCase({ guildId: OTHER_GUILD }));
    expect([first.caseNumber, second.caseNumber, other.caseNumber]).toEqual([1, 2, 1]);
  });

  it('never hands out a number twice under concurrency', async () => {
    const { db } = testDb;
    const cases = await Promise.all(Array.from({ length: 20 }, () => createCase(db, newCase())));
    const numbers = cases.map((c) => c.caseNumber).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('creates the guild row when it is missing', async () => {
    const created = await createCase(testDb.db, newCase({ guildId: '100000000000000003' }));
    expect(created.caseNumber).toBe(1);
  });
});

describe('listing', () => {
  it('filters, paginates newest first and hides deleted cases', async () => {
    const { db } = testDb;
    await createCase(db, newCase({ type: 'warn' }));
    await createCase(db, newCase({ type: 'ban', targetId: '200000000000000002' }));
    await createCase(db, newCase({ type: 'warn' }));
    await deleteCase(db, GUILD, 3, MOD);

    expect((await listCases(db, { guildId: GUILD })).map((c) => c.caseNumber)).toEqual([2, 1]);
    expect(await countCases(db, { guildId: GUILD })).toBe(2);
    expect(await countCases(db, { guildId: GUILD, includeDeleted: true })).toBe(3);
    expect((await listCases(db, { guildId: GUILD, type: 'ban' })).map((c) => c.caseNumber)).toEqual(
      [2],
    );
    expect(
      (await listCases(db, { guildId: GUILD, targetId: USER })).map((c) => c.caseNumber),
    ).toEqual([1]);
    expect(
      (await listCases(db, { guildId: GUILD, includeDeleted: true }, { limit: 1, offset: 1 })).map(
        (c) => c.caseNumber,
      ),
    ).toEqual([2]);
  });

  it('counts cases per type', async () => {
    const { db } = testDb;
    await createCase(db, newCase({ type: 'warn' }));
    await createCase(db, newCase({ type: 'warn' }));
    await createCase(db, newCase({ type: 'kick' }));
    await createCase(db, newCase({ type: 'kick', targetId: '200000000000000002' }));
    expect(await caseCountsByType(db, { guildId: GUILD })).toEqual({ warn: 2, kick: 2 });
    expect(await caseCountsByType(db, { guildId: GUILD, targetId: USER })).toEqual({
      warn: 2,
      kick: 1,
    });
    expect(
      await caseCountsByType(db, { guildId: GUILD, since: new Date(Date.now() + 60_000) }),
    ).toEqual({});
  });
});

describe('editing', () => {
  it('updates the reason of live cases only', async () => {
    const { db } = testDb;
    await createCase(db, newCase());
    expect((await updateCaseReason(db, GUILD, 1, 'new reason'))?.reason).toBe('new reason');
    await deleteCase(db, GUILD, 1, MOD);
    expect(await updateCaseReason(db, GUILD, 1, 'again')).toBeUndefined();
    expect((await getCase(db, GUILD, 1))?.deletedBy).toBe(MOD);
  });

  it('deletes a case only once', async () => {
    const { db } = testDb;
    await createCase(db, newCase());
    expect(await deleteCase(db, GUILD, 1, MOD)).toBeDefined();
    expect(await deleteCase(db, GUILD, 1, MOD)).toBeUndefined();
  });
});

describe('countActiveWarnings', () => {
  it('ignores deleted, inactive and expired warnings', async () => {
    const { db } = testDb;
    await createCase(db, newCase());
    await createCase(db, newCase());
    await createCase(db, newCase({ active: false }));
    await createCase(db, newCase({ type: 'kick' }));
    await createCase(db, newCase({ targetId: '200000000000000002' }));
    await deleteCase(db, GUILD, 2, MOD);

    expect(await countActiveWarnings(db, GUILD, USER, null)).toBe(1);
    expect(await countActiveWarnings(db, GUILD, USER, new Date(Date.now() + 60_000))).toBe(0);
  });
});

describe('temporary bans', () => {
  it('finds expired bans in the given guilds', async () => {
    const { db } = testDb;
    const past = new Date(Date.now() - 1_000);
    const future = new Date(Date.now() + 60_000);
    await createCase(db, newCase({ type: 'ban', expiresAt: past }));
    await createCase(db, newCase({ type: 'ban', expiresAt: future }));
    await createCase(db, newCase({ type: 'ban', expiresAt: null }));
    await createCase(db, newCase({ type: 'ban', expiresAt: past, guildId: OTHER_GUILD }));
    await createCase(db, newCase({ type: 'ban', expiresAt: past, targetId: '200000000000000003' }));
    await deleteCase(db, GUILD, 4, MOD);

    const expired = await findExpiredTempBans(db, new Date(), [GUILD]);
    expect(expired.map((c) => c.caseNumber)).toEqual([1]);
    expect(await findExpiredTempBans(db, new Date(), [])).toEqual([]);
  });

  it('stops pending temp bans after a manual unban', async () => {
    const { db } = testDb;
    await createCase(db, newCase({ type: 'ban', expiresAt: new Date(Date.now() - 1_000) }));
    await deactivateTempBans(db, GUILD, USER);
    expect(await findExpiredTempBans(db, new Date(), [GUILD])).toEqual([]);
  });
});
