import { z } from 'zod';
import { DURATION, MAX_TIMEOUT_MS } from '../duration';
import { snowflakeSchema } from '../snowflake';
import { MAX_TEMP_BAN_MS } from './moderation';

export const AUTOMOD_FILTERS = [
  'spam',
  'duplicates',
  'profanity',
  'invites',
  'links',
  'caps',
  'mentions',
] as const;
export type AutomodFilter = (typeof AUTOMOD_FILTERS)[number];

export const AUTOMOD_FILTER_LABELS: Record<AutomodFilter, string> = {
  spam: 'Spam',
  duplicates: 'Tekrar eden mesaj',
  profanity: 'Küfür',
  invites: 'Davet linki',
  links: 'Link',
  caps: 'Büyük harf',
  mentions: 'Toplu etiket',
};

export const AUTOMOD_FILTER_DESCRIPTIONS: Record<AutomodFilter, string> = {
  spam: 'Kısa sürede çok sayıda mesaj gönderen kullanıcılar.',
  duplicates: 'Aynı mesajı tekrar tekrar gönderenler (farklı kanallarda olsa da).',
  profanity: 'Türkçe küfür listesi ve sunucuya özel kelimeler.',
  invites: 'Başka Discord sunucularının davet linkleri.',
  links: 'İzin verilmeyen sitelere giden linkler.',
  caps: 'Çoğunlukla büyük harfle yazılmış mesajlar.',
  mentions: 'Tek mesajda çok sayıda kullanıcı veya rol etiketlemek.',
};

/**
 * What happens to a message that breaks a filter. Everything except `log`
 * deletes the message; punishments go through the moderation service and
 * create cases.
 */
export const AUTOMOD_ACTIONS = ['log', 'delete', 'warn', 'timeout', 'kick', 'ban'] as const;
export type AutomodAction = (typeof AUTOMOD_ACTIONS)[number];

export const AUTOMOD_ACTION_LABELS: Record<AutomodAction, string> = {
  log: 'Sadece logla',
  delete: 'Sil',
  warn: 'Sil ve uyar',
  timeout: 'Sil ve sustur',
  kick: 'Sil ve at',
  ban: 'Sil ve yasakla',
};

export const MAX_AUTOMOD_WORDS = 500;
export const MAX_AUTOMOD_DOMAINS = 200;
export const MAX_AUTOMOD_EXEMPT_ROLES = 50;
export const MAX_AUTOMOD_EXEMPT_CHANNELS = 100;

/** A word to match; a trailing `*` matches every word starting with it. */
export const wordEntrySchema = z
  .string()
  .trim()
  .min(2, 'En az 2 karakter olmalı')
  .max(50, 'En fazla 50 karakter olabilir')
  .regex(/^[^\s*]+\*?$/u, 'Boşluk içeremez; yıldız (*) yalnızca sonda olabilir');

export const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$/,
    'Geçersiz alan adı (ör. youtube.com)',
  );

/** Allowed out of the box when the link filter uses an allowlist. */
export const DEFAULT_ALLOWED_DOMAINS = [
  'discord.com',
  'discordapp.com',
  'discordapp.net',
  'tenor.com',
  'giphy.com',
  'youtube.com',
  'youtu.be',
];

const filterBase = z.object({
  enabled: z.boolean().default(false),
  action: z.enum(AUTOMOD_ACTIONS).default('delete'),
  /** Timeouts need one; for bans it makes the ban temporary; unused otherwise. */
  durationMs: z.number().int().min(DURATION.MINUTE).max(MAX_TEMP_BAN_MS).nullable().default(null),
});

function checkDuration(
  filter: { action: AutomodAction; durationMs: number | null },
  ctx: z.RefinementCtx,
): void {
  if (filter.action === 'timeout') {
    if (filter.durationMs === null) {
      ctx.addIssue({ code: 'custom', path: ['durationMs'], message: 'Susturma için süre gerekli' });
    } else if (filter.durationMs > MAX_TIMEOUT_MS) {
      ctx.addIssue({
        code: 'custom',
        path: ['durationMs'],
        message: 'Susturma en fazla 28 gün olabilir',
      });
    }
  } else if (filter.action !== 'ban' && filter.durationMs !== null) {
    ctx.addIssue({
      code: 'custom',
      path: ['durationMs'],
      message: 'Bu eylem için süre kullanılmaz',
    });
  }
}

