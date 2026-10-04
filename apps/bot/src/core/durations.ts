import {
  DURATION,
  DURATION_PRESETS,
  formatDuration,
  formatDurationInput,
  parseDuration,
} from '@discordplus/shared';
import type { AutocompleteInteraction } from 'discord.js';
import { tr } from '../locales/tr';
import { UserError } from './errors';

export interface DurationLimits {
  min?: number;
  max: number;
}

/** Parses a duration option, throwing a user-facing error when it is invalid or out of range. */
export function parseDurationOption(input: string, limits: DurationLimits): number {
  const ms = parseDuration(input);
  if (ms === null) throw new UserError(tr.duration.invalid);
  const min = limits.min ?? DURATION.MINUTE;
  if (ms < min) throw new UserError(tr.duration.tooShort(formatDuration(min)));
  if (ms > limits.max) throw new UserError(tr.duration.tooLong(formatDuration(limits.max)));
  return ms;
}

/** Suggestions for duration options: what the user typed (if valid) plus matching presets. */
export function durationSuggestions(
  input: string,
  limits: DurationLimits,
  presets: readonly { label: string; value: string }[] = DURATION_PRESETS,
): { name: string; value: string }[] {
  const typed = input.trim();
  const min = limits.min ?? DURATION.MINUTE;
  const inRange = (ms: number | null) => ms !== null && ms >= min && ms <= limits.max;
  const suggestions: { name: string; value: string }[] = [];

  const parsed = typed ? parseDuration(typed) : null;
  if (inRange(parsed)) {
    suggestions.push({ name: formatDuration(parsed!, 3), value: formatDurationInput(parsed!) });
  }
  const needle = typed.toLocaleLowerCase('tr');
  for (const preset of presets) {
    if (!inRange(parseDuration(preset.value))) continue;
    if (needle && !preset.label.includes(needle) && !preset.value.startsWith(needle)) continue;
    if (suggestions.some((s) => s.value === preset.value)) continue;
    suggestions.push({ name: preset.label, value: preset.value });
  }
  return suggestions.slice(0, 25);
}

export function durationAutocomplete(limits: DurationLimits) {
  return async (interaction: AutocompleteInteraction<'cached'>): Promise<void> => {
    const focused = interaction.options.getFocused(true);
    await interaction.respond(
      focused.name === 'duration' ? durationSuggestions(focused.value, limits) : [],
    );
  };
}

export const SLOWMODE_PRESETS = [
  { label: '5 saniye', value: '5sn' },
  { label: '10 saniye', value: '10sn' },
  { label: '30 saniye', value: '30sn' },
  { label: '1 dakika', value: '1dk' },
  { label: '5 dakika', value: '5dk' },
  { label: '15 dakika', value: '15dk' },
  { label: '1 saat', value: '1sa' },
  { label: '6 saat', value: '6sa' },
] as const;

export const MAX_SLOWMODE_MS = 6 * DURATION.HOUR;
