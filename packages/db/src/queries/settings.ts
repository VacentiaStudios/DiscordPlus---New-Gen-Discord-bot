import {
  diffSettings,
  parseSection,
  type SectionSettings,
  type SettingsChange,
  type SettingsSection,
} from '@discordplus/shared';
import { desc, eq } from 'drizzle-orm';
import { notifyEvent } from '../events';
import { guilds, settingsAudit, type SettingsAuditRow } from '../schema';
import type { Database, DbExecutor } from '../types';

export interface SettingsActor {
  /** Discord user id. */
  id: string;
  name: string;
}

export interface UpdateSettingsResult {
  changed: boolean;
  changes: SettingsChange[];
}

/**
 * Replaces one settings section of a guild. In a single transaction it records
 * who changed what and notifies the bot (delivered on commit). A save without
 * changes writes nothing.
 */
export async function updateGuildSettings<S extends SettingsSection>(
  db: Database,
  input: { guildId: string; section: S; value: SectionSettings<S>; actor: SettingsActor },
): Promise<UpdateSettingsResult> {
  const { guildId, section, value, actor } = input;
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ current: guilds[section] })
      .from(guilds)
      .where(eq(guilds.id, guildId))
      .for('update');
    if (!row) throw new Error(`Guild ${guildId} is not known`);

    const changes = diffSettings(parseSection(section, row.current).value, value);
    if (changes.length === 0) return { changed: false, changes };

    await tx
      .update(guilds)
      .set({ [section]: value })
      .where(eq(guilds.id, guildId));
    await tx.insert(settingsAudit).values({
      guildId,
      section,
      actorId: actor.id,
      actorName: actor.name,
      changes,
    });
    await notifyEvent(tx, {
      type: 'settings_updated',
      guildId,
      section,
      actorId: actor.id,
      actorName: actor.name,
    });
    return { changed: true, changes };
  });
}

export async function listSettingsAudit(
  db: DbExecutor,
  guildId: string,
  limit = 10,
): Promise<SettingsAuditRow[]> {
  return db
    .select()
    .from(settingsAudit)
    .where(eq(settingsAudit.guildId, guildId))
    .orderBy(desc(settingsAudit.createdAt), desc(settingsAudit.id))
    .limit(limit);
}
