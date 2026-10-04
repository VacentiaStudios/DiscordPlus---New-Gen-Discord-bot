import { parseSection, type GuildSettings, type SettingsSection } from '@discordplus/shared';
import { and, eq, inArray, isNotNull, isNull, notInArray, sql } from 'drizzle-orm';
import { guilds } from '../schema';
import type { DbExecutor } from '../types';

export interface GuildPresence {
  id: string;
  name: string;
  icon: string | null;
}

const INSERT_CHUNK_SIZE = 500;

// On re-join the join time is refreshed; while present it is kept as is.
const joinedAtOnConflict = sql`case when ${guilds.botLeftAt} is not null or ${guilds.botJoinedAt} is null then now() else ${guilds.botJoinedAt} end`;

/** Records that the bot is (still) in the given guilds. */
export async function upsertGuildPresence(
  db: DbExecutor,
  presences: GuildPresence[],
): Promise<void> {
  for (let i = 0; i < presences.length; i += INSERT_CHUNK_SIZE) {
    const chunk = presences.slice(i, i + INSERT_CHUNK_SIZE);
    await db
      .insert(guilds)
      .values(chunk.map((g) => ({ ...g, botJoinedAt: new Date(), botLeftAt: null })))
      .onConflictDoUpdate({
        target: guilds.id,
        set: {
          name: sql`excluded.name`,
          icon: sql`excluded.icon`,
          botJoinedAt: joinedAtOnConflict,
          botLeftAt: null,
          updatedAt: new Date(),
        },
      });
  }
}

export async function markGuildLeft(db: DbExecutor, guildId: string): Promise<void> {
  await db
    .update(guilds)
    .set({ botLeftAt: new Date() })
    .where(and(eq(guilds.id, guildId), isNull(guilds.botLeftAt)));
}

/**
 * Full sync on startup: every guild in `present` is marked as joined and every
 * other guild that was still marked as joined is marked as left.
 */
export async function syncGuildPresence(db: DbExecutor, present: GuildPresence[]): Promise<void> {
  await upsertGuildPresence(db, present);
  await db
    .update(guilds)
    .set({ botLeftAt: new Date() })
    .where(
      and(
        isNull(guilds.botLeftAt),
        isNotNull(guilds.botJoinedAt),
        present.length > 0
          ? notInArray(
              guilds.id,
              present.map((g) => g.id),
            )
          : undefined,
      ),
    );
}

export async function getGuild(db: DbExecutor, guildId: string) {
  const [row] = await db.select().from(guilds).where(eq(guilds.id, guildId)).limit(1);
  return row;
}

/** IDs among `guildIds` where the bot is currently present. */
export async function getBotGuildIds(db: DbExecutor, guildIds: string[]): Promise<Set<string>> {
  if (guildIds.length === 0) return new Set();
  const rows = await db
    .select({ id: guilds.id })
    .from(guilds)
    .where(
      and(inArray(guilds.id, guildIds), isNotNull(guilds.botJoinedAt), isNull(guilds.botLeftAt)),
    );
  return new Set(rows.map((r) => r.id));
}

export interface LoadedGuildSettings {
  settings: GuildSettings;
  /** Sections whose stored document was invalid and replaced by defaults. */
  invalidSections: SettingsSection[];
}

/** Reads and validates all settings of a guild; unknown guilds get the defaults. */
export async function loadGuildSettings(
  db: DbExecutor,
  guildId: string,
): Promise<LoadedGuildSettings> {
  const [row] = await db
    .select({ moderation: guilds.moderation, logging: guilds.logging, automod: guilds.automod })
    .from(guilds)
    .where(eq(guilds.id, guildId))
    .limit(1);

  const invalidSections: SettingsSection[] = [];
  const parse = <S extends SettingsSection>(section: S) => {
    const parsed = parseSection(section, row?.[section]);
    if (!parsed.valid) invalidSections.push(section);
    return parsed.value;
  };

  const settings: GuildSettings = {
    moderation: parse('moderation'),
    logging: parse('logging'),
    automod: parse('automod'),
  };
  return { settings, invalidSections };
}
