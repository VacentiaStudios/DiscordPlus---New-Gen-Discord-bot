import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const guilds = pgTable('guilds', {
  /** Discord guild snowflake. */
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon'),
  /** When the bot last joined. The bot is present while `botLeftAt` is null. */
  botJoinedAt: timestamp('bot_joined_at', { withTimezone: true }),
  botLeftAt: timestamp('bot_left_at', { withTimezone: true }),
  /** Last case number handed out in this guild. */
  caseCounter: integer('case_counter').notNull().default(0),
  // Settings documents, validated with the schemas in @discordplus/shared.
  moderation: jsonb('moderation').$type<unknown>().notNull().default({}),
  logging: jsonb('logging').$type<unknown>().notNull().default({}),
  automod: jsonb('automod').$type<unknown>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type GuildRow = typeof guilds.$inferSelect;
