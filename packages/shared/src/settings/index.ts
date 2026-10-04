import type { z } from 'zod';
import { automodSettingsSchema } from './automod';
import { loggingSettingsSchema } from './logging';
import { moderationSettingsSchema } from './moderation';

export * from './automod';
export * from './logging';
export * from './moderation';

/**
 * Every guild has one JSON document per section. Both the bot (reading) and the
 * web panel (validating writes) use these schemas, so they never drift apart.
 */
export const settingsSchemas = {
  moderation: moderationSettingsSchema,
  logging: loggingSettingsSchema,
  automod: automodSettingsSchema,
} as const;

export type SettingsSection = keyof typeof settingsSchemas;
export type SectionSettings<S extends SettingsSection> = z.infer<(typeof settingsSchemas)[S]>;
export type GuildSettings = { [S in SettingsSection]: SectionSettings<S> };

export const SETTINGS_SECTIONS = Object.keys(settingsSchemas) as SettingsSection[];

export const SETTINGS_SECTION_LABELS: Record<SettingsSection, string> = {
  moderation: 'Moderasyon',
  logging: 'Loglama',
  automod: 'AutoMod',
};

export function isSettingsSection(value: unknown): value is SettingsSection {
  return typeof value === 'string' && value in settingsSchemas;
}

export interface ParsedSection<S extends SettingsSection> {
  value: SectionSettings<S>;
  /** `false` when the stored document did not match the schema and defaults were used. */
  valid: boolean;
}

export function parseSection<S extends SettingsSection>(
  section: S,
  raw: unknown,
): ParsedSection<S> {
  const schema = settingsSchemas[section];
  const result = schema.safeParse(raw ?? {});
  if (result.success) return { value: result.data as SectionSettings<S>, valid: true };
  return { value: schema.parse({}) as SectionSettings<S>, valid: false };
}

export function defaultSettings<S extends SettingsSection>(section: S): SectionSettings<S> {
  return settingsSchemas[section].parse({}) as SectionSettings<S>;
}

export function defaultGuildSettings(): GuildSettings {
  return {
    moderation: defaultSettings('moderation'),
    logging: defaultSettings('logging'),
    automod: defaultSettings('automod'),
  };
}
