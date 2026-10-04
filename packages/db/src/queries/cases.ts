import type { CaseSource, CaseType } from '@discordplus/shared';
import {
  and,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
  type SQL,
} from 'drizzle-orm';
import { guilds, modCases, type CaseRow } from '../schema';
import type { Database, DbExecutor } from '../types';

export interface NewCase {
  guildId: string;
  /** Used only if the guild row does not exist yet. */
  guildName: string;
  type: CaseType;
  source: CaseSource;
  targetId: string;
  targetTag: string;
  moderatorId: string;
  moderatorTag: string;
  reason?: string | null;
  durationMs?: number | null;
  expiresAt?: Date | null;
  active?: boolean;
  metadata?: Record<string, unknown> | null;
}

/** Inserts a case with the guild's next case number; numbering is atomic per guild. */
export async function createCase(db: Database, input: NewCase): Promise<CaseRow> {
  return db.transaction(async (tx) => {
    // The upsert locks the guild row until commit, so concurrent cases queue up.
    const [counter] = await tx
      .insert(guilds)
      .values({ id: input.guildId, name: input.guildName, caseCounter: 1 })
      .onConflictDoUpdate({
        target: guilds.id,
        set: { caseCounter: sql`${guilds.caseCounter} + 1` },
      })
      .returning({ caseNumber: guilds.caseCounter });

    const [row] = await tx
      .insert(modCases)
      .values({
        guildId: input.guildId,
        caseNumber: counter!.caseNumber,
        type: input.type,
        source: input.source,
        targetId: input.targetId,
        targetTag: input.targetTag,
        moderatorId: input.moderatorId,
        moderatorTag: input.moderatorTag,
        reason: input.reason ?? null,
        durationMs: input.durationMs ?? null,
        expiresAt: input.expiresAt ?? null,
        active: input.active ?? true,
        metadata: input.metadata ?? null,
      })
      .returning();
    return row!;
  });
}

export async function getCase(
  db: DbExecutor,
  guildId: string,
  caseNumber: number,
): Promise<CaseRow | undefined> {
  const [row] = await db
    .select()
    .from(modCases)
    .where(and(eq(modCases.guildId, guildId), eq(modCases.caseNumber, caseNumber)))
    .limit(1);
  return row;
}

export async function getCaseById(db: DbExecutor, id: number): Promise<CaseRow | undefined> {
  const [row] = await db.select().from(modCases).where(eq(modCases.id, id)).limit(1);
  return row;
}

export interface CaseFilter {
  guildId: string;
  targetId?: string;
  moderatorId?: string;
  type?: CaseType;
  includeDeleted?: boolean;
}

function caseConditions(filter: CaseFilter): SQL | undefined {
  return and(
    eq(modCases.guildId, filter.guildId),
    filter.targetId ? eq(modCases.targetId, filter.targetId) : undefined,
    filter.moderatorId ? eq(modCases.moderatorId, filter.moderatorId) : undefined,
    filter.type ? eq(modCases.type, filter.type) : undefined,
    filter.includeDeleted ? undefined : isNull(modCases.deletedAt),
  );
}

/** Newest first. */
export async function listCases(
  db: DbExecutor,
  filter: CaseFilter,
  page: { limit?: number; offset?: number } = {},
): Promise<CaseRow[]> {
  return db
    .select()
    .from(modCases)
    .where(caseConditions(filter))
    .orderBy(desc(modCases.caseNumber))
    .limit(page.limit ?? 20)
    .offset(page.offset ?? 0);
}

export async function countCases(db: DbExecutor, filter: CaseFilter): Promise<number> {
  const [row] = await db.select({ value: count() }).from(modCases).where(caseConditions(filter));
  return row?.value ?? 0;
}

export async function updateCaseReason(
  db: DbExecutor,
  guildId: string,
  caseNumber: number,
  reason: string | null,
): Promise<CaseRow | undefined> {
  const [row] = await db
    .update(modCases)
    .set({ reason })
    .where(
      and(
        eq(modCases.guildId, guildId),
        eq(modCases.caseNumber, caseNumber),
        isNull(modCases.deletedAt),
      ),
    )
    .returning();
  return row;
}

/** Soft-deletes a case; deleted warnings no longer count and deleted bans are not lifted. */
export async function deleteCase(
  db: DbExecutor,
  guildId: string,
  caseNumber: number,
  deletedBy: string,
): Promise<CaseRow | undefined> {
  const [row] = await db
    .update(modCases)
    .set({ deletedAt: new Date(), deletedBy, active: false })
    .where(
      and(
        eq(modCases.guildId, guildId),
        eq(modCases.caseNumber, caseNumber),
        isNull(modCases.deletedAt),
      ),
    )
    .returning();
  return row;
}

export async function setCaseLogMessage(
  db: DbExecutor,
  id: number,
  logChannelId: string,
  logMessageId: string,
): Promise<void> {
  await db.update(modCases).set({ logChannelId, logMessageId }).where(eq(modCases.id, id));
}

/** Active, non-deleted warnings of a user, optionally only those created after `since`. */
export async function countActiveWarnings(
  db: DbExecutor,
  guildId: string,
  targetId: string,
  since: Date | null,
): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(modCases)
    .where(
      and(
        eq(modCases.guildId, guildId),
        eq(modCases.targetId, targetId),
        eq(modCases.type, 'warn'),
        eq(modCases.active, true),
        isNull(modCases.deletedAt),
        since ? gte(modCases.createdAt, since) : undefined,
      ),
    );
  return row?.value ?? 0;
}

/** Temporary bans whose time is up, limited to the given guilds. */
export async function findExpiredTempBans(
  db: DbExecutor,
  now: Date,
  guildIds: string[],
  limit = 50,
): Promise<CaseRow[]> {
  if (guildIds.length === 0) return [];
  return db
    .select()
    .from(modCases)
    .where(
      and(
        eq(modCases.type, 'ban'),
        eq(modCases.active, true),
        isNull(modCases.deletedAt),
        isNotNull(modCases.expiresAt),
        lte(modCases.expiresAt, now),
        inArray(modCases.guildId, guildIds),
      ),
    )
    .orderBy(modCases.expiresAt)
    .limit(limit);
}

export async function deactivateCase(db: DbExecutor, id: number): Promise<void> {
  await db.update(modCases).set({ active: false }).where(eq(modCases.id, id));
}

/** Marks pending temporary bans of a user as done, e.g. after a manual unban. */
export async function deactivateTempBans(
  db: DbExecutor,
  guildId: string,
  targetId: string,
): Promise<void> {
  await db
    .update(modCases)
    .set({ active: false })
    .where(
      and(
        eq(modCases.guildId, guildId),
        eq(modCases.targetId, targetId),
        eq(modCases.type, 'ban'),
        eq(modCases.active, true),
      ),
    );
}

export type CaseCounts = Partial<Record<CaseType, number>>;

/** Number of non-deleted cases per type, optionally since a date or for one user. */
export async function caseCountsByType(
  db: DbExecutor,
  filter: { guildId: string; since?: Date; targetId?: string },
): Promise<CaseCounts> {
  const rows = await db
    .select({ type: modCases.type, value: count() })
    .from(modCases)
    .where(
      and(
        eq(modCases.guildId, filter.guildId),
        isNull(modCases.deletedAt),
        filter.since ? gte(modCases.createdAt, filter.since) : undefined,
        filter.targetId ? eq(modCases.targetId, filter.targetId) : undefined,
      ),
    )
    .groupBy(modCases.type);
  return Object.fromEntries(rows.map((row) => [row.type, row.value]));
}
