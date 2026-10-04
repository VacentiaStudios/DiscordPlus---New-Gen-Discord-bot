export const CASE_TYPES = ['warn', 'timeout', 'untimeout', 'kick', 'ban', 'unban'] as const;
export type CaseType = (typeof CASE_TYPES)[number];

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  warn: 'Uyarı',
  timeout: 'Susturma',
  untimeout: 'Susturma kaldırma',
  kick: 'Atma',
  ban: 'Yasaklama',
  unban: 'Yasak kaldırma',
};

export const CASE_SOURCES = ['command', 'automod', 'manual', 'system'] as const;
export type CaseSource = (typeof CASE_SOURCES)[number];

export const CASE_SOURCE_LABELS: Record<CaseSource, string> = {
  command: 'Komut',
  automod: 'AutoMod',
  manual: 'Discord (elle)',
  system: 'Sistem',
};

export function isCaseType(value: unknown): value is CaseType {
  return typeof value === 'string' && (CASE_TYPES as readonly string[]).includes(value);
}

/** Punishments that can be applied automatically (warning thresholds, AutoMod). */
export const PUNISHMENTS = ['timeout', 'kick', 'ban'] as const;
export type Punishment = (typeof PUNISHMENTS)[number];

export const PUNISHMENT_LABELS: Record<Punishment, string> = {
  timeout: 'Sustur',
  kick: 'At',
  ban: 'Yasakla',
};
