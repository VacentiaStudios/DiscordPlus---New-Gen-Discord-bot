'use server';

import { updateGuildSettings } from '@discordplus/db';
import {
  isSettingsSection,
  settingsSchemas,
  type SectionSettings,
  type SettingsSection,
} from '@discordplus/shared';
import { revalidatePath } from 'next/cache';
import { getDb } from '../db';
import { getGuildChannels, getGuildRoles, textChannelIds } from '../guild-data';
import { requireGuildAccess } from '../guilds';

export interface SettingsIssue {
  path: string;
  message: string;
}

export type SaveSettingsResult =
  { ok: true; changed: boolean } | { ok: false; error: string; issues?: SettingsIssue[] };

const DISCORD_UNAVAILABLE =
  'Sunucunun kanal ve rol listesi Discord’dan alınamadı. Lütfen tekrar deneyin.';

/** Channel and role ids must belong to the guild being configured. */
async function checkReferences<S extends SettingsSection>(
  guildId: string,
  section: S,
  value: SectionSettings<S>,
): Promise<string | null> {
  if (section === 'logging') {
    const logging = value as SectionSettings<'logging'>;
    let channels;
    try {
      channels = await getGuildChannels(guildId);
    } catch {
      return DISCORD_UNAVAILABLE;
    }
    const textIds = textChannelIds(channels);
    const allIds = new Set(channels.map((c) => c.id));
    const targets = Object.values(logging.channels).filter((id): id is string => id !== null);
    if (targets.some((id) => !textIds.has(id))) return 'Seçilen log kanalı bu sunucuda bulunamadı.';
    if (logging.ignoredChannelIds.some((id) => !allIds.has(id))) {
      return 'Yoksayılan kanallardan biri bu sunucuda bulunamadı.';
    }
  }
  if (section === 'automod') {
    const automod = value as SectionSettings<'automod'>;
    if (automod.exemptRoleIds.length === 0 && automod.exemptChannelIds.length === 0) return null;
    let channels, roles;
    try {
      [channels, roles] = await Promise.all([getGuildChannels(guildId), getGuildRoles(guildId)]);
    } catch {
      return DISCORD_UNAVAILABLE;
    }
    const roleIds = new Set(roles.map((r) => r.id));
    if (automod.exemptRoleIds.some((id) => id === guildId || !roleIds.has(id))) {
      return 'Muaf rollerden biri bu sunucuda bulunamadı.';
    }
    const channelIds = new Set(channels.map((c) => c.id));
    if (automod.exemptChannelIds.some((id) => !channelIds.has(id))) {
      return 'Muaf kanallardan biri bu sunucuda bulunamadı.';
    }
  }
  return null;
}

/**
 * Saves one settings section of a guild from the panel. Access, bot presence and
 * the shared schema are checked on the server; the bot is notified on success.
 */
export async function saveSettings<S extends SettingsSection>(
  guildId: string,
  section: S,
  value: unknown,
): Promise<SaveSettingsResult> {
  if (!isSettingsSection(section)) return { ok: false, error: 'Geçersiz ayar bölümü.' };
  const access = await requireGuildAccess(guildId);
  if (!access.botPresent) return { ok: false, error: 'DiscordPlus bu sunucuda değil.' };

  const parsed = settingsSchemas[section].safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Ayarlar geçersiz. İşaretli alanları düzeltin.',
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }
  const settings = parsed.data as SectionSettings<S>;

  const referenceError = await checkReferences(guildId, section, settings);
  if (referenceError) return { ok: false, error: referenceError };

  const result = await updateGuildSettings(getDb(), {
    guildId,
    section,
    value: settings,
    actor: { id: access.user.discordId, name: access.user.name },
  });
  revalidatePath(`/panel/${guildId}`, 'layout');
  return { ok: true, changed: result.changed };
}
