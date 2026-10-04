import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DB_EVENTS_CHANNEL, notifyEvent, parseDbEvent, type DbEvent } from './events';
import { createTestDatabase, type TestDatabase } from './testing';

let testDb: TestDatabase;

beforeAll(async () => {
  testDb = await createTestDatabase();
});

afterAll(async () => {
  await testDb.close();
});

const event: DbEvent = {
  type: 'settings_updated',
  guildId: '100000000000000001',
  section: 'logging',
  actorId: '200000000000000002',
  actorName: 'yönetici',
};

describe('notifyEvent', () => {
  it('delivers a parsable payload on the events channel', async () => {
    const received: (DbEvent | null)[] = [];
    const unsubscribe = await testDb.client.listen(DB_EVENTS_CHANNEL, (payload) => {
      received.push(parseDbEvent(payload));
    });

    await notifyEvent(testDb.db, event);
    await expect.poll(() => received.length).toBe(1);
    expect(received[0]).toEqual(event);
    await unsubscribe();
  });

  it('is only delivered when the transaction commits', async () => {
    const received: string[] = [];
    const unsubscribe = await testDb.client.listen(DB_EVENTS_CHANNEL, (payload) => {
      received.push(payload);
    });

    await testDb.db
      .transaction(async (tx) => {
        await notifyEvent(tx, event);
        tx.rollback();
      })
      .catch(() => undefined);
    await notifyEvent(testDb.db, { ...event, section: 'automod' });

    await expect.poll(() => received.length).toBe(1);
    expect(parseDbEvent(received[0])?.section).toBe('automod');
    await unsubscribe();
  });
});

describe('parseDbEvent', () => {
  it.each([
    undefined,
    '',
    'not json',
    JSON.stringify({ type: 'unknown' }),
    JSON.stringify({ ...event, section: 'nope' }),
    JSON.stringify({ ...event, guildId: '12' }),
  ])('rejects %j', (payload) => {
    expect(parseDbEvent(payload)).toBeNull();
  });
});
