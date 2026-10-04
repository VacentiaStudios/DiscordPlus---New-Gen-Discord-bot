import { eq } from 'drizzle-orm';
import { channelLocks, type ChannelLockRow } from '../schema';
import type { DbExecutor } from '../types';

export async function getChannelLock(
  db: DbExecutor,
  channelId: string,
): Promise<ChannelLockRow | undefined> {
  const [row] = await db
    .select()
    .from(channelLocks)
    .where(eq(channelLocks.channelId, channelId))
    .limit(1);
  return row;
}

export async function saveChannelLock(
  db: DbExecutor,
  lock: Omit<ChannelLockRow, 'createdAt'>,
): Promise<void> {
  await db.insert(channelLocks).values(lock);
}

export async function deleteChannelLock(db: DbExecutor, channelId: string): Promise<void> {
  await db.delete(channelLocks).where(eq(channelLocks.channelId, channelId));
}
