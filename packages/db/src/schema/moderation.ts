import { CASE_SOURCES, CASE_TYPES } from '@discordplus/shared';
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { guilds } from './guilds';

export const caseTypeEnum = pgEnum('case_type', CASE_TYPES);
export const caseSourceEnum = pgEnum('case_source', CASE_SOURCES);

export const modCases = pgTable(
  'mod_cases',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    /** Sequential per guild: "Vaka #12". */
    caseNumber: integer('case_number').notNull(),
    type: caseTypeEnum('type').notNull(),
    source: caseSourceEnum('source').notNull(),
    targetId: text('target_id').notNull(),
    /** Username at the time of the action. */
    targetTag: text('target_tag').notNull(),
    moderatorId: text('moderator_id').notNull(),
    moderatorTag: text('moderator_tag').notNull(),
    reason: text('reason'),
    durationMs: bigint('duration_ms', { mode: 'number' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    /**
     * Warnings: counts towards thresholds. Temporary bans: not lifted yet.
     * Cleared when a ban is lifted early or a warning is pardoned.
     */
    active: boolean('active').notNull().default(true),
    logChannelId: text('log_channel_id'),
    logMessageId: text('log_message_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedBy: text('deleted_by'),
  },
  (t) => [
    uniqueIndex('mod_cases_guild_number_idx').on(t.guildId, t.caseNumber),
    index('mod_cases_guild_target_idx').on(t.guildId, t.targetId),
    index('mod_cases_guild_created_idx').on(t.guildId, t.createdAt),
    index('mod_cases_pending_bans_idx')
      .on(t.expiresAt)
      .where(sql`${t.type} = 'ban' and ${t.active} and ${t.deletedAt} is null`),
  ],
);

export type CaseRow = typeof modCases.$inferSelect;

/** The @everyone permission overwrite of a channel before `/kilitle`, restored by `/kilit-aç`. */
export const channelLocks = pgTable('channel_locks', {
  channelId: text('channel_id').primaryKey(),
  guildId: text('guild_id')
    .notNull()
    .references(() => guilds.id, { onDelete: 'cascade' }),
  /** Allow/deny bitfields of the previous overwrite; null when there was none. */
  previousAllow: text('previous_allow'),
  previousDeny: text('previous_deny'),
  lockedBy: text('locked_by').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ChannelLockRow = typeof channelLocks.$inferSelect;

/** Who changed which settings section in the web panel, and how. */
export const settingsAudit = pgTable(
  'settings_audit',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    guildId: text('guild_id')
      .notNull()
      .references(() => guilds.id, { onDelete: 'cascade' }),
    section: text('section').notNull(),
    actorId: text('actor_id').notNull(),
    actorName: text('actor_name').notNull(),
    changes: jsonb('changes')
      .$type<{ path: string; before: unknown; after: unknown }[]>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('settings_audit_guild_created_idx').on(t.guildId, t.createdAt)],
);

export type SettingsAuditRow = typeof settingsAudit.$inferSelect;