const int = (min: number, max: number, fallback: number) =>
  z
    .number({ error: 'Bir sayı girin' })
    .int('Tam sayı olmalı')
    .min(min, `En az ${min} olmalı`)
    .max(max, `En fazla ${max} olabilir`)
    .default(fallback);

export const automodSettingsSchema = z.object({
  spam: filterBase
    .extend({
      /** Messages allowed within `perSeconds`; the next one triggers the filter. */
      maxMessages: int(3, 30, 5),
      perSeconds: int(2, 60, 5),
    })
    .superRefine(checkDuration)
    .prefault({}),
  duplicates: filterBase
    .extend({
      maxDuplicates: int(2, 20, 3),
      perSeconds: int(5, 300, 30),
    })
    .superRefine(checkDuration)
    .prefault({}),
  profanity: filterBase
    .extend({
      useDefaultList: z.boolean().default(true),
      words: z.array(wordEntrySchema).max(MAX_AUTOMOD_WORDS).default([]),
      /** Exceptions, checked before both lists. */
      allowedWords: z.array(wordEntrySchema).max(MAX_AUTOMOD_WORDS).default([]),
    })
    .superRefine(checkDuration)
    .prefault({}),
  invites: filterBase
    .extend({
      /** Invites to the guild itself are fine. */
      allowOwnInvites: z.boolean().default(true),
    })
    .superRefine(checkDuration)
    .prefault({}),
  links: filterBase
    .extend({
      /** allowlist: only listed sites are allowed; blocklist: only listed sites are blocked. */
      mode: z.enum(['allowlist', 'blocklist']).default('allowlist'),
      domains: z
        .array(domainSchema)
        .max(MAX_AUTOMOD_DOMAINS)
        .default(() => [...DEFAULT_ALLOWED_DOMAINS]),
    })
    .superRefine(checkDuration)
    .prefault({}),
  caps: filterBase
    .extend({
      /** Shorter messages are never checked. */
      minLetters: int(5, 200, 10),
      percent: int(50, 100, 70),
    })
    .superRefine(checkDuration)
    .prefault({}),
  mentions: filterBase
    .extend({
      /** Distinct users and roles in one message that trigger the filter. */
      maxMentions: int(2, 50, 5),
    })
    .superRefine(checkDuration)
    .prefault({}),
  /** Members who can manage messages in the channel (and administrators) are not checked. */
  exemptModerators: z.boolean().default(true),
  exemptRoleIds: z.array(snowflakeSchema).max(MAX_AUTOMOD_EXEMPT_ROLES).default([]),
  /** Channels or categories AutoMod ignores. */
  exemptChannelIds: z.array(snowflakeSchema).max(MAX_AUTOMOD_EXEMPT_CHANNELS).default([]),
  /** Post a short, self-deleting notice in the channel when a message is removed. */
  notifyChannel: z.boolean().default(true),
});

export type AutomodSettings = z.infer<typeof automodSettingsSchema>;
export type AutomodFilterSettings<F extends AutomodFilter> = AutomodSettings[F];

/** Actions that need (timeout) or accept (ban) a duration. */
export function actionUsesDuration(action: AutomodAction): boolean {
  return action === 'timeout' || action === 'ban';
}

/**
 * A sensible starting point: every filter except links on, with escalating
 * actions. Word lists, link lists and exemptions are kept.
 */
export function recommendedAutomodSettings(current: AutomodSettings): AutomodSettings {
  return {
    ...current,
    spam: {
      ...current.spam,
      enabled: true,
      action: 'timeout',
      durationMs: 10 * DURATION.MINUTE,
      maxMessages: 5,
      perSeconds: 5,
    },
    duplicates: {
      ...current.duplicates,
      enabled: true,
      action: 'delete',
      durationMs: null,
      maxDuplicates: 3,
      perSeconds: 30,
    },
    profanity: {
      ...current.profanity,
      enabled: true,
      action: 'warn',
      durationMs: null,
      useDefaultList: true,
    },
    invites: {
      ...current.invites,
      enabled: true,
      action: 'delete',
      durationMs: null,
      allowOwnInvites: true,
    },
    caps: {
      ...current.caps,
      enabled: true,
      action: 'delete',
      durationMs: null,
      minLetters: 10,
      percent: 70,
    },
    mentions: {
      ...current.mentions,
      enabled: true,
      action: 'timeout',
      durationMs: DURATION.HOUR,
      maxMentions: 5,
    },
    exemptModerators: true,
    notifyChannel: true,
  };
}
