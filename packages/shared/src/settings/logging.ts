import { z } from 'zod';
import { snowflakeSchema } from '../snowflake';

export const LOG_CATEGORIES = ['moderation', 'message', 'member', 'server', 'voice'] as const;
export type LogCategory = (typeof LOG_CATEGORIES)[number];

export const LOG_CATEGORY_LABELS: Record<LogCategory, string> = {
  moderation: 'Moderasyon',
  message: 'Mesaj',
  member: 'Üye',
  server: 'Sunucu',
  voice: 'Ses',
};

export const LOG_CATEGORY_DESCRIPTIONS: Record<LogCategory, string> = {
  moderation: 'Vakalar: uyarı, susturma, atma, yasaklama ve panelden yapılan ayar değişiklikleri.',
  message: 'Silinen, düzenlenen ve toplu silinen mesajlar.',
  member: 'Katılma, ayrılma, takma ad, rol, kullanıcı adı ve avatar değişiklikleri.',
  server: 'Kanal, rol ve sunucu ayarlarındaki değişiklikler.',
  voice: 'Ses kanalına katılma, ayrılma ve kanal değiştirme.',
};

const channelId = snowflakeSchema.nullable().default(null);

export const loggingSettingsSchema = z.object({
  /** Target channel per category; null turns the category off. */
  channels: z
    .object({
      moderation: channelId,
      message: channelId,
      member: channelId,
      server: channelId,
      voice: channelId,
    })
    .prefault({}),
  /** Channels whose messages and voice activity are not logged. */
  ignoredChannelIds: z.array(snowflakeSchema).max(100).default([]),
  /** Skip messages written by bots. */
  ignoreBots: z.boolean().default(true),
});

export type LoggingSettings = z.infer<typeof loggingSettingsSchema>;
